import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce';

describe('debounce', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers();
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  it('waits and resets with the latest arguments', (): void => {
    const calls: string[] = [];
    const run: ((value: string) => void) & { cancel(): void } = debounce(
      (value: string): void => {
        calls.push(value);
      },
      300,
    );

    run('sp');
    vi.advanceTimersByTime(299);
    expect(calls).toEqual([]);

    run('spain');
    vi.advanceTimersByTime(299);
    expect(calls).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(calls).toEqual(['spain']);
  });

  it('cancels pending calls idempotently and can be reused', (): void => {
    const calls: number[] = [];
    const run: ((value: number) => void) & { cancel(): void } = debounce(
      (value: number): void => {
        calls.push(value);
      },
      0,
    );

    run(1);
    run.cancel();
    run.cancel();
    vi.runAllTimers();
    expect(calls).toEqual([]);

    run(2);
    vi.runAllTimers();
    expect(calls).toEqual([2]);
  });
});
