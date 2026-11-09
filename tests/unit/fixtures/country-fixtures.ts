export const spain: Record<string, unknown> = {
  alpha3Code: 'ESP',
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  population: 47000000,
  area: 505992,
  borders: ['FRA', 'PRT'],
  flag: '🇪🇸',
  languages: [{ name: 'Spanish', iso639_1: 'es' }],
  currencies: [{ name: 'Euro', code: 'EUR', symbol: '€' }],
};

export const island: Record<string, unknown> = {
  alpha2Code: 'IS',
  name: 'Iceland',
  borders: [],
  population: 0,
  area: 0,
};

export const urlFlag: Record<string, unknown> = {
  ...spain,
  flags: { svg: 'https://example.com/es.svg' },
};

export const malformed: Record<string, unknown> = { ...spain, population: -1 };

export const markup: Record<string, unknown> = {
  ...spain,
  name: '<script>alert(1)</script>',
};
