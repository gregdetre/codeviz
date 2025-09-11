# Product Vision & Features

see:
- `../README.md`
- `cyto/README.md`

Help developers understand complex code & docs.

e.g.
- View the codebase as a graph, where nodes might be functions, files, data structures, etc (depending on the mode)
- See the structure, e.g. group the functions by file
- See the execution flow, e.g. given a particular starting point, arrange the visualisation to make it easy to see what calls what in what order
- See how data structures get passed around, e.g. add a separate graph that shows how the data structures get transformed into one another
- See what has changed since the last Git commit (e.g. highlight new/changed edges and nodes)
- Filter in flexible ways, e.g. functions called by function X, functions that use data structure Y, etc
- Use LLMs to annotate the output from the deterministic code analysis tools, e.g. which functions are important, high-level narratives, tags, etc
- The preprocessing/codebase analysis should output into an intermediate-level .json. Ideally this should be agnostic to programming language.
- There should be a .codeviz.toml config file for each target codebase being analysed
- Rich web UI for exploring dependencies, imports, functions, and module relationships. (Eventually we'll add richer, more imaginative tools)

We're interested in Cytoscape.js features such as:
- being able to group nodes (ideally nested), and move the entire group around, and expand/collapse as a group (e.g. nodes for functions grouped by file)
- being able to filter (either to hide, fade, or disable some)
- a mix of dynamic (e.g. force-directed) and fixed (absolute or relative) positions
- interactivity (clicking to trigger custom actions), tooltips
- and then various GUI widgets


# Versions

## v1 (CURRENT)
- Static analysis of Python codebases only
- Don't worry about performance/scalability. We'll be using it on small codebases.

## FUTURE
- Use similar tools to analyse a large prose essay or book (i.e. not just code, also text)


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
