import React, { useCallback, useEffect, useState } from 'react';
import { AiConfig, EmailItem, Sender, ViewState, User, Theme } from './types';
import {
  loadEmails, putEmails, updateEmailRead, clearEmails,
  loadSendersLocal, saveSendersLocal,
  loadUserLocal, saveUserLocal,
  loadSendersFromCloud, syncSenderToCloud, removeSenderFromCloud,
  loadAiConfig, saveAiConfig,
  loadSyncCursor, saveSyncCursor
} from './services/storageService';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from './services/firebase';
import { initGoogleClient, fetchGmailPage } from './services/googleService';
import { MissingAiConfigError, summarizeDailyDigest } from './services/aiService';
import { COLORS } from './constants';
import { EmailList } from './components/EmailList';
import { SenderManager } from './components/SenderManager';
import { EmailReader } from './components/EmailReader';
import { Profile } from './components/Profile';
import { AiSettings } from './components/AiSettings';
import { Welcome } from './components/Welcome';
import { Settings, RefreshCw, User as UserIcon, X, Sparkles, Loader2 } from 'lucide-react';

const PAGE_SIZE = 20;

const App: React.FC = () => {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);

  const [view, setView] = useState<ViewState>('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const [dailyDigest, setDailyDigest] = useState<{ date: string, text: string } | null>(null);
  const [isSummarizingDay, setIsSummarizingDay] = useState(false);

  // 1. Dados locais (cache offline)
  useEffect(() => {
    setUser(loadUserLocal());
    setSenders(loadSendersLocal());
    setAiConfig(loadAiConfig());
    setPageToken(loadSyncCursor());
    loadEmails().then(setEmails);
    initGoogleClient(() => setIsGoogleReady(true));
  }, []);

  // 2. Sessão do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          avatarUrl: firebaseUser.photoURL || undefined,
          theme: loadUserLocal()?.theme || 'system'
        };
        setUser(userData);
        saveUserLocal(userData);

        const cloudSenders = await loadSendersFromCloud(firebaseUser.uid);
        setSenders(cloudSenders);
        saveSendersLocal(cloudSenders);
      } else {
        setUser(null);
        saveUserLocal(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Tema
  useEffect(() => {
    const isDark = user?.theme === 'dark'
      || ((user?.theme || 'system') === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }, [user?.theme]);

  useEffect(() => { saveSendersLocal(senders); }, [senders]);

  const mergeEmails = (incoming: EmailItem[]) => {
    setEmails(prev => {
      const existingIds = new Set(prev.map(e => e.id));
      const fresh = incoming.filter(e => !existingIds.has(e.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
    });
    putEmails(incoming);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    setView('READING');
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
    updateEmailRead(id, true);
  };

  const handleToggleRead = (id: string) => {
    const target = emails.find(e => e.id === id);
    if (!target) return;
    const next = !target.isRead;
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: next } : e));
    updateEmailRead(id, next);
  };

  const handleSaveAiConfig = (config: AiConfig | null) => {
    setAiConfig(config);
    saveAiConfig(config);
  };

  const handleSummarizeDay = async (dateStr: string) => {
    if (!aiConfig) {
      setView('SETTINGS');
      return;
    }

    setIsSummarizingDay(true);
    try {
      const emailsOfToday = emails.filter(e => e.receivedAt.startsWith(dateStr));

      if (emailsOfToday.length === 0) {
        alert('Nenhum e-mail encontrado para esta data na sua lista local.');
        return;
      }

      const summary = await summarizeDailyDigest(aiConfig, dateStr, emailsOfToday);
      setDailyDigest({ date: dateStr, text: summary });
    } catch (err) {
      if (err instanceof MissingAiConfigError) {
        setView('SETTINGS');
        return;
      }
      alert(err instanceof Error ? err.message : 'Falha ao gerar o resumo diário.');
    } finally {
      setIsSummarizingDay(false);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        // @ts-ignore
        gapi.client.setToken({ access_token: credential.accessToken });
      }
      setView('INBOX');
    } catch (error) {
      console.error('Login Failed', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setEmails([]);
    setSenders([]);
    setPageToken(null);
    setReachedEnd(false);
    saveSyncCursor(null);
    await clearEmails();
    setView('INBOX');
  };

  // Primeira página: recomeça a paginação do zero.
  const handleGmailSync = async () => {
    if (isSyncing || !user || !isGoogleReady || senders.length === 0) return;
    setIsSyncing(true);
    try {
      const { emails: page, nextPageToken } = await fetchGmailPage(
        senders.map(s => s.email), null, PAGE_SIZE
      );
      mergeEmails(page);
      setPageToken(nextPageToken);
      saveSyncCursor(nextPageToken);
      setReachedEnd(!nextPageToken);
    } catch (error) {
      console.error('Sync Failed', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Scroll infinito: continua de onde a última página parou.
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isSyncing || !pageToken || !isGoogleReady || senders.length === 0) return;
    setIsLoadingMore(true);
    try {
      const { emails: page, nextPageToken } = await fetchGmailPage(
        senders.map(s => s.email), pageToken, PAGE_SIZE
      );
      mergeEmails(page);
      setPageToken(nextPageToken);
      saveSyncCursor(nextPageToken);
      setReachedEnd(!nextPageToken);
    } catch (error) {
      console.error('Falha ao carregar mais e-mails', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isSyncing, pageToken, isGoogleReady, senders]);

  const handleAddSender = async (email: string, name: string) => {
    const normalized = email.trim().toLowerCase();
    if (senders.some(s => s.email.toLowerCase() === normalized)) return;

    const sender: Sender = {
      email: normalized,
      name: name.trim(),
      avatarColor: COLORS[senders.length % COLORS.length],
    };
    setSenders(prev => [...prev, sender]);
    if (auth.currentUser) await syncSenderToCloud(auth.currentUser.uid, sender);
  };

  const handleRemoveSender = async (email: string) => {
    setSenders(prev => prev.filter(s => s.email !== email));
    if (auth.currentUser) await removeSenderFromCloud(auth.currentUser.uid, email);
  };

  if (!user) {
    return <Welcome onLogin={handleLogin} isLoading={!isGoogleReady} />;
  }

  const renderView = () => {
    if (view === 'READING' && selectedEmailId) {
      const email = emails.find(e => e.id === selectedEmailId);
      if (!email) return <div>E-mail não encontrado</div>;
      return (
        <EmailReader
          email={email}
          onBack={() => setView('INBOX')}
          onToggleRead={handleToggleRead}
          aiConfig={aiConfig}
          onOpenAiSettings={() => setView('SETTINGS')}
        />
      );
    }
    if (view === 'SENDERS') {
      return (
        <SenderManager
          senders={senders}
          onAddSender={handleAddSender}
          onRemoveSender={handleRemoveSender}
          onClose={() => setView('INBOX')}
        />
      );
    }
    if (view === 'SETTINGS') {
      return (
        <AiSettings
          config={aiConfig}
          onSave={handleSaveAiConfig}
          onClose={() => setView('INBOX')}
        />
      );
    }
    if (view === 'PROFILE') {
      return (
        <Profile
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onThemeChange={(t) => {
            const updated = { ...user, theme: t };
            setUser(updated);
            saveUserLocal(updated);
          }}
          onOpenAiSettings={() => setView('SETTINGS')}
          onClose={() => setView('INBOX')}
        />
      );
    }
    return (
      <EmailList
        emails={emails}
        onSelectEmail={handleSelectEmail}
        filterUnread={filterUnread}
        onToggleFilter={() => setFilterUnread(!filterUnread)}
        onSummarizeDay={handleSummarizeDay}
        onLoadMore={handleLoadMore}
        hasMore={Boolean(pageToken) && !reachedEnd}
        isLoadingMore={isLoadingMore}
      />
    );
  };

  return (
    <div className="max-w-md mx-auto h-full bg-white dark:bg-gray-900 shadow-xl overflow-hidden relative flex flex-col transition-colors duration-200">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>

      {view === 'INBOX' && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2 pb-6 flex justify-around items-center transition-colors duration-200 z-10">
          <button onClick={() => setView('SENDERS')} className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-blue-600">
            <Settings size={20} />
            <span className="text-[10px] font-medium">Fontes</span>
          </button>

          <button onClick={handleGmailSync} disabled={isSyncing} className={`flex flex-col items-center gap-1 p-2 ${isSyncing ? 'text-blue-600' : 'text-gray-400'}`}>
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-medium">{isSyncing ? 'Buscando...' : 'Sincronizar'}</span>
          </button>

          <button onClick={() => setView('PROFILE')} className="flex flex-col items-center gap-1 p-2 text-blue-600">
            <UserIcon size={20} />
            <span className="text-[10px] font-medium">Perfil</span>
          </button>
        </div>
      )}

      {/* Daily Digest Modal / Loader */}
      {(isSummarizingDay || dailyDigest) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSummarizingDay && setDailyDigest(null)} />

          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] p-6 pt-2 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto my-4" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                  <Sparkles size={20} className="text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resumo do Dia</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dailyDigest ? new Date(dailyDigest.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Processando...'}
                  </p>
                </div>
              </div>
              <button
                disabled={isSummarizingDay}
                onClick={() => setDailyDigest(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-[200px] max-h-[60vh] overflow-y-auto no-scrollbar mb-8">
              {isSummarizingDay ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Curando suas notícias...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Isso pode levar alguns segundos.</p>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700 dark:text-gray-300 bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-50 dark:border-blue-800/50">
                  {dailyDigest?.text}
                </div>
              )}
            </div>

            {!isSummarizingDay && (
              <button
                onClick={() => setDailyDigest(null)}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold transition-transform active:scale-95 shadow-xl"
              >
                Fechar Digest
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
