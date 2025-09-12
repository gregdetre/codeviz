# Testing

## Principles

Prefer a very small number of high-coverage tests, and try to avoid mocking.

Prefer backend (i.e. non-browser) tests where you can.


## Node tests (no browser)

```bash
npm test
```

## Playwright (optional UI tests)

```bash
npm run test:playwright
# or
npm run test:ui
```

## Notes

- Node tests load `out/demo_codebase/codebase_graph.json` via `pretest`.
- Install deps first: `npm install`.
