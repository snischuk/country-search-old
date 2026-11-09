import type { Country } from './country';

export function mapCountryResponse(raw: unknown): Country {
  void raw;

  throw new Error('Not implemented');
}
