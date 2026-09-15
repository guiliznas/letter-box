# 🧪 Guia de Testes - LetterBox

## Ambiente mock (sem credenciais)

```bash
npm run dev:mock
```

Sobe o app em `http://localhost:3000` com todos os serviços externos simulados — dá para usar o app inteiro sem Firebase, Gmail ou chave de IA. Um selo **MODO MOCK** aparece no topo da tela.

| Serviço | Mock | O que simula |
|---|---|---|
| Firebase Auth | `mocks/firebase.ts` | "Começar com Google" loga na hora com um usuário de teste |
| Firestore | `mocks/firebase.ts` | Fontes salvas no `localStorage`, já com 3 newsletters cadastradas |
| Gmail | `mocks/googleService.ts` | Caixa com 135 newsletters (7 páginas) + 20 e-mails de um remetente não cadastrado, que não devem aparecer |
| Providers de IA | `mocks/setup.ts` | Intercepta o `fetch` para Claude, OpenAI, Gemini e OpenRouter e devolve um resumo falso |

O `services/aiService.ts` roda de verdade no modo mock — só a rede é falsa. Para simular erros, use chaves que contenham:

- `invalid` → 401 (chave inválida)
- `ratelimit` → 429 (limite de uso)
- `semcredito` → 402 (sem créditos)

Para zerar o estado, limpe o `localStorage` e o IndexedDB do `localhost` (DevTools → Application → Clear site data).

A troca é feita por um plugin no `vite.config.ts`, ativo só com `--mode mock`. O build de produção não inclui nenhum código de mock.

## Testes unitários (Vitest)

```bash
npm run test         # watch
npm run test:run     # uma execução
```

Ficam em `tests/` (`*.test.tsx`), com React Testing Library em `jsdom`.

## Testes E2E (Playwright)

```bash
npx playwright install chromium   # só na primeira vez
npm run test:e2e
npx playwright test e2e/inbox.spec.ts          # um arquivo
npx playwright test --ui                        # modo interativo
```

Ficam em `e2e/` e rodam contra o ambiente mock, num viewport de celular (Pixel 7). O Playwright sobe o servidor sozinho na porta 4174; se já houver um rodando, ele reaproveita.

Os testes leem `window.__letterboxMock` para verificar o que o app enviou de fato: `aiCalls` (URL, headers e corpo de cada chamada de IA) e `gmailCalls` (remetentes e `pageToken` de cada página buscada).

**Cobertura atual:** login/logout, sincronização, filtro por remetente, scroll infinito até o fim sem duplicar, leitura offline após reload, status de lido, gerenciamento de fontes, e toda a configuração de IA — cada provider, erros e onde a chave é guardada.
