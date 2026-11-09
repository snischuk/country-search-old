import type {
  Country,
  Listener,
  Search,
  SearchController,
  SearchState,
} from './country';
import { debounce } from './debounce';
import type { Debounced } from './debounce';
import { classifySearchError } from './errors';

export interface ControllerDependencies {
  readonly search: Search;
  readonly debounceDelayMs?: number;
}

export function createSearchController(
  dependencies: ControllerDependencies,
): SearchController {
  let state: SearchState = { status: 'idle', input: '', query: '' };
  let isDisposed: boolean = false;
  const subscribers: Set<Listener> = new Set();

  function updateState(nextState: SearchState): void {
    if (isDisposed) {
      return;
    }

    state = Object.freeze(nextState);
    subscribers.forEach((onSearchStateChange: Listener): void =>
      onSearchStateChange(state),
    );
  }

  async function runSearch(): Promise<void> {
    const input: string = state.input;
    const query: string = state.query;
    const requestController: AbortController = new AbortController();

    updateState({ status: 'loading', input, query });

    try {
      const countries: Country[] = await dependencies.search(
        query,
        requestController.signal,
      );

      updateState(
        countries.length
          ? {
              status: 'results',
              input,
              query,
              countries: Object.freeze([...countries]),
              selectedCountryId: null,
            }
          : { status: 'empty', input, query },
      );
    } catch (error: unknown) {
      updateState({
        status: 'error',
        input,
        query,
        failure: classifySearchError(error),
      });
    }
  }

  const scheduleSearch: Debounced<[]> = debounce((): void => {
    void runSearch();
  }, dependencies.debounceDelayMs ?? 300);

  return {
    setInput(input: string): void {
      if (isDisposed) {
        return;
      }

      scheduleSearch.cancel();

      const query: string = input.trim();

      updateState({ status: query ? 'waiting' : 'idle', input, query });

      if (query) {
        scheduleSearch();
      }
    },
    getState(): SearchState {
      return state;
    },
    subscribe(onSearchStateChange: Listener): () => void {
      if (!isDisposed) {
        subscribers.add(onSearchStateChange);
        onSearchStateChange(state);
      }

      return (): void => {
        subscribers.delete(onSearchStateChange);
      };
    },
    dispose(): void {
      scheduleSearch.cancel();
      isDisposed = true;
      subscribers.clear();
    },
    retry(): void {
      throw new Error('Not implemented');
    },
    selectCountry(id: string): void {
      void id;
      throw new Error('Not implemented');
    },
    closeDetails(): void {
      throw new Error('Not implemented');
    },
  };
}
