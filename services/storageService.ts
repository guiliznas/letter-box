import { EmailItem, Sender, User } from '../types';
import { INITIAL_EMAILS, INITIAL_SENDERS } from '../constants';
import { db, collection, doc, setDoc, deleteDoc, getDocs } from './firebase';

const KEYS = {
  EMAILS: 'letterbox_emails',
  SENDERS: 'letterbox_senders',
  USER: 'letterbox_user',
};

// --- E-mails (Local Cache Only for Offline) ---
export const saveEmailsLocal = (emails: EmailItem[]) => {
  localStorage.setItem(KEYS.EMAILS, JSON.stringify(emails));
};

export const loadEmailsLocal = (): EmailItem[] => {
  const stored = localStorage.getItem(KEYS.EMAILS);
  if (!stored) return INITIAL_EMAILS;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_EMAILS;
  }
};

// --- Senders (Firestore + Local Cache) ---
export const saveSendersLocal = (senders: Sender[]) => {
  localStorage.setItem(KEYS.SENDERS, JSON.stringify(senders));
};

export const syncSendersToCloud = async (userId: string, senders: Sender[]) => {
  const userSendersRef = collection(db, `users/${userId}/subscriptions`);
  // Em uma app de produção, faríamos updates atômicos. Aqui simplificamos salvando cada um.
  for (const sender of senders) {
    await setDoc(doc(userSendersRef, btoa(sender.email)), sender);
  }
};

export const removeSenderFromCloud = async (userId: string, email: string) => {
  const docRef = doc(db, `users/${userId}/subscriptions`, btoa(email));
  await deleteDoc(docRef);
};

export const loadSendersFromCloud = async (userId: string): Promise<Sender[]> => {
  const userSendersRef = collection(db, `users/${userId}/subscriptions`);
  const querySnapshot = await getDocs(userSendersRef);
  const senders: Sender[] = [];
  querySnapshot.forEach((doc) => {
    senders.push(doc.data() as Sender);
  });
  return senders.length > 0 ? senders : INITIAL_SENDERS;
};

export const loadSendersLocal = (): Sender[] => {
  const stored = localStorage.getItem(KEYS.SENDERS);
  if (!stored) return INITIAL_SENDERS;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_SENDERS;
  }
};

// --- User ---
export const saveUserLocal = (user: User | null) => {
  if (user) {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.USER);
  }
};

export const loadUserLocal = (): User | null => {
  const stored = localStorage.getItem(KEYS.USER);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};