import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../data/ai_service.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'ai_settings_screen.dart';

class ReaderScreen extends ConsumerStatefulWidget {
  const ReaderScreen({super.key, required this.emailId});

  final String emailId;

  @override
  ConsumerState<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends ConsumerState<ReaderScreen> {
  WebViewController? _controller;
  String? _loadedHtml;

  void _ensureController(EmailItem email) {
    if (_loadedHtml == email.bodyHtml) return;
    _loadedHtml = email.bodyHtml;
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.disabled)
      ..setBackgroundColor(Theme.of(context).scaffoldBackgroundColor)
      ..loadHtmlString(_wrapHtml(email.bodyHtml));
  }

  String _wrapHtml(String body) {
    final bool isDark = Theme.of(context).brightness == Brightness.dark;
    final String fg = isDark ? '#e5e7eb' : '#111827';
    final String bg = isDark ? '#111827' : '#ffffff';
    return '''
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, Roboto, sans-serif; color: $fg; background: $bg;
         margin: 16px; line-height: 1.6; font-size: 16px; word-wrap: break-word; }
  img, table { max-width: 100% !important; height: auto !important; }
  a { color: #3b82f6; }
</style>
</head>
<body>$body</body>
</html>
''';
  }

  Future<void> _summarize(EmailItem email) async {
    final AiConfig? config = ref.read(aiConfigProvider).value;
    if (config == null) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const AiSettingsScreen()),
      );
      return;
    }

    final String text = email.bodyText.isNotEmpty
        ? email.bodyText
        : email.bodyHtml.replaceAll(RegExp(r'<[^>]*>'), ' ');

    if (!mounted) return;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _SummarySheet(
        future: ref.read(aiServiceProvider).summarizeNewsletter(config, email.subject, text),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final InboxState state = ref.watch(inboxProvider);
    final EmailItem? email =
        state.emails.where((EmailItem e) => e.id == widget.emailId).firstOrNull;

    if (email == null) {
      return const Scaffold(body: Center(child: Text('E-mail não encontrado')));
    }

    _ensureController(email);

    return Scaffold(
      appBar: AppBar(
        title: Text(email.senderName, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: <Widget>[
          IconButton(
            tooltip: 'Resumir',
            onPressed: () => _summarize(email),
            icon: const Icon(Icons.auto_awesome),
          ),
          IconButton(
            tooltip: email.isRead ? 'Marcar como não lido' : 'Marcar como lido',
            onPressed: () =>
                ref.read(inboxProvider.notifier).setRead(email.id, !email.isRead),
            icon: Icon(email.isRead ? Icons.check_circle : Icons.circle_outlined),
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(email.subject, style: Theme.of(context).textTheme.titleLarge),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _controller == null
                ? const Center(child: CircularProgressIndicator())
                : WebViewWidget(controller: _controller!),
          ),
        ],
      ),
    );
  }
}

class _SummarySheet extends StatelessWidget {
  const _SummarySheet({required this.future});

  final Future<String> future;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: FutureBuilder<String>(
        future: future,
        builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SizedBox(
              height: 160,
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final Object? error = snapshot.error;
          final String text = error != null
              ? (error is AiException ? error.message : 'Falha ao gerar o resumo.')
              : snapshot.data ?? '';

          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  const Icon(Icons.auto_awesome),
                  const SizedBox(width: 8),
                  Text('Resumo inteligente', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
              const SizedBox(height: 16),
              Flexible(child: SingleChildScrollView(child: Text(text))),
            ],
          );
        },
      ),
    );
  }
}
