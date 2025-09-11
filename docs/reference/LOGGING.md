## Runtime Logging Reference (Local-only)

### Overview

Logging is local-only. The viewer writes developer-facing notes to the browser console. A development-only HTTP endpoint is available to read the current log file content. For troubleshooting sessions, you can either tail the local file directly or fetch it over HTTP and pipe to `tail`.

### What gets captured
- The server resets (truncates) the log file on each start: `out/viewer.log`.
- The viewer may print warnings to the browser console (e.g., schema validation warnings); these are not forwarded.

### Server endpoints
- `GET /out/viewer.log`: returns the current log file content as plain text (development use only).
- The server also serves the viewer UI and JSON data.

### Log file location
- Default: `out/viewer.log` under the repository (or current working directory if `out/` exists there).

### How to use
1) Start the server (single-port viewer):
```bash
node ts/dist/cli/index.js view open --no-browser
```
2) Open the viewer and reproduce the issue:
```bash
open http://127.0.0.1:8000
```
3) Tail the last lines of logs locally:
```bash
tail -n 50 out/viewer.log
```

Or via HTTP (default port 8000 unless overridden):
```bash
curl -s http://127.0.0.1:8000/out/viewer.log | tail -n 50
```

### Notes
- Logging is development-focused and local-only.
- The `/out/viewer.log` endpoint simply serves the local file content; it does not forward browser console output.
- The viewer filters invalid edges to prevent Cytoscape crashes and may warn in the browser console.

### Future improvements
- Optional toggle to persist viewer warnings to file (local-only), gated behind a flag.

