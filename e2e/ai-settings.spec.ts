import { test, expect } from '@playwright/test';
import {
  aiCalls,
  apiKeyInput,
  configureAi,
  login,
  openAiSettings,
  openFirstEmail,
  sync,
} from './helpers';

const KEY = 'sk-e2e-chave-de-teste-1234567890';

test.beforeEach(async ({ page }) => {
  await login(page);
  await sync(page);
});

test.describe('sem chave configurada', () => {
  test('"Resumir" no leitor leva para as configurações', async ({ page }) => {
    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();

    await expect(page.getByRole('heading', { name: 'Inteligência Artificial' })).toBeVisible();
    expect(await aiCalls(page)).toHaveLength(0);
  });

  test('"Resumir Dia" leva para as configurações', async ({ page }) => {
    await page.getByRole('button', { name: 'Resumir Dia' }).click();

    await expect(page.getByRole('heading', { name: 'Inteligência Artificial' })).toBeVisible();
  });
});

test.describe('tela de configurações', () => {
  test('trocar provider atualiza o modelo padrão', async ({ page }) => {
    await openAiSettings(page);
    const model = page.getByPlaceholder(/claude-sonnet-5|gpt-4o-mini|gemini-2.5-flash|openai\/gpt-4o-mini/);

    await expect(model).toHaveValue('claude-sonnet-5');
    for (const [label, expected] of [
      ['OpenAI', 'gpt-4o-mini'],
      ['Google Gemini', 'gemini-2.5-flash'],
      ['OpenRouter', 'openai/gpt-4o-mini'],
      ['Claude (Anthropic)', 'claude-sonnet-5'],
    ]) {
      await page.getByRole('button', { name: label }).click();
      await expect(model).toHaveValue(expected);
    }
  });

  test('chave começa mascarada e "Testar conexão" exige chave', async ({ page }) => {
    await openAiSettings(page);
    const testButton = page.getByRole('button', { name: 'Testar conexão' });

    await expect(testButton).toBeDisabled();
    await apiKeyInput(page).fill(KEY);
    await expect(testButton).toBeEnabled();

    await expect(apiKeyInput(page)).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar chave' }).click();
    await expect(apiKeyInput(page)).toHaveAttribute('type', 'text');
  });

  test('testar conexão com sucesso', async ({ page }) => {
    await openAiSettings(page);
    await apiKeyInput(page).fill(KEY);
    await page.getByRole('button', { name: 'Testar conexão' }).click();

    await expect(page.getByText('Conexão funcionando.')).toBeVisible();
  });

  for (const [key, message] of [
    ['sk-invalid-key', 'Chave de API inválida ou sem permissão. Confira em Configurações.'],
    ['sk-ratelimit-key', 'Limite de uso atingido no provider. Tente novamente em instantes.'],
    ['sk-semcredito-key', 'Sem créditos disponíveis nessa conta.'],
  ]) {
    test(`erro do provider exibe mensagem: ${message}`, async ({ page }) => {
      await openAiSettings(page);
      await apiKeyInput(page).fill(key);
      await page.getByRole('button', { name: 'Testar conexão' }).click();

      await expect(page.getByText(message)).toBeVisible();
    });
  }

  test('configuração persiste no dispositivo, nunca no Firestore, e pode ser removida', async ({ page }) => {
    await configureAi(page, 'OpenAI', KEY);

    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('letterbox_ai_config') || 'null')),
    ).toEqual({ provider: 'openai', apiKey: KEY, model: 'gpt-4o-mini' });

    const firestore = await page.evaluate(() => localStorage.getItem('letterbox_mock_firestore') || '');
    expect(firestore).not.toContain(KEY);

    await page.reload();
    await openAiSettings(page);
    await expect(apiKeyInput(page)).toHaveValue(KEY);

    await page.getByRole('button', { name: 'Remover chave deste dispositivo' }).click();
    expect(await page.evaluate(() => localStorage.getItem('letterbox_ai_config'))).toBeNull();
  });
});

test.describe('chamadas a cada provider', () => {
  test('Claude: headers da Anthropic e acesso direto pelo browser', async ({ page }) => {
    await configureAi(page, 'Claude (Anthropic)', KEY);
    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();

    await expect(page.getByText('resumo gerado pelo mock — anthropic')).toBeVisible();

    const [call] = await aiCalls(page);
    expect(call.url).toBe('https://api.anthropic.com/v1/messages');
    expect(call.headers['x-api-key']).toBe(KEY);
    expect(call.headers['anthropic-version']).toBe('2023-06-01');
    expect(call.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(call.body.model).toBe('claude-sonnet-5');
    expect(call.body.system).toBeTruthy();
  });

  test('OpenAI: Bearer e chat completions', async ({ page }) => {
    await configureAi(page, 'OpenAI', KEY);
    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();

    await expect(page.getByText('resumo gerado pelo mock — openai')).toBeVisible();

    const [call] = await aiCalls(page);
    expect(call.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(call.headers['authorization']).toBe(`Bearer ${KEY}`);
    expect(call.body.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
  });

  test('OpenRouter: formato OpenAI com endpoint próprio', async ({ page }) => {
    await configureAi(page, 'OpenRouter', KEY);
    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();

    await expect(page.getByText('resumo gerado pelo mock — openrouter')).toBeVisible();

    const [call] = await aiCalls(page);
    expect(call.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(call.headers['authorization']).toBe(`Bearer ${KEY}`);
    expect(call.body.model).toBe('openai/gpt-4o-mini');
  });

  test('Gemini: chave no header, nunca na URL', async ({ page }) => {
    await configureAi(page, 'Google Gemini', KEY);
    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();

    await expect(page.getByText('resumo gerado pelo mock — gemini')).toBeVisible();

    const [call] = await aiCalls(page);
    expect(call.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect(call.url).not.toContain(KEY);
    expect(call.headers['x-goog-api-key']).toBe(KEY);
  });

  test('modelo customizado é enviado ao provider', async ({ page }) => {
    await openAiSettings(page);
    await apiKeyInput(page).fill(KEY);
    await page.getByPlaceholder('claude-sonnet-5').fill('claude-haiku-4-5');
    await page.getByRole('button', { name: 'Salvar' }).click();

    await openFirstEmail(page);
    await page.getByRole('button', { name: 'Resumir' }).click();
    await expect(page.getByText('resumo gerado pelo mock — anthropic')).toBeVisible();

    expect((await aiCalls(page))[0].body.model).toBe('claude-haiku-4-5');
  });
});

test('resumo do dia envia os e-mails da data escolhida', async ({ page }) => {
  await configureAi(page, 'Claude (Anthropic)', KEY);

  const today = await page.evaluate(() => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 10));
  await page.locator('input[type="date"]').fill(today);
  await page.getByRole('button', { name: 'Resumir Dia' }).click();

  await expect(page.getByText(/Resumo de \d+ newsletter\(s\)/)).toBeVisible();

  const [call] = await aiCalls(page);
  expect(call.body.messages[0].content).toContain(today);
  expect(call.body.messages[0].content).toMatch(/\[Email 1\]/);
});
