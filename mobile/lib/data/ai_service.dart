import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/models.dart';

class MissingAiConfigException implements Exception {
  const MissingAiConfigException();
}

class AiException implements Exception {
  const AiException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Uma única interface para os quatro providers. No mobile as chamadas são
/// diretas — a restrição de CORS que o web enfrenta não se aplica aqui.
class AiService {
  AiService(this._client);

  final http.Client _client;

  Future<String> summarizeNewsletter(AiConfig? config, String title, String content) {
    final String body = content.length > 15000 ? content.substring(0, 15000) : content;
    return _complete(
      config,
      system: 'Você é um assistente de leitura produtiva. Seu objetivo é extrair o valor real '
          'de newsletters longas, removendo anúncios e introduções irrelevantes.',
      prompt: 'Resuma esta newsletter intitulada "$title" em no máximo 4 tópicos curtos e '
          'impactantes. Use emojis relacionados aos temas.\n\nConteúdo: $body',
      temperature: 0.7,
    );
  }

  Future<String> summarizeDailyDigest(
    AiConfig? config,
    DateTime date,
    List<EmailItem> emails,
  ) {
    final String joined = emails
        .asMap()
        .entries
        .map((e) => '[Email ${e.key + 1}] Assunto: ${e.value.subject}\n'
            'Conteúdo: ${e.value.bodyText}')
        .join('\n\n---\n\n');
    final String body = joined.length > 20000 ? joined.substring(0, 20000) : joined;
    final String dateLabel = '${date.day}/${date.month}/${date.year}';

    return _complete(
      config,
      system: 'Você é um curador de conteúdo sênior. Sua missão é fazer o usuário economizar '
          "tempo, entregando apenas o 'suco' das notícias do dia em um formato digestível.",
      prompt: 'Crie um resumo executivo de todas as newsletters recebidas no dia $dateLabel. '
          'Organize por temas principais. Use um tom profissional, porém engajador. Use emojis.'
          '\n\nE-mails do dia:\n$body',
      temperature: 0.5,
    );
  }

  Future<String> testConnection(AiConfig config) async {
    final String text = await _complete(
      config,
      system: 'Você responde em uma única palavra.',
      prompt: 'Responda apenas: ok',
      temperature: 0,
    );
    return text.trim().isEmpty ? 'ok' : text.trim();
  }

  Future<String> _complete(
    AiConfig? config, {
    required String system,
    required String prompt,
    required double temperature,
  }) async {
    if (config == null || config.apiKey.isEmpty) {
      throw const MissingAiConfigException();
    }

    return switch (config.provider) {
      AiProvider.anthropic => _anthropic(config, system, prompt, temperature),
      AiProvider.openai => _openAiCompatible(
          config, system, prompt, temperature, 'https://api.openai.com/v1/chat/completions'),
      AiProvider.openrouter => _openAiCompatible(
          config, system, prompt, temperature, 'https://openrouter.ai/api/v1/chat/completions'),
      AiProvider.gemini => _gemini(config, system, prompt, temperature),
    };
  }

  Future<String> _anthropic(
      AiConfig config, String system, String prompt, double temperature) async {
    final http.Response response = await _client.post(
      Uri.parse('https://api.anthropic.com/v1/messages'),
      headers: <String, String>{
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: jsonEncode(<String, dynamic>{
        'model': config.effectiveModel,
        'max_tokens': 1500,
        'temperature': temperature,
        'system': system,
        'messages': <Map<String, String>>[
          <String, String>{'role': 'user', 'content': prompt}
        ],
      }),
    );

    _ensureOk(response);
    final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
    final List<dynamic> content = data['content'] as List<dynamic>? ?? <dynamic>[];
    for (final dynamic part in content) {
      if (part is Map && part['type'] == 'text') return part['text'] as String? ?? '';
    }
    return '';
  }

  Future<String> _openAiCompatible(AiConfig config, String system, String prompt,
      double temperature, String endpoint) async {
    final http.Response response = await _client.post(
      Uri.parse(endpoint),
      headers: <String, String>{
        'content-type': 'application/json',
        'authorization': 'Bearer ${config.apiKey}',
      },
      body: jsonEncode(<String, dynamic>{
        'model': config.effectiveModel,
        'temperature': temperature,
        'messages': <Map<String, String>>[
          <String, String>{'role': 'system', 'content': system},
          <String, String>{'role': 'user', 'content': prompt},
        ],
      }),
    );

    _ensureOk(response);
    final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
    final List<dynamic> choices = data['choices'] as List<dynamic>? ?? <dynamic>[];
    if (choices.isEmpty) return '';
    final Map<String, dynamic>? message =
        (choices.first as Map<String, dynamic>)['message'] as Map<String, dynamic>?;
    return message?['content'] as String? ?? '';
  }

  Future<String> _gemini(
      AiConfig config, String system, String prompt, double temperature) async {
    final Uri uri = Uri.parse(
      'https://generativelanguage.googleapis.com/v1beta/models/'
      '${Uri.encodeComponent(config.effectiveModel)}:generateContent',
    );

    final http.Response response = await _client.post(
      uri,
      headers: <String, String>{
        'content-type': 'application/json',
        'x-goog-api-key': config.apiKey,
      },
      body: jsonEncode(<String, dynamic>{
        'systemInstruction': <String, dynamic>{
          'parts': <Map<String, String>>[
            <String, String>{'text': system}
          ]
        },
        'contents': <Map<String, dynamic>>[
          <String, dynamic>{
            'role': 'user',
            'parts': <Map<String, String>>[
              <String, String>{'text': prompt}
            ],
          }
        ],
        'generationConfig': <String, dynamic>{'temperature': temperature},
      }),
    );

    _ensureOk(response);
    final Map<String, dynamic> data = jsonDecode(response.body) as Map<String, dynamic>;
    final List<dynamic> candidates = data['candidates'] as List<dynamic>? ?? <dynamic>[];
    if (candidates.isEmpty) return '';
    final Map<String, dynamic>? content =
        (candidates.first as Map<String, dynamic>)['content'] as Map<String, dynamic>?;
    final List<dynamic> parts = content?['parts'] as List<dynamic>? ?? <dynamic>[];
    return parts.map((dynamic p) => (p as Map<String, dynamic>)['text'] ?? '').join();
  }

  void _ensureOk(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;

    if (response.statusCode == 401 || response.statusCode == 403) {
      throw const AiException('Chave de API inválida ou sem permissão. Confira nas configurações.');
    }
    if (response.statusCode == 429) {
      throw const AiException('Limite de uso atingido no provider. Tente novamente em instantes.');
    }
    if (response.statusCode == 402) {
      throw const AiException('Sem créditos disponíveis nessa conta.');
    }

    String detail = '';
    try {
      final dynamic data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        final dynamic error = data['error'];
        detail = (error is Map ? error['message'] : data['message']) as String? ?? '';
      }
    } catch (_) {
      detail = '';
    }

    throw AiException(
      detail.isNotEmpty ? detail : 'Falha na chamada ao provider (HTTP ${response.statusCode}).',
    );
  }
}
