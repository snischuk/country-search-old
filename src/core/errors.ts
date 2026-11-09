import type { SearchFailure } from './country';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('Not implemented');
    this.status = status;

    throw new Error('Not implemented');
  }
}

export class InvalidResponseError extends Error {
  constructor() {
    super('Not implemented');

    throw new Error('Not implemented');
  }
}

export function classifySearchError(error: unknown): SearchFailure {
  void error;

  throw new Error('Not implemented');
}
