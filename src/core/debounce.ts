export type Debounced<Arguments extends unknown[]> = ((
  ...callbackArguments: Arguments
) => void) & {
  cancel(): void;
};

export function debounce<Arguments extends unknown[]>(
  callback: (...callbackArguments: Arguments) => void,
  delayMs: number,
): Debounced<Arguments> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel: () => void = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  const run: Debounced<Arguments> = (...callbackArguments: Arguments): void => {
    cancel();

    timer = setTimeout((): void => {
      timer = undefined;

      callback(...callbackArguments);
    }, delayMs);
  };

  run.cancel = cancel;

  return run;
}
