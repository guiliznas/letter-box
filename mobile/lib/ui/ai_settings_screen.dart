import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/ai_service.dart';
import '../models/models.dart';
import '../state/app_state.dart';

class AiSettingsScreen extends ConsumerStatefulWidget {
  const AiSettingsScreen({super.key});

  @override
  ConsumerState<AiSettingsScreen> createState() => _AiSettingsScreenState();
}

class _AiSettingsScreenState extends ConsumerState<AiSettingsScreen> {
  late AiProvider _provider;
  late TextEditingController _keyController;
  late TextEditingController _modelController;
  bool _showKey = false;
  bool _testing = false;
  String? _testMessage;
  bool _testOk = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _provider = AiProvider.anthropic;
    _keyController = TextEditingController();
    _modelController = TextEditingController(text: _provider.defaultModel);
  }

  @override
  void dispose() {
    _keyController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  void _hydrate(AiConfig? config) {
    if (_initialized || config == null) return;
    _initialized = true;
    _provider = config.provider;
    _keyController.text = config.apiKey;
    _modelController.text = config.effectiveModel;
  }

  Future<void> _test() async {
    setState(() {
      _testing = true;
      _testMessage = null;
    });

    try {
      await ref.read(aiServiceProvider).testConnection(AiConfig(
            provider: _provider,
            apiKey: _keyController.text.trim(),
            model: _modelController.text.trim(),
          ));
      setState(() {
        _testOk = true;
        _testMessage = 'Conexão funcionando.';
      });
    } catch (e) {
      setState(() {
        _testOk = false;
        _testMessage = e is AiException ? e.message : 'Falha no teste.';
      });
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _save() async {
    final String key = _keyController.text.trim();
    await ref.read(aiConfigProvider.notifier).save(
          key.isEmpty
              ? null
              : AiConfig(
                  provider: _provider,
                  apiKey: key,
                  model: _modelController.text.trim(),
                ),
        );
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final AiConfig? config = ref.watch(aiConfigProvider).value;
    _hydrate(config);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inteligência Artificial'),
        actions: <Widget>[
          TextButton(onPressed: _save, child: const Text('Salvar')),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Text(
            'Os resumos usam a sua própria chave de API. Ela fica guardada com criptografia '
            'apenas neste aparelho e não é enviada para nenhum servidor além do provider escolhido.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          Text('Provider', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 8),
          RadioGroup<AiProvider>(
            groupValue: _provider,
            onChanged: (AiProvider? value) {
              if (value == null) return;
              setState(() {
                _provider = value;
                _modelController.text = value.defaultModel;
                _testMessage = null;
              });
            },
            child: Column(
              children: AiProvider.values
                  .map(
                    (AiProvider provider) => RadioListTile<AiProvider>(
                      value: provider,
                      title: Text(provider.label),
                      subtitle: Text(provider.defaultModel,
                          style: Theme.of(context).textTheme.bodySmall),
                      contentPadding: EdgeInsets.zero,
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _keyController,
            obscureText: !_showKey,
            autocorrect: false,
            enableSuggestions: false,
            onChanged: (_) => setState(() => _testMessage = null),
            decoration: InputDecoration(
              labelText: 'Chave de API',
              helperText: _provider.keyUrl,
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                icon: Icon(_showKey ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _showKey = !_showKey),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _modelController,
            autocorrect: false,
            decoration: InputDecoration(
              labelText: 'Modelo',
              hintText: _provider.defaultModel,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _testing || _keyController.text.trim().isEmpty ? null : _test,
            icon: _testing
                ? const SizedBox(
                    width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.wifi_tethering),
            label: const Text('Testar conexão'),
          ),
          if (_testMessage != null) ...<Widget>[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _testOk
                    ? Colors.green.withValues(alpha: 0.12)
                    : Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: <Widget>[
                  Icon(_testOk ? Icons.check_circle : Icons.error_outline, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_testMessage!, style: const TextStyle(fontSize: 12))),
                ],
              ),
            ),
          ],
          if (config != null) ...<Widget>[
            const SizedBox(height: 24),
            TextButton(
              onPressed: () async {
                await ref.read(aiConfigProvider.notifier).save(null);
                if (context.mounted) Navigator.of(context).pop();
              },
              child: const Text('Remover chave deste aparelho'),
            ),
          ],
        ],
      ),
    );
  }
}
