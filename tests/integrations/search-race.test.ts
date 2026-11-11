import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCountrySearch } from '../../src/api/search-countries';
import type {
  Country,
  Search,
  SearchController,
  SearchState,
} from '../../src/core/country';
import { HttpError } from '../../src/core/errors';
import { mapCountryResponse } from '../../src/core/map-country-response';
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

describe('overlapping failure and input races', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it.each(['timeout-first', 'edit-first', 'clear-first', 'error-first'])(
    'ignores obsolete state updates with %s',
    async (raceOrder: string): Promise<void> => {
      const network: ReturnType<typeof createControlledFetch> =
        createControlledFetch();
      const timeoutControllers: AbortController[] = [];
      const controller: SearchController = createSearchController({
        search: createCountrySearch({
          fetch: network.fetch,
          createTimeoutSignal: (): AbortSignal => {
            const timeoutController: AbortController = new AbortController();

            timeoutControllers.push(timeoutController);

            return timeoutController.signal;
          },
        }),
      });
      const states: SearchState[] = [];

      controller.setInput('sp');
      await vi.advanceTimersByTimeAsync(300);

      if (raceOrder === 'timeout-first') {
        timeoutControllers[0]?.abort(
          new DOMException('expired', 'TimeoutError'),
        );
      } else if (raceOrder === 'error-first') {
        network.requests[0]?.fail(new HttpError(503));
      }

      controller.setInput(raceOrder === 'clear-first' ? '' : 'spain');
      controller.subscribe((state: SearchState): void => {
        states.push(state);
      });
      timeoutControllers[0]?.abort(new DOMException('expired', 'TimeoutError'));
      await vi.advanceTimersByTimeAsync(0);

      expect(controller.getState().status).toBe(
        raceOrder === 'clear-first' ? 'idle' : 'waiting',
      );
      expect(
        states.some((state: SearchState): boolean => state.status === 'error'),
      ).toBe(false);

      if (raceOrder !== 'clear-first') {
        await vi.advanceTimersByTimeAsync(300);
        network.requests[1]?.respond([spain]);
        await vi.advanceTimersByTimeAsync(0);

        expect(controller.getState()).toMatchObject({
          status: 'results',
          query: 'spain',
          countries: [{ name: 'Spain' }],
        });
      }

      controller.dispose();
    },
  );

  it('ignores a late rejection from a dependency that does not cooperate with abort', async (): Promise<void> => {
    let rejectObsoleteSearch: (reason: unknown) => void = (): void => {
      throw new Error('Search not started');
    };

    const searchMock: ReturnType<typeof vi.fn<Search>> = vi
      .fn<Search>()
      .mockImplementationOnce(
        (): Promise<Country[]> =>
          new Promise(
            (
              resolve: (countries: Country[]) => void,
              reject: (reason: unknown) => void,
            ): void => {
              void resolve;
              rejectObsoleteSearch = reject;
            },
          ),
      )
      .mockResolvedValue([mapCountryResponse(spain)]);
    const controller: SearchController = createSearchController({
      search: searchMock,
    });
    const states: SearchState[] = [];

    controller.subscribe((state: SearchState): void => {
      states.push(state);
    });
    controller.setInput('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);

    const stateCount: number = states.length;

    expect(searchMock.mock.calls[0]?.[1].aborted).toBe(true);

    rejectObsoleteSearch(new HttpError(503));
    await vi.advanceTimersByTimeAsync(0);

    expect(states).toHaveLength(stateCount);
    expect(controller.getState()).toMatchObject({
      status: 'results',
      query: 'spain',
      countries: [{ name: 'Spain' }],
    });

    controller.dispose();
  });
});
