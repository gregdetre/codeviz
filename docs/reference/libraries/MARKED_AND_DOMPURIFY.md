# Marked + DOMPurify Integration (Viewer Chat)

## Introduction
Short reference for how the viewer chat renders assistant Markdown safely using `marked` (parser) and `DOMPurify` (sanitizer).

## See also
- `ts/viewer/src/chat/chat.ts` – rendering implementation
- `package.json` – dependencies and versions
- `VIEWER_COMMANDS.md` – how assistants can emit UI commands alongside text

## Rationale
- **Marked**: small, fast Markdown-to-HTML parser with stable API.
- **DOMPurify**: widely used XSS sanitizer for untrusted HTML in browsers.

## Usage Pattern
1. Parse Markdown to HTML via Marked.
2. Sanitize the HTML via DOMPurify.
3. Inject as `innerHTML` for assistant messages only; user messages remain as plain text.

```ts
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const rawHtml = String(marked.parse(content, { breaks: true }));
const cleanHtml = DOMPurify.sanitize(rawHtml);
bubble.innerHTML = cleanHtml;
```

## Security Notes
- Always sanitize before setting `innerHTML`.
- Add `rel="noopener noreferrer nofollow"` and `target="_blank"` on links.
- Keep user-authored content as textContent to avoid spoofing.

## Styling Notes
- Code blocks (`pre > code`) use monospace font and subtle background.
- Long blocks are scrollable to avoid layout jumps.

## Maintenance
- When upgrading either library, smoke-test with:
  - links, lists, headings, inline/code fences
  - malicious payload samples (e.g., `<img onerror>`), which must be neutralized
- Both libraries are framework-agnostic; no viewer build config changes required.

