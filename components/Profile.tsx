import React, { useState } from 'react';
import { User, Theme } from '../types';
import { LogOut, User as UserIcon, Loader2, Moon, Sun, Monitor } from 'lucide-react';

interface ProfileProps {
  user: User | null;
  onLogin: () => Promise<void> | void; // Can be async now
  onLogout: () => void;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogin, onLogout, onClose, onThemeChange }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginClick = async () => {
    setIsLoading(true);
    try {
      await onLogin();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const ThemeOption = ({ theme, icon: Icon, label }: { theme: Theme, icon: any, label: string }) => (
    <button
      onClick={() => onThemeChange(theme)}
      className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
        user?.theme === theme 
          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' 
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      <Icon size={20} className="mb-2" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Profile</h2>
        <button onClick={onClose} className="text-blue-600 dark:text-blue-400 font-medium text-sm">Done</button>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
        {user ? (
          <div className="w-full max-w-sm">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold border-4 border-blue-50 dark:border-blue-900/50">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{user.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{user.email}</p>
            
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl text-sm font-medium mb-8 flex items-center justify-center gap-2 border border-green-100 dark:border-green-900/30">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Gmail Connected
            </div>

            <div className="w-full mb-8">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-left">App Theme</h4>
              <div className="flex gap-3">
                <ThemeOption theme="light" icon={Sun} label="Light" />
                <ThemeOption theme="dark" icon={Moon} label="Dark" />
                <ThemeOption theme="system" icon={Monitor} label="System" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              Disconnect Account
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400 dark:text-gray-500 border-4 border-gray-100 dark:border-gray-700">
               <UserIcon size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connect to Gmail</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
              Sign in to read your newsletters directly from your Gmail inbox.
              <br/>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-2 block">
                This runs entirely in your browser. No data is sent to external servers.
              </span>
            </p>

            <button
              onClick={handleLoginClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm relative overflow-hidden"
            >
              {isLoading ? (
                 <Loader2 size={20} className="animate-spin text-gray-500" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};