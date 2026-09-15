import { expect, Page } from '@playwright/test';

export const PAGE_SIZE = 20;
export const REGISTERED_EMAILS = 45 * 3;

export type AiCall = { provider: string; url: string; headers: Record<string, string>; body: any };

export async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar com Google' }).click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
}

export async function sync(page: Page) {
  await page.getByRole('button', { name: /Sincronizar|Buscando/ }).click();
  await expect(page.getByRole('button', { name: 'Sincronizar' })).toBeVisible();
}

export const emailRows = (page: Page) => page.locator('button:has(h3)');

export async function scrollListToBottom(page: Page) {
  await page
    .locator('.overflow-y-auto')
    .first()
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
}

export async function scrollUntilEnd(page: Page) {
  const end = page.getByText('Você chegou ao fim.');
  for (let i = 0; i < 20 && !(await end.isVisible()); i++) {
    await scrollListToBottom(page);
    await page.waitForTimeout(700);
  }
  await expect(end).toBeVisible();
}

export const gmailCalls = (page: Page) =>
  page.evaluate(() => window.__letterboxMock.gmailCalls as { senderEmails: string[]; pageToken: string | null }[]);

export const aiCalls = (page: Page) =>
  page.evaluate(() => window.__letterboxMock.aiCalls as AiCall[]);

export async function openAiSettings(page: Page) {
  await page.getByRole('button', { name: 'Perfil' }).click();
  await page.getByRole('button', { name: 'Inteligência Artificial' }).click();
  await expect(page.getByRole('heading', { name: 'Inteligência Artificial' })).toBeVisible();
}

export const apiKeyInput = (page: Page) => page.locator('input[autocomplete="off"]');

export async function configureAi(page: Page, providerLabel: string, key: string) {
  await openAiSettings(page);
  await page.getByRole('button', { name: providerLabel }).click();
  await apiKeyInput(page).fill(key);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
}

export async function openFirstEmail(page: Page) {
  await emailRows(page).first().click();
  await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();
}
