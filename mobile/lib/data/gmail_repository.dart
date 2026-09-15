import 'dart:convert';

import 'package:googleapis/gmail/v1.dart' as gmail;
import 'package:http/http.dart' as http;

import '../models/models.dart';

const String gmailReadonlyScope = 'https://www.googleapis.com/auth/gmail.readonly';

class GmailPage {
  const GmailPage({required this.emails, required this.nextPageToken});

  final List<EmailItem> emails;
  final String? nextPageToken;
}

/// Injeta o header de autorização obtido pelo google_sign_in nas chamadas do
/// pacote googleapis.
class AuthenticatedClient extends http.BaseClient {
  AuthenticatedClient(this._headers, this._inner);

  final Map<String, String> _headers;
  final http.Client _inner;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    request.headers.addAll(_headers);
    return _inner.send(request);
  }

  @override
  void close() {
    _inner.close();
    super.close();
  }
}

class GmailRepository {
  GmailRepository(this._client);

  final http.Client _client;

  /// Uma página de e-mails, já filtrada por remetente na própria query — evita
  /// baixar a caixa inteira para descartar quase tudo depois.
  Future<GmailPage> fetchPage({
    required List<String> senderEmails,
    String? pageToken,
    int pageSize = 20,
  }) async {
    if (senderEmails.isEmpty) {
      return const GmailPage(emails: <EmailItem>[], nextPageToken: null);
    }

    final gmail.GmailApi api = gmail.GmailApi(_client);
    final String query = 'from:(${senderEmails.join(' OR ')})';

    final gmail.ListMessagesResponse list = await api.users.messages.list(
      'me',
      q: query,
      maxResults: pageSize,
      pageToken: pageToken,
    );

    final List<gmail.Message>? messages = list.messages;
    if (messages == null || messages.isEmpty) {
      return GmailPage(emails: const <EmailItem>[], nextPageToken: list.nextPageToken);
    }

    final List<EmailItem> emails = await Future.wait(
      messages.map((gmail.Message message) async {
        final gmail.Message detail =
            await api.users.messages.get('me', message.id!, format: 'full');
        return _toEmailItem(detail);
      }),
    );

    return GmailPage(emails: emails, nextPageToken: list.nextPageToken);
  }

  EmailItem _toEmailItem(gmail.Message message) {
    final List<gmail.MessagePartHeader> headers =
        message.payload?.headers ?? <gmail.MessagePartHeader>[];

    final String from = _header(headers, 'From');
    final RegExpMatch? match = RegExp(r'(.*)<(.*)>').firstMatch(from);
    final String senderName =
        match != null ? match.group(1)!.trim().replaceAll('"', '') : from.split('@').first;
    final String senderEmail = match != null ? match.group(2)!.trim() : from;

    final _Body body = _extractBody(message.payload);
    final int millis = int.tryParse(message.internalDate ?? '') ?? 0;

    return EmailItem(
      id: message.id!,
      senderEmail: senderEmail.toLowerCase(),
      senderName: senderName.isEmpty ? senderEmail : senderName,
      subject: _header(headers, 'Subject').isEmpty ? '(Sem assunto)' : _header(headers, 'Subject'),
      bodyHtml: body.html.isNotEmpty ? body.html : '<p>${body.text}</p>',
      bodyText: body.text.isNotEmpty ? body.text : 'Sem pré-visualização',
      receivedAt: DateTime.fromMillisecondsSinceEpoch(millis),
      isRead: !(message.labelIds ?? <String>[]).contains('UNREAD'),
    );
  }

  String _header(List<gmail.MessagePartHeader> headers, String name) {
    for (final gmail.MessagePartHeader header in headers) {
      if ((header.name ?? '').toLowerCase() == name.toLowerCase()) {
        return header.value ?? '';
      }
    }
    return '';
  }

  _Body _extractBody(gmail.MessagePart? part) {
    if (part == null) return const _Body('', '');

    String html = '';
    String text = '';

    final String? data = part.body?.data;
    if (data != null && data.isNotEmpty) {
      final String decoded = _decodeBase64Url(data);
      if (part.mimeType == 'text/html') html = decoded;
      if (part.mimeType == 'text/plain') text = decoded;
    }

    for (final gmail.MessagePart child in part.parts ?? <gmail.MessagePart>[]) {
      final _Body nested = _extractBody(child);
      if (nested.html.isNotEmpty) html = nested.html;
      if (nested.text.isNotEmpty) text = nested.text;
    }

    return _Body(html, text);
  }

  String _decodeBase64Url(String data) {
    try {
      return utf8.decode(base64Url.decode(base64Url.normalize(data)), allowMalformed: true);
    } catch (_) {
      return '';
    }
  }
}

class _Body {
  const _Body(this.html, this.text);

  final String html;
  final String text;
}
