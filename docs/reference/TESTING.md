# Testing

Minimal, actionable commands to run tests.

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
