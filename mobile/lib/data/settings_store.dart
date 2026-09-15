import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';

/// A chave de API fica no Keystore do Android; provider, modelo e cursor de
/// paginação são preferências comuns.
class SettingsStore {
  static const FlutterSecureStorage _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const String _keyApiKey = 'ai_api_key';
  static const String _keyProvider = 'ai_provider';
  static const String _keyModel = 'ai_model';
  static const String _keyCursor = 'sync_cursor';

  Future<AiConfig?> loadAiConfig() async {
    final String? apiKey = await _secure.read(key: _keyApiKey);
    if (apiKey == null || apiKey.isEmpty) return null;

    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String providerId = prefs.getString(_keyProvider) ?? AiProvider.anthropic.id;
    final AiProvider provider = AiProvider.values.firstWhere(
      (AiProvider p) => p.id == providerId,
      orElse: () => AiProvider.anthropic,
    );

    return AiConfig(
      provider: provider,
      apiKey: apiKey,
      model: prefs.getString(_keyModel) ?? provider.defaultModel,
    );
  }

  Future<void> saveAiConfig(AiConfig? config) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    if (config == null) {
      await _secure.delete(key: _keyApiKey);
      await prefs.remove(_keyProvider);
      await prefs.remove(_keyModel);
      return;
    }
    await _secure.write(key: _keyApiKey, value: config.apiKey);
    await prefs.setString(_keyProvider, config.provider.id);
    await prefs.setString(_keyModel, config.effectiveModel);
  }

  Future<String?> loadSyncCursor() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyCursor);
  }

  Future<void> saveSyncCursor(String? token) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_keyCursor);
    } else {
      await prefs.setString(_keyCursor, token);
    }
  }
}
