import { AiConfig, EmailItem, Sender, User } from '../types';
import { db, collection, doc, setDoc, deleteDoc, getDocs } from './firebase';

const KEYS = {
  EMAILS_LEGACY: 'letterbox_emails',
  SENDERS: 'letterbox_senders',
  USER: 'letterbox_user',
  AI_CONFIG: 'letterbox_ai_config',
  SYNC_CURSOR: 'letterbox_sync_cursor',
};

const DB_NAME = 'letterbox';
const DB_VERSION = 1;
const EMAIL_STORE = 'emails';

// O corpo HTML das newsletters estoura a cota de ~5MB do localStorage assim que o
// scroll infinito começa a acumular páginas, por isso os e-mails vivem no IndexedDB.
let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB indisponível'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(EMAIL_STORE)) {
          database.createObjectStore(EMAIL_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
};

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(EMAIL_STORE, mode);
    const request = run(transaction.objectStore(EMAIL_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- E-mails (IndexedDB, cache offline) ---
export const loadEmails = async (): Promise<EmailItem[]> => {
  try {
    await migrateLegacyEmails();
    const all = await tx<EmailItem[]>('readonly', (store) => store.getAll());
    return all.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  } catch {
    return [];
  }
};

export const putEmails = async (emails: EmailItem[]): Promise<void> => {
  if (emails.length === 0) return;
  try {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(EMAIL_STORE, 'readwrite');
      const store = transaction.objectStore(EMAIL_STORE);
      emails.forEach((email) => store.put(email));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn('Não foi possível gravar os e-mails no cache local', e);
  }
};

export const updateEmailRead = async (id: string, isRead: boolean): Promise<void> => {
  try {
    const existing = await tx<EmailItem | undefined>('readonly', (store) => store.get(id));
    if (!existing) return;
    await tx('readwrite', (store) => store.put({ ...existing, isRead }));
  } catch (e) {
    console.warn('Não foi possível atualizar o status de leitura', e);
  }
};

export const clearEmails = async (): Promise<void> => {
  try {
    await tx('readwrite', (store) => store.clear());
  } catch {
    // cache já indisponível, nada a limpar
  }
};

const migrateLegacyEmails = async () => {
  const legacy = localStorage.getItem(KEYS.EMAILS_LEGACY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy) as EmailItem[];
    if (Array.isArray(parsed) && parsed.length > 0) await putEmails(parsed);
  } catch {
    // conteúdo corrompido, descartado
  }
  localStorage.removeItem(KEYS.EMAILS_LEGACY);
};

// --- Cursor de paginação do Gmail ---
export const saveSyncCursor = (token: string | null) => {
  if (token) localStorage.setItem(KEYS.SYNC_CURSOR, token);
  else localStorage.removeItem(KEYS.SYNC_CURSOR);
};

export const loadSyncCursor = (): string | null => localStorage.getItem(KEYS.SYNC_CURSOR);

// --- Configuração de IA (somente neste dispositivo) ---
export const saveAiConfig = (config: AiConfig | null) => {
  if (config) localStorage.setItem(KEYS.AI_CONFIG, JSON.stringify(config));
  else localStorage.removeItem(KEYS.AI_CONFIG);
};

export const loadAiConfig = (): AiConfig | null => {
  const stored = localStorage.getItem(KEYS.AI_CONFIG);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// --- Remetentes (Firestore + cache local) ---
export const saveSendersLocal = (senders: Sender[]) => {
  localStorage.setItem(KEYS.SENDERS, JSON.stringify(senders));
};

export const loadSendersLocal = (): Sender[] => {
  const stored = localStorage.getItem(KEYS.SENDERS);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const syncSenderToCloud = async (userId: string, sender: Sender) => {
  const userSendersRef = collection(db, `users/${userId}/subscriptions`);
  await setDoc(doc(userSendersRef, btoa(sender.email)), sender);
};

export const removeSenderFromCloud = async (userId: string, email: string) => {
  const docRef = doc(db, `users/${userId}/subscriptions`, btoa(email));
  await deleteDoc(docRef);
};

export const loadSendersFromCloud = async (userId: string): Promise<Sender[]> => {
  const userSendersRef = collection(db, `users/${userId}/subscriptions`);
  const querySnapshot = await getDocs(userSendersRef);
  const senders: Sender[] = [];
  querySnapshot.forEach((snapshot) => {
    senders.push(snapshot.data() as Sender);
  });
  return senders;
};

// --- Usuário ---
export const saveUserLocal = (user: User | null) => {
  if (user) localStorage.setItem(KEYS.USER, JSON.stringify(user));
  else localStorage.removeItem(KEYS.USER);
};

export const loadUserLocal = (): User | null => {
  const stored = localStorage.getItem(KEYS.USER);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};
