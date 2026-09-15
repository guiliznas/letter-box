import 'package:flutter/material.dart';

const List<Color> kAvatarColors = <Color>[
  Color(0xFFEF4444), Color(0xFFF97316), Color(0xFFF59E0B),
  Color(0xFF22C55E), Color(0xFF10B981), Color(0xFF14B8A6),
  Color(0xFF06B6D4), Color(0xFF3B82F6), Color(0xFF6366F1),
  Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFFD946EF),
  Color(0xFFEC4899), Color(0xFFF43F5E),
];

/// Mesma cor para o mesmo remetente em qualquer dispositivo.
Color colorForSender(String email) {
  var hash = 0;
  for (final unit in email.codeUnits) {
    hash = (hash * 31 + unit) & 0x7FFFFFFF;
  }
  return kAvatarColors[hash % kAvatarColors.length];
}

class Sender {
  const Sender({required this.email, required this.name});

  final String email;
  final String name;

  Color get avatarColor => colorForSender(email);

  factory Sender.fromMap(Map<String, dynamic> map) => Sender(
        email: (map['email'] as String? ?? '').toLowerCase(),
        name: map['name'] as String? ?? '',
      );

  Map<String, dynamic> toMap() => <String, dynamic>{
        'email': email,
        'name': name,
        // Mantém compatibilidade com os documentos criados pelo app web.
        'avatarColor': 'bg-blue-500',
      };
}

class EmailItem {
  const EmailItem({
    required this.id,
    required this.senderEmail,
    required this.senderName,
    required this.subject,
    required this.bodyHtml,
    required this.bodyText,
    required this.receivedAt,
    required this.isRead,
  });

  final String id;
  final String senderEmail;
  final String senderName;
  final String subject;
  final String bodyHtml;
  final String bodyText;
  final DateTime receivedAt;
  final bool isRead;

  Color get avatarColor => colorForSender(senderEmail);

  EmailItem copyWith({bool? isRead}) => EmailItem(
        id: id,
        senderEmail: senderEmail,
        senderName: senderName,
        subject: subject,
        bodyHtml: bodyHtml,
        bodyText: bodyText,
        receivedAt: receivedAt,
        isRead: isRead ?? this.isRead,
      );

  Map<String, Object?> toRow() => <String, Object?>{
        'id': id,
        'sender_email': senderEmail,
        'sender_name': senderName,
        'subject': subject,
        'body_html': bodyHtml,
        'body_text': bodyText,
        'received_at': receivedAt.toUtc().toIso8601String(),
        'is_read': isRead ? 1 : 0,
      };

  factory EmailItem.fromRow(Map<String, Object?> row) => EmailItem(
        id: row['id'] as String,
        senderEmail: row['sender_email'] as String,
        senderName: row['sender_name'] as String,
        subject: row['subject'] as String,
        bodyHtml: row['body_html'] as String,
        bodyText: row['body_text'] as String,
        receivedAt: DateTime.parse(row['received_at'] as String).toLocal(),
        isRead: (row['is_read'] as int) == 1,
      );
}

enum AiProvider { anthropic, openai, gemini, openrouter }

extension AiProviderInfo on AiProvider {
  String get id => name;

  String get label => switch (this) {
        AiProvider.anthropic => 'Claude (Anthropic)',
        AiProvider.openai => 'OpenAI',
        AiProvider.gemini => 'Google Gemini',
        AiProvider.openrouter => 'OpenRouter',
      };

  String get defaultModel => switch (this) {
        AiProvider.anthropic => 'claude-sonnet-5',
        AiProvider.openai => 'gpt-4o-mini',
        AiProvider.gemini => 'gemini-2.5-flash',
        AiProvider.openrouter => 'openai/gpt-4o-mini',
      };

  String get keyUrl => switch (this) {
        AiProvider.anthropic => 'https://console.anthropic.com/settings/keys',
        AiProvider.openai => 'https://platform.openai.com/api-keys',
        AiProvider.gemini => 'https://aistudio.google.com/apikey',
        AiProvider.openrouter => 'https://openrouter.ai/keys',
      };
}

class AiConfig {
  const AiConfig({required this.provider, required this.apiKey, required this.model});

  final AiProvider provider;
  final String apiKey;
  final String model;

  String get effectiveModel => model.trim().isEmpty ? provider.defaultModel : model.trim();
}
