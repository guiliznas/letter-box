import React, { useState, useEffect } from 'react';
import { AiConfig, EmailItem, Sender, ViewState, User, Theme } from './types';
import {
  loadEmailsLocal, saveEmailsLocal,
  loadSendersLocal, saveSendersLocal,
  loadUserLocal, saveUserLocal,
  loadSendersFromCloud, removeSenderFromCloud,
  loadAiConfig, saveAiConfig
} from './services/storageService';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, signOut, GoogleAuthProvider } from './services/firebase';
import { initGoogleClient, fetchGmailMessages } from './services/googleService';
import { MissingAiConfigError, summarizeDailyDigest } from './services/aiService';
import { INITIAL_SENDERS } from './constants';
import { EmailList } from './components/EmailList';
import { SenderManager } from './components/SenderManager';
import { EmailReader } from './components/EmailReader';
import { Profile } from './components/Profile';
import { AiSettings } from './components/AiSettings';
import { Welcome } from './components/Welcome';
import { Settings, RefreshCw, User as UserIcon, X, Sparkles, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);

  const [view, setView] = useState<ViewState>('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  // Daily Digest State
  const [dailyDigest, setDailyDigest] = useState<{ date: string, text: string } | null>(null);
  const [isSummarizingDay, setIsSummarizingDay] = useState(false);

  // 1. Initialize data from LocalStorage
  useEffect(() => {
    setUser(loadUserLocal());
    setEmails(loadEmailsLocal());
    setSenders(loadSendersLocal());
    setAiConfig(loadAiConfig());
    initGoogleClient(() => setIsGoogleReady(true));
  }, []);

  // 2. Firebase Auth Listener
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

  // 3. Theme Management
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(user?.theme || 'system');
  }, [user?.theme]);

  // 4. Persistence
  useEffect(() => { saveEmailsLocal(emails); }, [emails]);
  useEffect(() => { saveSendersLocal(senders); }, [senders]);

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    setView('READING');
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
  };

  const handleToggleRead = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: !e.isRead } : e));
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
      // Filtrar e-mails da data selecionada
      const emailsOfToday = emails.filter(e => e.receivedAt.startsWith(dateStr));

      if (emailsOfToday.length === 0) {
        alert("Nenhum e-mail encontrado para esta data na sua lista local.");
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
      handleGmailSync();
    } catch (error) {
      console.error("Login Failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setEmails([]);
    setSenders(INITIAL_SENDERS);
    setView('INBOX');
  };

  const handleGmailSync = async () => {
    if (isSyncing || !user || !isGoogleReady) return;
    setIsSyncing(true);
    try {
      const newEmails = await fetchGmailMessages(30);
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const senderEmails = new Set(senders.map(s => s.email.toLowerCase()));
        const filteredNew = newEmails.filter(e => {
          return senderEmails.has(e.senderEmail.toLowerCase()) && !existingIds.has(e.id);
        });
        if (filteredNew.length === 0) return prev;
        return [...filteredNew, ...prev].sort((a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        ).slice(0, 100);
      });
    } catch (error) {
      console.error("Sync Failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) {
    return <Welcome onLogin={handleLogin} isLoading={!isGoogleReady} />;
  }

  const renderView = () => {
    if (view === 'READING' && selectedEmailId) {
      const email = emails.find(e => e.id === selectedEmailId);
      if (!email) return <div>Email não encontrado</div>;
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
      return <SenderManager senders={senders} onAddSender={(e, n) => {}} onRemoveSender={handleRemoveSender} onClose={() => setView('INBOX')} />;
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
          onThemeChange={(t) => setUser({...user, theme: t})}
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
      />
    );
  };

  const handleRemoveSender = async (email: string) => {
    setSenders(prev => prev.filter(s => s.email !== email));
    if (auth.currentUser) await removeSenderFromCloud(auth.currentUser.uid, email);
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
