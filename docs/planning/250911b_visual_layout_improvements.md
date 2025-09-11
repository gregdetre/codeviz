# CodeViz Visual Polish & Interactivity

## Goal, context

Build on the excellent ELK layout foundation to add interactive features and visual polish, transforming CodeViz into a professional tool for exploring small Python codebases.

**Current state**: ELK layout has solved the fundamental layout problems - no overlapping text, good space utilization, clean edge routing, and clear hierarchical flow.

**Remaining work**:
- **Visual differentiation**: All nodes look identical regardless of type/importance  
- **Rich interactivity**: Limited to basic neighbor highlighting and edge toggling
- **Missing tooltips**: No detailed information on hover despite rich metadata available
- **Visual polish**: Basic styling that could benefit from better colors, typography, contrast

Goal: Transform this into a polished, professional visualization tool while maintaining the excellent layout foundation.

## References

- `docs/reference/PRODUCT_VISION_FEATURES.md`: Overall vision including Cytoscape.js features we want (grouping, filtering, interactivity, tooltips)
- `ts/viewer/src/main.ts`: Current TypeScript viewer implementation using Cytoscape.js + ELK layout
- `ts/viewer/index.html`: Basic HTML structure with minimal styling
- Current working demo at http://127.0.0.1:3080 showing much-improved ELK layout
- `out/codebase_graph.json`: Data structure with nodes, edges, groups, and metadata

**Key references from old TypeScript implementation** (`src/codeviz/viewer/cyto/`):
- `src/codeviz/viewer/cyto/src/main.ts`: Rich implementation with details panel, search, mode switching, module colors
- `src/codeviz/viewer/cyto/index.html`: Professional two-pane layout (graph + details sidebar) 
- `src/codeviz/viewer/cyto/src/types.d.ts`: Comprehensive type definitions for graph data
- `src/codeviz/viewer/cyto/src/schema.ts`: JSON schema validation for graph data

## Principles, key decisions

- **Visual quality first**: Focus on making the current functionality look professional before adding new features
- **Small codebase focus**: Don't worry about performance optimizations - target dozens of files max
- **Incremental improvement**: Get each visual fix working before moving to the next
- **Preserve existing functionality**: Don't break current edge toggling, neighbor highlighting, etc.
- **Use existing tech stack**: Stick with Cytoscape.js + TypeScript, work within current architecture
- **Reuse proven patterns**: Leverage excellent features from old implementation (`src/codeviz/viewer/cyto/`)

## Stages & actions

### Stage: Port module-based color generation (Quick win!)
- [ ] Add module-based automatic coloring from old code
  - [ ] Port `hslToHex` function from `src/codeviz/viewer/cyto/src/main.ts:36-55`
  - [ ] Port `hashColorForModule` function from `src/codeviz/viewer/cyto/src/main.ts:57-66`
  - [ ] Update node styling to use generated module colors (see line 86 in old code)
  - [ ] Test that each module gets distinct, readable colors

### Stage: Enhanced visual differentiation  
- [ ] Add node styling based on type and importance
  - [ ] Different shapes/colors for functions vs classes vs variables (using node.kind)
  - [ ] Size nodes based on some measure of importance (number of connections, centrality)
  - [ ] Add visual indicators for exported vs internal functions
- [ ] Improve edge styling and contrast
  - [ ] Better edge colors and arrows (see old code lines 87-90 for examples)
  - [ ] Improve visibility of different edge types (calls vs imports)
  - [ ] Test edge visibility at different zoom levels

### Stage: Port professional two-pane layout (Major UX upgrade!)
- [ ] Update HTML structure to match old professional layout
  - [ ] Port layout from `src/codeviz/viewer/cyto/index.html` (lines 32-35)
  - [ ] Add toolbar with mode selector, search input, clear button
  - [ ] Create right sidebar for details panel (width: 360px)
  - [ ] Update CSS for flex layout: graph on left, details on right
- [ ] Add rich details panel functionality
  - [ ] Port `renderDetails` function from old code (lines 128-178)
  - [ ] Show function signatures, docstrings, file/line info
  - [ ] Display connected nodes with clickable navigation links
  - [ ] Include arguments parsing and tags display

### Stage: Advanced search and filtering (Major usability win!)
- [ ] Port comprehensive search functionality from old code
  - [ ] Port search logic from old `main.ts:220-267`
  - [ ] Search by node ID, label, and module name
  - [ ] Add "hide vs fade" toggle for non-matching nodes
  - [ ] Implement ESC key to reset all filters
