import { expect, test } from '@playwright/test';

/**
 * Walks the path a new user actually takes: sign up, add a client, open a
 * project, invoice it, send it, get paid. Needs a running database.
 */
test('a new studio can go from sign-up to a paid invoice', async ({ page }) => {
  const stamp = Date.now();
  const email = `owner-${stamp}@example.com`;

  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Nadia Rahman');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/clients');
  await page.getByLabel('Name').fill('Marina Events');
  await page.getByRole('button', { name: 'Add client' }).click();
  await expect(page.getByText('Marina Events')).toBeVisible();

  await page.goto('/projects');
  await page.getByLabel('Project name').fill('Autumn gala film');
  await page.getByLabel('Value').fill('12000');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText('Autumn gala film')).toBeVisible();

  await page.goto('/invoices/new');
  await page.getByLabel('Line 1 description').fill('Full day film crew');
  await page.getByLabel('Line 1 unit price').fill('12000');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as sent' }).click();
  await expect(page.getByRole('button', { name: 'Record payment' })).toBeVisible();

  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Settled in full.')).toBeVisible();
});
