import { searchCountries } from '../api/search-countries';
import type {
  Country,
  SearchController,
  SearchFailure,
  SearchState,
} from '../core/country';
import { createSearchController } from '../core/search-controller';

import { createCountryCard } from './country-card';
import { createCountryDetails } from './country-details';
import type { CountryDetails } from './country-details';

function getFailureMessage(failure: SearchFailure): string {
  switch (failure.kind) {
    case 'timeout':
      return 'The search took too long. Please try again.';
    case 'http':
      return `The country service is unavailable (HTTP ${failure.status}). Please try again.`;
    case 'invalid-response':
      return 'The country service returned unreadable data. Please try again.';
    case 'cancelled':
      return '';
    case 'network':
      return 'Check your internet connection and try again.';
  }
}

export function createApp(): HTMLElement {
  const controller: SearchController = createSearchController({
    search: searchCountries,
  });
  const main: HTMLElement = document.createElement('main');
  const eyebrow: HTMLParagraphElement = document.createElement('p');
  const heading: HTMLHeadingElement = document.createElement('h1');
  const description: HTMLParagraphElement = document.createElement('p');
  const label: HTMLLabelElement = document.createElement('label');
  const searchInput: HTMLInputElement = document.createElement('input');
  const searchContainer: HTMLDivElement = document.createElement('div');
  const status: HTMLParagraphElement = document.createElement('p');
  const errorMessage: HTMLParagraphElement = document.createElement('p');
  const retryButton: HTMLButtonElement = document.createElement('button');
  const results: HTMLDivElement = document.createElement('div');
  const footer: HTMLElement = document.createElement('footer');
  const details: CountryDetails = createCountryDetails((): void =>
    controller.closeDetails(),
  );
  let displayedCountries: readonly Country[] | null = null;

  main.className = 'app';
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'A little curiosity goes a long way';
  heading.textContent = 'Find your next discovery.';
  description.className = 'intro';
  description.textContent =
    'Explore countries, from familiar places to names you’ve never heard. Start with a name.';
  label.htmlFor = 'country-search';
  label.textContent = 'Country name';
  searchInput.type = 'search';
  searchInput.id = 'country-search';
  searchInput.placeholder = 'Try Spain, Iceland, or Japan…';
  searchInput.autocomplete = 'off';
  searchInput.spellcheck = false;
  searchInput.setAttribute('aria-describedby', 'search-status');
  searchInput.addEventListener('input', (): void =>
    controller.setInput(searchInput.value),
  );
  searchContainer.className = 'search-container';
  searchContainer.append(label, searchInput);
  status.id = 'search-status';
  status.className = 'search-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  errorMessage.className = 'error-message';
  errorMessage.setAttribute('role', 'alert');
  retryButton.type = 'button';
  retryButton.className = 'retry-button';
  retryButton.textContent = 'Retry';
  retryButton.hidden = true;
  retryButton.addEventListener('click', (): void => controller.retry());
  results.className = 'country-grid';
  results.setAttribute('aria-label', 'Matching countries');
  footer.textContent = 'COUNTRY SEARCH / A WORLD WORTH EXPLORING';
  main.append(
    eyebrow,
    heading,
    description,
    searchContainer,
    status,
    errorMessage,
    retryButton,
    results,
    footer,
    details.element,
  );

  controller.subscribe((state: SearchState): void => {
    errorMessage.textContent =
      state.status === 'error' ? getFailureMessage(state.failure) : '';
    retryButton.hidden = state.status !== 'error';
    results.setAttribute('aria-busy', String(state.status === 'loading'));

    if (state.status === 'results') {
      status.textContent = `${state.countries.length} ${state.countries.length === 1 ? 'country' : 'countries'} to discover`;

      if (displayedCountries !== state.countries) {
        displayedCountries = state.countries;
        results.replaceChildren(
          ...state.countries.map((country: Country): HTMLButtonElement =>
            createCountryCard(country, (id: string): void =>
              controller.selectCountry(id),
            ),
          ),
        );
      }

      const selectedCountry: Country | undefined = state.countries.find(
        (country: Country): boolean => country.id === state.selectedCountryId,
      );

      if (selectedCountry) {
        details.show(selectedCountry);
      } else {
        details.close();
      }
    } else {
      displayedCountries = null;
      results.replaceChildren();
      details.close();
      status.textContent =
        state.status === 'loading'
          ? 'Searching the world…'
          : state.status === 'empty'
            ? 'No countries found. Try another name.'
            : '';
    }
  });

  return main;
}
