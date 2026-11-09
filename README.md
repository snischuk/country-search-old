# country-search

## Browser tests

Playwright uses installed Google Chrome. Install dependencies with `npm ci` and
ensure Google Chrome is available before running the tests.

```sh
npm run test:e2e
npm run test:e2e:ui
```

The runner starts Vite on `http://127.0.0.1:4173` and stops it after the run.
Port 4173 must be free. Browser tests live in `tests/e2e/`; `npm test` runs `tests/unit/` and
`tests/integrations/`.
Screenshots and traces for failures are written to the ignored `test-results/` directory.
