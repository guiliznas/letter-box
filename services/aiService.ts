import { AiConfig, AiProvider, EmailItem } from '../types';

export class MissingAiConfigError extends Error {
  constructor() {
    super('Nenhum provider de IA configurado.');
    this.name = 'MissingAiConfigError';
  }
}

interface ProviderSpec {
  label: string;
  defaultModel: string;
  keyUrl: string;
  keyPlaceholder: string;
}

export const PROVIDERS: Record<AiProvider, ProviderSpec> = {
  anthropic: {
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-sonnet-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza...',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-...',
  },
};

interface CompletionRequest {
  system: string;
  prompt: string;
  temperature: number;
}

const describeHttpError = async (response: Response): Promise<string> => {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.error?.message || body?.message || '';
  } catch {
    detail = '';
  }

  if (response.status === 401 || response.status === 403) {
    return 'Chave de API inválida ou sem permissão. Confira em Configurações.';
  }
  if (response.status === 429) {
    return 'Limite de uso atingido no provider. Tente novamente em instantes.';
  }
  if (response.status === 402) {
    return 'Sem créditos disponíveis nessa conta.';
  }
  return detail || `Falha na chamada ao provider (HTTP ${response.status}).`;
};

const callAnthropic = async (config: AiConfig, req: CompletionRequest): Promise<string> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      // Sem este header a Anthropic bloqueia chamadas feitas direto do browser.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1500,
      temperature: req.temperature,
      system: req.system,
      messages: [{ role: 'user', content: req.prompt }],
    }),
  });

  if (!response.ok) throw new Error(await describeHttpError(response));

  const data = await response.json();
  return data?.content?.find((part: any) => part.type === 'text')?.text || '';
};

const callOpenAiCompatible = async (
  config: AiConfig,
  req: CompletionRequest,
  endpoint: string
): Promise<string> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: req.temperature,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(await describeHttpError(response));

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};

const callGemini = async (config: AiConfig, req: CompletionRequest): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model
  )}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
      generationConfig: { temperature: req.temperature },
    }),
  });

  if (!response.ok) throw new Error(await describeHttpError(response));

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
};

const complete = async (config: AiConfig | null, req: CompletionRequest): Promise<string> => {
  if (!config?.apiKey) throw new MissingAiConfigError();

  const model = config.model || PROVIDERS[config.provider].defaultModel;
  const resolved: AiConfig = { ...config, model };

  switch (resolved.provider) {
    case 'anthropic':
      return callAnthropic(resolved, req);
    case 'openai':
      return callOpenAiCompatible(resolved, req, 'https://api.openai.com/v1/chat/completions');
    case 'openrouter':
      return callOpenAiCompatible(resolved, req, 'https://openrouter.ai/api/v1/chat/completions');
    case 'gemini':
      return callGemini(resolved, req);
  }
};

export const testConnection = async (config: AiConfig): Promise<string> => {
  const text = await complete(config, {
    system: 'Você responde em uma única palavra.',
    prompt: 'Responda apenas: ok',
    temperature: 0,
  });
  return text.trim() || 'ok';
};

export const summarizeNewsletter = async (
  config: AiConfig | null,
  title: string,
  content: string
): Promise<string> => {
  const text = await complete(config, {
    system:
      'Você é um assistente de leitura produtiva. Seu objetivo é extrair o valor real de newsletters longas, removendo anúncios e introduções irrelevantes.',
    prompt: `Resuma esta newsletter intitulada "${title}" em no máximo 4 tópicos curtos e impactantes. Use emojis relacionados aos temas.\n\nConteúdo: ${content.substring(
      0,
      15000
    )}`,
    temperature: 0.7,
  });

  return text || 'Não foi possível extrair um resumo deste conteúdo.';
};

export const summarizeDailyDigest = async (
  config: AiConfig | null,
  date: string,
  emails: EmailItem[]
): Promise<string> => {
  if (emails.length === 0) return 'Nenhum e-mail encontrado para esta data.';

  const emailsContent = emails
    .map((e, i) => `[Email ${i + 1}] Assunto: ${e.subject}\nConteúdo: ${e.bodyText}`)
    .join('\n\n---\n\n');

  const text = await complete(config, {
    system:
      "Você é um curador de conteúdo sênior. Sua missão é fazer o usuário economizar tempo, entregando apenas o 'suco' das notícias do dia em um formato digestível e elegante.",
    prompt: `Crie um resumo executivo de todas as newsletters recebidas no dia ${date}.
Organize por temas principais. Para cada tema, sintetize o que há de mais importante vindo dos diferentes e-mails.
Use um tom profissional, porém engajador. Use emojis.

E-mails do dia:\n${emailsContent.substring(0, 20000)}`,
    temperature: 0.5,
  });

  return text || 'Não foi possível gerar o resumo diário.';
};
