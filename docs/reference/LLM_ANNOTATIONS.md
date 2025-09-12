# LLM Annotations (optional)

CodeViz can optionally enrich the core graph with LLM-generated tags to aid filtering and discovery. This document explains how annotations are produced, where they live, how the viewer uses them, and what to expect when they are absent.

- Core graph: `codebase_graph.json`
- Optional annotations: `llm_annotation.json`

## See also

- `docs/planning/250911d_llm_annotation_and_tag_filtering.md` — Background, design goals, schema details, and acceptance criteria.
- `docs/reference/COMMAND_LINE_USAGE.md` — How to run `extract`, `annotate`, and `view` commands together.
- `docs/reference/JSON_FILE_FORMAT.md` — Core graph schema and reference; mentions optional annotations.
- `docs/reference/LLM_CHAT_INTERFACE.md` — Context on the viewer’s chat integration (separate from offline annotations).
- `ts/src/annotation/annotate.ts` — Implementation that computes metrics and writes `llm_annotation.json`.
- `ts/src/server/server.ts` — Serves the graph and optional annotations to the viewer.
- `ts/viewer/` — Viewer integration; optional status indicator in the left toolbar.
- `docs/reference/TAGGING.md` — How tags are presented and filtered in the viewer

## Principles and key decisions

- Annotations are optional; the viewer must function without them.
- Tags are flat strings. Nodes with no tags conceptually behave as "untagged" (future UI will reflect this).
- Vocabulary modes: `closed | open | suggest`. In `suggest`, the file may include `suggestedTags` that are not auto-applied.
- When `vocab != open`, `nodes[*].tags` must be a subset of `globalTags ∪ projectTags`.
- v1 scope: functions only; later versions may add file/module roll-ups.
- Cost and speed: v1 uses metadata-only prompting with optional `--limit` and ranking to control size.

## How it works (flow)

1. Extract the graph (deterministic):
   - `npm run extract -- <target_dir>` writes `<output.path>/codebase_graph.json`.
2. Optionally annotate:
   - `npm run annotate -- <target_dir> [--vocab ...] [--limit N] [--rank ...]` reads the graph, computes cheap metrics, and writes `<output.path>/llm_annotation.json`.
3. View:
   - `npm run view --` serves the viewer and both files from `<output.path>`.
   - If `llm_annotation.json` is missing, the server returns `204 No Content` and the viewer proceeds without annotations.

## CLI usage

```bash
npm run annotate -- <target_dir> [--vocab closed|open|suggest] [--limit N] [--rank mixed|centrality|fanin|fanout|loc] [--verbose 0|1|2]
```

- Reads `<output.path>/codebase_graph.json`
- Computes lightweight metrics (fan-in, fan-out, degree, LOC)
- Optionally ranks/truncates when `--limit > 0`
- Calls the configured LLM and writes `<output.path>/llm_annotation.json`

## Schema (summary)

The annotations file aligns node IDs with the core graph and includes tag vocabularies:

```json
{
  "version": 1,
  "schemaVersion": "1.0.0",
  "vocabMode": "closed|open|suggest",
  "globalTags": ["logging", "util"],
  "projectTags": ["api"],
  "suggestedTags": [{ "tag": "metrics", "count": 3 }],
  "nodes": [
    { "id": "path/module.py::func", "tags": ["util", "parse"] }
  ]
}
```

Notes:
- `suggestedTags` appears only with `--vocab suggest`.
- When `vocab != open`, `nodes[*].tags` must be a subset of `globalTags ∪ projectTags`.

## Server and viewer behavior

- Endpoint: `/out/llm_annotation.json`
  - Returns `200` and JSON when present
  - Returns `204 No Content` when missing
- The viewer treats missing annotations as optional and shows a subtle status in the left toolbar, e.g., “Annotations: none (optional)”.
- Tags filter widget: when annotations are present, the left pane shows a default-collapsed Tags section with counts and checkboxes. See `TAGGING.md`.


## Limitations

- v1 covers function nodes only; module/file roll-ups are planned.
- Metadata-only prompting (no source/docstrings) in v1 to control token cost and latency.
- Temporary tags (from chat) are session-only and not persisted.

## Future work

- Tag filter widget (checkboxes with union of global/project/suggested/temporary tags and virtual `untagged`).
- Chat-driven commands to add/remove temporary tags in the session.
- Richer ranking/metrics and cross-file heuristics to improve tag relevance.
- Multi-language support beyond Python (JS/TS planned).

## Quick start

```bash
# Extract
npm run extract -- <target_dir>

# Optional: generate annotations
npm run annotate -- <target_dir>

# View
npm run view -- --port 8000
```

Open the viewer and check the left toolbar for the annotations status.
