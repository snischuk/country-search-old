# Country Search design

## Search lifecycle and cancellation

`src/core/search-controller.ts` owns search state without accessing the DOM. Every input edit
invalidates the request revision, cancels the pending debounce timer and immediately aborts the
active request through `AbortController.abort()`. It then clears old results, messages and selected
country, entering idle for blank input or waiting for a nonempty query.

Cancellation happens before the next request's delay. Cancelling only when that delay expires
would let an old response appear below the new input during the waiting window. A revision and
controller-identity check supplements the actual abort and protects against already queued or
non-cooperative completions. Success and failure both check ownership before updating state;
there is no unconditional finally block capable of clearing another request's loading indicator.

`src/api/search-countries.ts` composes caller cancellation and a 10,000 ms timeout through
`AbortSignal.any` and `AbortSignal.timeout`. The first abort reason remains authoritative.
Caller `AbortError` stays silent; `TimeoutError` becomes a recoverable failure. Cancellation is
checked after fetch and after body parsing as well as enforced by the network signal. Native
timeout measures active document time, so suspension can pause its clock.

HTTP 404 means no matches and returns an empty array without parsing an error body. Other non-OK
statuses throw `HttpError` with the status. Network errors remain distinct; invalid JSON and
malformed country records throw `InvalidResponseError`. Retry is enabled only in an error state
and immediately searches the current trimmed query once, with a fresh request controller.

## Debounce timing

`src/core/debounce.ts` implements a trailing 300 ms debounce with the latest arguments and an
explicit cancel method. This delay reduces traffic while typing without imposing a long wait
after a pause. Removing debounce would send requests for every edit; substantially increasing it
would make the interface feel unresponsive. Empty input cancels the timer and never starts fetch.

## Data mapping and complexity

`src/core/map-country-response.ts` validates unknown provider input before constructing immutable
country data. Missing optional fields become null; empty borders means no land borders, whereas
null means unavailable. URL and emoji flag representations are supported. Flag URLs must use
HTTPS. Text is rendered with textContent, and remote text is never interpreted as HTML.

For one country, mapping takes O(L + C + B + S) time and space: L languages, C currencies,
B border codes, and S the total inspected/copied text length. Fixed scalar fields are constant
work apart from their string length. Across N countries, sum these per-country costs.
Duplicate-id validation uses a Set, adding expected O(N) time and O(N) space. There is no
response cache or in-flight deduplication in this version.

## Responsibilities and clean code

- `createCountrySearch` injects fetch and timeout-signal creation, keeping network tests deterministic.
- `mapCountryResponse` is pure, validates data at its trust boundary and preserves raw fixtures.
- `classifySearchError` in `src/core/errors.ts` centralizes error categories instead of duplicating
  HTTP, cancellation and timeout logic in UI event handlers.
- `createSearchController` coordinates state and requests; rendering remains in `src/ui/`.
- `createCountryCard` and `createCountryDetails` create native DOM nodes without dynamic HTML.
- The input node and current result buttons remain stable when opening/closing details, preserving
  keyboard focus. The native dialog supports Escape and focus return, with labelled content.
- Names describe operations and measurements; strict TypeScript and ESLint prevent unchecked
  assertions, debug logging, ambiguous abbreviations and inconsistent naming.

## Verification

`npm test` runs deterministic Vitest tests from `tests/unit/` and `tests/integrations/`.
The required unit history keeps separate failing-test and implementation commits. Test commits
include typed stubs throwing `Not implemented`; imports and TypeScript remain valid.

The dedicated request-race test uses an abort-aware fetch mock with older responses scheduled
later than newer responses. It checks actual signal abortion and verifies the latest state
across 20 schedules; additional controller cases cover clearing and the debounce waiting window.

`npm run test:e2e` runs Playwright against installed Google Chrome and a managed local Vite server.
Controlled browser responses cover loading, immediate clearing, actual cancellation, no matches,
network recovery, details, keyboard focus and ten render-latency measurements. These controlled
checks do not guarantee availability of the external country service or replace deployment checks.
