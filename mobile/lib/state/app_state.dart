import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import '../data/ai_service.dart';
import '../data/gmail_repository.dart';
import '../data/local_database.dart';
import '../data/senders_repository.dart';
import '../data/settings_store.dart';
import '../models/models.dart';

/// Client ID web do projeto Firebase, necessário no Android para receber o
/// idToken. Passe com --dart-define=GOOGLE_SERVER_CLIENT_ID=...
const String kServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

const int kPageSize = 20;

final httpClientProvider = Provider<http.Client>((ref) {
  final http.Client client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final localDatabaseProvider = Provider<LocalDatabase>((ref) => LocalDatabase());
final settingsStoreProvider = Provider<SettingsStore>((ref) => SettingsStore());
final aiServiceProvider =
    Provider<AiService>((ref) => AiService(ref.watch(httpClientProvider)));
final sendersRepositoryProvider =
    Provider<SendersRepository>((ref) => SendersRepository(FirebaseFirestore.instance));

final authStateProvider = StreamProvider<User?>(
  (ref) => FirebaseAuth.instance.authStateChanges(),
);

final aiConfigProvider = AsyncNotifierProvider<AiConfigNotifier, AiConfig?>(
  AiConfigNotifier.new,
);

class AiConfigNotifier extends AsyncNotifier<AiConfig?> {
  @override
  Future<AiConfig?> build() => ref.read(settingsStoreProvider).loadAiConfig();

  Future<void> save(AiConfig? config) async {
    await ref.read(settingsStoreProvider).saveAiConfig(config);
    state = AsyncValue<AiConfig?>.data(config);
  }
}

class InboxState {
  const InboxState({
    this.emails = const <EmailItem>[],
    this.senders = const <Sender>[],
    this.isSyncing = false,
    this.isLoadingMore = false,
    this.pageToken,
    this.filterUnread = false,
    this.error,
  });

  final List<EmailItem> emails;
  final List<Sender> senders;
  final bool isSyncing;
  final bool isLoadingMore;
  final String? pageToken;
  final bool filterUnread;
  final String? error;

  bool get hasMore => pageToken != null;

  List<EmailItem> get visibleEmails =>
      filterUnread ? emails.where((EmailItem e) => !e.isRead).toList() : emails;

  InboxState copyWith({
    List<EmailItem>? emails,
    List<Sender>? senders,
    bool? isSyncing,
    bool? isLoadingMore,
    String? pageToken,
    bool clearPageToken = false,
    bool? filterUnread,
    String? error,
    bool clearError = false,
  }) {
    return InboxState(
      emails: emails ?? this.emails,
      senders: senders ?? this.senders,
      isSyncing: isSyncing ?? this.isSyncing,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      pageToken: clearPageToken ? null : (pageToken ?? this.pageToken),
      filterUnread: filterUnread ?? this.filterUnread,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final inboxProvider = NotifierProvider<InboxNotifier, InboxState>(InboxNotifier.new);

class InboxNotifier extends Notifier<InboxState> {
  GoogleSignInAccount? _account;

  @override
  InboxState build() {
    _restore();
    return const InboxState();
  }

  void attachAccount(GoogleSignInAccount account) => _account = account;

  Future<void> _restore() async {
    final LocalDatabase db = ref.read(localDatabaseProvider);
    final SettingsStore settings = ref.read(settingsStoreProvider);
    final List<EmailItem> cached = await db.loadEmails();
    final String? cursor = await settings.loadSyncCursor();
    state = state.copyWith(emails: cached, pageToken: cursor);
  }

  Future<void> loadSenders() async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    final List<Sender> senders = await ref.read(sendersRepositoryProvider).load(user.uid);
    state = state.copyWith(senders: senders);
  }

  Future<void> addSender(String email, String name) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final String normalized = email.trim().toLowerCase();
    if (state.senders.any((Sender s) => s.email == normalized)) return;

    final Sender sender = Sender(email: normalized, name: name.trim());
    state = state.copyWith(senders: <Sender>[...state.senders, sender]);
    await ref.read(sendersRepositoryProvider).save(user.uid, sender);
  }

  Future<void> removeSender(String email) async {
    final User? user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    state = state.copyWith(
      senders: state.senders.where((Sender s) => s.email != email).toList(),
    );
    await ref.read(sendersRepositoryProvider).remove(user.uid, email);
  }

  void toggleFilter() => state = state.copyWith(filterUnread: !state.filterUnread);

  Future<GmailRepository?> _repository() async {
    final GoogleSignInAccount? account = _account;
    if (account == null) return null;

    final Map<String, String>? headers = await account.authorizationClient
        .authorizationHeaders(<String>[gmailReadonlyScope], promptIfNecessary: true);
    if (headers == null) return null;

    return GmailRepository(
      AuthenticatedClient(headers, ref.read(httpClientProvider)),
    );
  }

  /// Primeira página: recomeça a paginação do zero.
  Future<void> sync() async {
    if (state.isSyncing || state.senders.isEmpty) return;
    state = state.copyWith(isSyncing: true, clearError: true);
    try {
      await _fetch(pageToken: null);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(isSyncing: false);
    }
  }

  /// Scroll infinito: continua de onde a última página parou.
  Future<void> loadMore() async {
    if (state.isLoadingMore || state.isSyncing || !state.hasMore) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      await _fetch(pageToken: state.pageToken);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<void> _fetch({required String? pageToken}) async {
    final GmailRepository? repository = await _repository();
    if (repository == null) return;

    final GmailPage page = await repository.fetchPage(
      senderEmails: state.senders.map((Sender s) => s.email).toList(),
      pageToken: pageToken,
      pageSize: kPageSize,
    );

    await ref.read(localDatabaseProvider).upsertEmails(page.emails);
    await ref.read(settingsStoreProvider).saveSyncCursor(page.nextPageToken);

    final Set<String> existing = state.emails.map((EmailItem e) => e.id).toSet();
    final List<EmailItem> merged = <EmailItem>[
      ...state.emails,
      ...page.emails.where((EmailItem e) => !existing.contains(e.id)),
    ]..sort((EmailItem a, EmailItem b) => b.receivedAt.compareTo(a.receivedAt));

    state = state.copyWith(
      emails: merged,
      pageToken: page.nextPageToken,
      clearPageToken: page.nextPageToken == null,
    );
  }

  Future<void> setRead(String id, bool isRead) async {
    state = state.copyWith(
      emails: state.emails
          .map((EmailItem e) => e.id == id ? e.copyWith(isRead: isRead) : e)
          .toList(),
    );
    await ref.read(localDatabaseProvider).setRead(id, isRead);
  }

  Future<void> reset() async {
    _account = null;
    await ref.read(localDatabaseProvider).clear();
    await ref.read(settingsStoreProvider).saveSyncCursor(null);
    state = const InboxState();
  }
}
