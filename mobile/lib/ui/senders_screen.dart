import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/models.dart';
import '../state/app_state.dart';

class SendersScreen extends ConsumerStatefulWidget {
  const SendersScreen({super.key});

  @override
  ConsumerState<SendersScreen> createState() => _SendersScreenState();
}

class _SendersScreenState extends ConsumerState<SendersScreen> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _add() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await ref.read(inboxProvider.notifier).addSender(_email.text, _name.text);
    _name.clear();
    _email.clear();
    if (mounted) FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final List<Sender> senders = ref.watch(inboxProvider).senders;

    return Scaffold(
      appBar: AppBar(title: const Text('Fontes')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  children: <Widget>[
                    TextFormField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Nome da newsletter',
                        border: OutlineInputBorder(),
                      ),
                      validator: (String? value) =>
                          (value == null || value.trim().isEmpty) ? 'Informe um nome' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'E-mail do remetente',
                        border: OutlineInputBorder(),
                      ),
                      validator: (String? value) {
                        final String text = value?.trim() ?? '';
                        if (!text.contains('@') || !text.contains('.')) {
                          return 'Informe um e-mail válido';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _add,
                        icon: const Icon(Icons.add),
                        label: const Text('Adicionar fonte'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text('Inscrito em (${senders.length})',
              style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          if (senders.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Text(
                'Nenhuma fonte ainda. Só e-mails desses remetentes são sincronizados.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ...senders.map(
            (Sender sender) => ListTile(
              leading: CircleAvatar(
                backgroundColor: sender.avatarColor,
                child: Text(
                  sender.name.isEmpty ? '?' : sender.name[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
              title: Text(sender.name),
              subtitle: Text(sender.email),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline),
                tooltip: 'Remover',
                onPressed: () => ref.read(inboxProvider.notifier).removeSender(sender.email),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
