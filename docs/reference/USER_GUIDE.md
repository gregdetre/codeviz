# CodeViz User Guide

This guide covers the key features of the CodeViz interactive viewer. See also `UI_WIDGETS_ARRANGEMENT.md` for where controls live, `LAYOUT.md` for layout details, and `KEYBOARD_SHORTCUTS.md` for keyboard and modifier shortcuts.

## Viewer Overview

The viewer presents your codebase with:

- Module compound nodes (per file) containing functions, classes, and variables
- Relationship edges (calls and imports)
- Interactive navigation (search, focus, selection, expand/collapse)

## Layout System

### Layout Types

**ELK**: Hierarchical layered layout with orthogonal edge routing, good for showing clear dependency flows

**fCoSE**: Force-directed layout that optimizes for minimal edge crossings and compact arrangements  

**ELK → fCoSE (Hybrid)**: Combines both - starts with ELK's structure, then applies fCoSE refinement

### Recompute layout

- The **Recompute layout** button re-runs the currently selected algorithm (ELK, fCoSE, or Hybrid)
- It does not change viewport, selection, filters, or styling

### Recenter

- The **Recenter** button fits the viewport to all visible elements (camera-only)

## Search Functionality

The search box provides real-time filtering with the following behavior:

### Search Targets
- **Node labels**: Function, class, and variable names
- **Module names**: File and directory paths  
- **File paths**: Full file system paths
- **Node IDs**: Internal identifiers

### Search Behavior
- **Real-time**: 150ms debounced search as you type
- **Fade mode**: Non-matching nodes become faded, matches stay highlighted
- **Neighborhood inclusion**: Immediate neighbors of matches remain visible
- **Clear search**: Empty the search box to restore full visibility

### Search Tips
- Use partial matches: "util" will find "utilities", "string_util", etc.
- Search by file: "models" will highlight all nodes in files containing "models"
- Case insensitive: "MyFunction" and "myfunction" both work

## Interactive Features

### Focus & Selection
- **Click any node**: Focus on that node and its immediate neighbors
- **Click empty space**: Clear focus and show all nodes
- **Press Escape**: De-select and clear focus (ignored when typing in inputs)
- **Clear selection** button: De-selects without affecting filters or styling

### Element Toggles
Use the control panel to show/hide different elements:
- **Calls**: Function call relationships
- **Imports**: Import/dependency edges
- **Functions**: Function nodes
- **Classes**: Class nodes  
- **Variables**: Variable nodes

### Filter Modes
- **Fade**: Non-focused elements become translucent (default)
- **Hide**: Non-focused elements disappear completely

### Filters and Styling
- **Search**: Real-time filtering (fade/hide based on Filter Mode)
- **Clear filters**: Resets search, filter mode to Fade, and re-enables all element toggles
- **Clear styling**: Removes focus/highlight styling without changing visibility

### Groups (Expand/Collapse)
- **Expand all / Collapse all**: Expand or collapse folder and module groups (if plugin available)

### External Editor Integration
- **VS Code Integration**: Click file paths in the details panel to open files directly in VS Code
- **Cmd+Click (Mac) / Ctrl+Click (Win/Linux)**: Click any node to open its source file in VS Code
- **Automatic fallback**: If VS Code protocol fails, commands are copied to clipboard

## Best Practices

### Exploring Large Codebases
1. Use **Recenter** to get an overview of visible elements
2. Use **search** to quickly locate specific components
3. Use **focus** (click nodes) to explore local neighborhoods

### Layout Optimization
1. Try **ELK** first for clear hierarchical view
2. Use **fCoSE** for compact, optimized arrangements
3. Use **hybrid sequential** for best of both worlds
4. Use **Recompute layout** to re-run the active layout algorithm when needed

### Performance Tips
- Hide unnecessary element types (variables, etc.) for better performance
- Use search to focus on relevant areas in large graphs
- Prefer **fade mode** over **hide mode** for smoother interactions