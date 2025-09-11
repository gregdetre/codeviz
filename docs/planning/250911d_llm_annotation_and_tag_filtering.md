# LLM-driven annotation tags and viewer filtering

### Goal, context

The viewer becomes noisy even for small codebases. We will introduce tags to surface “what matters now” and hide irrelevant nodes. Tags come from three sources and are combined at runtime:

- Global extraction-time tags (from `codeviz.config.toml`)
- Project-specific extraction-time tags (from `<target>.codeviz.toml`)
- In-memory temporary tags produced during viewer chat sessions (not persisted)

We will also add a separate `annotate` CLI that reads `codebase_graph.json`, computes cheap metrics (fan-in, fan-out, degree, LOC), and asks an LLM to assign tags to functions. Results are stored in a separate `llm_annotation.json` next to the graph so we can regenerate annotations less frequently than static analysis.

### References

- `ts/src/cli/index.ts` — Clipanion CLI entrypoint
- `ts/src/analyzer/extract-python.ts` — current extraction pipeline
- `ts/src/server/server.ts` — single-port Fastify server that serves viewer and graph data
- `ts/viewer/` — Cytoscape.js viewer
- `docs/reference/JSON_FILE_FORMAT.md` — codebase graph schema
- `docs/reference/LLM_CHAT_INTERFACE.md` — viewer chat integration background
- `docs/reference/COMMAND_LINE_USAGE.md` — CLI documentation to update

### Principles, key decisions

- Tags are flat strings. Nodes with no tags behave as if they have the virtual tag `untagged`.
- Vocabulary control: `vocab=closed|open|suggest` (default `closed`). `suggest` proposes new tags for review but does not apply them.
- Filtering rule (left pane widget): A node is shown if any of its tags are checked. Nodes with no tags use `untagged`. Default: all tags checked; widget collapsed.
- Scope v1: functions only for annotation; file/module rollups later.
- Ranking: `mixed` (default) orders nodes by a weighted combo of normalized fan-in (0.4), fan-out (0.3), and LOC (0.3). Other modes: `centrality|fanin|fanout|loc`. Ranking is used when `limit > 0` or for UI ordering; default `limit=0` (no cap).
- LLM inputs v1: metadata-only (graph + cheap metrics); no source text/docstrings.
- Output folder semantics: `[output].path` in per-target config points to a folder. We always write `codebase_graph.json` and `llm_annotation.json` into that folder.
- Starter global tags (tunable later): `logging`, `util`, `cli`, `config`, `io`, `network`, `db`, `cache`, `api`, `security`, `error-handling`, `parse`, `serialize`, `compute`, `entrypoint`, `experimental`, `deprecated`.

### CLI: annotate (new)

```
npm run annotate -- <target_dir> [options]

Options:
  --vocab <closed|open|suggest>    Vocabulary mode (default: closed)
  --limit <int>                    Max nodes to send to LLM (default: 0 = no limit)
  --rank <mixed|centrality|fanin|fanout|loc>
                                   Ordering strategy when limiting (default: mixed)
  --verbose <int>                  Verbosity level (default: 0)
```

Behavior:
- Loads global config and per-target config (auto-resolved).
- Reads `<output.path>/codebase_graph.json`.
- Computes cheap metrics (fan-in, fan-out, degree, LOC) per function node.
- If `limit>0`, sorts by `rank` and truncates the candidate set.
- Builds a prompt including: configured vocabularies (global + project), metrics, and node metadata.
- Calls the configured LLM (from `[llm]` in `codeviz.config.toml`).
- Writes `<output.path>/llm_annotation.json`.

### llm_annotation.json schema (v1)

Minimal and extensible; aligns node IDs with `codebase_graph.json`.

```json
{
  "version": 1,
  "schemaVersion": "1.0.0",
  "generatedAt": "2025-09-11T12:34:56Z",
  "vocabMode": "closed",
  "globalTags": ["logging", "util"],
  "projectTags": ["llm", "expensive"],
  "suggestedTags": [
    { "tag": "data-ingest", "count": 5 },
    { "tag": "metrics", "count": 3 }
  ],
  "nodes": [
    { "id": "demo_codebase/utils/helpers.py::clean_text", "tags": ["util", "parse"] },
    { "id": "demo_codebase/recipe.py::build_shopping_list", "tags": ["compute"] }
  ]
}
```

