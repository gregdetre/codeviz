# Mixed Layouts: Dynamic & Fixed Positioning

Guide to combining force-directed algorithms with fixed positioning constraints in Cytoscape.js.

## Overview

Cytoscape.js supports hybrid layout approaches that combine the organic arrangement of force-directed algorithms with the precision of fixed positioning. This enables layouts where some nodes follow physics-based positioning while others remain anchored or constrained.

## ELK vs fCoSE vs ELK→fCoSE (quick guide)

- **Use ELK**: when you want clear, hierarchical/DAG call flows, orthogonal edge routing, and minimal crossings (e.g., execution flow, module hierarchies). ELK is deterministic and great for “presentation-ready” structure.
- **Use fCoSE**: when you want fast, interactive exploration on compound graphs with animation and constraint support (fixed nodes, alignments). fCoSE is excellent for iterative discovery and refinement.
- **Use ELK→fCoSE (elk-then-fcose, default)**: when you want ELK’s clarity followed by an organic refinement to improve spacing. Start with ELK (animate: false), then apply fCoSE with `randomize:false`.

### ELK (layered / hierarchical)

ELK (Eclipse Layout Kernel) via the Cytoscape adapter provides layered (hierarchical) layouts and advanced edge routing. It works with compound nodes (module grouping) and tends to produce clean top-down diagrams.

- **Strengths**: hierarchical clarity, orthogonal/polyline edge routing, fewer crossings
- **Best for**: call graphs, dependency layers, module hierarchies
- **Tips**: turn animation off for large graphs; consider a web worker for responsiveness

Example options:

```javascript
const elkLayout = {
  name: 'elk',
  animate: false,
  nodeDimensionsIncludeLabels: true,
  elk: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL'
  }
};

cy.layout(elkLayout).run();
```

