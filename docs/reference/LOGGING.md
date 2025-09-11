## Runtime Logging Reference (TS Viewer + Server)

### Overview

The TS viewer forwards browser console logs/warns/errors to the server, which appends them to `out/viewer.log` as JSON Lines. This enables tailing logs while reproducing issues in the browser.

### What gets captured
- `console.log`, `console.warn`, `console.error`
- Basic metadata: timestamp, user-agent, client IP (Fastify-reported)

### Server endpoints
- `POST /client-log`: accepts JSON body `{ level, message, data }` and appends a line to `out/viewer.log`.
- `GET /out/viewer.log`: returns the full log file as `text/plain`.
- `GET /favicon.ico`: returns 204 to avoid noisy 404s.

### Log file location
- Default: `out/viewer.log` under the repository (or current working directory if `out/` exists there).

### How to use
1) Start the server (single-port viewer):
```bash
node ts/dist/cli/index.js view open --port 3080 --no-browser
```
2) Open the viewer and reproduce the issue:
```bash
open http://127.0.0.1:3080
```
3) Tail logs locally:
```bash
tail -f out/viewer.log
```
   or via HTTP:
```bash
curl -s http://127.0.0.1:3080/out/viewer.log | tail -n 50
```

### Notes
- Logging is development-focused and lightweight; payloads are small and best-effort (network failures are ignored on the client).
- The viewer also filters invalid edges to prevent Cytoscape crashes and logs the number of skipped edges.

### Future improvements
- Capture unhandled errors/rejections with stack traces.
- Add a toggle to enable/disable logging from the UI or via `localStorage`.
- Redact sensitive data if needed before forwarding.

