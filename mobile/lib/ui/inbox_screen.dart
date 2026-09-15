import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/ai_service.dart';
import '../models/models.dart';
import '../state/app_state.dart';
import 'ai_settings_screen.dart';
import 'reader_screen.dart';

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key, required this.onOpenSenders, required this.onOpenProfile});

  final VoidCallback onOpenSenders;
  final VoidCallback onOpenProfile;

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final ScrollController _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  @override
  void dispose() {
    _controller.removeListener(_onScroll);
    _controller.dispose();
    super.dispose();
  }

  /// Scroll infinito: dispara a próxima página antes de chegar no fim.
  void _onScroll() {
    if (!_controller.hasClients) return;
    final double remaining = _controller.position.maxScrollExtent - _controller.position.pixels;
    if (remaining < 400) {
      ref.read(inboxProvider.notifier).loadMore();
    }
  }

  Future<void> _summarizeDay() async {
    final AiConfig? config = ref.read(aiConfigProvider).value;
    if (config == null) {
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const AiSettingsScreen()),
      );
      return;
    }

    final DateTime? date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (date == null || !mounted) return;

    final List<EmailItem> ofDay = ref
        .read(inboxProvider)
        .emails
        .where((EmailItem e) =>
            e.receivedAt.year == date.year &&
            e.receivedAt.month == date.month &&
            e.receivedAt.day == date.day)
        .toList();

    if (ofDay.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nenhum e-mail encontrado para esta data.')),
      );
      return;
    }

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _DigestDialog(
        future: ref.read(aiServiceProvider).summarizeDailyDigest(config, date, ofDay),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final InboxState state = ref.watch(inboxProvider);
    final List<EmailItem> emails = state.visibleEmails;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox'),
        actions: <Widget>[
          TextButton(
            onPressed: ref.read(inboxProvider.notifier).toggleFilter,
            child: Text(state.filterUnread ? 'Não lidos' : 'Todos'),
          ),
          IconButton(
            onPressed: _summarizeDay,
            icon: const Icon(Icons.auto_awesome),
            tooltip: 'Resumo do dia',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: ref.read(inboxProvider.notifier).sync,
        child: _buildBody(state, emails),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 1,
        onDestinationSelected: (int index) {
          if (index == 0) widget.onOpenSenders();
          if (index == 1) ref.read(inboxProvider.notifier).sync();
          if (index == 2) widget.onOpenProfile();
        },
        destinations: <Widget>[
          const NavigationDestination(icon: Icon(Icons.tune), label: 'Fontes'),
          NavigationDestination(
            icon: state.isSyncing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh),
            label: state.isSyncing ? 'Buscando' : 'Sincronizar',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), label: 'Perfil'),
        ],
      ),
    );
  }

  Widget _buildBody(InboxState state, List<EmailItem> emails) {
    if (state.senders.isEmpty) {
      return _EmptyState(
        icon: Icons.tune,
        title: 'Nenhuma fonte cadastrada',
        subtitle: 'Adicione os remetentes das suas newsletters para começar a sincronizar.',
        actionLabel: 'Gerenciar fontes',
        onAction: widget.onOpenSenders,
      );
    }

    if (emails.isEmpty) {
      return _EmptyState(
        icon: Icons.mark_email_read_outlined,
        title: 'Nenhum e-mail por aqui',
        subtitle: state.filterUnread
            ? 'Você leu tudo. Troque o filtro para ver os e-mails lidos.'
            : 'Puxe para baixo para sincronizar com o Gmail.',
      );
    }

    return ListView.separated(
      controller: _controller,
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: emails.length + 1,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (BuildContext context, int index) {
        if (index == emails.length) return _Footer(state: state);

        final EmailItem email = emails[index];
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: email.avatarColor,
            child: Text(
              email.senderName.isEmpty ? '?' : email.senderName[0].toUpperCase(),
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          title: Text(
            email.senderName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontWeight: email.isRead ? FontWeight.w500 : FontWeight.bold),
          ),
          subtitle: Text(
            email.subject,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontWeight: email.isRead ? FontWeight.normal : FontWeight.w600),
          ),
          trailing: Text(
            _formatDate(email.receivedAt),
            style: Theme.of(context).textTheme.bodySmall,
          ),
          onTap: () {
            ref.read(inboxProvider.notifier).setRead(email.id, true);
            Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => ReaderScreen(emailId: email.id)),
            );
          },
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final Duration diff = DateTime.now().difference(date);
    if (diff.inDays == 0) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    if (diff.inDays == 1) return 'Ontem';
    return '${date.day}/${date.month}';
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.state});

  final InboxState state;

  @override
  Widget build(BuildContext context) {
    if (state.isLoadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (!state.hasMore) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text('Você chegou ao fim.',
              style: Theme.of(context).textTheme.bodySmall),
        ),
      );
    }
    return const SizedBox(height: 48);
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: <Widget>[
        const SizedBox(height: 120),
        Icon(icon, size: 48, color: Theme.of(context).hintColor),
        const SizedBox(height: 16),
        Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48),
          child: Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        if (actionLabel != null) ...<Widget>[
          const SizedBox(height: 24),
          Center(child: FilledButton(onPressed: onAction, child: Text(actionLabel!))),
        ],
      ],
    );
  }
}

class _DigestDialog extends StatelessWidget {
  const _DigestDialog({required this.future});

  final Future<String> future;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: <Widget>[
          Icon(Icons.auto_awesome),
          SizedBox(width: 8),
          Text('Resumo do dia'),
        ],
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: FutureBuilder<String>(
          future: future,
          builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(
                height: 120,
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.hasError) {
              final Object? error = snapshot.error;
              return Text(error is AiException ? error.message : 'Falha ao gerar o resumo.');
            }
            return SingleChildScrollView(child: Text(snapshot.data ?? ''));
          },
        ),
      ),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Fechar'),
        ),
      ],
    );
  }
}
