# Filtering & Visibility Controls

Guide to hiding, fading, and disabling elements in Cytoscape.js for dynamic graph exploration.

## Overview

Cytoscape.js provides multiple strategies for controlling element visibility: complete hiding (`display: none`), visual fading (`opacity`), and interaction disabling (`events: no`). Each serves different use cases in interactive graph exploration.

## See Also

- [Interactivity](INTERACTIVITY.md) - Event handling and user controls for filtering
- [GUI Controls](GUI_CONTROLS.md) - UI components for filter interfaces
- [Cytoscape.js Selectors](https://js.cytoscape.org/#selectors) - Query syntax for element selection

## Visibility Control Methods

### 1. Hide Elements (display: none)

Completely removes elements from view and layout calculations:

```javascript
// Hide specific elements
cy.$('#node1').style('display', 'none');
cy.$('.temporary').style('display', 'none');

// Show hidden elements
cy.$('#node1').style('display', 'element');

// Hide with connected edges
function hideNodeAndEdges(nodeId) {
  const node = cy.$('#' + nodeId);
  const edges = node.connectedEdges();
  
  node.style('display', 'none');
  edges.style('display', 'none');
}
```

### 2. Fade Elements (opacity)

Reduces visual prominence while maintaining layout:

```javascript
// Fade to semi-transparent
cy.$('.background-nodes').style('opacity', 0.2);

// Gradual fade effect
cy.$('.secondary').style({
  'opacity': 0.3,
  'text-opacity': 0.5
});

// Fade edges differently from nodes
cy.$('edge.weak').style('opacity', 0.1);
```

### 3. Disable Interactivity

Make elements non-interactive while visible:

```javascript
// Disable events on specific elements
cy.$('.disabled').style('events', 'no');

// Re-enable interaction
cy.$('.disabled').style('events', 'yes');

// Combine with visual indication
cy.$('.disabled').style({
  'events': 'no',
  'opacity': 0.5,
  'background-color': '#ccc'
});
```

## Filter Implementation Patterns

### Filter by Node Type

```javascript
// Show only function nodes
function showOnlyFunctions() {
  cy.batch(() => {
    cy.nodes('[type != "function"]').style('display', 'none');
    cy.nodes('[type = "function"]').style('display', 'element');
    
    // Update edges based on visible nodes
    updateVisibleEdges();
  });
}

function updateVisibleEdges() {
  cy.edges().forEach(edge => {
    const source = edge.source();
    const target = edge.target();
    
    if (source.style('display') === 'none' || target.style('display') === 'none') {
      edge.style('display', 'none');
    } else {
      edge.style('display', 'element');
    }
  });
}
```

### Search-Based Filtering

```javascript
function filterBySearch(searchTerm) {
  if (!searchTerm) {
    // Show all elements
    cy.elements().style('display', 'element');
    return;
  }
  
  const matchingNodes = cy.nodes().filter(node => {
    const label = node.data('label').toLowerCase();
    return label.includes(searchTerm.toLowerCase());
  });
  
  cy.batch(() => {
    // Hide all nodes first
    cy.nodes().style('display', 'none');
    
    // Show matching nodes and their connections
    matchingNodes.style('display', 'element');
    matchingNodes.connectedEdges().style('display', 'element');
    matchingNodes.connectedEdges().connectedNodes().style('display', 'element');
  });
}
```

### Attribute-Based Filtering

```javascript
// Filter by multiple criteria
function applyFilters(filters) {
  cy.batch(() => {
    let visibleElements = cy.elements();
    
    // Apply each filter
    Object.keys(filters).forEach(attribute => {
      if (filters[attribute].enabled) {
        const values = filters[attribute].values;
        visibleElements = visibleElements.filter(`[${attribute}]`).filter(el => {
          return values.includes(el.data(attribute));
        });
      }
    });
    
    // Hide all, then show filtered
    cy.elements().style('display', 'none');
    visibleElements.style('display', 'element');
    
    // Show connecting edges
    visibleElements.nodes().connectedEdges().filter((edge) => {
      const source = edge.source();
      const target = edge.target();
      return visibleElements.contains(source) && visibleElements.contains(target);
    }).style('display', 'element');
  });
}
```

## Advanced Filtering Strategies

### Progressive Disclosure

Gradually reveal information based on user focus:

```javascript
function focusMode(centralNodeId, depth = 1) {
  const centralNode = cy.$('#' + centralNodeId);
  
  // Start with all nodes faded
  cy.nodes().style({
    'opacity': 0.1,
    'text-opacity': 0.1
  });
  
  // Highlight central node
  centralNode.style({
    'opacity': 1,
    'text-opacity': 1,
    'background-color': '#ff6b6b'
  });
  
  // Show neighbors at each depth level
  let currentLevel = centralNode;
  for (let i = 0; i < depth; i++) {
    currentLevel = currentLevel.neighborhood().nodes();
    currentLevel.style({
      'opacity': Math.max(0.3, 1 - i * 0.3),
      'text-opacity': Math.max(0.3, 1 - i * 0.3)
    });
  }
  
  // Show connecting edges
  centralNode.edgesWith(currentLevel).style('opacity', 0.7);
}
```

### Contextual Filtering

Filter based on relationships and context:

```javascript
function showCallChain(startNodeId) {
  const startNode = cy.$('#' + startNodeId);
  
  // Find all nodes reachable from start (following call direction)
  const reachableNodes = cy.elements().dijkstra(startNode, edge => 1);
  const callChain = cy.collection();
  
  cy.nodes().forEach(node => {
    const path = reachableNodes.pathTo(node);
    if (path.length > 0) {
      callChain.merge(node);
      callChain.merge(path);
    }
  });
  
  // Fade everything, highlight call chain
  cy.elements().style('opacity', 0.1);
  callChain.style('opacity', 1);
}
```

### Performance-Optimized Filtering

For large graphs, use efficient filtering techniques:

```javascript
// Pre-compute filter groups for performance
const filterGroups = {
  functions: cy.nodes('[type = "function"]'),
  classes: cy.nodes('[type = "class"]'),
  imports: cy.edges('[type = "import"]')
};

function quickFilter(groupName, show = true) {
  const group = filterGroups[groupName];
  if (group) {
    group.style('display', show ? 'element' : 'none');
  }
}

// Batch multiple filter operations
function applyMultipleFilters(operations) {
  cy.batch(() => {
    operations.forEach(op => quickFilter(op.group, op.show));
  });
}
```

## Filter UI Integration

### Toggle Controls

```javascript
function createFilterToggles() {
  const filterPanel = document.getElementById('filter-panel');
  
  const filterTypes = ['functions', 'classes', 'variables', 'imports'];
  
  filterTypes.forEach(type => {
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = true;
    toggle.id = `filter-${type}`;
    
    toggle.addEventListener('change', (e) => {
      const elements = cy.elements(`[type = "${type}"]`);
      elements.style('display', e.target.checked ? 'element' : 'none');
    });
    
    const label = document.createElement('label');
    label.htmlFor = toggle.id;
    label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    filterPanel.appendChild(toggle);
    filterPanel.appendChild(label);
  });
}
```

### Search Interface

```javascript
function createSearchFilter() {
  const searchInput = document.getElementById('search-input');
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterBySearch(e.target.value);
    }, 300); // Debounce search
  });
}
```

### Range Filters

```javascript
function createRangeFilter(attributeName, min, max) {
  const slider = document.getElementById(`${attributeName}-slider`);
  
  // Initialize range slider (using noUiSlider or similar)
  slider.addEventListener('change', (e) => {
    const [minVal, maxVal] = e.target.value.split(',').map(Number);
    
    cy.nodes().forEach(node => {
      const value = node.data(attributeName);
      const visible = value >= minVal && value <= maxVal;
      node.style('display', visible ? 'element' : 'none');
    });
  });
}
```

## Filter State Management

### Save/Restore Filter States

```javascript
class FilterManager {
  constructor(cy) {
    this.cy = cy;
    this.savedStates = new Map();
  }
  
  saveState(name) {
    const state = {
      hiddenElements: [],
      fadedElements: [],
      disabledElements: []
    };
    
    this.cy.elements().forEach(el => {
      const display = el.style('display');
      const opacity = el.style('opacity');
      const events = el.style('events');
      
      if (display === 'none') state.hiddenElements.push(el.id());
      if (opacity < 1) state.fadedElements.push({id: el.id(), opacity});
      if (events === 'no') state.disabledElements.push(el.id());
    });
    
    this.savedStates.set(name, state);
  }
  
  restoreState(name) {
    const state = this.savedStates.get(name);
    if (!state) return;
    
    // Reset all elements
    this.cy.elements().style({
      'display': 'element',
      'opacity': 1,
      'events': 'yes'
    });
    
    // Apply saved state
    state.hiddenElements.forEach(id => {
      this.cy.$('#' + id).style('display', 'none');
    });
    
    state.fadedElements.forEach(item => {
      this.cy.$('#' + item.id).style('opacity', item.opacity);
    });
    
    state.disabledElements.forEach(id => {
      this.cy.$('#' + id).style('events', 'no');
    });
  }
}
```

## Common Filtering Patterns for Code Visualization

### Show File Contents

```javascript
function showFileContents(fileId) {
  // Hide all nodes except the selected file and its functions
  cy.nodes().style('display', 'none');
  
  const file = cy.$('#' + fileId);
  const functions = file.children(); // Assuming compound nodes
  
  file.style('display', 'element');
  functions.style('display', 'element');
  
  // Show internal function calls
  functions.edgesWith(functions).style('display', 'element');
}
```

### Dependency Levels

```javascript
function showByDependencyLevel(maxLevel = 2) {
  // Calculate dependency levels from entry points
  const entryPoints = cy.nodes('[type = "entry"]');
  
  entryPoints.forEach(entry => {
    let currentLevel = cy.collection().union(entry);
    
    for (let level = 0; level < maxLevel; level++) {
      const nextLevel = currentLevel.outgoers().nodes();
      currentLevel = currentLevel.union(nextLevel);
    }
    
    // Show nodes in dependency chain
    currentLevel.style('display', 'element');
    currentLevel.edgesWith(currentLevel).style('display', 'element');
  });
}
```

## Performance Considerations

### Efficient Operations

```javascript
// Use batch operations for multiple changes
cy.batch(() => {
  elements.forEach(el => {
    el.style('display', 'none');
  });
});

// Cache frequently accessed collections
const cachedCollections = {
  functions: cy.nodes('[type = "function"]'),
  classes: cy.nodes('[type = "class"]')
};
```

### Memory Management

```javascript
// Clean up event listeners when filters change
function cleanupFilterListeners() {
  // Remove old event listeners before applying new filters
  cy.removeListener('tap', 'node', oldTapHandler);
  cy.on('tap', 'node[display != "none"]', newTapHandler);
}
```

*Based on Cytoscape.js 3.31.0 visibility and interaction APIs (September 2025)*