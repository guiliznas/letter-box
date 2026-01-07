import { EmailItem, Sender, User } from '../types';
import { INITIAL_EMAILS, INITIAL_SENDERS } from '../constants';

const KEYS = {
  EMAILS: 'letterbox_emails',
  SENDERS: 'letterbox_senders',
  USER: 'letterbox_user',
};

export const saveEmails = (emails: EmailItem[]) => {
  localStorage.setItem(KEYS.EMAILS, JSON.stringify(emails));
};

export const loadEmails = (): EmailItem[] => {
  const stored = localStorage.getItem(KEYS.EMAILS);
  if (!stored) return INITIAL_EMAILS;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse emails", e);
    return INITIAL_EMAILS;
  }
};

export const saveSenders = (senders: Sender[]) => {
  localStorage.setItem(KEYS.SENDERS, JSON.stringify(senders));
};

export const loadSenders = (): Sender[] => {
  const stored = localStorage.getItem(KEYS.SENDERS);
  if (!stored) return INITIAL_SENDERS;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse senders", e);
    return INITIAL_SENDERS;
  }
};

export const saveUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.USER);
  }
};

export const loadUser = (): User | null => {
  const stored = localStorage.getItem(KEYS.USER);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Failed to parse user", e);
    return null;
  }
};