import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCountrySearch } from '../../src/api/search-countries';
import type { SearchController, SearchState } from '../../src/core/country';
import { createSearchController } from '../../src/core/search-controller';
import { spain } from '../unit/fixtures/country-fixtures';

import { createControlledFetch } from './helpers/controlled-fetch';

describe('request races', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it.each(
    Array.from({ length: 20 }, (value: unknown, index: number): number => {
      void value;

      return index + 1;
    }),
  )(
    'keeps only the last result with reversed responses, schedule %i',
    async (scheduleIndex: number): Promise<void> => {
      const network: ReturnType<typeof createControlledFetch> =
        createControlledFetch();
      const controller: SearchController = createSearchController({
        search: createCountrySearch({
          fetch: network.fetch,
          createTimeoutSignal: (): AbortSignal => new AbortController().signal,
        }),
      });
      const states: SearchState[] = [];

      controller.setInput('sp');
      await vi.advanceTimersByTimeAsync(300);

      setTimeout((): void => {
        network.requests[0]?.respond([{ ...spain, name: 'Obsolete country' }]);
      }, 700 + scheduleIndex);
      controller.setInput('spain');
      controller.subscribe((state: SearchState): void => {
        states.push(state);
      });

      expect(network.requests[0]?.signal.aborted).toBe(true);
      expect(network.requests[0]?.signal.reason).toMatchObject({
        name: 'AbortError',
      });

      await vi.advanceTimersByTimeAsync(300);
      network.requests[1]?.respond([spain]);
      await vi.advanceTimersByTimeAsync(1000);

      expect(controller.getState()).toMatchObject({
        status: 'results',
        query: 'spain',
        countries: [{ name: 'Spain' }],
      });
      expect(
        states.every((state: SearchState): boolean => state.query === 'spain'),
      ).toBe(true);
      expect(
        states.some((state: SearchState): boolean => state.status === 'error'),
      ).toBe(false);

      controller.dispose();
    },
  );

  it('mock fetch rejects with the actual caller abort reason', async (): Promise<void> => {
    const network: ReturnType<typeof createControlledFetch> =
      createControlledFetch();
    const caller: AbortController = new AbortController();
    const pending: Promise<Response> = network.fetch('https://example.com', {
      signal: caller.signal,
    });
    const assertion: Promise<void> = expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    });

    caller.abort();
    network.requests[0]?.respond([spain]);

    await assertion;
  });
});