- [ ] Improve node focus and highlighting
  - [ ] Port `focusNode` function (old code lines 180-190)
  - [ ] Click node → highlight neighbors, fade others
  - [ ] Click background → reset all highlighting
  - [ ] Make highlighting more prominent than current 0.1 opacity

### Stage: Remaining layout validation
- [ ] Test with different demo codebases to ensure ELK layout robustness

### Stage: Polish and testing
- [ ] Comprehensive visual testing across browsers
  - [ ] Test in Chrome, Firefox, Safari for consistent rendering
  - [ ] Test at different screen sizes and zoom levels  
  - [ ] Verify all interactions work smoothly
- [ ] Performance validation for target use cases
  - [ ] Test with larger demo codebase (if available) to find breaking points
  - [ ] Ensure smooth animations and interactions
  - [ ] Measure and optimize initial load time
- [ ] Documentation and examples
  - [ ] Update viewer documentation with new features
  - [ ] Create visual examples showing before/after improvements
  - [ ] Document best practices for creating readable visualizations

### Stage: Final validation and cleanup
- [ ] End-to-end testing with real Python projects
  - [ ] Test extraction and visualization pipeline with different Python project structures
  - [ ] Validate that improvements work across different coding patterns
  - [ ] Gather feedback on usability improvements
- [ ] Code cleanup and optimization
  - [ ] Refactor viewer code for maintainability
  - [ ] Remove any experimental code or console.log statements
  - [ ] Ensure TypeScript types are properly defined
- [ ] Health checks and commit
  - [ ] Run `npm run build` to ensure compilation succeeds
  - [ ] Run `tsc --noEmit` for type checking
  - [ ] Test that viewer starts and loads demo correctly
  - [ ] Git commit with comprehensive change summary

## Appendix

### Current Technical Stack
- **Frontend**: Vite + TypeScript + Cytoscape.js with ELK layout algorithm
- **Backend**: Fastify server serving static files and graph JSON data  
- **Data format**: JSON schema with nodes (functions/classes), edges (calls/imports), groups (modules)
- **Styling**: Basic CSS with minimal Cytoscape.js style definitions

### Demo Data Analysis
Current demo (`demo_codebase/`) contains:
- ~10 Python functions across 3-4 modules (main, recipe, shopping, ingredients)
- Function call relationships and import dependencies
- Rich metadata including signatures, docstrings, file locations, line numbers

### Old Implementation Feature Analysis

**Sophisticated features available to port from `src/codeviz/viewer/cyto/`:**

#### Rich Details Panel (`main.ts:128-178`)
- Function signatures with parsed arguments
- Docstrings and metadata display  
- File paths with line numbers
- **Clickable connected node navigation** - major UX win
- Tags and custom metadata rendering

#### Module-Based Color Generation (`main.ts:36-66`)
- Hash-based color generation per module
- HSL → Hex conversion for consistent colors
- Automatic contrast and readability

#### Advanced Search & Filtering (`main.ts:220-267`)
- Multi-field search (ID, label, module)
- Hide vs fade toggle for non-matching results
- ESC key reset functionality
- Real-time filtering with visual feedback

#### Professional UI Structure (`index.html`)
- Clean toolbar with controls
- Two-pane layout: graph + details sidebar
- Mode selector for different visualization types
- Comprehensive status indicators

#### Smart Node Focus (`main.ts:180-196`)
- Sophisticated neighbor highlighting
- Opacity-based focus with connected nodes
- Click-to-focus, background-click-to-reset
- Much better than current basic highlighting

#### Schema Validation (`schema.ts`)
- JSON schema validation for data integrity
- Error reporting and debugging support
- Flexible schema loading (local + remote)

### Quick Implementation Priority
1. **Module colors** - Immediate visual improvement, small effort
2. **Details panel** - Major functionality upgrade, medium effort  
3. **Two-pane layout** - Professional appearance, medium effort
4. **Advanced search** - Major usability win, medium effort
5. **Focus/highlighting** - Better interactions, small effort

### Remaining Issues to Address
1. **Poor contrast**: Gray edges (#666) - old code has better examples
2. **No information hierarchy**: Everything looks the same - module colors will fix this
3. **Missing interactivity**: Old code has rich tooltips, navigation, search