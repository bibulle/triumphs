import { test as base, type Page } from '@playwright/test';
import { TRIUMPHS, getMockProgress, PLAYERS, PLAYER_TAG } from '../../backend/src/data/mock';

async function mockApi(page: Page) {
  await page.route('/api/triumphs', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(TRIUMPHS) })
  );
  await page.route('/api/nodes', route =>
    route.fulfill({ contentType: 'application/json', body: '[]' })
  );
  await page.route('/api/progress', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(getMockProgress()) })
  );
  await page.route('/api/players', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        PLAYERS.map(name => ({ name, tag: PLAYER_TAG[name as keyof typeof PLAYER_TAG] }))
      ),
    })
  );
  await page.route('/api/version', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: '0.0.0' }) })
  );
  await page.route('/api/annotations', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({}) })
  );
  await page.route('/api/annotations/*', route =>
    route.fulfill({ status: 200, body: '' })
  );
}

export const test = base.extend<{ mockApi: void }>({
  mockApi: [async ({ page }, use) => {
    await mockApi(page);
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
