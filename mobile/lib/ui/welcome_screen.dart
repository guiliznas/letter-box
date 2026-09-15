import 'package:flutter/material.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key, required this.onLogin, required this.isLoading, this.error});

  final VoidCallback onLogin;
  final bool isLoading;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Spacer(),
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(Icons.mail_outline, color: Colors.white, size: 40),
                ),
              ),
              const SizedBox(height: 32),
              Text('LetterBox',
                  textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(
                'Suas newsletters, sem distrações.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.hintColor),
              ),
              const SizedBox(height: 40),
              const _Feature(
                icon: Icons.bolt_outlined,
                title: 'Focado em leitura',
                subtitle: 'Layout limpo para você focar no que importa.',
              ),
              const _Feature(
                icon: Icons.wifi_off_outlined,
                title: 'Funciona offline',
                subtitle: 'Os e-mails sincronizados ficam salvos no aparelho.',
              ),
              const _Feature(
                icon: Icons.shield_outlined,
                title: 'Privacidade',
                subtitle: 'Conecta direto ao seu Gmail, sem servidor intermediário.',
              ),
              const Spacer(),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    error!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
                  ),
                ),
              FilledButton.icon(
                onPressed: isLoading ? null : onLogin,
                icon: isLoading
                    ? const SizedBox(
                        width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.login),
                label: const Text('Começar com Google'),
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Ao entrar, o app acessa seus e-mails apenas para leitura.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(fontSize: 10, color: theme.hintColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Feature extends StatelessWidget {
  const _Feature({required this.icon, required this.title, required this.subtitle});

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: theme.colorScheme.onPrimaryContainer),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: theme.textTheme.titleSmall),
                Text(subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.hintColor)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
