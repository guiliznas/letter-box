import React, { useState } from 'react';
import { AiConfig, AiProvider } from '../types';
import { PROVIDERS, testConnection } from '../services/aiService';
import { Check, Eye, EyeOff, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface AiSettingsProps {
  config: AiConfig | null;
  onSave: (config: AiConfig | null) => void;
  onClose: () => void;
}

type TestState = { status: 'idle' | 'testing' | 'ok' | 'error'; message?: string };

export const AiSettings: React.FC<AiSettingsProps> = ({ config, onSave, onClose }) => {
  const [provider, setProvider] = useState<AiProvider>(config?.provider || 'anthropic');
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [model, setModel] = useState(config?.model || PROVIDERS[config?.provider || 'anthropic'].defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });

  const spec = PROVIDERS[provider];

  const handleProviderChange = (next: AiProvider) => {
    setProvider(next);
    setModel(PROVIDERS[next].defaultModel);
    setTest({ status: 'idle' });
  };

  const handleTest = async () => {
    setTest({ status: 'testing' });
    try {
      await testConnection({ provider, apiKey: apiKey.trim(), model: model.trim() || spec.defaultModel });
      setTest({ status: 'ok', message: 'Conexão funcionando.' });
    } catch (err) {
      setTest({ status: 'error', message: err instanceof Error ? err.message : 'Falha no teste.' });
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      onSave(null);
    } else {
      onSave({ provider, apiKey: trimmed, model: model.trim() || spec.defaultModel });
    }
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Inteligência Artificial</h2>
        <button onClick={handleSave} className="text-blue-600 dark:text-blue-400 font-medium text-sm">
          Salvar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Os resumos usam a sua própria chave de API. Ela fica salva apenas neste dispositivo e não é
          enviada para nenhum servidor além do provider escolhido.
        </p>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Provider</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PROVIDERS) as AiProvider[]).map((key) => (
              <button
                key={key}
                onClick={() => handleProviderChange(key)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  provider === key
                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                    : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                <span className="text-xs font-medium">{PROVIDERS[key].label}</span>
                {provider === key && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Chave de API</h3>
            <a
              href={spec.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"
            >
              Obter chave <ExternalLink size={12} />
            </a>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTest({ status: 'idle' });
              }}
              placeholder={spec.keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 pr-10 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
              aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Modelo</h3>
          <input
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setTest({ status: 'idle' });
            }}
            placeholder={spec.defaultModel}
            spellCheck={false}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            Padrão: {spec.defaultModel}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || test.status === 'testing'}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {test.status === 'testing' ? <Loader2 size={16} className="animate-spin" /> : null}
            Testar conexão
          </button>

          {test.status === 'ok' && (
            <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
              <Check size={14} className="mt-0.5 flex-shrink-0" />
              <span>{test.message}</span>
            </div>
          )}
          {test.status === 'error' && (
            <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{test.message}</span>
            </div>
          )}
        </div>

        {config && (
          <button
            onClick={() => {
              onSave(null);
              onClose();
            }}
            className="w-full text-sm text-red-600 dark:text-red-400 py-3"
          >
            Remover chave deste dispositivo
          </button>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-medium"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};
