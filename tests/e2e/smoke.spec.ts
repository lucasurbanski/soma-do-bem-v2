import { test, expect } from '@playwright/test';

/**
 * Smoke e2e dos fluxos públicos principais. Requer o seed aplicado
 * (node --env-file=.env.local scripts/seed.mjs) e navegadores instalados.
 */

test('home carrega com hero e CTA', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('primeira contribuição');
  await expect(page.getByRole('link', { name: 'Dê o primeiro passo agora' }).first()).toBeVisible();
});

test('listagem de causas mostra vaquinhas e filtros', async ({ page }) => {
  await page.goto('/causes');
  await expect(page.getByRole('heading', { name: /Encontre uma vaquinha/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible();
});

test('página da vaquinha exibe progresso e CTA de contribuir', async ({ page }) => {
  await page.goto('/causes/tratamento-da-dona-marlene-4a1b2c3d');
  await expect(page.getByRole('link', { name: 'Quero contribuir' })).toBeVisible();
  await expect(page.getByText('Arrecadado')).toBeVisible();
});

test('rota protegida redireciona para login', async ({ page }) => {
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/login/);
});

test('usuário comum não acessa o admin', async ({ page }) => {
  await page.goto('/admin');
  // sem sessão: middleware redireciona ao login
  await expect(page).toHaveURL(/\/login/);
});
