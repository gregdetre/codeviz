## gdviz Runtime Logging Reference

### Introduction

This document explains how gdviz captures browser console logs and errors during development, where they are stored, and how to control logging. It covers both the client-side hooks in the viewer and the server endpoint that persists logs.

### See also

- `gdviz/viewer/cyto/` – client-side logging wrapper for `console.*` and global error handlers (Vite app)
- `webserver.py` – dev HTTP server implementing `POST /__gdviz_log` to persist logs as JSONL
- `gdviz/README.md` – quick-start and how to tail logs
 - Vite proxy config – ensure `/__gdviz_log` is proxied to the Python server during dev

### Principles, key decisions

- **Default-on**: Logging is enabled by default to aid rapid debugging.
- **Low overhead**: Uses batching and `navigator.sendBeacon` when available; falls back to `fetch` with `keepalive`.
- **Local, ephemeral**: Logs write to repo-local JSONL; no third-party services required.
- **Opt-out controls**: Developers can disable via query param or `localStorage`.

### How it works

#### Client-side

- The viewer initializes a logging shim at load time.
- It wraps `console.log/info/warn/error` to mirror messages to the server.
- It listens for `window.onerror` and `unhandledrejection` to capture exceptions.
- Events are buffered and periodically flushed to `/__gdviz_log`.
- Payload schema (per event):
  - `level`: `log|info|warn|error`
  - `type` (optional): e.g., `window.error`, `unhandledrejection`
  - `message`: string
  - `args`: serialized console arguments
  - `stack` (when available)
  - `ts`: client ISO timestamp
  - `href`, `ua`, `tag`

#### Server-side

- `webserver.py` handles `POST /__gdviz_log` requests.
- Each event is enriched with `server_ts`, `client_ip`, and request `path`.
- Logs are appended to `gdviz/out/runtime_logs.jsonl` (one JSON object per line).
- `POST /__gdviz_log/clear` truncates the log file.
 - When using the Vite dev server, configure a proxy so viewer requests to `/__gdviz_log` reach the Python dev server (example below).

### Controlling logging

- Default state: ON.
- Disable for current/next loads:
  - Append `?log=0` to the viewer URL, or
  - In DevTools: `localStorage.setItem('gdvizLog','0')`.
- Re-enable:
  - `?log=1`, or `localStorage.setItem('gdvizLog','1')`.

### Usage examples

Enable (default)
- Vite dev server: `http://127.0.0.1:5173/`
- Served build (Python server): `http://127.0.0.1:8000/gdviz/viewer/cyto/dist/index.html`

Disable explicitly
- Vite dev server: `http://127.0.0.1:5173/?log=0`
- Served build (Python server): `http://127.0.0.1:8000/gdviz/viewer/cyto/dist/index.html?log=0`

Tail logs in another terminal:
```bash
tail -f gdviz/out/runtime_logs.jsonl
```

Clear logs via HTTP (optional):
```bash
curl -X POST http://127.0.0.1:8000/__gdviz_log/clear -i
```

### Troubleshooting

- If `gdviz/out/runtime_logs.jsonl` is not created, ensure the dev server is serving the repo root or that `--out-dir .` is used so `/gdviz/out/` is writable.
- If you don’t see logs, confirm logging isn’t disabled: `localStorage.getItem('gdvizLog') !== '0'`.
- Check browser network tab for requests to `/__gdviz_log` and dev server console for `[gdviz-log]` summaries.
 - If using Vite dev server, make sure proxy is configured for `/__gdviz_log`.

### Vite proxy configuration (dev)

Add to `gdviz/viewer/cyto/vite.config.ts`:
```ts
export default defineConfig({
  server: {
    proxy: {
      '/gdviz': 'http://127.0.0.1:8000',
      '/__gdviz_log': 'http://127.0.0.1:8000',
    },
  },
})
```

### Future work

- Add sampling and size limits for very noisy sessions.
- Optional integrations with hosted tools (Sentry, Highlight.io) guarded by env flags.

