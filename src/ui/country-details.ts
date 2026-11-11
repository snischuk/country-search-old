import type { Country, Currency, Language } from '../core/country';

import { createCountryFlag } from './country-card';

export interface CountryDetails {
  readonly element: HTMLDialogElement;
  show(country: Country): void;
  close(): void;
}

export function createCountryDetails(
  onDetailsClose: () => void,
): CountryDetails {
  const dialog: HTMLDialogElement = document.createElement('dialog');
  const content: HTMLDivElement = document.createElement('div');
  const closeButton: HTMLButtonElement = document.createElement('button');
  const facts: HTMLDListElement = document.createElement('dl');
  let selectedCountryId: string | null = null;

  dialog.className = 'country-dialog';
  dialog.setAttribute('aria-labelledby', 'country-details-title');
  content.className = 'country-details';
  closeButton.type = 'button';
  closeButton.className = 'close-button';
  closeButton.textContent = 'Close';
  closeButton.autofocus = true;
  closeButton.addEventListener('click', (): void => dialog.close());
  dialog.addEventListener('close', (): void => {
    selectedCountryId = null;
    onDetailsClose();
  });
  dialog.append(closeButton, content);

  function addDetail(label: string, value: string): void {
    const heading: HTMLElement = document.createElement('dt');
    const description: HTMLElement = document.createElement('dd');

    heading.textContent = label;
    description.textContent = value;
    facts.append(heading, description);
  }

  return {
    element: dialog,
    show(country: Country): void {
      if (selectedCountryId === country.id && dialog.open) {
        return;
      }

      selectedCountryId = country.id;
      content.replaceChildren();
      facts.replaceChildren();

      const heading: HTMLHeadingElement = document.createElement('h2');
      const languageNames: string =
        country.languages === null
          ? 'Not available'
          : country.languages
              .map((language: Language): string => language.name)
              .join(', ') || 'No languages listed';
      const currencyNames: string =
        country.currencies === null
          ? 'Not available'
          : country.currencies
              .map((currency: Currency): string =>
                [currency.name, currency.code, currency.symbol]
                  .filter(Boolean)
                  .join(' · '),
              )
              .join(', ') || 'No currencies listed';

      heading.id = 'country-details-title';
      heading.textContent = country.name;
      content.append(createCountryFlag(country), heading, facts);
      addDetail(
        'Overview',
        `${country.name}${country.region ? ` is in ${country.region}` : ''}.${country.capital ? ` Its capital is ${country.capital}.` : ''}`,
      );
      addDetail(
        'Area',
        country.area === null
          ? 'Not available'
          : `${new Intl.NumberFormat().format(country.area)} km²`,
      );
      addDetail(
        'Borders',
        country.borders === null
          ? 'Not available'
          : country.borders.join(', ') || 'No land borders',
      );
      addDetail('Languages', languageNames);
      addDetail('Currencies', currencyNames);

      if (!dialog.open) {
        dialog.showModal();
      }
    },
    close(): void {
      if (dialog.open) {
        dialog.close();
      }
    },
  };
}
