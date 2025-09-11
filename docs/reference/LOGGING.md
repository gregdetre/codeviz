## Runtime Logging Reference

### Introduction

This document explains the intended approach for capturing browser console logs and errors during development. The current TS server MVP does not implement logging endpoints.

### Current status
- Viewer does not post logs to a server in the TS MVP.
- Future: add optional Fastify routes to capture client logs into `out/runtime_logs.jsonl`.

### Future plan (outline)
- Client: wrap `console.*`, listen to `window.onerror`/`unhandledrejection`, buffer and send via `navigator.sendBeacon` when available.
- Server: Fastify `POST /__codeviz_log` appends JSON objects to `out/runtime_logs.jsonl`.
- Controls: query param `?log=0|1` or `localStorage` toggle.

### Troubleshooting
- Until implemented, use the browser console directly.
- For persistent logs, consider running the viewer via `vite dev` and adding a small proxy + logging plugin.

