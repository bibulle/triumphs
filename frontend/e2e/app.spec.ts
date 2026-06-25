import { test, expect } from './fixtures';

test.describe('Page load', () => {
  test('renders the page title and eyebrow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Triomphes');
    await expect(page.getByText(/Destiny 2 · Tracker de triomphes/i)).toBeVisible();
  });

  test('shows total triumph count in the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('204 triomphes')).toBeVisible();
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
  test('Triomphes tab is active on load', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('nav button');
    await expect(tabs.first()).toContainText('Triomphes');
    await expect(tabs.first()).toHaveClass(/active/);
  });

  test('clicking Titres switches section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Titres/i }).click();
    await expect(page.locator('h1')).toHaveText('Titres');
  });

  test('no "à venir" badges (all sections have data)', async ({ page }) => {
    await page.goto('/');
    const badges = page.locator('nav').getByText('à venir');
    await expect(badges).toHaveCount(0);
  });

  test('switching back to Triomphes restores the table', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Titres/i }).click();
    await page.getByRole('button', { name: /Triomphes/i }).click();
    await expect(page.getByPlaceholder(/Rechercher/i)).toBeVisible();
  });
});

test.describe('Toolbar — search', () => {
  test('search input is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/Rechercher/i)).toBeVisible();
  });

  test('filtering by "Le Monument" shows that triumph', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Rechercher/i).fill('Le Monument');
    // The triumph title "Le Monument" should be visible in an item row
    const titleCells = page.locator('[class*="titleFr"]');
    await expect(titleCells.filter({ hasText: 'Le Monument' }).first()).toBeVisible();
  });

  test('filtering with no match hides all item rows', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Rechercher/i).fill('zzz_no_match_zzz');
    await expect(page.locator('[class*="itemRow"]')).toHaveCount(0);
  });

  test('clearing search restores item rows', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/Rechercher/i).fill('zzz_no_match_zzz');
    await page.getByPlaceholder(/Rechercher/i).fill('');
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });
});

test.describe('Toolbar — collapse / expand', () => {
  test('"Tout replier" hides all triumph rows', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout replier' }).click();
    await expect(page.locator('[class*="itemRow"]')).toHaveCount(0);
  });

  test('"Tout déplier" after collapse shows triumphs again', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Tout replier' }).click();
    await page.getByRole('button', { name: 'Tout déplier' }).click();
    await expect(page.locator('[class*="itemRow"]').first()).toBeVisible();
  });

  test('clicking a group row collapses it', async ({ page }) => {
    await page.goto('/');
    // Wait for items to render before counting
    await page.locator('[class*="itemRow"]').first().waitFor();
    const before = await page.locator('[class*="itemRow"]').count();
    expect(before).toBeGreaterThan(0);
    await page.locator('[class*="groupRow"]').first().click();
    const after = await page.locator('[class*="itemRow"]').count();
    expect(after).toBeLessThan(before);
  });

  test('clicking a collapsed group row expands it', async ({ page }) => {
    await page.goto('/');
    const firstGroupRow = page.locator('[class*="groupRow"]').first();
    await page.locator('[class*="itemRow"]').first().waitFor();
    const before = await page.locator('[class*="itemRow"]').count();
    await firstGroupRow.click(); // collapse
    await firstGroupRow.click(); // expand
    const after = await page.locator('[class*="itemRow"]').count();
    expect(after).toBe(before);
  });
});

test.describe('Toolbar — hide done', () => {
  test('"Masquer terminés" hides allDone rows', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[class*="allDone"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Masquer terminés' }).click();
    await expect(page.locator('[class*="allDone"]')).toHaveCount(0);
  });

  test('"Afficher terminés" restores allDone rows', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Masquer terminés' }).click();
    await page.getByRole('button', { name: 'Afficher terminés' }).click();
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
    await page.locator('button', { hasText: /Sombre/i }).click();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('light');
    await expect(page.locator('button', { hasText: /Clair/i })).toBeVisible();
  });

  test('toggling twice returns to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: /Sombre/i }).click();
    await page.locator('button', { hasText: /Clair/i }).click();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBeNull();
  });

  test('theme preference is persisted across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.locator('button', { hasText: /Sombre/i }).click();
    await page.reload();
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('light');
  });
});

test.describe('Status badges', () => {
  test('first triumph row is marked allDone (demo)', async ({ page }) => {
    await page.goto('/');
    const allDoneRow = page.locator('[class*="allDone"]').first();
    await expect(allDoneRow).toBeVisible();
    await expect(allDoneRow.getByText('COMPLET')).toBeVisible();
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
    await expect(page.getByPlaceholder(/Rechercher/i)).toBeVisible();
  });
});
