# Node Grouping & Compound Nodes

Guide to creating hierarchical node structures with expand/collapse functionality in Cytoscape.js.

## Overview

Cytoscape.js supports compound nodes (parent-child relationships) that enable grouping functionality. Compound nodes automatically size themselves based on their children and can be collapsed/expanded programmatically.

## See Also

- [Mixed Layouts](LAYOUTS.md) - Layout algorithms that work well with compound graphs
- [Interactivity](INTERACTIVITY.md) - Click handlers for expand/collapse actions
- [Cytoscape.js Compound Nodes Docs](https://js.cytoscape.org/#notation/compound-nodes)

## Basic Compound Node Structure

### Creating Parent-Child Relationships

```javascript
const elements = [
  // Parent node (file)
  { data: { id: 'file1', label: 'utils.js' } },
  
  // Child nodes (functions in the file)
  { data: { id: 'func1', label: 'parseData', parent: 'file1' } },
  { data: { id: 'func2', label: 'formatOutput', parent: 'file1' } },
  
  // Nested grouping (module containing files)
  { data: { id: 'module1', label: 'Utils Module' } },
  { data: { id: 'file1', label: 'utils.js', parent: 'module1' } }
];
```

### Key Principles

- **Parent property**: Child nodes specify `parent: 'parentId'` in their data
- **Auto-sizing**: Parent dimensions are calculated from children positions
- **No manual positioning**: Compound nodes can't be positioned directly

## Expand/Collapse Implementation

### Using Extensions

**cytoscape-expand-collapse** is the recommended extension:

```javascript
// Install: npm install cytoscape-expand-collapse
import expandCollapse from 'cytoscape-expand-collapse';
cytoscape.use(expandCollapse);

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: elements
});

// Initialize expand-collapse
const api = cy.expandCollapse({
  layoutBy: {
    name: 'fcose', // Layout to apply after expand/collapse
    animate: true
  },
  fisheye: true, // Smooth zoom to fit
  animate: true,
  undoable: false
});

// Programmatic control
api.collapse(cy.$('#file1')); // Collapse a group
api.expand(cy.$('#file1'));   // Expand a group
api.collapseAll();            // Collapse all groups
api.expandAll();              // Expand all groups
```

### Manual Implementation

```javascript
// Custom collapse function
function collapseGroup(parentId) {
  const parent = cy.$('#' + parentId);
  const children = parent.children();
  
  // Hide children and their edges
  children.style('display', 'none');
  children.connectedEdges().style('display', 'none');
  
  // Mark as collapsed for expand logic
  parent.data('collapsed', true);
  
  // Update layout
  cy.layout({ name: 'fcose', animate: true }).run();
}

function expandGroup(parentId) {
  const parent = cy.$('#' + parentId);
  const children = parent.children();
  
  // Show children and edges
  children.style('display', 'element');
  children.connectedEdges().style('display', 'element');
  
  parent.data('collapsed', false);
  
  cy.layout({ name: 'fcose', animate: true }).run();
}
```

## Styling Compound Nodes

### Visual Distinction

```javascript
const style = [
  {
    selector: 'node[?parent]', // Child nodes
    style: {
      'background-color': '#11479e',
      'shape': 'ellipse'
    }
  },
  {
    selector: '$node > node', // Parent nodes  
    style: {
      'background-color': '#f0f0f0',
      'background-opacity': 0.5,
      'border-width': 2,
      'border-color': '#999',
      'shape': 'round-rectangle'
    }
  },
  {
    selector: 'node[collapsed]', // Collapsed state
    style: {
      'background-color': '#ffeb3b',
      'border-width': 3
    }
  }
];
```

### Responsive Sizing

```javascript
// Ensure parent nodes adapt to content
style.push({
  selector: 'node:parent',
  style: {
    'padding': 10, // Space around children
    'compound-sizing-wrt-labels': 'include' // Include labels in sizing
  }
});
```

## Best Layouts for Compound Graphs

### Recommended Layouts

1. **fcose** - Best performance and aesthetics for compound graphs
2. **cose-bilkent** - Good alternative with constraint support  
3. **cola** - Supports additional constraints and smooth transitions

```javascript
const layoutOptions = {
  name: 'fcose',
  animate: true,
  fit: true,
  // Compound-specific options
  nestingFactor: 0.1,        // How much compound nodes shrink
  gravity: 0.25,             // Keeps groups together
  numIter: 2500             // Iterations for stability
};

cy.layout(layoutOptions).run();
```

## Common Patterns

### Code File Grouping

```javascript
// Functions grouped by file
const codeElements = [
  // Files (parent nodes)
  { data: { id: 'auth.js', label: 'auth.js', type: 'file' } },
  { data: { id: 'utils.js', label: 'utils.js', type: 'file' } },
  
  // Functions (child nodes)
  { data: { id: 'login', label: 'login()', parent: 'auth.js', type: 'function' } },
  { data: { id: 'logout', label: 'logout()', parent: 'auth.js', type: 'function' } },
  { data: { id: 'parseJson', label: 'parseJson()', parent: 'utils.js', type: 'function' } },
  
  // Dependencies between functions
  { data: { id: 'login-parseJson', source: 'login', target: 'parseJson' } }
];
```

### Module Hierarchy

```javascript
// Three-level hierarchy: module > file > function  
const hierarchicalElements = [
  // Module level
  { data: { id: 'auth-module', label: 'Authentication', type: 'module' } },
  
  // File level
  { data: { id: 'auth.js', label: 'auth.js', parent: 'auth-module', type: 'file' } },
  { data: { id: 'session.js', label: 'session.js', parent: 'auth-module', type: 'file' } },
  
  // Function level  
  { data: { id: 'login', label: 'login()', parent: 'auth.js', type: 'function' } },
  { data: { id: 'createSession', label: 'createSession()', parent: 'session.js', type: 'function' } }
];
```

## Dynamic Group Management

### Adding Nodes to Groups

```javascript
// Move a node into a group
function moveToGroup(nodeId, newParentId) {
  const node = cy.$('#' + nodeId);
  const newParent = cy.$('#' + newParentId);
  
  // Update parent relationship
  node.data('parent', newParentId);
  
  // Refresh layout to show new grouping
  cy.layout({ name: 'fcose', animate: true }).run();
}
```

### Drag-and-Drop Grouping

```javascript
// Requires cytoscape-compound-drag-and-drop extension
import compoundDragAndDrop from 'cytoscape-compound-drag-and-drop';
cytoscape.use(compoundDragAndDrop);

cy.compoundDragAndDrop({
  grabbedNode: function(node) {
    return !node.isParent(); // Only allow dragging child nodes  
  },
  dropTarget: function(dropTarget, grabbedNode) {
    return dropTarget.isParent(); // Only drop on parent nodes
  }
});
```

## Performance Considerations

### Large Hierarchies

- Use `hideEdgesOnViewport: true` for better panning performance
- Consider lazy loading of deeply nested groups
- Batch expand/collapse operations

```javascript
// Efficient batch operations
cy.batch(() => {
  groups.forEach(group => api.collapse(group));
});
```

### Memory Management

```javascript
// Clean up when removing groups
function removeGroup(groupId) {
  const group = cy.$('#' + groupId);
  const children = group.children();
  
  // Remove children first, then parent
  children.remove();
  group.remove();
}
```

## Troubleshooting

### Common Issues

1. **Layout instability**: Use higher `numIter` values for fcose layout
2. **Overlapping nodes**: Increase `padding` on parent nodes
3. **Poor performance**: Enable `hideEdgesOnViewport` and use batch operations
4. **Missing expand/collapse**: Ensure extension is properly registered

### Debug Helpers

```javascript
// Check compound node structure
cy.nodes().forEach(node => {
  if (node.isParent()) {
    console.log(`Parent: ${node.id()}, Children: ${node.children().length}`);
  }
});

// Verify parent-child relationships
cy.nodes('[?parent]').forEach(child => {
  console.log(`${child.id()} is child of ${child.data('parent')}`);
});
```

*Based on Cytoscape.js 3.31.0 and current extension ecosystem (September 2025)*