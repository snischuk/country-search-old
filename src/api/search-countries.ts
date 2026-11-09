import type { Search } from '../core/country';

export interface SearchDependencies {
  readonly fetch: typeof fetch;
  readonly createTimeoutSignal: (timeoutMs: number) => AbortSignal;
}

export function createCountrySearch(dependencies: SearchDependencies): Search {
  void dependencies;

  throw new Error('Not implemented');
}

export const searchCountries: Search = async (
  query: string,
  signal: AbortSignal,
): ReturnType<Search> => {
  void query;
  void signal;

  throw new Error('Not implemented');
};
