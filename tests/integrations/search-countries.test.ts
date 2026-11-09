import { describe, expect, it, vi } from 'vitest';

import { createCountrySearch } from '../../src/api/search-countries';
import type { Search } from '../../src/core/country';
import { HttpError, InvalidResponseError } from '../../src/core/errors';
import { malformed, spain } from '../unit/fixtures/country-fixtures';

import { createControlledFetch } from './helpers/controlled-fetch';

function createHarness(): {
  search: Search;
  network: ReturnType<typeof createControlledFetch>;
  caller: AbortController;
  timeout: AbortController;
} {
  const network: ReturnType<typeof createControlledFetch> =
    createControlledFetch();
  const timeout: AbortController = new AbortController();
  const caller: AbortController = new AbortController();
  const search: Search = createCountrySearch({
    fetch: network.fetch,
    createTimeoutSignal: (timeoutMs: number): AbortSignal => {
      expect(timeoutMs).toBe(10000);

      return timeout.signal;
    },
  });

  return { search, network, caller, timeout };
}

describe('searchCountries', (): void => {
  it('trims and encodes the query, forwards cancellation, and maps results', async (): Promise<void> => {
    const fetchMock: ReturnType<typeof vi.fn<typeof fetch>> = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([spain])));
    const search: Search = createCountrySearch({
      fetch: fetchMock,
      createTimeoutSignal: (): AbortSignal => new AbortController().signal,
    });

    const countries: Awaited<ReturnType<Search>> = await search(
      '  côte / spain  ',
      new AbortController().signal,
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://countries.dev/name/c%C3%B4te%20%2F%20spain',
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(countries[0]).toMatchObject({
      id: 'ESP',
      name: 'Spain',
      capital: 'Madrid',
    });
  });

  it('does not fetch empty input or an already-cancelled query', async (): Promise<void> => {
    const harness: ReturnType<typeof createHarness> = createHarness();

    await expect(harness.search('   ', harness.caller.signal)).resolves.toEqual(
      [],
    );
    harness.caller.abort();
    await expect(
      harness.search('spain', harness.caller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(harness.network.requests).toHaveLength(0);
  });

  it('resolves 404 without parsing its non-JSON body', async (): Promise<void> => {
    const response: Response = new Response('No matches', { status: 404 });
    const parseBody: ReturnType<typeof vi.spyOn> = vi.spyOn(response, 'json');
    const search: Search = createCountrySearch({
      fetch: async (): Promise<Response> => response,
      createTimeoutSignal: (): AbortSignal => new AbortController().signal,
    });

    await expect(
      search('missing', new AbortController().signal),
    ).resolves.toEqual([]);

    expect(parseBody).not.toHaveBeenCalled();
  });

  it.each([429, 500])(
    'throws HttpError for HTTP %i',
    async (status: number): Promise<void> => {
      const harness: ReturnType<typeof createHarness> = createHarness();
      const pending: ReturnType<Search> = harness.search(
        'spain',
        harness.caller.signal,
      );
      const assertion: Promise<void> = expect(pending).rejects.toMatchObject({
        name: 'HttpError',
        status,
      });

      harness.network.requests[0]?.respond(null, status);

      await assertion;
      expect(new HttpError(status).status).toBe(status);
    },
  );

  it.each(['caller', 'timeout'])(
    'preserves the first %s cancellation reason',
    async (source: string): Promise<void> => {
      const harness: ReturnType<typeof createHarness> = createHarness();
      const pending: ReturnType<Search> = harness.search(
        'spain',
        harness.caller.signal,
      );
      const reason: DOMException = new DOMException(
        'Expired',
        source === 'caller' ? 'AbortError' : 'TimeoutError',
      );
      const assertion: Promise<void> = expect(pending).rejects.toBe(reason);

      if (source === 'caller') {
        harness.caller.abort(reason);
        harness.timeout.abort(new DOMException('Expired', 'TimeoutError'));
      } else {
        harness.timeout.abort(reason);
        harness.caller.abort();
      }

      await assertion;
      expect(harness.network.requests[0]?.signal.reason).toBe(reason);
    },
  );

  it('preserves network failures', async (): Promise<void> => {
    const harness: ReturnType<typeof createHarness> = createHarness();
    const failure: TypeError = new TypeError('Offline');
    const pending: ReturnType<Search> = harness.search(
      'spain',
      harness.caller.signal,
    );
    const assertion: Promise<void> = expect(pending).rejects.toBe(failure);

    harness.network.requests[0]?.fail(failure);

    await assertion;
  });

  it.each([{}, [malformed], [spain, spain]])(
    'rejects invalid successful data',
    async (body: unknown): Promise<void> => {
      const harness: ReturnType<typeof createHarness> = createHarness();
      const pending: ReturnType<Search> = harness.search(
        'spain',
        harness.caller.signal,
      );
      const assertion: Promise<void> =
        expect(pending).rejects.toBeInstanceOf(InvalidResponseError);

      harness.network.requests[0]?.respond(body);

      await assertion;
    },
  );

  it('rejects invalid JSON', async (): Promise<void> => {
    const search: Search = createCountrySearch({
      fetch: async (): Promise<Response> => new Response('{'),
      createTimeoutSignal: (): AbortSignal => new AbortController().signal,
    });

    await expect(
      search('spain', new AbortController().signal),
    ).rejects.toBeInstanceOf(InvalidResponseError);
  });

  it('does not return data cancelled while the response body was being read', async (): Promise<void> => {
    const response: Response = new Response();
    const caller: AbortController = new AbortController();
    const body: Promise<unknown> = Promise.resolve([spain]);

    vi.spyOn(response, 'json').mockImplementation(
      async (): Promise<unknown> => {
        caller.abort();

        return body;
      },
    );

    const search: Search = createCountrySearch({
      fetch: async (): Promise<Response> => response,
      createTimeoutSignal: (): AbortSignal => new AbortController().signal,
    });

    await expect(search('spain', caller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
