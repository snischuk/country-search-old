import type { Search, SearchController } from './country';

export interface ControllerDependencies {
  readonly search: Search;
  readonly debounceDelayMs?: number;
}

export function createSearchController(
  dependencies: ControllerDependencies,
): SearchController {
  void dependencies;

  throw new Error('Not implemented');
}
