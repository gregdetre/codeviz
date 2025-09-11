# Getting Started with Cytoscape.js

Quick setup guide for creating interactive network visualizations with Cytoscape.js.

## Installation & Setup

### NPM Installation

```bash
npm install cytoscape
```

### Basic HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cytoscape.js Example</title>
  <style>
    #cy {
      width: 100%;
      height: 600px;
      border: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <div id="cy"></div>
  <script src="app.js"></script>
</body>
</html>
```

### Basic JavaScript Setup

```javascript
import cytoscape from 'cytoscape';

// Initialize Cytoscape
const cy = cytoscape({
  container: document.getElementById('cy'),
  
  elements: [
    // Nodes
    { data: { id: 'a', label: 'Node A' } },
    { data: { id: 'b', label: 'Node B' } },
    { data: { id: 'c', label: 'Node C' } },
    
    // Edges
    { data: { id: 'ab', source: 'a', target: 'b' } },
    { data: { id: 'bc', source: 'b', target: 'c' } }
  ],
  
  style: [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle'
      }
    }
  ],
  
  layout: {
    name: 'grid',
    rows: 1
  }
});
```

## First Interactive Example

```javascript
// Add click handler
cy.on('tap', 'node', function(evt) {
  const node = evt.target;
  console.log('Clicked:', node.data('label'));
  
  // Highlight clicked node
  cy.nodes().removeClass('highlighted');
  node.addClass('highlighted');
});

// Add highlighted style
cy.style()
  .selector('.highlighted')
  .style({
    'background-color': '#ff6b6b',
    'border-width': 3,
    'border-color': '#333'
  })
  .update();
```

## Code Visualization Example

```javascript
// Example: Visualize function dependencies
const codeGraph = cytoscape({
  container: document.getElementById('cy'),
  
  elements: [
    // Functions
    { data: { id: 'main', label: 'main()', type: 'function', file: 'app.js' } },
    { data: { id: 'init', label: 'init()', type: 'function', file: 'app.js' } },
    { data: { id: 'render', label: 'render()', type: 'function', file: 'ui.js' } },
    { data: { id: 'utils', label: 'utils.js', type: 'file' } },
    
    // File groupings (compound nodes)
    { data: { id: 'helper1', label: 'helper1()', type: 'function', parent: 'utils' } },
    { data: { id: 'helper2', label: 'helper2()', type: 'function', parent: 'utils' } },
    
    // Dependencies
    { data: { id: 'main-init', source: 'main', target: 'init', type: 'calls' } },
    { data: { id: 'init-render', source: 'init', target: 'render', type: 'calls' } },
    { data: { id: 'render-helper1', source: 'render', target: 'helper1', type: 'calls' } }
  ],
  
  style: [
    {
      selector: 'node[type = "function"]',
      style: {
        'background-color': '#4CAF50',
        'shape': 'ellipse',
        'label': 'data(label)',
        'text-valign': 'center',
        'font-size': 12
      }
    },
    {
      selector: 'node[type = "file"]',
      style: {
        'background-color': '#2196F3',
        'shape': 'round-rectangle',
        'label': 'data(label)',
        'text-valign': 'top',
        'text-margin-y': -10,
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node:parent',
      style: {
        'background-opacity': 0.3,
        'border-width': 2,
        'border-color': '#333',
        'padding': 10
      }
    },
    {
      selector: 'edge[type = "calls"]',
      style: {
        'width': 2,
        'line-color': '#999',
        'target-arrow-color': '#999',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ],
  
  layout: {
    name: 'fcose',
    animate: true,
    fit: true,
    padding: 50
  }
});

// Add interactivity
codeGraph.on('tap', 'node[type = "function"]', function(evt) {
  const func = evt.target;
  
  // Highlight function and its dependencies
  codeGraph.elements().removeClass('highlighted faded');
  
  const connected = func.neighborhood().add(func);
  connected.addClass('highlighted');
  
  codeGraph.elements().difference(connected).addClass('faded');
});

// Add styles for highlighting
codeGraph.style()
  .selector('.highlighted')
  .style({
    'opacity': 1,
    'z-index': 10
  })
  .selector('.faded')
  .style({
    'opacity': 0.3
  })
  .update();
```

## Common Patterns

### Loading Data

```javascript
// From JSON
fetch('/api/graph-data')
  .then(response => response.json())
  .then(data => {
    cy.add(data.elements);
    cy.layout({ name: 'fcose' }).run();
  });

// From CSV or other formats
function loadFromCSV(csvData) {
  const elements = parseCSVToElements(csvData);
  cy.add(elements);
  cy.layout({ name: 'grid' }).run();
}
```

### Dynamic Updates

```javascript
// Add nodes dynamically
function addNode(nodeData) {
  cy.add({
    data: nodeData,
    position: { x: Math.random() * 500, y: Math.random() * 500 }
  });
}

// Remove nodes
function removeNode(nodeId) {
  cy.remove(`#${nodeId}`);
}

// Update node data
function updateNode(nodeId, newData) {
  const node = cy.$(`#${nodeId}`);
  Object.keys(newData).forEach(key => {
    node.data(key, newData[key]);
  });
}
```

### Basic Filtering

```javascript
// Show/hide by type
function toggleNodeType(type, visible) {
  const elements = cy.nodes(`[type = "${type}"]`);
  elements.style('display', visible ? 'element' : 'none');
}

// Search filter
function filterByName(searchTerm) {
  if (!searchTerm) {
    cy.elements().style('display', 'element');
    return;
  }
  
  cy.elements().style('display', 'none');
  
  const matches = cy.nodes().filter(node => {
    return node.data('label').toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  matches.style('display', 'element');
  matches.connectedEdges().style('display', 'element');
}
```

## Next Steps

1. **Explore layouts**: Try different layout algorithms (`fcose`, `dagre`, `circle`)
2. **Add extensions**: Install `cytoscape-popper` for tooltips or `cytoscape-context-menus`
3. **Customize styling**: Create more sophisticated visual styles
4. **Build controls**: Add UI panels for filtering and layout switching
5. **Handle large graphs**: Implement performance optimizations

## See Also

- [Node Grouping](NODE_GROUPING.md) - Create hierarchical structures
- [Filtering](FILTERING.md) - Advanced filtering techniques
- [Layouts](LAYOUTS.md) - Mixed positioning strategies
- [Interactivity](INTERACTIVITY.md) - Rich user interactions
- [Extensions](EXTENSIONS.md) - Useful community extensions

*Based on Cytoscape.js 3.31.0 (September 2025)*