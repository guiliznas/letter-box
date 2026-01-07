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

export type ViewState = 'INBOX' | 'READING' | 'SENDERS' | 'PROFILE';

export interface AppState {
  emails: EmailItem[];
  senders: Sender[];
  currentView: ViewState;
  selectedEmailId: string | null;
  filterUnread: boolean;
}