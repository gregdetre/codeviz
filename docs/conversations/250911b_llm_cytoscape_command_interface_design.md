# LLM-Cytoscape Command Interface Design - 2025-09-11

---
Date: 2025-09-11
Duration: ~45 minutes
Type: Exploratory, Decision-making
Status: Active - Architecture decisions made, implementation pending
Related Docs: TBD
---

## Context & Goals

User wants to enable LLM-driven interaction with CodeViz's Cytoscape.js visualization. The vision: "I want to be able to have a conversation with an LLM while using CodeViz. I want the LLM to be able to issue commands to Cytoscape.js, e.g. to select subsets of nodes, and emphasise/fade them."

Example use cases mentioned:
- "Highlight the most important functions for preprocessing"  
- "Fade functions related to logging"

Core question: How to safely translate LLM requests into Cytoscape.js manipulation without using `eval()` on raw JavaScript.

## Key Background

**Current CodeViz Architecture:**
- TypeScript CLI with Tree-sitter analysis, Vite + Cytoscape.js viewer
- Existing manipulation capabilities: `InteractionManager` with focus/fade, search functionality, toggle visibility by node/edge type
- Well-structured foundation for extension

**User's Safety Concern:** "We could ask the LLM to output the Javascript itself and just eval it, but that seems a bit risky."

**User's Preference:** "Ideally the LLM would output JSON (or similar), and we'd programmatically turn that into the appropriate JavaScript commands."

## Main Discussion

### Initial Research Findings
Investigation revealed **no built-in Cytoscape.js JSON command system exists**, but several relevant capabilities:
- Cytoscape.js has batch operation support for performance
- Standard JSON models exist for data representation  
- Extensions like expand-collapse provide some JSON manipulation patterns
- Community discussions show interest in programmatic control but no unified command interface

### Architecture Evolution

**First Iteration - Simple JSON Commands:**
Started with basic command structure but quickly identified limitation - conflated selection with action (similar to existing codebase pattern).

**Key Insight from User:** "We do need multiple selections. Last command wins."

**Critical Architectural Realization:** User identified that commands need to operate on their own selection sets rather than modifying a global selection buffer. This led to the breakthrough insight about rich selector specifications.

### Selection vs Action Separation

User emphasized the need for **sequential command capability**: "first deselect everything, then select just the following nodes, then apply some action/modification/view to them, then select these other nodes and do some other action to them."

This drove the realization that the fundamental abstraction should separate:
1. **Target specification** (what to select)
2. **Action specification** (what to do with selection)

Each command operates independently with its own target resolution.

## Alternatives Considered

### Option A: Selection Buffer + Action Commands
Separate selection state management with explicit selection commands followed by action commands.
- **Pro**: Clean separation, composable
- **Con**: Requires complex selection state management, potential confusion

### Option B: Multi-Layer Visual State  
Multiple independent visual layers with priority systems for conflicts.
- **Pro**: Supports complex overlapping visual treatments
- **Con**: Much more complex, potential visual conflicts, performance implications

### Option C: Functional Pipeline
Each command operates on previous result in a pipeline.
- **Pro**: Simple, predictable execution model
- **Con**: Less flexible for complex scenarios

## Decisions Made

**Core Architecture Decision:** Hybrid approach with self-contained commands that include both target specification and action.

```typescript
interface Command {
  type: 'highlight' | 'fade' | 'hide' | 'style' | 'layout';
  target: SelectorSpec;
  params?: any;
}
```

**Selector Specification Language:** Rich selector system supporting:
- Basic selectors (IDs, node types, text search)
- Set operations (union, intersection, difference)  
- Exclusions via `except` clause
- Future extensibility for graph relations and semantic queries

**Conflict Resolution:** "Last command wins" - simpler than priority systems, matches user expectation.

**Example Usage Pattern:**
```json
[
  {
    "type": "fade",
    "target": { "type": "nodes", "nodeType": "variable" }
  },
  {
    "type": "highlight", 
    "target": { 
      "type": "difference",
      "operands": [
        { "type": "nodes", "search": "preprocess" },
        { "type": "nodes", "ids": ["node4"] }
      ]
    }
  }
]
```

## Selector Language Design Levels

**Level 1 (Immediate)**: Basic selectors
- IDs, node types, text search, simple exclusions

**Level 2 (Near-term)**: Set operations
- Union, intersection, difference, nested operations

**Level 3 (Future)**: Graph relationships  
- "All callers of X", "Functions in same module", "Shortest path"

**Level 4 (Advanced)**: Semantic/AI-driven
- "Error handling functions", "Large/complex functions", "Recently modified code"

## Open Questions

**Implementation Priority:** What level of selector complexity should the initial implementation support?

**User Experience Design:**
- Separate chat interface alongside viewer?
- Embedded chat panel in viewer? 
- External API controlling viewer?

**Command Scope:** Should LLMs only manipulate visibility/highlighting, or also control layout, styling, annotations?

**Safety Level:** Should commands be auto-executed, require confirmation, or show preview first?

**Performance Considerations:** How to optimize for complex selector resolution and batch operations?

## Next Steps

1. Implement basic Level 1 selector system with core command types
2. Design and prototype command execution engine with Cytoscape.js integration
3. Create validation system for command JSON structure
4. Prototype LLM integration with structured output generation
5. Design user interface for LLM interaction

## Sources & References

**Cytoscape.js Documentation:**
- [Official Cytoscape.js docs](https://js.cytoscape.org/) - Core API and manipulation methods
- [Standard Cytoscape JSON Models](https://github.com/cytoscape/cytoscape-automation/wiki/Standard-Cytoscape-JSON-Models) - Data format specifications
- [Cytoscape Automation Manual](https://manual.cytoscape.org/en/stable/Programmatic_Access_to_Cytoscape_Features_Scripting.html) - Programmatic access patterns

**Community Extensions:**
- [cytoscape-expand-collapse](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse) - JSON manipulation patterns
- Various Stack Overflow discussions on programmatic manipulation approaches

**LLM Integration Research:**
- JSON mode and structured output parsing techniques
- Safe execution patterns for AI-generated commands
- Format enforcement libraries for reliable JSON generation

## Related Work

- Current CodeViz implementation in `ts/viewer/src/` 
- Existing `InteractionManager` and `search.ts` provide foundation patterns
- `gjdutils/docs/instructions/SOUNDING_BOARD_MODE.md` - facilitated this architectural exploration

**Key Files Referenced:**
- `ts/viewer/src/app.ts` - Main Cytoscape.js initialization and current command patterns
- `ts/viewer/src/interaction-manager.ts` - Existing focus/fade functionality 
- `ts/viewer/src/search.ts` - Text-based search with visual treatment patterns