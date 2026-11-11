export interface Language {
  readonly name: string;
  readonly code: string | null;
}

export interface Currency extends Language {
  readonly symbol: string | null;
}

export type Flag = { readonly kind: 'image' | 'text'; readonly value: string };

export interface Country {
  readonly id: string;
  readonly name: string;
  readonly flag: Flag | null;
  readonly capital: string | null;
  readonly region: string | null;
  readonly population: number | null;
  readonly area: number | null;
  readonly borders: readonly string[] | null;
  readonly languages: readonly Language[] | null;
  readonly currencies: readonly Currency[] | null;
}

export type SearchFailure =
  | { readonly kind: 'cancelled' | 'timeout' | 'invalid-response' | 'network' }
  | { readonly kind: 'http'; readonly status: number };

export type SearchState = {
  readonly input: string;
  readonly query: string;
} & (
  | { readonly status: 'idle' | 'waiting' | 'loading' | 'empty' }
  | {
      readonly status: 'results';
      readonly countries: readonly Country[];
      readonly selectedCountryId: string | null;
    }
  | { readonly status: 'error'; readonly failure: SearchFailure }
);

export type Search = (query: string, signal: AbortSignal) => Promise<Country[]>;

export type Listener = (state: SearchState) => void;

export interface SearchController {
  setInput(input: string): void;
  retry(): void;
  selectCountry(id: string): void;
  closeDetails(): void;
  getState(): SearchState;
  subscribe(listener: Listener): () => void;
  dispose(): void;
}
