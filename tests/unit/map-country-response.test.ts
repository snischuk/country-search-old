import { describe, expect, it } from 'vitest';

import type { Country } from '../../src/core/country';
import { InvalidResponseError } from '../../src/core/errors';
import { mapCountryResponse } from '../../src/core/map-country-response';

import {
  island,
  malformed,
  markup,
  spain,
  urlFlag,
} from './fixtures/country-fixtures';

describe('mapCountryResponse', (): void => {
  it('maps flat provider fields without changing input', (): void => {
    const before: string = JSON.stringify(spain);

    const country: Country = mapCountryResponse(spain);

    expect(country).toEqual({
      id: 'ESP',
      name: 'Spain',
      capital: 'Madrid',
      region: 'Europe',
      population: 47000000,
      area: 505992,
      borders: ['FRA', 'PRT'],
      flag: { kind: 'text', value: '🇪🇸' },
      languages: [{ name: 'Spanish', code: 'es' }],
      currencies: [{ name: 'Euro', code: 'EUR', symbol: '€' }],
    });
    expect(JSON.stringify(spain)).toBe(before);
    expect(country.borders).not.toBe(spain.borders);
  });

  it('keeps zero and empty borders distinct from missing values', (): void => {
    const country: Country = mapCountryResponse(island);

    expect(country).toMatchObject({
      id: 'IS',
      capital: null,
      flag: null,
      population: 0,
      area: 0,
      borders: [],
      languages: null,
      currencies: null,
    });
    expect(
      mapCountryResponse({ ...island, borders: undefined, capital: '' })
        .borders,
    ).toBeNull();
  });

  it('supports documented flag shapes and rejects unsafe URL schemes', (): void => {
    expect(mapCountryResponse(urlFlag).flag).toEqual({
      kind: 'image',
      value: 'https://example.com/es.svg',
    });
    expect(
      mapCountryResponse({ ...spain, flag: 'https://example.com/es.svg' }).flag
        ?.kind,
    ).toBe('image');
    expect(
      mapCountryResponse({ ...spain, flag: 'javascript:alert(1)' }).flag,
    ).toBeNull();
    expect(mapCountryResponse({ ...spain, flag: 12 }).flag).toBeNull();
    expect(mapCountryResponse(markup).name).toBe(markup.name);
  });

  it.each([
    null,
    [],
    {},
    malformed,
    { ...spain, name: '' },
    { ...spain, alpha3Code: null },
    { ...spain, population: '12' },
    { ...spain, area: Infinity },
    { ...spain, borders: [1] },
    { ...spain, languages: {} },
    { ...spain, languages: [{ name: '' }] },
    { ...spain, currencies: [{ name: 'Euro', symbol: 1 }] },
  ])('rejects malformed non-null data', (raw: unknown): void => {
    expect((): Country => mapCountryResponse(raw)).toThrow(
      InvalidResponseError,
    );
  });
});
