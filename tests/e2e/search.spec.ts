import { expect, test } from '@playwright/test';
import type { Page, Request, Route } from '@playwright/test';

import { spain } from '../unit/fixtures/country-fixtures';

test('searches automatically, shows loading, clears old results immediately', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let pendingRoute: Route | undefined;

  await page.clock.install();
  await page.route('https://countries.dev/**', (route: Route): void => {
    pendingRoute = route;
  });
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Country name' }).fill('spain');

  await expect(page.getByTestId('country-card')).toHaveCount(0);
  await expect(page.getByRole('status')).not.toContainText('Searching');

  await page.clock.fastForward(300);
  await expect(page.getByRole('status')).toContainText('Searching');
  await expect.poll((): boolean => pendingRoute !== undefined).toBe(true);

  if (!pendingRoute) {
    throw new Error('Expected a pending search');
  }

  await pendingRoute.fulfill({ json: [spain] });
  await expect(page.getByTestId('country-card')).toContainText(['Spain']);
  await expect(page.getByTestId('country-card')).toContainText(['Madrid']);
  await page.getByRole('searchbox').fill('iceland');

  await expect(page.getByTestId('country-card')).toHaveCount(0);
  await expect(page.getByRole('status')).not.toContainText('Searching');
  await expect(page.getByRole('searchbox')).toBeFocused();

  await page.getByRole('searchbox').fill('');
  await page.clock.fastForward(1000);

  await expect(page.getByTestId('country-card')).toHaveCount(0);
});

test('aborts the obsolete request and keeps the latest result', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let obsoleteRoute: Route | undefined;
  const failedRequests: Request[] = [];

  page.on('requestfailed', (request: Request): void => {
    failedRequests.push(request);
  });
  await page.clock.install();
  await page.route(
    'https://countries.dev/**',
    async (route: Route): Promise<void> => {
      if (route.request().url().endsWith('/sp')) {
        obsoleteRoute = route;

        return;
      }

      await route.fulfill({ json: [spain] });
    },
  );
  await page.goto('/');
  await page.getByRole('searchbox').fill('sp');
  await page.clock.fastForward(300);
  await expect.poll((): boolean => obsoleteRoute !== undefined).toBe(true);
  await page.getByRole('searchbox').fill('spain');

  await expect
    .poll(
      (): number =>
        failedRequests.filter((request: Request): boolean =>
          request.url().endsWith('/sp'),
        ).length,
    )
    .toBe(1);

  await page.clock.fastForward(300);
  await expect(page.getByTestId('country-card')).toContainText(['Spain']);

  if (!obsoleteRoute) {
    throw new Error('Expected obsolete request');
  }

  await obsoleteRoute.fulfill({
    json: [{ ...spain, name: 'Obsolete country' }],
  });

  await expect(page.getByText('Obsolete country')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('distinguishes no matches from failures and retries once', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let requestCount: number = 0;

  await page.route(
    'https://countries.dev/**',
    async (route: Route): Promise<void> => {
      requestCount += 1;

      if (requestCount === 1) {
        await route.fulfill({ status: 404, body: 'No matches' });

        return;
      }

      if (requestCount === 2) {
        await route.abort('internetdisconnected');

        return;
      }

      await route.fulfill({ json: [spain] });
    },
  );
  await page.goto('/');
  await page.getByRole('searchbox').fill('missing');

  await expect(page.getByRole('status')).toContainText('No countries found');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeHidden();

  await page.getByRole('searchbox').fill('spain');

  await expect(page.getByRole('alert')).toContainText('connection');

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('country-card')).toContainText(['Spain']);

  expect(requestCount).toBe(3);
});

test('opens details by keyboard and restores focus on Escape', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  await page.route(
    'https://countries.dev/**',
    async (route: Route): Promise<void> => {
      await route.fulfill({ json: [spain] });
    },
  );
  await page.goto('/');
  await page.getByRole('searchbox').fill('spain');
  await page.getByTestId('country-card').focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('dialog')).toBeVisible();
  const detailLabels: string[] = [
    'Spain',
    'Area',
    'Borders',
    'Languages',
    'Currencies',
    'Overview',
  ];

  for (const detailLabel of detailLabels) {
    await expect(page.getByRole('dialog')).toContainText(detailLabel);
  }

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByTestId('country-card')).toBeFocused();
  await expect(page.getByRole('searchbox')).toHaveValue('spain');
});

for (let runIndex: number = 1; runIndex <= 10; runIndex += 1) {
  test(`renders settled results within 500 ms, run ${runIndex}`, async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    await page.route(
      'https://countries.dev/**',
      async (route: Route): Promise<void> => {
        await page.evaluate((): void => {
          const startedAtMs: number = performance.now();
          const observer: MutationObserver = new MutationObserver((): void => {
            if (!document.querySelector('[data-testid="country-card"]')) {
              return;
            }

            observer.disconnect();
            requestAnimationFrame((): void => {
              document.documentElement.dataset.renderMs = String(
                performance.now() - startedAtMs,
              );
            });
          });

          observer.observe(document.body, { childList: true, subtree: true });
        });
        await route.fulfill({ json: [spain] });
      },
    );
    await page.goto('/');
    await page.getByRole('searchbox').fill('spain');
    await expect(page.locator('html')).toHaveAttribute('data-render-ms', /\d/);

    const renderMs: number = Number(
      await page.locator('html').getAttribute('data-render-ms'),
    );

    expect(renderMs).toBeLessThanOrEqual(500);
    test
      .info()
      .annotations.push({ type: 'renderMs', description: String(renderMs) });
  });
}

test('shows timeout as a retryable failure rather than silent cancellation', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  await page.addInitScript((): void => {
    const createTimeoutSignal: typeof AbortSignal.timeout = AbortSignal.timeout;

    AbortSignal.timeout = (timeoutMs: number): AbortSignal =>
      createTimeoutSignal(Math.min(timeoutMs, 50));
  });
  await page.route('https://countries.dev/**', (): void => {
    /* Keep the response pending until timeout aborts fetch. */
  });
  await page.goto('/');
  await page.getByRole('searchbox').fill('spain');

  await expect(page.getByRole('alert')).toContainText('took too long');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(page.getByRole('status')).not.toContainText('Searching');
});

test('handles missing fields, failed flag images and untrusted country text', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  const countryName: string = '<b>Example Island</b>';

  await page.route(
    'https://countries.dev/**',
    async (route: Route): Promise<void> => {
      await route.fulfill({
        json: [
          {
            alpha3Code: 'TST',
            name: countryName,
            borders: [],
            population: 0,
            flags: { svg: 'https://example.com/flag.svg' },
          },
        ],
      });
    },
  );
  await page.route(
    'https://example.com/**',
    async (route: Route): Promise<void> => {
      await route.abort();
    },
  );
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('searchbox').fill('island');

  await expect(page.getByTestId('country-card')).toContainText(countryName);
  await expect(page.getByTestId('country-card')).toContainText(
    'Flag unavailable',
  );
  await expect(page.getByTestId('country-card').locator('b')).toHaveCount(0);

  expect(
    await page.evaluate(
      (): boolean => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.getByTestId('country-card').click();

  await expect(page.getByRole('dialog')).toContainText('No land borders');
  await expect(page.getByRole('dialog')).toContainText('Not available');

  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTestId('country-card')).toBeFocused();
});
