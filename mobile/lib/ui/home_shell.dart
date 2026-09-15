import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_service.dart';
import '../state/app_state.dart';
import 'inbox_screen.dart';
import 'profile_screen.dart';
import 'senders_screen.dart';
import 'welcome_screen.dart';

class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  final AuthService _auth = AuthService(kServerClientId);
  bool _busy = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    try {
      final AuthResult? result = await _auth.restore();
      if (result != null) {
        ref.read(inboxProvider.notifier).attachAccount(result.account);
        await ref.read(inboxProvider.notifier).loadSenders();
      }
    } catch (_) {
      // Sessão não recuperável: o usuário faz login manualmente.
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final AuthResult? result = await _auth.signIn();
      if (result != null) {
        ref.read(inboxProvider.notifier).attachAccount(result.account);
        await ref.read(inboxProvider.notifier).loadSenders();
        await ref.read(inboxProvider.notifier).sync();
      }
    } catch (e) {
      setState(() => _error = 'Não foi possível entrar: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _logout() async {
    await _auth.signOut();
    await ref.read(inboxProvider.notifier).reset();
    if (mounted) Navigator.of(context).popUntil((Route<void> route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<User?> auth = ref.watch(authStateProvider);

    return auth.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (Object e, _) => Scaffold(body: Center(child: Text('Erro de autenticação: $e'))),
      data: (User? user) {
        if (user == null) {
          return WelcomeScreen(onLogin: _login, isLoading: _busy, error: _error);
        }
        return InboxScreen(
          onOpenSenders: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const SendersScreen()),
          ),
          onOpenProfile: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => ProfileScreen(onLogout: _logout)),
          ),
        );
      },
    );
  }
}
