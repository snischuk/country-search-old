import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCountrySearch } from '../../src/api/search-countries';
import type {
  Country,
  Listener,
  Search,
  SearchController,
  SearchState,
} from '../../src/core/country';
import { HttpError, InvalidResponseError } from '../../src/core/errors';
import { mapCountryResponse } from '../../src/core/map-country-response';
import { createSearchController } from '../../src/core/search-controller';
import { spain } from '../unit/fixtures/country-fixtures';

import { createControlledFetch } from './helpers/controlled-fetch';

const country: Country = mapCountryResponse(spain);

describe('search controller', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it('starts idle and ignores blank input', async (): Promise<void> => {
    const searchMock: ReturnType<typeof vi.fn<Search>> = vi.fn<Search>();
    const controller: SearchController = createSearchController({
      search: searchMock,
    });

    expect(controller.getState()).toEqual({
      status: 'idle',
      input: '',
      query: '',
    });

    controller.setInput('   ');
    await vi.runAllTimersAsync();

    expect(searchMock).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('idle');
  });

  it('waits 300 ms, searches trimmed input and publishes mapped results', async (): Promise<void> => {
    const searchMock: ReturnType<typeof vi.fn<Search>> = vi
      .fn<Search>()
      .mockResolvedValue([country]);
    const controller: SearchController = createSearchController({
      search: searchMock,
    });
    const states: SearchState[] = [];

    controller.subscribe((state: SearchState): void => {
      states.push(state);
    });
    controller.setInput(' spain ');
    await vi.advanceTimersByTimeAsync(299);

    expect(searchMock).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual({
      status: 'waiting',
      input: ' spain ',
      query: 'spain',
    });

    await vi.advanceTimersByTimeAsync(1);

    expect(searchMock).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    expect(
      states.some((state: SearchState): boolean => state.status === 'loading'),
    ).toBe(true);
    expect(controller.getState()).toMatchObject({
      status: 'results',
      countries: [country],
      selectedCountryId: null,
    });
  });

  it('clears existing results immediately and cancels scheduled empty searches', async (): Promise<void> => {
    const searchMock: ReturnType<typeof vi.fn<Search>> = vi
      .fn<Search>()
      .mockResolvedValue([country]);
    const controller: SearchController = createSearchController({
      search: searchMock,
    });

    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('iceland');

    expect(controller.getState()).toEqual({
      status: 'waiting',
      input: 'iceland',
      query: 'iceland',
    });

    controller.setInput('');
    await vi.runAllTimersAsync();

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('idle');
  });

  it('publishes no matches and supports unsubscribe', async (): Promise<void> => {
    const controller: SearchController = createSearchController({
      search: async (): Promise<Country[]> => [],
    });
    const onSearchStateChange: ReturnType<typeof vi.fn<Listener>> =
      vi.fn<Listener>();
    const unsubscribe: () => void = controller.subscribe(onSearchStateChange);

    unsubscribe();
    controller.setInput('missing');
    await vi.advanceTimersByTimeAsync(300);

    expect(controller.getState().status).toBe('empty');
    expect(onSearchStateChange).toHaveBeenCalledTimes(1);
  });

  it('disposes scheduled work and ignores further input', async (): Promise<void> => {
    const searchMock: ReturnType<typeof vi.fn<Search>> = vi.fn<Search>();
    const controller: SearchController = createSearchController({
      search: searchMock,
    });

    controller.setInput('spain');
    controller.dispose();
    controller.setInput('iceland');
    await vi.runAllTimersAsync();

    expect(searchMock).not.toHaveBeenCalled();
  });
});