Notes:
- `suggestedTags` present only when `vocab=suggest`; they are not auto-applied.
- `nodes[*].tags` must be a subset of `globalTags ∪ projectTags` when `vocab != open`.
- Future fields (optional later): per-tag confidence, rationales, metrics echo, per-node proposed tags.

### Viewer behavior

- Server loads both files from `<output.path>` and serves them (or the viewer fetches both paths).
- Viewer computes `total-tags = global ∪ project ∪ temporary ∪ {untagged (if any node has no tags)}`.
- Left-pane widget (collapsed by default) lists checkboxes (all checked by default).
- A node is hidden if all its tags are unchecked.
- Temporary tags are added via chat commands and exist only in memory for the session.

### Stages & actions

#### Stage: Config + documentation
- [x] Update `codeviz.config.toml` to add `[tags] global=[...]`.
- [x] Change per-target configs so `[output].path` is a folder and update examples:
  - [ ] `configs/demo_codebase.codeviz.toml`
  - [ ] `configs/hellozenno_backend.codeviz.toml`
- [x] Update docs:
  - [x] `docs/reference/COMMAND_LINE_USAGE.md` with `annotate` command
  - [x] `docs/reference/JSON_FILE_FORMAT.md` to mention `llm_annotation.json` alongside the graph and reference its schema summary here

#### Stage: Annotate CLI implementation
- [x] Add `annotate` command to `ts/src/cli/index.ts` and `npm run annotate` script.
- [x] Implement `ts/src/annotation/annotate.ts` (new) to:
  - [x] Load config and graph; compute metrics; rank/truncate if `limit>0`.
  - [ ] Build prompt using vocab mode and tag lists.
  - [ ] Call LLM (via chosen SDK) and validate output.
  - [x] Write `<output.path>/llm_annotation.json`.
- [x] Add `--vocab`, `--limit`, `--rank`, `--verbose` options.
- [ ] Add unit/CLI tests for happy-path and edge cases (no tags, empty graph, invalid vocab).

#### Stage: Server + viewer integration
- [ ] Server: expose both files to the viewer; handle missing `llm_annotation.json` gracefully.
- [ ] Viewer: load annotations; compute `total-tags` union; apply virtual `untagged`.
- [ ] Viewer UI: left-pane `Tags` widget (collapsed; checkboxes all checked).
- [ ] Filtering: hide nodes whose tag set is entirely unchecked; edges to hidden nodes are hidden.
- [ ] Persist UI state in `localStorage` (optional v1.1).

#### Stage: Chat-driven temporary tags (v1)
- [ ] Define viewer command(s) to add/remove temporary tags to node IDs in memory.
- [ ] Update checkbox list when temporary tags appear; do not persist to disk.
- [ ] Basic prompt template so the chat can output add/remove tag commands.

#### Stage: Health checks
- [ ] Type-check `ts/` (`tsc --noEmit`).
- [ ] Run viewer tests (`npm test` / Playwright) after UI changes.
- [ ] Build and quick manual run-through on `demo_codebase/`.

### Acceptance criteria

- `npm run annotate -- demo_codebase` produces `out/demo_codebase/llm_annotation.json` with tags for functions and optional `suggestedTags` when `--vocab suggest`.
- Viewer shows a `Tags` widget; hiding by unchecked tags works; `untagged` behaves correctly.
- `total-tags` includes global, project, and temporary tags; no persistence of temporary tags.
- Config `[output].path` folder contains both `codebase_graph.json` and `llm_annotation.json`.

### Risks & follow-ups

- Token costs and latency: mitigate with metadata-only v1 and optional `limit`.
- Tag drift: allow `suggest` mode for review; later add accept/commit UX to merge into config.
- Quality of ranking: consider richer centrality later (e.g., betweenness, PageRank) if performance allows.
- Multi-language extraction: current path is Python; design keeps tags language-agnostic.


