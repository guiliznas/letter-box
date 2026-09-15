// Substitui services/firebase.ts no modo mock (vite --mode mock).
// Mesma superfície de exports, com auth e Firestore em memória persistidos no localStorage.

type MockUser = { uid: string; email: string; displayName: string; photoURL: string | null };
type AuthListener = (user: MockUser | null) => void;

const AUTH_KEY = 'letterbox_mock_auth';
const STORE_KEY = 'letterbox_mock_firestore';

export const MOCK_USER: MockUser = {
  uid: 'mock-user',
  email: 'voce@exemplo.com',
  displayName: 'Usuário de Teste',
  photoURL: null,
};

export const SEED_SENDERS = [
  { email: 'newsletter@techweekly.com', name: 'Tech Weekly', avatarColor: 'bg-blue-500' },
  { email: 'daily@finance.com', name: 'Morning Finance', avatarColor: 'bg-green-500' },
  { email: 'cooking@recipes.com', name: "Chef's Corner", avatarColor: 'bg-orange-500' },
];

const listeners = new Set<AuthListener>();

const readUser = (): MockUser | null => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
};

export const auth = {
  get currentUser() {
    return readUser();
  },
};

export const db = {};

export class GoogleAuthProvider {
  addScope(_scope: string) {}
  static credentialFromResult(_result: unknown) {
    return null;
  }
}

export const googleProvider = new GoogleAuthProvider();

const notify = () => listeners.forEach((listener) => listener(readUser()));

export const signInWithPopup = async (_auth: unknown, _provider: unknown) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  localStorage.setItem(AUTH_KEY, JSON.stringify(MOCK_USER));
  notify();
  return { user: MOCK_USER };
};

export const signOut = async (_auth: unknown) => {
  localStorage.removeItem(AUTH_KEY);
  notify();
};

export const onAuthStateChanged = (_auth: unknown, listener: AuthListener) => {
  listeners.add(listener);
  setTimeout(() => listener(readUser()), 0);
  return () => listeners.delete(listener);
};

// --- Firestore ---
type Store = Record<string, Record<string, unknown>>;

const readStore = (): Store => {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // recria abaixo
    }
  }
  const seeded: Store = {
    [`users/${MOCK_USER.uid}/subscriptions`]: Object.fromEntries(
      SEED_SENDERS.map((sender) => [btoa(sender.email), sender])
    ),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
  return seeded;
};

const writeStore = (store: Store) => localStorage.setItem(STORE_KEY, JSON.stringify(store));

type CollectionRef = { kind: 'collection'; path: string };
type DocRef = { kind: 'doc'; collection: string; id: string };

export const collection = (_db: unknown, path: string): CollectionRef => ({ kind: 'collection', path });

export function doc(parent: CollectionRef, id: string): DocRef;
export function doc(db: unknown, path: string, id: string): DocRef;
export function doc(a: unknown, b: string, c?: string): DocRef {
  if (c !== undefined) return { kind: 'doc', collection: b, id: c };
  return { kind: 'doc', collection: (a as CollectionRef).path, id: b };
}

export const setDoc = async (ref: DocRef, data: unknown) => {
  const store = readStore();
  store[ref.collection] = { ...(store[ref.collection] || {}), [ref.id]: data };
  writeStore(store);
};

export const deleteDoc = async (ref: DocRef) => {
  const store = readStore();
  if (store[ref.collection]) delete store[ref.collection][ref.id];
  writeStore(store);
};

export const getDocs = async (ref: CollectionRef) => {
  const docs = Object.values(readStore()[ref.path] || {});
  return {
    forEach: (callback: (snapshot: { data: () => unknown }) => void) =>
      docs.forEach((data) => callback({ data: () => data })),
  };
};

export const onSnapshot = () => () => {};
