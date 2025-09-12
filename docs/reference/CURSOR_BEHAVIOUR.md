### Cursor behaviour

Brief reference for mouse cursor state changes in the CodeViz viewer.

### States

- Default: Normal pointer as managed by the browser and Cytoscape.
- Space-hold Pan: `grab` when Space is held; `grabbing` while dragging. Restores on release.

### Notes

- Space-hold pan is ignored when focus is in a text input.
- Implemented in `ts/viewer/src/interaction-manager.ts`.

### See also

- `KEYBOARD_SHORTCUTS.md` – keyboard interactions
- `VIEWER_COMMANDS.md` – UI commands and interactions

