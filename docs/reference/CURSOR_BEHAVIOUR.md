### Cursor behaviour

Brief reference for mouse cursor state changes in the CodeViz viewer.

### States

- Default: Normal pointer as managed by the browser and Cytoscape. Dragging on whitespace pans the viewport.
- Space-hold Pan: `grab` when Space is held; `grabbing` while dragging. Restores on release.
- Shift-hold Box Select: While holding Shift, drag to draw a selection box; nodes and groups intersecting the box become selected. Cursor remains default.

### Notes

- Shift+Click on a node/group toggles its selection membership.
- Shift+Drag box selection replaces the current selection.
- Cmd+Click (macOS) / Ctrl+Click (Windows/Linux) on a node opens the source file; it does not affect selection.
- Middle mouse button (press & drag) pans the viewport.
- Space-hold pan is ignored when focus is in a text input.
- Implemented in `ts/viewer/src/interaction-manager.ts`.

### See also

- `KEYBOARD_SHORTCUTS.md` – keyboard interactions
- `VIEWER_COMMANDS.md` – UI commands and interactions
- `UI_RIGHT_DETAILS_PANE.md` – details pane behaviour for multi-selection



