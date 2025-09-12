# Colour Palette & Theming

Brief reference for how colours are applied in the TypeScript viewer and how to override them. See `VISUAL_DESIGN_STYLING.md` for broader UI styling context.

## See also

- `VISUAL_DESIGN_STYLING.md` – Visual components and styling overview
- `LAYOUT.md` – Layout strategy; independent of color
- `ts/viewer/src/style-tokens.ts` – Token defaults and HSL helpers
- `ts/viewer/src/style.ts` – Style generation and group colouring
- `codeviz.config.toml` – Optional viewer colour overrides under `[viewer.colors]`

## Current state

- Group compounds are coloured with light HSL backgrounds and darken slightly with nesting depth:
  - **Folders**: base `folderBg` (HSL) with increased darkness by depth
  - **Modules (files)**: base `moduleBg` (HSL), darkened relative to ancestor folder depth
- Entity nodes use fixed light background colours by kind (function/class/variable) and get a module-tinted background for quick grouping.

## Configuration (global)

Add optional HSL overrides in `codeviz.config.toml`:

```toml
[viewer.colors]
moduleBg = { h = 210, s = 40, l = 92 }
folderBg = { h = 220, s = 20, l = 93 }
```

- Values are HSL (0–360, 0–100, 0–100). Either key may be omitted.
- Overrides are passed to the viewer at runtime via `/viewer-config.json`.

## Notes

- Depth darkening is a simple lightness decrement per level; it does not change hue.
- Highlight colours (focus/incoming/outgoing/moduleOutline) remain configured under `[viewer.highlight.*]`.


