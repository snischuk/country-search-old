import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { spain } from '../test/country-fixtures';

import type {
  Country,
  Listener,
  Search,
  SearchController,
  SearchState,
} from './country';
import { mapCountryResponse } from './map-country-response';
import { createSearchController } from './search-controller';

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
