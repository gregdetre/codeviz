### Keyboard shortcuts

Brief reference for built-in keyboard and modifier interactions in the CodeViz viewer.

### See also
- `VIEWER_COMMANDS.md` – UI command capabilities and interactions
- `UI_WIDGETS_ARRANGEMENT.md` – Search box and details panel placement
- `ts/viewer/src/app.ts` – Search dropdown key handling
- `ts/viewer/src/interaction-manager.ts` – Focus management and modifier-click

### Current shortcuts

- **Escape**: Clear graph focus/selection; hide search suggestions when the search box is focused.
- **Cmd+K (macOS) / Ctrl+K (Windows/Linux)**: Focus the "Ask the assistant…" chat input and select its text.
- **ArrowUp / ArrowDown** (in search box): Move selection in the suggestions dropdown.
- **Enter** (in search box): Open/focus the currently highlighted suggestion.
- **Cmd+Click (macOS) / Ctrl+Click (Windows/Linux)** on a node: Open the node’s source file at its line in the editor.
- **Shift+Click** on a node/group: Toggle selection membership (multi-select). Does not change focus.
- **Shift+Drag** on whitespace: Box select (replaces the current selection).
- **Space (hold)**: Temporarily enter Pan mode. While held, dragging pans the viewport even over nodes; cursor shows grab/grabbing. Ignored when focus is in a text input.
- **Middle mouse button (press & drag)**: Pan the viewport (works over nodes and whitespace).

### Notes
- Shortcuts apply in the viewer (Vite + Cytoscape.js). Behaviour defined in `app.ts` and `interaction-manager.ts`.
- More shortcuts may be added; keep this doc in sync with the implementation.


