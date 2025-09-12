### Tagging and tag-based filtering

A concise guide to how CodeViz tags functions, where tags live, and how the viewer filters by tags.

### See also

- `LLM_ANNOTATIONS.md` – optional LLM-generated annotations file (`llm_annotation.json`) and schema summary
- `../planning/250911d_llm_annotation_and_tag_filtering.md` – design goals, vocab modes, ranking, acceptance criteria
- `UI_LEFT_CONTROLS_PANE.md` – placement and behaviour of the left-hand pane (Tags widget lives here)
- `../ts/viewer/src/tags.ts` – implementation of tag indexing, counts, and filtering overlay classes
- `../ts/viewer/src/load-graph.ts` – loading of graph and optional annotations
- `../ts/viewer/index.html` – container structure (`#tagsSection`, `#tagsList`)

### Principles and key decisions

- Tags are flat strings applied to function nodes only in v1.
- `llm_annotation.json` is optional; the viewer works without it. When present, a Tags widget appears in the left pane.
- Vocabulary modes: `closed | open | suggest`. In `suggest`, new tags are listed in `suggestedTags` but not auto-applied to nodes.
- Nodes with no tags behave as if they have the virtual tag `Untagged`.
- Pinned tags: `Important` and `Entrypoint` always appear at the top of the list (count may be 0).
- Ordering: `Important`, `Entrypoint`, `Untagged`, then all other tags sorted by number of functions descending, ties alphabetically.

### Data sources

- Tags come from `llm_annotation.json` under `nodes[*].tags` and the configured vocabularies `globalTags` and `projectTags`.
- `suggestedTags` are not displayed as selectable options (they are proposals only).
- Tag universe = `globalTags ∪ projectTags ∪ observedNodeTags ∪ {Untagged}` (Untagged only if any function has no tags).

### Viewer behaviour

- The Tags widget is default-collapsed and appears only when annotations are available.
- All tags are selected by default. Shift-click on a tag to select “only this”. Quick actions: All / None.
- Filtering semantics: a function is shown if it has at least one checked tag; nodes with no tags are shown only when `Untagged` is checked.
- Non-matching function nodes are hidden via a dedicated overlay class; edges incident to hidden nodes are hidden. Groups (modules/folders) are auto-hidden when all their member entities are hidden.
- Each function node also receives per-tag CSS classes of the form `.cv-tag-<tag>` (e.g., `.cv-tag-important`, `.cv-tag-entrypoint`) for command-based selection.
- Counts shown as `visible/total` per tag:
  - `total` = number of functions carrying that tag (stable over time)
  - `visible` = number of currently visible functions with that tag (dynamic; respects other tag selections and visibility state)

### Implementation overview

- `tags.ts` builds an index mapping tag → node IDs, and the `untagged` set. It also renders the widget and applies filter classes.
- Styling uses the `.cv-tag-hidden` class for nodes and edges to avoid clobbering other visibility controls, and `.cv-group-hidden-auto` for auto-hiding groups whose members are all hidden.
- The widget is rendered inside `#tagsSection` (`index.html`), with content in `#tagsList`.
- Integration is wired in `app.ts` after graph and annotations load.

### Limitations and future work

- v1 covers function nodes only; future versions may add roll-ups at file/module level and a separate Type filter.
- Persisting tag selections across sessions in `localStorage` is deferred.
- Chat-driven temporary tags and a UI to manage them are planned.


