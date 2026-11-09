import type { Country, Search } from '../core/country';
import { HttpError, InvalidResponseError } from '../core/errors';
import { mapCountryResponse } from '../core/map-country-response';

export interface SearchDependencies {
  readonly fetch: typeof fetch;
  readonly createTimeoutSignal: (timeoutMs: number) => AbortSignal;
}

export function createCountrySearch(dependencies: SearchDependencies): Search {
  return async (query: string, signal: AbortSignal): Promise<Country[]> => {
    const trimmedQuery: string = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    signal.throwIfAborted();

    const requestSignal: AbortSignal = AbortSignal.any([
      signal,
      dependencies.createTimeoutSignal(10000),
    ]);
    let response: Response;

    try {
      response = await dependencies.fetch(
        `https://countries.dev/name/${encodeURIComponent(trimmedQuery)}`,
        { signal: requestSignal },
      );
    } catch (error: unknown) {
      requestSignal.throwIfAborted();

      throw error;
    }

    requestSignal.throwIfAborted();

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new HttpError(response.status);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      requestSignal.throwIfAborted();

      throw new InvalidResponseError();
    }

    requestSignal.throwIfAborted();

    if (!Array.isArray(body)) {
      throw new InvalidResponseError();
    }

    const countries: Country[] = body.map(mapCountryResponse);
    const countryIds: Set<string> = new Set(
      countries.map((country: Country): string => country.id),
    );

    if (countryIds.size !== countries.length) {
      throw new InvalidResponseError();
    }

    return countries;
  };
}

export const searchCountries: Search = createCountrySearch({
  fetch: (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
    fetch(input, init),
  createTimeoutSignal: (timeoutMs: number): AbortSignal =>
    AbortSignal.timeout(timeoutMs),
});
