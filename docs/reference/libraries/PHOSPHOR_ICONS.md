# Phosphor Icons Integration

Short reference for using Phosphor Icons in the CodeViz viewer (Vite + TypeScript), including a loading spinner pattern for the LLM chat panel.

## See also

- `../ICONS_SYMBOLS.md` – Icons used across CodeViz and UI conventions
- `../LLM_CHAT_INTERFACE.md` – Chat feature where the loading spinner is used
- `../VISUAL_DESIGN_STYLING.md` – Global styling patterns used by the viewer

## What is Phosphor?

Phosphor is an open‑source icon family with 1,200+ icons in multiple weights (Thin, Light, Regular, Bold, Fill, Duotone). It’s flexible, well-documented, and licensed under MIT.

- Website: `https://phosphoricons.com`
- GitHub (web package): `https://github.com/phosphor-icons/web`
- NPM (web): `@phosphor-icons/web`
- License: MIT (free for commercial use)

## How we will use it

For CodeViz (vanilla TS + Vite), prefer the web package (CSS + font classes). We don’t use the React/Vue packages in the viewer.

### Install

```bash
npm install @phosphor-icons/web --save
```

Then import in the viewer entry (bundled by Vite):

```ts
// e.g., ts/viewer/src/main.ts or ts/viewer/src/app.ts
import "@phosphor-icons/web";
```

Alternatively (CDN, not preferred in dev):

```html
<!-- ts/viewer/index.html -->
<script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>
```

### Use icons

```html
<i class="ph ph-rocket" aria-hidden="true"></i>
<i class="ph-bold ph-gear" aria-hidden="true"></i>
```

- **weights**: `ph-thin`, `ph-light`, `ph` (regular), `ph-bold`, `ph-fill`, `ph-duotone`
- **size**: via CSS `font-size`; **color**: via CSS `color`
- **a11y**: use `aria-label` or a visually hidden label if meaning-bearing

## Loading spinner pattern (LLM chat)

Phosphor provides a `spinner` glyph. Animate it with CSS:

```html
<!-- Example markup in chat UI -->
<span id="llm-loading" class="cv-loading" hidden>
  <i class="ph ph-spinner" aria-hidden="true"></i>
  <span class="sr-only">Loading…</span>
</span>
```

```css
/* Minimal spin animation */
.cv-loading .ph-spinner {
  display: inline-block;
  animation: cv-spin 1s linear infinite;
}

@keyframes cv-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .cv-loading .ph-spinner { animation: none; }
}
```

```ts
// Show/hide around LLM request lifecycle
const loading = document.getElementById("llm-loading");

export function showLoading() { loading?.removeAttribute("hidden"); }
export function hideLoading() { loading?.setAttribute("hidden", ""); }
```

Notes:
- No built-in spin utility class; add a small CSS keyframe as above.
- Consider `role="status" aria-live="polite"` on a wrapping element if you want screen readers to announce loading.

## Vite/TypeScript notes

- Importing `@phosphor-icons/web` includes CSS and font files in the bundle.
- Prefer pinning a minor version in `package.json` to avoid unexpected visual diffs.
- If you use the CDN in `index.html`, pin the version (e.g., `@2.1.1`).

## Gotchas & guidance

- Icon names/weights can change on majors; pin and test before updating.
- The web package is font-based; if you need fine-grained SVG control, use framework packages (not used here).
- Keep animations subtle and respect `prefers-reduced-motion`.

## References

- Phosphor homepage: `https://phosphoricons.com`
- Phosphor web package: `https://github.com/phosphor-icons/web`
- NPM: `https://www.npmjs.com/package/@phosphor-icons/web`
- Icons overview in CodeViz: `../ICONS_SYMBOLS.md`
