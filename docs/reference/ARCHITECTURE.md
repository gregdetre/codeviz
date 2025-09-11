# CodeViz Architecture Overview

High-level system architecture for CodeViz. This document explains how the extraction and viewer components work together to create interactive code visualizations.

## See also

- `../../README.md` - Project overview and quick start
- `SETUP.md` - Development environment setup and dependencies
- `LAYOUT.md` - Layout strategies and compound node grouping
- `cyto/README.md` - Cytoscape.js implementation guides
- `../../schema/codebase_graph.schema.json` - JSON data format specification

## Introduction

CodeViz follows a **two-phase architecture**: static analysis extracts codebase data into JSON, then a client-side viewer renders interactive visualizations.

## System Components

### 1. Data Extraction Phase (TS)

**Purpose**: Parse Python source code and extract structural relationships

**Key Files**:
- `ts/src/analyzer/extract-python.ts` - Extraction logic (Tree-sitter)
- `ts/src/config/loadConfig.ts` - Per-target TOML config loader

**Process**:
1. File discovery (glob exclusions via config)
2. Parse with Tree-sitter
3. Extract functions, simple call edges, imports
4. Build module groups and moduleImports
5. Emit `out/codebase_graph.json`

### 2. Visualization Phase (TS)

**Purpose**: Render interactive graph visualizations from extracted data

**Key Files**:
- `ts/viewer/` - Vite app (Cytoscape viewer)
- `ts/src/server/server.ts` - Single-port Fastify server

**Process**:
1. Load JSON from `out/codebase_graph.json`
2. Render with Cytoscape.js (compound nodes by module)
3. Basic interactions: toggle edges, neighbor highlight
4. Layout: `fcose` for compound support

## Data Flow Architecture

```
┌───────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Python Files │───▶│  TS Analyzer (AST)   │───▶│  codebase_graph │
│  (.py)        │    │  tree-sitter-python  │    │  .json          │
└───────────────┘    └──────────────────────┘    └─────────────────┘
                                │                           │
                                ▼                           ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Config (TOML)  │───▶│  Graph Building  │───▶│  Viewer (Vite)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │  Server (TS)    │
                                              │  Fastify        │
                                              └─────────────────┘
```

## Core Data Structures

See `schema/codebase_graph.schema.json` for the complete format; the TS tool preserves this schema.

## Principles and Design Decisions

- Static analysis first (deterministic, no runtime deps)
- Client-side rendering (fast iteration)
- Per-target TOML configuration
- Keep schema stable for compatibility

## Future Architecture Considerations

- Switchable parser backend (web-tree-sitter/WASM)
- React UI shell for richer panels
- Multi-language analyzers under `ts/src/analyzer/*`