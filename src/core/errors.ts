import type { SearchFailure } from './country';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Country search failed (HTTP ${status})`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class InvalidResponseError extends Error {
  constructor() {
    super('The country service returned invalid data');
    this.name = 'InvalidResponseError';
  }
}

export function classifySearchError(error: unknown): SearchFailure {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    if (error.name === 'AbortError') {
      return { kind: 'cancelled' };
    }

    if (error.name === 'TimeoutError') {
      return { kind: 'timeout' };
    }
  }

  if (error instanceof HttpError) {
    return { kind: 'http', status: error.status };
  }

  if (error instanceof InvalidResponseError) {
    return { kind: 'invalid-response' };
  }

  return { kind: 'network' };
}
