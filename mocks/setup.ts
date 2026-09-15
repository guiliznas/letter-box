// Carregado antes do app no modo mock. Intercepta as chamadas aos providers de IA
// no fetch — o services/aiService.ts roda de verdade, só a rede é falsa.
//
// Chaves especiais para simular erros:
//   contém "invalid"    → 401
//   contém "ratelimit"  → 429
//   contém "semcredito" → 402

type AiCall = { provider: string; url: string; headers: Record<string, string>; body: any };

declare global {
  interface Window {
    __letterboxMock: { aiCalls: AiCall[]; gmailCalls: unknown[] };
  }
}

window.__letterboxMock = { aiCalls: [], gmailCalls: [] };

const LATENCY_MS = 700;

const PROVIDER_HOSTS: Record<string, string> = {
  'api.anthropic.com': 'anthropic',
  'api.openai.com': 'openai',
  'openrouter.ai': 'openrouter',
  'generativelanguage.googleapis.com': 'gemini',
};

const normalizeHeaders = (init?: RequestInit): Record<string, string> => {
  const out: Record<string, string> = {};
  new Headers(init?.headers).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
};

const promptOf = (provider: string, body: any): string => {
  if (provider === 'anthropic') return body?.messages?.[0]?.content ?? '';
  if (provider === 'gemini') return body?.contents?.[0]?.parts?.[0]?.text ?? '';
  return body?.messages?.find((m: any) => m.role === 'user')?.content ?? '';
};

const apiKeyOf = (provider: string, headers: Record<string, string>): string => {
  if (provider === 'anthropic') return headers['x-api-key'] ?? '';
  if (provider === 'gemini') return headers['x-goog-api-key'] ?? '';
  return (headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
};

const fakeCompletion = (prompt: string, provider: string): string => {
  if (prompt.includes('Responda apenas: ok')) return 'ok';

  if (prompt.includes('resumo executivo')) {
    const count = (prompt.match(/\[Email \d+\]/g) || []).length;
    return [
      `📬 Resumo de ${count} newsletter(s) — gerado pelo mock (${provider})`,
      '',
      '💻 Tecnologia: IA generativa e modelos locais seguem dominando a pauta.',
      '📈 Finanças: mercado atento a juros e resultados trimestrais.',
      '🍝 Culinária: receitas rápidas e fermentação natural em alta.',
    ].join('\n');
  }

  const title = prompt.match(/intitulada "([^"]+)"/)?.[1] ?? 'esta newsletter';
  return [
    `🧠 ${title}`,
    '• Ponto principal da edição, em uma frase.',
    '• O que muda na prática para quem lê.',
    '• O que acompanhar nos próximos dias.',
    `(resumo gerado pelo mock — ${provider})`,
  ].join('\n');
};

const responseBody = (provider: string, text: string) => {
  if (provider === 'anthropic') return { content: [{ type: 'text', text }] };
  if (provider === 'gemini') return { candidates: [{ content: { parts: [{ text }] } }] };
  return { choices: [{ message: { content: text } }] };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const realFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const provider = PROVIDER_HOSTS[new URL(url, location.href).host];
  if (!provider) return realFetch(input, init);

  const headers = normalizeHeaders(init);
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  window.__letterboxMock.aiCalls.push({ provider, url, headers, body });

  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const key = apiKeyOf(provider, headers);
  if (key.includes('invalid')) return json(401, { error: { message: 'invalid api key' } });
  if (key.includes('ratelimit')) return json(429, { error: { message: 'rate limited' } });
  if (key.includes('semcredito')) return json(402, { error: { message: 'no credits' } });

  return json(200, responseBody(provider, fakeCompletion(promptOf(provider, body), provider)));
};

const badge = document.createElement('div');
badge.textContent = 'MODO MOCK';
badge.setAttribute('aria-hidden', 'true');
badge.style.cssText =
  'position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:9999;pointer-events:none;' +
  'background:#f59e0b;color:#111;font:700 10px/1 system-ui;padding:3px 8px;border-radius:999px;letter-spacing:.05em;';
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(badge));

export {};
