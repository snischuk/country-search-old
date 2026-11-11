# country-search

## Browser tests

Playwright runs Chrome, Firefox, and WebKit projects. Chrome uses the installed
Google Chrome application; install the managed Firefox and WebKit engines after `npm ci`:

```sh
npx playwright install firefox webkit
```

WebKit engine results are not a substitute for a separately recorded Safari check.

```sh
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e -- --project=chrome
```

The runner starts Vite on `http://127.0.0.1:4173` and stops it after the run.
Port 4173 must be free. Browser tests live in `tests/e2e/`; `npm test` runs `tests/unit/` and
`tests/integrations/`.
Screenshots and traces for failures are written to the ignored `test-results/` directory.
