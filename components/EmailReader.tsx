import React, { useState } from 'react';
import { EmailItem } from '../types';
import { ArrowLeft, CheckCircle, Circle, MoreHorizontal, Sparkles, X, Loader2 } from 'lucide-react';
import { summarizeNewsletter } from '../services/geminiService';

interface EmailReaderProps {
  email: EmailItem;
  onBack: () => void;
  onToggleRead: (id: string) => void;
}

export const EmailReader: React.FC<EmailReaderProps> = ({ email, onBack, onToggleRead }) => {
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSummarize = async () => {
    setShowSummary(true);
    if (summaryText) return; // Já temos o resumo

    setIsSummarizing(true);
    try {
      // Usamos o text body ou strip de HTML se necessário
      const textToSummarize = email.bodyText || email.bodyHtml.replace(/<[^>]*>?/gm, '');
      const result = await summarizeNewsletter(email.subject, textToSummarize);
      setSummaryText(result);
    } catch (err) {
      setSummaryText("Erro ao gerar o resumo. Tente novamente mais tarde.");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200 relative">
      {/* Navbar */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 transition-colors duration-200">
        <div className="flex items-center gap-1">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={handleSummarize}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-100 dark:border-blue-800"
          >
            <Sparkles size={14} className="fill-current" />
            <span>Resumir</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
           <button 
            onClick={() => onToggleRead(email.id)}
            className={`p-2 rounded-full transition-colors ${
              email.isRead 
                ? 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800' 
                : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
            }`}
          >
            {email.isRead ? <CheckCircle size={20} /> : <Circle size={20} />}
          </button>
          <button className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{email.subject}</h1>
          
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full ${email.avatarColor} flex items-center justify-center text-white font-bold`}>
              {email.senderName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-200">{email.senderName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(email.receivedAt)}</p>
            </div>
          </div>
        </div>

        <div className="dark:text-gray-300">
          <div 
            className="prose prose-blue dark:prose-invert prose-img:rounded-xl max-w-none"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        </div>
      </div>

      {/* Summary Bottom Sheet Modal */}
      {showSummary && (
        <>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 transition-opacity animate-in fade-in"
            onClick={() => setShowSummary(false)}
          />
          
          {/* Modal Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-[32px] shadow-2xl z-30 p-6 pt-2 transition-transform animate-in slide-in-from-bottom duration-300 border-t border-gray-100 dark:border-gray-700">
            {/* Handle for dragging feel */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto my-4" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Sparkles size={18} className="text-white fill-current" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resumo Inteligente</h3>
              </div>
              <button 
                onClick={() => setShowSummary(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-[160px] mb-8">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse font-medium">Lendo entrelinhas...</p>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {summaryText ? (
                    <div className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-50 dark:border-blue-800">
                      {summaryText}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400">Clique para gerar um resumo.</p>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowSummary(false)}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold transition-transform active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
            >
              Entendido
            </button>
          </div>
        </>
      )}
    </div>
  );
};