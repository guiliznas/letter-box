import React, { useState, useEffect } from 'react';
import { AppState, EmailItem, Sender, ViewState, User, Theme } from './types';
import { loadEmails, loadSenders, loadUser, saveEmails, saveSenders, saveUser } from './services/storageService';
import { initGoogleClient, loginToGoogle, fetchGmailMessages } from './services/googleService';
import { COLORS } from './constants';
import { EmailList } from './components/EmailList';
import { SenderManager } from './components/SenderManager';
import { EmailReader } from './components/EmailReader';
import { Profile } from './components/Profile';
import { Welcome } from './components/Welcome';
import { Settings, RefreshCw, User as UserIcon } from 'lucide-react';

const App: React.FC = () => {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [user, setUser] = useState<User | null>(null);
  
  const [view, setView] = useState<ViewState>('INBOX');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);

  // Load initial data
  useEffect(() => {
    const storedUser = loadUser();
    setUser(storedUser);
    setEmails(loadEmails());
    setSenders(loadSenders());

    // Initialize Google API Client
    initGoogleClient(() => {
      console.log("Google API Client Initialized");
      setIsGoogleReady(true);
    });
  }, []);

  // Theme Management
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#111827');
      } else {
        document.documentElement.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');
      }
    };

    applyTheme(user?.theme || 'system');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (user?.theme === 'system' || !user?.theme) applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user?.theme]);

  // Persistence
  useEffect(() => { saveEmails(emails); }, [emails]);
  useEffect(() => { saveSenders(senders); }, [senders]);
  useEffect(() => { saveUser(user); }, [user]);

  // Actions
  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    setView('READING');
  };

  const handleToggleRead = (id: string) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: !e.isRead } : e));
  };

  const handleAddSender = (email: string, name: string) => {
    const newSender: Sender = {
      email,
      name,
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    setSenders(prev => [...prev, newSender]);
  };

  const handleRemoveSender = (email: string) => {
    setSenders(prev => prev.filter(s => s.email !== email));
  };

  const handleThemeChange = (theme: Theme) => {
    if (user) {
      setUser({ ...user, theme });
    }
  };

  const handleLogin = async () => {
    if (!isGoogleReady) {
      alert("Serviços do Google carregando... tente em instantes.");
      return;
    }

    try {
      const googleUser = await loginToGoogle();
      const userWithTheme = { ...googleUser, theme: user?.theme || 'system' };
      setUser(userWithTheme);
      setView('INBOX');
      handleGmailSync();
    } catch (error) {
      console.error("Login Failed", error);
      alert("Erro ao conectar com Google. Verifique o console.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setEmails([]); // Clear for privacy
    setView('INBOX'); // Reset to default view for next login
  };

  const handleGmailSync = async () => {
    if (isSyncing || !user || !isGoogleReady) return;
    setIsSyncing(true);

    try {
      const newEmails = await fetchGmailMessages(20);
      setEmails(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const uniqueNewEmails = newEmails.filter(e => !existingIds.has(e.id));
        return [...uniqueNewEmails, ...prev].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      });
    } catch (error) {
      console.error("Sync Failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Se não houver usuário, exibe tela de Welcome
  if (!user) {
    return <Welcome onLogin={handleLogin} isLoading={!isGoogleReady} />;
  }

  // View Routing
  const renderView = () => {
    if (view === 'READING' && selectedEmailId) {
      const email = emails.find(e => e.id === selectedEmailId);
      if (!email) return <div>Email não encontrado</div>;
      return (
        <EmailReader 
          email={email} 
          onBack={() => setView('INBOX')}
          onToggleRead={handleToggleRead}
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

    if (view === 'PROFILE') {
      return (
        <Profile 
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onThemeChange={handleThemeChange}
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
      />
    );
  };

  return (
    <div className="max-w-md mx-auto h-full bg-white dark:bg-gray-900 shadow-xl overflow-hidden relative flex flex-col transition-colors duration-200">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>

      {view === 'INBOX' && (
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2 flex justify-around items-center safe-area-pb transition-colors duration-200">
          <button 
            onClick={() => setView('SENDERS')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Fontes</span>
          </button>
          
          <button 
            onClick={handleGmailSync}
            disabled={isSyncing}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              isSyncing ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-medium">{isSyncing ? 'Buscando...' : 'Sincronizar'}</span>
          </button>

          <button 
            onClick={() => setView('PROFILE')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <UserIcon size={20} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Perfil</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;