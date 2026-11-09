export interface PendingFetch {
  readonly signal: AbortSignal;
  respond(body: unknown, status?: number): void;
  fail(reason: unknown): void;
}

export function createControlledFetch(): {
  fetch: typeof fetch;
  requests: PendingFetch[];
} {
  const requests: PendingFetch[] = [];

  const fetcher: typeof fetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> =>
    new Promise(
      (
        resolve: (response: Response) => void,
        reject: (reason: unknown) => void,
      ): void => {
        void input;

        const signal: AbortSignal =
          init?.signal ?? new AbortController().signal;

        const cleanup: () => void = (): void =>
          signal.removeEventListener('abort', abort);
        const abort: () => void = (): void => {
          cleanup();
          reject(signal.reason);
        };

        if (signal.aborted) {
          abort();

          return;
        }

        signal.addEventListener('abort', abort, { once: true });
        requests.push({
          signal,
          respond(body: unknown, status: number = 200): void {
            cleanup();
            resolve(new Response(JSON.stringify(body), { status }));
          },
          fail(reason: unknown): void {
            cleanup();
            reject(reason);
          },
        });
      },
    );

  return { fetch: fetcher, requests };
}
