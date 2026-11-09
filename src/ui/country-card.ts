import type { Country } from '../core/country';

export function createCountryFlag(country: Country): HTMLElement {
  const container: HTMLSpanElement = document.createElement('span');

  container.className = 'country-flag';

  if (country.flag?.kind === 'image') {
    const image: HTMLImageElement = document.createElement('img');

    image.src = country.flag.value;
    image.alt = `Flag of ${country.name}`;
    image.loading = 'lazy';
    image.addEventListener(
      'error',
      (): void => {
        container.textContent = 'Flag unavailable';
      },
      { once: true },
    );
    container.append(image);
  } else if (country.flag?.kind === 'text') {
    container.classList.add('emoji-flag');
    container.textContent = country.flag.value;
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', `Flag of ${country.name}`);
  } else {
    container.textContent = 'Flag unavailable';
  }

  return container;
}

export function createCountryCard(
  country: Country,
  onCountrySelect: (id: string) => void,
): HTMLButtonElement {
  const card: HTMLButtonElement = document.createElement('button');
  const heading: HTMLSpanElement = document.createElement('span');
  const facts: HTMLSpanElement = document.createElement('span');
  const hint: HTMLSpanElement = document.createElement('span');
  const population: string =
    country.population === null
      ? 'Not available'
      : new Intl.NumberFormat().format(country.population);

  card.type = 'button';
  card.className = 'country-card';
  card.dataset.testid = 'country-card';
  heading.className = 'country-name';
  heading.textContent = country.name;
  facts.className = 'country-facts';
  facts.textContent = `Capital: ${country.capital ?? 'Not available'}\nRegion: ${country.region ?? 'Not available'}\nPopulation: ${population}`;
  hint.className = 'card-hint';
  hint.textContent = 'Explore country →';
  card.append(createCountryFlag(country), heading, facts, hint);
  card.addEventListener('click', (): void => {
    card.focus();
    onCountrySelect(country.id);
  });

  return card;
}
