import { test, expect } from '@playwright/test';
import {
  PAGE_SIZE,
  REGISTERED_EMAILS,
  emailRows,
  gmailCalls,
  login,
  scrollListToBottom,
  scrollUntilEnd,
  sync,
} from './helpers';

test.describe('login e sincronização', () => {
  test('login leva à inbox e sincronizar carrega a primeira página', async ({ page }) => {
    await login(page);
    await expect(page.getByText('No emails found')).toBeVisible();

    await sync(page);

    await expect(emailRows(page)).toHaveCount(PAGE_SIZE);
    const calls = await gmailCalls(page);
    expect(calls).toHaveLength(1);
    expect(calls[0].pageToken).toBeNull();
    expect(calls[0].senderEmails.sort()).toEqual(
      ['cooking@recipes.com', 'daily@finance.com', 'newsletter@techweekly.com'],
    );
  });

  test('só e-mails das fontes cadastradas aparecem', async ({ page }) => {
    await login(page);
    await sync(page);

    await expect(emailRows(page).first()).toBeVisible();
    await expect(page.getByText('Loja Promo')).toHaveCount(0);
  });

  test('logout limpa o cache local e volta para as boas-vindas', async ({ page }) => {
    await login(page);
    await sync(page);
    await expect(emailRows(page)).toHaveCount(PAGE_SIZE);

    await page.getByRole('button', { name: 'Perfil' }).click();
    await page.getByRole('button', { name: 'Disconnect Account' }).click();
    await expect(page.getByRole('button', { name: 'Começar com Google' })).toBeVisible();

    await page.getByRole('button', { name: 'Começar com Google' }).click();
    await expect(page.getByText('No emails found')).toBeVisible();
  });
});

test.describe('scroll infinito', () => {
  test('rolar até o fim carrega todas as páginas, sem duplicar', async ({ page }) => {
    await login(page);
    await sync(page);

    await scrollUntilEnd(page);

    await expect(emailRows(page)).toHaveCount(REGISTERED_EMAILS);

    const subjects = await page.locator('button:has(h3) h3').allTextContents();
    expect(new Set(subjects).size).toBe(subjects.length);

    const tokens = (await gmailCalls(page)).map((c) => c.pageToken);
    expect(tokens).toEqual([null, '20', '40', '60', '80', '100', '120']);
  });

  test('mostra carregamento enquanto busca a próxima página', async ({ page }) => {
    await login(page);
    await sync(page);

    await scrollListToBottom(page);
    await expect(page.getByText('Carregando mais e-mails...')).toBeVisible();
    await expect(emailRows(page)).toHaveCount(PAGE_SIZE * 2);
  });
});

test.describe('leitura offline', () => {
  test('e-mails e posição da paginação sobrevivem ao reload', async ({ page }) => {
    await login(page);
    await sync(page);
    await scrollListToBottom(page);
    await expect(emailRows(page)).toHaveCount(PAGE_SIZE * 2);

    await page.reload();

    // Sem sincronizar de novo: tudo vem do IndexedDB.
    await expect(emailRows(page)).toHaveCount(PAGE_SIZE * 2);
    expect(await gmailCalls(page)).toHaveLength(0);

    await scrollListToBottom(page);
    await expect(emailRows(page)).toHaveCount(PAGE_SIZE * 3);
    expect((await gmailCalls(page))[0].pageToken).toBe('40');
  });

  test('abre o e-mail sem nenhuma chamada ao Gmail depois do reload', async ({ page }) => {
    await login(page);
    await sync(page);
    const subject = await emailRows(page).first().locator('h3').textContent();

    await page.reload();
    await emailRows(page).first().click();

    await expect(page.getByRole('heading', { level: 1, name: subject! })).toBeVisible();
    expect(await gmailCalls(page)).toHaveLength(0);
  });

  test('status de lido persiste após reload', async ({ page }) => {
    await login(page);
    await sync(page);

    const first = emailRows(page).first();
    const subject = (await first.locator('h3').textContent())!;
    await expect(first.locator('h3')).toHaveClass(/font-semibold/);

    await first.click();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await page.reload();

    await expect(page.locator('button:has(h3)', { hasText: subject }).locator('h3')).not.toHaveClass(/font-semibold/);
  });
});

test.describe('fontes', () => {
  test('remover uma fonte tira o remetente da query do Gmail', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Fontes' }).click();
    await page
      .locator('div', { hasText: 'cooking@recipes.com' })
      .getByRole('button', { name: 'Remove sender' })
      .last()
      .click();
    await expect(page.getByText('cooking@recipes.com')).toHaveCount(0);
    await page.getByRole('button', { name: 'Done' }).click();

    await sync(page);
    const calls = await gmailCalls(page);
    expect(calls[0].senderEmails).not.toContain('cooking@recipes.com');
    await expect(page.getByText("Chef's Corner")).toHaveCount(0);
  });

  test('adicionar uma fonte persiste no Firestore e sobrevive ao reload', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Fontes' }).click();
    await page.getByPlaceholder('Sender Name').fill('Nova News');
    await page.getByPlaceholder('Sender Email').fill('Contato@NovaNews.com');
    await page.getByRole('button', { name: 'Add Sender' }).click();
    await expect(page.getByText('contato@novanews.com')).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Fontes' }).click();
    await expect(page.getByText('contato@novanews.com')).toBeVisible();
    await expect(page.getByText('Subscribed (4)')).toBeVisible();
  });

  test('adicionar fonte duplicada não cria outra entrada', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: 'Fontes' }).click();
    await page.getByPlaceholder('Sender Name').fill('Tech de novo');
    await page.getByPlaceholder('Sender Email').fill('NEWSLETTER@techweekly.com');
    await page.getByRole('button', { name: 'Add Sender' }).click();

    await expect(page.getByText('Subscribed (3)')).toBeVisible();
  });
});
