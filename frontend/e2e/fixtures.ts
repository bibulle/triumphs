import { test as base, type Page } from '@playwright/test';
import { TRIUMPHS, getMockProgress } from '../../backend/src/data/mock';

async function mockApi(page: Page) {
  await page.route('/api/triumphs', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(TRIUMPHS) })
  );
  await page.route('/api/progress', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(getMockProgress()) })
  );
}

export const test = base.extend<{ mockApi: void }>({
  mockApi: [async ({ page }, use) => {
    await mockApi(page);
    await use();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
