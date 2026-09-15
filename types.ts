export interface Sender {
  email: string;
  name: string;
  avatarColor: string;
}

export interface EmailItem {
  id: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string; // Fallback/Preview
  receivedAt: string; // ISO Date
  isRead: boolean;
  avatarColor: string;
}

export type Theme = 'light' | 'dark' | 'system';

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
  theme: Theme;
}

export type ViewState = 'INBOX' | 'READING' | 'SENDERS' | 'PROFILE' | 'SETTINGS';

export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface AppState {
  emails: EmailItem[];
  senders: Sender[];
  currentView: ViewState;
  selectedEmailId: string | null;
  filterUnread: boolean;
}