describe('search cancellation', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it('aborts synchronously on every edit before debounce expires', async (): Promise<void> => {
    const network: ReturnType<typeof createControlledFetch> =
      createControlledFetch();
    const controller: SearchController = createSearchController({
      search: createCountrySearch({
        fetch: network.fetch,
        createTimeoutSignal: (): AbortSignal => new AbortController().signal,
      }),
    });

    controller.setInput('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('spain');

    expect(network.requests[0]?.signal.aborted).toBe(true);
    expect(network.requests).toHaveLength(1);
    expect(controller.getState().status).toBe('waiting');

    await vi.advanceTimersByTimeAsync(300);

    expect(network.requests).toHaveLength(2);
    expect(controller.getState().status).toBe('loading');

    controller.dispose();

    expect(network.requests[1]?.signal.aborted).toBe(true);
  });

  it('keeps empty state after clearing an active query', async (): Promise<void> => {
    const network: ReturnType<typeof createControlledFetch> =
      createControlledFetch();
    const controller: SearchController = createSearchController({
      search: createCountrySearch({
        fetch: network.fetch,
        createTimeoutSignal: (): AbortSignal => new AbortController().signal,
      }),
    });

    controller.setInput('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('');
    await vi.advanceTimersByTimeAsync(0);

    expect(network.requests[0]?.signal.aborted).toBe(true);
    expect(controller.getState()).toEqual({
      status: 'idle',
      input: '',
      query: '',
    });
  });

  it('ignores non-cooperative late completions during the waiting window', async (): Promise<void> => {
    let resolveSearch: (countries: Country[]) => void = (): void => {
      throw new Error('Search not started');
    };

    const search: Search = (): Promise<Country[]> =>
      new Promise((resolve: (countries: Country[]) => void): void => {
        resolveSearch = resolve;
      });
    const controller: SearchController = createSearchController({ search });

    controller.setInput('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('spain');
    resolveSearch([country]);
    await vi.advanceTimersByTimeAsync(0);

    expect(controller.getState()).toEqual({
      status: 'waiting',
      input: 'spain',
      query: 'spain',
    });

    controller.dispose();
  });
});

describe('search recovery', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it.each([
    { failure: new TypeError('offline'), kind: 'network' },
    { failure: new HttpError(500), kind: 'http' },
    { failure: new HttpError(429), kind: 'http' },
    { failure: new InvalidResponseError(), kind: 'invalid-response' },
    { failure: new DOMException('timeout', 'TimeoutError'), kind: 'timeout' },
  ])(
    'classifies $kind and retries immediately once',
    async ({
      failure,
      kind,
    }: {
      failure: Error;
      kind: string;
    }): Promise<void> => {
      const searchMock: ReturnType<typeof vi.fn<Search>> = vi
        .fn<Search>()
        .mockRejectedValueOnce(failure)
        .mockResolvedValue([country]);
      const controller: SearchController = createSearchController({
        search: searchMock,
      });

      controller.setInput('spain');
      await vi.advanceTimersByTimeAsync(300);

      expect(controller.getState()).toMatchObject({
        status: 'error',
        failure: { kind },
      });

      controller.retry();
      controller.retry();

      expect(searchMock).toHaveBeenCalledTimes(2);
      expect(controller.getState().status).toBe('loading');

      await vi.advanceTimersByTimeAsync(0);

      expect(controller.getState().status).toBe('results');
    },
  );

  it('retries the latest failed query and never revives cleared input', async (): Promise<void> => {
    const searchMock: ReturnType<typeof vi.fn<Search>> = vi
      .fn<Search>()
      .mockRejectedValue(new TypeError('offline'));
    const controller: SearchController = createSearchController({
      search: searchMock,
    });

    controller.setInput('sp');
    await vi.advanceTimersByTimeAsync(300);
    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(searchMock.mock.calls[2]?.[0]).toBe('spain');

    controller.setInput('');
    controller.retry();
    await vi.runAllTimersAsync();

    expect(searchMock).toHaveBeenCalledTimes(3);
    expect(controller.getState().status).toBe('idle');
  });

  it('never presents AbortError as a recoverable failure', async (): Promise<void> => {
    const controller: SearchController = createSearchController({
      search: async (): Promise<Country[]> => {
        throw new DOMException('cancelled', 'AbortError');
      },
    });

    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);

    expect(controller.getState().status).not.toBe('error');
    expect(controller.getState().status).not.toBe('loading');
  });
});

describe('country selection', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it('selects only a current result and closing preserves input/results', async (): Promise<void> => {
    const controller: SearchController = createSearchController({
      search: async (): Promise<Country[]> => [country],
    });

    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.selectCountry('missing');

    expect(controller.getState()).toMatchObject({ selectedCountryId: null });

    controller.selectCountry('ESP');

    expect(controller.getState()).toMatchObject({ selectedCountryId: 'ESP' });

    controller.closeDetails();

    expect(controller.getState()).toMatchObject({
      status: 'results',
      query: 'spain',
      countries: [country],
      selectedCountryId: null,
    });
  });

  it('clears selection on edit and ignores selection outside results', async (): Promise<void> => {
    const controller: SearchController = createSearchController({
      search: async (): Promise<Country[]> => [country],
    });

    controller.selectCountry('ESP');
    controller.closeDetails();
    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(300);
    controller.selectCountry('ESP');
    controller.setInput('iceland');
    controller.selectCountry('ESP');

    expect(controller.getState()).toEqual({
      status: 'waiting',
      query: 'iceland',
      input: 'iceland',
    });

    controller.dispose();
  });
});

describe('controller disposal', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });
  afterEach((): void => {
    vi.useRealTimers();
  });

  it('clears selected country without notifying subscribers', async (): Promise<void> => {
    const controller: SearchController = createSearchController({
      search: async (): Promise<Country[]> => [country],
      debounceDelayMs: 0,
    });
    const onSearchStateChange: ReturnType<typeof vi.fn<Listener>> =
      vi.fn<Listener>();

    controller.subscribe(onSearchStateChange);
    controller.setInput('spain');
    await vi.advanceTimersByTimeAsync(0);
    controller.selectCountry('ESP');
    onSearchStateChange.mockClear();
    controller.dispose();

    expect(controller.getState()).toMatchObject({
      status: 'results',
      selectedCountryId: null,
    });
    expect(onSearchStateChange).not.toHaveBeenCalled();

    controller.selectCountry('ESP');

    expect(controller.getState()).toMatchObject({ selectedCountryId: null });
  });
});
