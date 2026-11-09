export type Debounced<Arguments extends unknown[]> = ((
  ...callbackArguments: Arguments
) => void) & {
  cancel(): void;
};

export function debounce<Arguments extends unknown[]>(
  callback: (...callbackArguments: Arguments) => void,
  delayMs: number,
): Debounced<Arguments> {
  void callback;
  void delayMs;

  throw new Error('Not implemented');
}
