# Product Vision & Features

see:
- `../README.md`
- `cyto/README.md`

Help developers understand complex code & docs.

Highlight the important stuff (and de-emphasise the irrelevant), according to the user's context/task/needs, e.g. which functionality they're trying to understand, which part of the codebase has changed, which execution flow they're running, etc.

e.g.
- View the codebase as a graph, where nodes might be functions, files, data structures, etc (depending on the mode)
- See the structure, e.g. group the functions by folder (nested) and file
- See the execution flow, e.g. given a particular starting point, arrange the visualisation to make it easy to see what calls what in what order
- See how data structures get passed around, e.g. add a separate graph that shows how the data structures get transformed into one another
- See what has changed since the last Git commit (e.g. highlight new/changed edges and nodes)
- Filter in flexible ways, e.g. functions called by function X, functions that use data structure Y, etc
- Use LLMs to annotate the output from the deterministic code analysis tools, e.g. which functions are important, high-level narratives, tags, etc
  - Separate `annotate` step produces `llm_annotation.json` next to `codebase_graph.json`
  - Flat tag vocabulary with virtual `untagged`; viewer gets a collapsed Tags filter (all checked by default)
  - Vocab modes: `closed|open|suggest` (suggest = propose for review without applying)
- The preprocessing/codebase analysis should output into an intermediate-level .json. Ideally this should be agnostic to programming language.
- There should be a .codeviz.toml config file for each target codebase being analysed
- Rich web UI for exploring dependencies, imports, functions, and module relationships. (Eventually we'll add richer, more imaginative tools)
 - Expand/collapse groups with sensible defaults (auto-collapse deeper than 2 levels) and a simple UI toggle to switch folder grouping on/off

We're interested in Cytoscape.js features such as:
- being able to group nodes (ideally nested), and move the entire group around, and expand/collapse as a group (e.g. nodes for functions grouped by file)
- being able to filter (either to hide, fade, or disable some)
  - Tag-based filtering: a node is hidden if all of its tags are unchecked
- a mix of dynamic (e.g. force-directed) and fixed (absolute or relative) positions
- interactivity (clicking to trigger custom actions), tooltips
- and then various GUI widgets


# Versions

## v1 (CURRENT)
- Static analysis of Python codebases only
- Don't worry about performance/scalability. We'll be using it on small codebases.
 - Viewer: nested folder → file → function grouping with compound nodes; expand/collapse enabled; default auto-collapse for folders deeper than 2 levels; "Group folders" toggle in left pane
 - New: optional LLM-driven annotations stored in `llm_annotation.json`; tag-based filtering UI (collapsed by default)

## FUTURE
- Use similar tools to analyse a large prose essay or book (i.e. not just code, also text)
 - Aggregated/bundled edges when groups are collapsed; depth slider for grouping; per-project sticky grouping preferences


## Principles

- Get a simple version working end-to-end first, then gradually layer in complexity in stages
- Emphasise speed of experimentation rather than bullet-proofing things
- Avoid fallbacks & defaults - better to fail if input assumptions aren't being met

# Key Questions to think about

1. What information do you want users to extract fastest? Is it:
  - Entry points and main execution paths?
  - Module boundaries and organization?
  - Function types (utilities vs core logic vs data processing)?
  - Call frequency or importance?
2. Do you have access to additional metadata that could drive color decisions, like:
  - Function complexity (lines of code, cyclomatic complexity)?
  - Call frequency or centrality?
  - Function categories (I/O, computation, coordination)?
  - Module types (business logic vs utilities vs data)?

Answers from the user:

1) Yes to all of the above. We probably can't show everything at once. So we'll want to give the user a way to switch mode/intent, which would change what's emphasised.

2) Yes, let's calculate that stuff.
