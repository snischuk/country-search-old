import { describe, expect, it } from 'vitest';

import { HttpError, InvalidResponseError, classifySearchError } from './errors';

describe('search errors', (): void => {
  it('retains HTTP status and Error behavior', (): void => {
    const error: HttpError = new HttpError(429);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(429);
    expect(classifySearchError(error)).toEqual({ kind: 'http', status: 429 });
  });

  it.each(['AbortError', 'TimeoutError'])(
    'distinguishes %s by name',
    (name: string): void => {
      const error: DOMException = new DOMException('reason', name);

      expect(classifySearchError(error)).toEqual({
        kind: name === 'AbortError' ? 'cancelled' : 'timeout',
      });
      expect(classifySearchError({ name })).toEqual(classifySearchError(error));
    },
  );

  it('identifies invalid responses', (): void => {
    const error: InvalidResponseError = new InvalidResponseError();

    expect(error).toBeInstanceOf(Error);
    expect(classifySearchError(error)).toEqual({ kind: 'invalid-response' });
  });

  it.each([null, undefined, 'offline', new TypeError('fetch failed'), {}])(
    'handles unknown failures safely',
    (error: unknown): void => {
      expect(classifySearchError(error)).toEqual({ kind: 'network' });
    },
  );
});
