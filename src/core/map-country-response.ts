import type { Country, Currency, Flag, Language } from './country';
import { InvalidResponseError } from './errors';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new InvalidResponseError();
  }

  return value;
}

function parseOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidResponseError();
  }

  return value.trim() || null;
}

function parseRequiredText(value: unknown): string {
  const text: string | null = parseOptionalText(value);

  if (!text) {
    throw new InvalidResponseError();
  }

  return text;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new InvalidResponseError();
  }

  return value;
}

function mapOptionalList<T>(
  value: unknown,
  map: (item: unknown) => T,
): readonly T[] | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new InvalidResponseError();
  }

  return Object.freeze(value.map(map));
}

function mapLanguage(raw: unknown): Language {
  const value: Record<string, unknown> = parseRecord(raw);

  return Object.freeze({
    name: parseRequiredText(value.name),
    code: parseOptionalText(value.iso639_1 ?? value.iso639_2),
  });
}

function mapCurrency(raw: unknown): Currency {
  const value: Record<string, unknown> = parseRecord(raw);

  return Object.freeze({
    name: parseRequiredText(value.name),
    code: parseOptionalText(value.code),
    symbol: parseOptionalText(value.symbol),
  });
}

function parseImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const url: URL = new URL(value);

    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function mapFlag(raw: Record<string, unknown>): Flag | null {
  const flags: Record<string, unknown> = isRecord(raw.flags) ? raw.flags : {};
  const image: string | null =
    parseImageUrl(flags.svg) ??
    parseImageUrl(flags.png) ??
    parseImageUrl(raw.flag);

  if (image) {
    return Object.freeze({ kind: 'image', value: image });
  }

  if (
    typeof raw.flag === 'string' &&
    /^\p{Regional_Indicator}{2}$/u.test(raw.flag.trim())
  ) {
    return Object.freeze({ kind: 'text', value: raw.flag.trim() });
  }

  return null;
}

export function mapCountryResponse(raw: unknown): Country {
  const value: Record<string, unknown> = parseRecord(raw);

  return Object.freeze({
    id:
      parseOptionalText(value.alpha3Code) ??
      parseRequiredText(value.alpha2Code),
    name: parseRequiredText(value.name),
    flag: mapFlag(value),
    capital: parseOptionalText(value.capital),
    region: parseOptionalText(value.region),
    population: parseOptionalNumber(value.population),
    area: parseOptionalNumber(value.area),
    borders: mapOptionalList(value.borders, parseRequiredText),
    languages: mapOptionalList(value.languages, mapLanguage),
    currencies: mapOptionalList(value.currencies, mapCurrency),
  });
}
