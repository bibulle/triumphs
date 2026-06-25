import { test, expect } from './fixtures';

test.describe('Page load', () => {
  test('renders the page title and eyebrow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Triunfos');
    await expect(page.locator('[class*="eyebrow"]')).toBeVisible();
  });

  test('shows total triumph count in the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('204 triunfos')).toBeVisible();
  });

  test('renders the leaderboard with all 3 players', async ({ page }) => {
    await page.goto('/');
    // Scope to the leaderboard section to avoid matching the table header
    const leaderboard = page.locator('[class*="leaderboard"]');
    await expect(leaderboard.getByText('Bibullus')).toBeVisible();
    await expect(leaderboard.getByText('Vincent')).toBeVisible();
    await expect(leaderboard.getByText('Guiz')).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Bungie/)).toBeVisible();
  });
});

  test('shows the app version in the eyebrow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[class*="version"]')).toBeVisible();
    await expect(page.locator('[class*="version"]')).toHaveText(/^v\d+\.\d+\.\d+$/);
  });

test.describe('Section tabs', () => {
  test('Triunfos tab is active on load', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('nav button');
    await expect(tabs.first()).toContainText('Triunfos');
    await expect(tabs.first()).toHaveClass(/active/);
  });

  test('clicking Títulos switches section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Títulos/i }).click();
    await expect(page.locator('h1')).toHaveText('Títulos');
  });

  test('no "em breve" badges (all sections have data)', async ({ page }) => {
    await page.goto('/');
    const badges = page.locator('nav').getByText('em breve');
    await expect(badges).toHaveCount(0);
  });

  test('switching back to Triunfos restores the table', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Títulos/i }).click();
    await page.getByRole('button', { name: /Triunfos/i }).click();
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible();
  });
});

test.describe('Toolbar — search', () => {
  test('search input is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible();
  });

  test('filtering by "Le Monument" shows that triumph', async ({ page }) => {
    await page.goto('/');
    // Expand first to make items visible, then filter
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await page.locator('[class*="itemRow"]').first().waitFor();
    await page.getByPlaceholder(/Pesquisar/i).fill('Le Monument');
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });

  test('filtering with no match hides all item rows', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Pesquisar/i).fill('zzz_no_match_zzz');
    await expect(page.locator('[class*="itemRow"]')).toHaveCount(0);
  });

  test('clearing search restores item rows', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await page.locator('[class*="itemRow"]').first().waitFor();
    await page.getByPlaceholder(/Pesquisar/i).fill('zzz_no_match_zzz');
    await page.getByPlaceholder(/Pesquisar/i).fill('');
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });
});

test.describe('Toolbar — collapse / expand', () => {
  test('"Recolher tudo" hides all triumph rows', async ({ page }) => {
    await page.goto('/');
    // Expand first, then collapse
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await page.locator('[class*="itemRow"]').first().waitFor();
    await page.getByRole('button', { name: 'Recolher tudo' }).click();
    await expect(page.locator('[class*="itemRow"]')).toHaveCount(0);
  });

  test('"Expandir tudo" opens the first group', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });

  test('clicking a group row expands it (accordion)', async ({ page }) => {
    await page.goto('/');
    // All groups start collapsed — click first to expand
    await page.locator('[class*="groupRow"]').first().click();
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });

  test('clicking an expanded group row collapses it', async ({ page }) => {
    await page.goto('/');
    const firstGroupRow = page.locator('[class*="groupRow"]').first();
    await firstGroupRow.click(); // expand
    await page.locator('[class*="itemRow"]').first().waitFor();
    await firstGroupRow.click(); // collapse
    await expect(page.locator('[class*="itemRow"]')).toHaveCount(0);
  });
});

test.describe('Toolbar — hide done', () => {
  test('"Ocultar concluídos" hides allDone rows', async ({ page }) => {
    await page.goto('/');
    // Expand first group to make rows visible
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await expect(page.locator('[class*="allDone"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Ocultar concluídos' }).click();
    await expect(page.locator('[class*="allDone"]')).toHaveCount(0);
  });

  test('"Mostrar concluídos" restores allDone rows', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    await page.locator('[class*="allDone"]').first().waitFor();
    await page.getByRole('button', { name: 'Ocultar concluídos' }).click();
    await page.getByRole('button', { name: 'Mostrar concluídos' }).click();
    await expect(page.locator('[class*="allDone"]').first()).toBeVisible();
  });
});

test.describe('Theme toggle', () => {
  test('starts in dark mode by default', async ({ page }) => {
    await page.goto('/');
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBeNull();
  });

  test('clicking theme button switches to light mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Changer de thème' }).click();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('light');
    await expect(page.getByRole('button', { name: 'Changer de thème' })).toBeVisible();
  });

  test('toggling twice returns to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Changer de thème' }).click();
    await page.getByRole('button', { name: 'Changer de thème' }).click();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBeNull();
  });

  test('theme preference is persisted across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Changer de thème' }).click();
    await page.reload();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('light');
  });
});

test.describe('Status badges', () => {
  test('first triumph row is marked allDone (demo)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Expandir tudo' }).click();
    const allDoneRow = page.locator('[class*="allDone"]').first();
    await expect(allDoneRow).toBeVisible();
    await expect(allDoneRow.getByText('COMPLETO')).toBeVisible();
  });

  test('status badges are not interactive (no pointer cursor)', async ({ page }) => {
    await page.goto('/');
    const badge = page.locator('[class*="status"]').first();
    const cursor = await badge.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).not.toBe('pointer');
  });
});

test.describe('Responsive layout', () => {
  test('renders correctly at 640px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible();
  });
});
