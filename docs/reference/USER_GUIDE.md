# CodeViz User Guide

This guide covers the key features and modes of the CodeViz interactive viewer. See also `UI_WIDGETS_ARRANGEMENT.md` for where controls live, `LAYOUT.md` for layout details, and `KEYBOARD_SHORTCUTS.md` for keyboard and modifier shortcuts.

## Viewer Modes

The viewer offers two distinct visualization modes, selectable from the Mode dropdown:

### Explore Mode

**Explore** mode provides a detailed view of your codebase:

- **Module compound nodes**: Parent containers representing each module/file
- **Individual entity nodes**: Functions, classes, and variables nested within their modules
- **All relationship edges**: Calls and imports between entities
- **Interactive navigation**: Click nodes to focus on neighborhoods, explore dependencies

Best for: Detailed code exploration, understanding function-level relationships, debugging call flows

### Modules Mode

**Modules** mode provides a high-level architectural overview:

- **Module nodes only**: Shows just the module/file containers
- **Module-to-module imports**: Displays only inter-module dependency relationships
- **Simplified layout**: Removes entity-level detail for clarity

Best for: Understanding overall project structure, identifying module dependencies, architectural planning

## Layout System

### Layout Types

**ELK**: Hierarchical layered layout with orthogonal edge routing, good for showing clear dependency flows

**fCoSE**: Force-directed layout that optimizes for minimal edge crossings and compact arrangements  

**ELK → fCoSE (Hybrid)**: Combines both - starts with ELK's structure, then applies fCoSE refinement

### Hybrid Layout Mode

When using the hybrid ELK → fCoSE layout, refinement runs in **sequential** mode:

- Runs fCoSE after ELK with `randomize:false`
- Allows repositioning for optimal layout
- Best for: General-purpose optimization

### Re-layout Feature

The **Re-layout** button (enabled only for hybrid layouts):
- Re-runs fCoSE optimization on the current graph
- Useful for further improving node positions after initial layout
- Can be clicked multiple times to iteratively improve layout quality

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

### Focus Navigation
- **Click any node**: Focus on that node and its immediate neighbors
- **Click empty space**: Clear focus and show all nodes
- **Press Escape**: Clear focus from keyboard

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

### External Editor Integration
- **VS Code Integration**: Click file paths in the details panel to open files directly in VS Code
- **Cmd+Click (Mac) / Ctrl+Click (Win/Linux)**: Click any node to open its source file in VS Code
- **Automatic fallback**: If VS Code protocol fails, commands are copied to clipboard

## Best Practices

### Exploring Large Codebases
1. Start with **Modules mode** to understand overall structure
2. Switch to **Explore mode** for detailed exploration
3. Use **search** to quickly locate specific components
4. Use **focus** (click nodes) to explore local neighborhoods

### Layout Optimization
1. Try **ELK** first for clear hierarchical view
2. Use **fCoSE** for compact, optimized arrangements
3. Use **hybrid sequential** for best of both worlds
4. Use **Re-layout** button to iteratively improve hybrid layouts

### Performance Tips
- Hide unnecessary element types (variables, etc.) for better performance
- Use search to focus on relevant areas in large graphs
- Prefer **fade mode** over **hide mode** for smoother interactions