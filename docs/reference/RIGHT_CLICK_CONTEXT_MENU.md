### Viewer context menu (right‑click)

Brief reference for the viewer’s radial right‑click context menu. This menu provides fast, gesture‑friendly actions on nodes and edges and complements existing keyboard and mouse interactions.

### See also

- `CURSOR_BEHAVIOUR.md` – overall pointer/selection behaviour; the context menu augments these interactions rather than replacing them
- `libraries/CYTOSCAPE_CXTMENU_INTEGRATION.md` – developer guide for installing, configuring, and customising the Cytoscape cxtmenu integration used by the viewer

### Current state

- Desktop‑first interaction. Touch devices have limited support; provide alternatives via keyboard commands and UI controls when needed.
- Triggers on right‑click (or control‑click) over interactive elements (nodes/edges). It does not open on empty canvas by design.
- Command set is intentionally small for speed (e.g. open in editor, focus, copy, hide). Exact items may evolve; see the integration reference for implementation details.

### How to use

1. Right‑click a node or edge to open the radial menu.
2. Move the cursor toward a command and click (or swipe and release) to activate.
3. Press Escape or click outside the menu to dismiss without action.

### Typical commands

- Open in editor – jump to the file/line for the selected item
- Focus – centre and emphasise the selected element
- Copy – copy the element’s ID or label to the clipboard
- Hide – temporarily hide the element from the view
- Deps – show dependencies for the selected element in the details pane
- Exclude file/folder – persist a glob to `[analyzer].exclude` in the active config (module = file; folder = `<folder>/**`). Run Extract from the left pane to apply.

### Developer notes

- Initialisation and lifecycle are handled alongside viewer setup after the Cytoscape instance is created.
- For API, options, and typing strategies, see `libraries/CYTOSCAPE_CXTMENU_INTEGRATION.md`.

