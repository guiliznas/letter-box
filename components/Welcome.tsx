import React from 'react';
import { Mail, ShieldCheck, Zap, Loader2 } from 'lucide-react';

interface WelcomeProps {
  onLogin: () => void;
  isLoading: boolean;
}

export const Welcome: React.FC<WelcomeProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="max-w-md mx-auto h-full bg-white dark:bg-gray-900 flex flex-col items-center justify-between p-8 text-center transition-colors duration-200">
      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        {/* Logo */}
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
          <Mail className="text-white w-10 h-10" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">LetterBox</h1>
          <p className="text-gray-500 dark:text-gray-400">Suas newsletters, sem distrações.</p>
        </div>

        {/* Value Props */}
        <div className="space-y-4 w-full text-left">
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
              <Zap className="text-blue-600 dark:text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Focado em Leitura</h4>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Layout limpo para você focar no que importa.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg">
              <ShieldCheck className="text-green-600 dark:text-green-400 w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Privacidade Total</h4>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Conectamos direto ao seu Gmail. Sem servidores intermediários.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4">
        <button
          onClick={onLogin}
          disabled={isLoading}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Começar com Google</span>
            </>
          )}
        </button>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Ao entrar, você concorda que o app acesse seus emails apenas para leitura local.
        </p>
      </div>
    </div>
  );
};