See also: [Cytoscape-ELK adapter](https://github.com/cytoscape/cytoscape.js-elk) and [ELK project](https://projects.eclipse.org/projects/modeling.elk)

## See Also

- [Node Grouping](NODE_GROUPING.md) - Compound node layouts and hierarchical positioning
- [Cytoscape.js Layouts](https://js.cytoscape.org/#layouts) - Complete layout API reference
- [Layout Blog Post](https://blog.js.cytoscape.org/2020/05/11/layouts/) - Official layout guidance

## Best Layouts for Mixed Positioning

### 1. fCoSE (Recommended)

Fast Compound Spring Embedder - optimal for compound graphs with constraints:

```javascript
const fcoseOptions = {
  name: 'fcose',
  animate: true,
  fit: true,
  
  // Performance
  numIter: 2500,
  
  // Compound node support
  nestingFactor: 0.1,        // How much compound nodes shrink
  gravity: 0.25,             // Keeps groups together
  gravityRange: 3.8,
  
  // Fixed positioning support
  fixedNodeConstraint: undefined,  // Will be set per node
  alignmentConstraint: undefined,  // Alignment constraints
  relativePlacementConstraint: undefined  // Relative positioning
};

cy.layout(fcoseOptions).run();
```

### 2. Cola Layout

Best for complex constraints and smooth transitions:

```javascript
const colaOptions = {
  name: 'cola',
  animate: true,
  maxSimulationTime: 4000,
  
  // Constraint support
  alignment: undefined,      // Alignment constraints
  gapInequalities: undefined, // Spacing constraints
  centerGraph: true,
  
  // Continuous updates during interaction
  flow: { axis: 'y', minSeparation: 30 },
  
  // Smooth transitions
  edgeLength: 100,
  nodeSpacing: 10
};
```

### 3. Preset + Force-Directed Combination

Manual positioning with physics refinement:

```javascript
// Step 1: Set initial positions
const presetPositions = {
  'header': { x: 0, y: 0 },
  'sidebar': { x: -200, y: 100 },
  'main': { x: 200, y: 100 }
};

cy.nodes().positions(function(node) {
  return presetPositions[node.id()] || { x: Math.random() * 400, y: Math.random() * 400 };
});

// Step 2: Apply force-directed refinement
cy.layout({
  name: 'cose',
  animate: true,
  idealEdgeLength: 100,
  nodeOverlap: 20,
  refresh: 20,
  componentSpacing: 100,
  
  // Preserve some fixed positions
  fit: false,  // Don't auto-fit to reset positions
  stop: function() {
    // Post-layout position fixes if needed
    fixCriticalNodePositions();
  }
}).run();
```

## Fixed Positioning Strategies

### Anchor Specific Nodes

```javascript
// Lock nodes in place during layout
function lockNodes(nodeIds) {
  nodeIds.forEach(id => {
    const node = cy.$('#' + id);
    const pos = node.position();
    node.lock();  // Prevent movement
    
    // Store original position for restoration
    node.data('lockedPosition', pos);
  });
}

function unlockNodes(nodeIds) {
  nodeIds.forEach(id => {
    cy.$('#' + id).unlock();
  });
}
```

### Constraint-Based Positioning

Using fCoSE constraints:

```javascript
function applyLayoutConstraints() {
  const constraintOptions = {
    name: 'fcose',
    
    // Fixed node constraints
    fixedNodeConstraint: [
      {nodeId: 'header', position: {x: 0, y: 0}},
      {nodeId: 'footer', position: {x: 0, y: 500}}
    ],
    
    // Alignment constraints  
    alignmentConstraint: {
      vertical: [['sidebar', 'content']],  // Vertically align these nodes
      horizontal: [['header', 'navigation']] // Horizontally align these nodes
    },
    
    // Relative positioning
    relativePlacementConstraint: [
      {left: 'sidebar', right: 'content', gap: 150},
      {top: 'header', bottom: 'content', gap: 100}
    ]
  };
  
  cy.layout(constraintOptions).run();
}
```

## Dynamic Layout Switching

### Responsive Layout Changes

```javascript
class LayoutManager {
  constructor(cy) {
    this.cy = cy;
    this.currentLayout = null;
  }
  
  applyLayout(layoutName, options = {}) {
    // Stop current layout if running
    if (this.currentLayout) {
      this.currentLayout.stop();
    }
    
    const layouts = {
      'force': {
        name: 'fcose',
        animate: true,
        ...options
      },
      'hierarchical': {
        name: 'dagre',
        rankDir: 'TB',
        animate: true,
        ...options
      },
      'circular': {
        name: 'circle',
        animate: true,
        ...options
      },
      'grid': {
        name: 'grid',
        animate: true,
        ...options
      }
    };
    
    this.currentLayout = this.cy.layout(layouts[layoutName]);
    this.currentLayout.run();
    
    return this.currentLayout;
  }
  
  // Smooth transition between layouts
  transitionTo(newLayoutName, duration = 1000) {
    // Get target positions from new layout
    const tempCy = cytoscape({
      elements: this.cy.elements().jsons(),
      headless: true
    });
    
    const tempLayout = tempCy.layout({name: newLayoutName});
    tempLayout.run();
    
    const targetPositions = {};
    tempCy.nodes().forEach(node => {
      targetPositions[node.id()] = node.position();
    });
    
    // Animate to target positions
    this.cy.nodes().forEach(node => {
      const target = targetPositions[node.id()];
      if (target) {
        node.animate({
          position: target
        }, {
          duration: duration,
          easing: 'ease-in-out'
        });
      }
    });
  }
}
```

### Layout Modes for Different Views

```javascript
// Different layouts for different visualization modes
const layoutModes = {
  overview: {
    name: 'fcose',
    fit: true,
    padding: 50,
    nodeRepulsion: node => 4500,
    idealEdgeLength: 200
  },
  
  detail: {
    name: 'cola',
    fit: false,  // Keep current zoom level
    edgeLength: 100,
    nodeSpacing: 20,
    flow: { axis: 'y', minSeparation: 30 }
  },
  
  hierarchical: {
    name: 'dagre',
    rankDir: 'TB',
    rankSep: 100,
    nodeSep: 50
  }
};

function switchToMode(modeName) {
  const layoutOptions = layoutModes[modeName];
  cy.layout(layoutOptions).run();
}
```

## Interactive Layout Control

### Manual Node Positioning with Physics

```javascript
// Allow manual dragging while maintaining physics on other nodes
cy.on('drag', 'node', function(evt) {
  const draggedNode = evt.target;
  
  // Stop any running layout
  if (currentLayout) currentLayout.stop();
  
  // Apply local physics to affected nodes
  const affectedNodes = draggedNode.neighborhood().nodes();
  
  setTimeout(() => {
    // Restart layout for non-dragged nodes
    cy.layout({
      name: 'fcose',
      animate: true,
      fit: false,
      randomize: false,
      // Fix the dragged node position
      fixedNodeConstraint: [{
        nodeId: draggedNode.id(),
        position: draggedNode.position()
      }]
    }).run();
  }, 100);
});
```

### Incremental Layout Updates

```javascript
// Update layout when nodes are added/removed
function addNodeWithLayout(nodeData) {
  cy.add({
    data: nodeData,
    position: { x: Math.random() * 400, y: Math.random() * 400 }
  });
  
  // Run incremental layout
  cy.layout({
    name: 'fcose',
    animate: true,
    fit: false,
    randomize: false,
    numIter: 1000  // Fewer iterations for incremental updates
  }).run();
}

function removeNodeWithLayout(nodeId) {
  cy.remove('#' + nodeId);
  
  // Relayout remaining nodes
  cy.layout({
    name: 'fcose',
    animate: true,
    fit: false,
    numIter: 500
  }).run();
}
```

## Layout-Specific Positioning Patterns

### Code Structure Layouts

#### File-Based Organization

```javascript
function applyFileBasedLayout() {
  // Group nodes by file, then apply layout
  const fileGroups = {};
  
  cy.nodes('[type = "function"]').forEach(node => {
    const file = node.data('file');
    if (!fileGroups[file]) fileGroups[file] = [];
    fileGroups[file].push(node);
  });
  
  // Position file groups in a grid
  const filesPerRow = Math.ceil(Math.sqrt(Object.keys(fileGroups).length));
  let fileIndex = 0;
  
  Object.keys(fileGroups).forEach(fileName => {
    const row = Math.floor(fileIndex / filesPerRow);
    const col = fileIndex % filesPerRow;
    
    const baseX = col * 300;
    const baseY = row * 300;
    
    // Apply local layout to functions within each file
    const fileNodes = cy.collection();
    fileGroups[fileName].forEach(node => fileNodes.merge(node));
    
    // Set approximate positions for this file's nodes
    fileNodes.forEach((node, i) => {
      node.position({
        x: baseX + (i % 3) * 80,
        y: baseY + Math.floor(i / 3) * 80
      });
    });
    
    fileIndex++;
  });
  
  // Fine-tune with force-directed layout
  cy.layout({
    name: 'fcose',
    animate: true,
    fit: true,
    randomize: false,
    numIter: 1500
  }).run();
}
```

#### Dependency Layers

```javascript
function applyLayeredLayout() {
  // Calculate dependency levels
  const entryPoints = cy.nodes('[type = "entry"]');
  const layers = [];
  
  let currentNodes = entryPoints;
  let level = 0;
  
  while (currentNodes.length > 0) {
    layers[level] = currentNodes;
    const nextNodes = cy.collection();
    
    currentNodes.forEach(node => {
      node.outgoers('node').forEach(target => {
        if (!layers.flat().includes(target)) {
          nextNodes.merge(target);
        }
      });
    });
    
    currentNodes = nextNodes;
    level++;
  }
  
  // Position nodes in layers
  layers.forEach((layerNodes, layerIndex) => {
    const y = layerIndex * 150;
    layerNodes.forEach((node, nodeIndex) => {
      const x = (nodeIndex - layerNodes.length / 2) * 120;
      node.position({ x, y });
    });
  });
  
  // Apply gentle force-directed refinement
  cy.layout({
    name: 'cola',
    animate: true,
    fit: true,
    flow: { axis: 'y', minSeparation: 100 },
    edgeLength: 100
  }).run();
}
```

## Performance Optimization

### Efficient Layout Updates

```javascript
// Cache layout results for quick switching
const layoutCache = new Map();

function getCachedLayout(layoutName, elements) {
  const key = `${layoutName}-${elements.length}`;
  
  if (layoutCache.has(key)) {
    return layoutCache.get(key);
  }
  
  // Calculate new layout
  const positions = runLayoutCalculation(layoutName, elements);
  layoutCache.set(key, positions);
  
  return positions;
}

// Batch position updates
function applyPositionsBatch(positions) {
  cy.batch(() => {
    Object.keys(positions).forEach(nodeId => {
      cy.$('#' + nodeId).position(positions[nodeId]);
    });
  });
}
```

### Large Graph Handling

```javascript
// Progressive layout for large graphs
function progressiveLayout(elements, chunkSize = 100) {
  const chunks = [];
  for (let i = 0; i < elements.length; i += chunkSize) {
    chunks.push(elements.slice(i, i + chunkSize));
  }
  
  let processedChunks = 0;
  
  function processNextChunk() {
    if (processedChunks >= chunks.length) return;
    
    const chunk = chunks[processedChunks];
    
    // Apply layout to chunk
    cy.collection(chunk).layout({
      name: 'fcose',
      animate: false,
      fit: false,
      numIter: 500
    }).run();
    
    processedChunks++;
    setTimeout(processNextChunk, 50); // Allow UI updates
  }
  
  processNextChunk();
}
```

## Troubleshooting Layout Issues

### Common Problems

1. **Layout instability**: Increase `numIter` for force-directed layouts
2. **Overlapping nodes**: Adjust `nodeRepulsion` or `nodeSpacing`
3. **Poor compound node layout**: Use `nestingFactor` in fCoSE
4. **Slow performance**: Use `animate: false` for large graphs

### Debug Helpers

```javascript
// Visualize layout constraints
function showConstraints() {
  // Add temporary edges to show constraints
  const constraintEdges = [];
  
  alignmentConstraints.forEach(constraint => {
    constraintEdges.push({
      data: { id: `constraint-${Date.now()}`, source: constraint[0], target: constraint[1] },
      classes: 'constraint-edge'
    });
  });
  
  cy.add(constraintEdges);
  
  // Style constraint edges
  cy.style().selector('.constraint-edge').style({
    'line-style': 'dashed',
    'line-color': '#ff0000',
    'opacity': 0.5
  }).update();
}
```

*Based on Cytoscape.js 3.31.0 layout algorithms and constraint systems (September 2025)*