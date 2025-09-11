# Best Practices & Performance

Proven patterns and optimization techniques for building robust Cytoscape.js applications.

## Performance Optimization

### Large Graph Handling

```javascript
// Enable viewport optimizations for graphs > 1000 elements
const cy = cytoscape({
  container: document.getElementById('cy'),
  
  // Performance settings
  hideEdgesOnViewport: true,    // Hide edges while panning/zooming
  textureOnViewport: true,      // Use texture during viewport changes
  motionBlur: true,            // Smooth transitions
  wheelSensitivity: 0.1,       // Slower zoom for better control
  
  elements: largeElementSet,
  
  style: styleSheet,
  layout: { name: 'fcose' }
});
```

### Batch Operations

```javascript
// Always batch multiple element operations
cy.batch(() => {
  elements.forEach(el => {
    el.style('background-color', newColor);
    el.data('processed', true);
  });
});

// Batch DOM updates
function updateManyNodes(updates) {
  cy.batch(() => {
    updates.forEach(update => {
      cy.$('#' + update.id).data(update.data);
    });
  });
  
  // Single layout run after all updates
  cy.layout({ name: 'fcose', animate: false }).run();
}
```

### Efficient Element Selection

```javascript
// Cache frequently used collections
const functionNodes = cy.nodes('[type = "function"]');
const callEdges = cy.edges('[type = "call"]');

// Use specific selectors instead of filtering
// Good
const visibleFunctions = cy.nodes('[type = "function"]:visible');

// Less efficient
const visibleFunctions2 = cy.nodes('[type = "function"]').filter(':visible');

// Cache complex selector results
const complexSelection = cy.nodes('[complexity > 5][type = "function"]:visible');
```

### Memory Management

```javascript
class GraphManager {
  constructor() {
    this.cy = null;
    this.eventListeners = new Map();
    this.tooltips = new Map();
  }
  
  cleanup() {
    // Remove all event listeners
    this.eventListeners.forEach((listener, event) => {
      this.cy.removeListener(event, listener);
    });
    this.eventListeners.clear();
    
    // Destroy tooltips
    this.tooltips.forEach(tooltip => tooltip.destroy());
    this.tooltips.clear();
    
    // Clear Cytoscape instance
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
  
  addEventListener(event, selector, handler) {
    const key = `${event}-${selector}`;
    this.cy.on(event, selector, handler);
    this.eventListeners.set(key, handler);
  }
}
```

## Code Organization

### Modular Architecture

```javascript
// graph-manager.js
export class GraphManager {
  constructor(container, options = {}) {
    this.cy = cytoscape({
      container,
      ...this.getDefaultOptions(),
      ...options
    });
    
    this.layoutManager = new LayoutManager(this.cy);
    this.filterManager = new FilterManager(this.cy);
    this.interactionManager = new InteractionManager(this.cy);
  }
  
  getDefaultOptions() {
    return {
      style: this.getDefaultStyle(),
      layout: { name: 'fcose' }
    };
  }
}

// layout-manager.js
export class LayoutManager {
  constructor(cy) {
    this.cy = cy;
    this.currentLayout = null;
    this.layoutConfigs = new Map();
  }
  
  applyLayout(name, options = {}) {
    const config = { ...this.layoutConfigs.get(name), ...options };
    this.currentLayout = this.cy.layout(config);
    this.currentLayout.run();
    return this.currentLayout;
  }
}
```

### Style Management

```javascript
// styles.js - Centralized style definitions
export const nodeStyles = {
  function: {
    'background-color': '#4CAF50',
    'shape': 'ellipse',
    'width': 40,
    'height': 40
  },
  
  class: {
    'background-color': '#2196F3',
    'shape': 'round-rectangle',
    'width': 60,
    'height': 40
  },
  
  variable: {
    'background-color': '#FF9800',
    'shape': 'diamond',
    'width': 30,
    'height': 30
  }
};

export const edgeStyles = {
  call: {
    'line-color': '#666',
    'target-arrow-color': '#666',
    'target-arrow-shape': 'triangle',
    'width': 2
  },
  
  import: {
    'line-color': '#9C27B0',
    'line-style': 'dashed',
    'width': 1
  }
};

// Generate Cytoscape style array
export function generateStyleSheet() {
  const styles = [];
  
  Object.entries(nodeStyles).forEach(([type, style]) => {
    styles.push({
      selector: `node[type = "${type}"]`,
      style
    });
  });
  
  Object.entries(edgeStyles).forEach(([type, style]) => {
    styles.push({
      selector: `edge[type = "${type}"]`,
      style
    });
  });
  
  return styles;
}
```

## Error Handling

### Robust Event Handling

```javascript
function safeEventHandler(handler) {
  return function(evt) {
    try {
      handler.call(this, evt);
    } catch (error) {
      console.error('Event handler error:', error);
      
      // Optional: Report to error tracking service
      if (window.errorTracker) {
        window.errorTracker.report(error, { 
          event: evt.type,
          element: evt.target.id() 
        });
      }
    }
  };
}

// Usage
cy.on('tap', 'node', safeEventHandler(function(evt) {
  // Your handler code here
  handleNodeClick(evt.target);
}));
```

### Layout Error Recovery

```javascript
function applyLayoutWithFallback(layoutName, options = {}) {
  const layouts = [
    { name: layoutName, ...options },
    { name: 'fcose', animate: false },  // Fallback 1
    { name: 'grid', animate: false }    // Fallback 2
  ];
  
  function tryLayout(index = 0) {
    if (index >= layouts.length) {
      console.error('All layout attempts failed');
      return;
    }
    
    const layout = cy.layout(layouts[index]);
    
    layout.on('layoutstop', () => {
      console.log(`Layout ${layouts[index].name} completed successfully`);
    });
    
    layout.on('layouterror', () => {
      console.warn(`Layout ${layouts[index].name} failed, trying fallback`);
      tryLayout(index + 1);
    });
    
    layout.run();
  }
  
  tryLayout();
}
```

## Data Validation

### Element Validation

```javascript
function validateElements(elements) {
  const errors = [];
  const nodeIds = new Set();
  
  // Validate nodes
  elements.forEach((el, index) => {
    if (el.data && el.data.id) {
      if (nodeIds.has(el.data.id)) {
        errors.push(`Duplicate node ID: ${el.data.id} at index ${index}`);
      }
      nodeIds.add(el.data.id);
    } else {
      errors.push(`Missing node ID at index ${index}`);
    }
  });
  
  // Validate edges
  elements.forEach((el, index) => {
    if (el.data && el.data.source && el.data.target) {
      if (!nodeIds.has(el.data.source)) {
        errors.push(`Edge at index ${index} references non-existent source: ${el.data.source}`);
      }
      if (!nodeIds.has(el.data.target)) {
        errors.push(`Edge at index ${index} references non-existent target: ${el.data.target}`);
      }
    }
  });
  
  return errors;
}

// Usage
function loadElements(elements) {
  const errors = validateElements(elements);
  if (errors.length > 0) {
    console.error('Element validation failed:', errors);
    return false;
  }
  
  cy.add(elements);
  return true;
}
```

## State Management

### Application State Pattern

```javascript
class GraphState {
  constructor() {
    this.state = {
      selectedNodes: new Set(),
      hiddenElements: new Set(),
      currentLayout: 'fcose',
      filters: {},
      zoomLevel: 1,
      panPosition: { x: 0, y: 0 }
    };
    
    this.listeners = [];
  }
  
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    this.listeners.forEach(listener => {
      listener(this.state, oldState);
    });
  }
  
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  // State query methods
  isNodeSelected(nodeId) {
    return this.state.selectedNodes.has(nodeId);
  }
  
  isElementHidden(elementId) {
    return this.state.hiddenElements.has(elementId);
  }
}
```

### Undo/Redo System

```javascript
class CommandManager {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = 50;
  }
  
  execute(command) {
    // Remove any commands after current index
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Execute command
    command.execute();
    
    // Add to history
    this.history.push(command);
    this.currentIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }
  
  undo() {
    if (this.currentIndex >= 0) {
      const command = this.history[this.currentIndex];
      command.undo();
      this.currentIndex--;
    }
  }
  
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      const command = this.history[this.currentIndex];
      command.execute();
    }
  }
}

// Example command
class HideNodeCommand {
  constructor(cy, nodeId) {
    this.cy = cy;
    this.nodeId = nodeId;
  }
  
  execute() {
    this.cy.$('#' + this.nodeId).style('display', 'none');
  }
  
  undo() {
    this.cy.$('#' + this.nodeId).style('display', 'element');
  }
}
```

## Testing Strategies

### Unit Testing

```javascript
// graph-manager.test.js
import { GraphManager } from './graph-manager.js';

describe('GraphManager', () => {
  let container;
  let graphManager;
  
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    graphManager = new GraphManager(container);
  });
  
  afterEach(() => {
    graphManager.cleanup();
    document.body.removeChild(container);
  });
  
  test('should initialize with default options', () => {
    expect(graphManager.cy).toBeDefined();
    expect(graphManager.cy.container()).toBe(container);
  });
  
  test('should add nodes correctly', () => {
    const nodeData = { id: 'test', label: 'Test Node' };
    graphManager.addNode(nodeData);
    
    const node = graphManager.cy.$('#test');
    expect(node.length).toBe(1);
    expect(node.data('label')).toBe('Test Node');
  });
});
```

### Integration Testing

```javascript
// Full workflow tests
describe('Graph Workflow', () => {
  test('should handle complete filter workflow', async () => {
    // Load test data
    await graphManager.loadData(testGraphData);
    
    // Apply filter
    graphManager.filterManager.applyFilter('type', 'function');
    
    // Verify results
    const visibleNodes = graphManager.cy.nodes(':visible');
    const functionNodes = visibleNodes.filter('[type = "function"]');
    expect(visibleNodes.length).toBe(functionNodes.length);
  });
});
```

## Common Gotchas

### Layout Timing Issues

```javascript
// ❌ Wrong: Layout runs before elements are added
cy.layout({ name: 'fcose' }).run();
cy.add(newElements);

// ✅ Correct: Add elements first, then layout
cy.add(newElements);
cy.layout({ name: 'fcose' }).run();

// ✅ Better: Use promises for complex sequences
async function addElementsWithLayout(elements) {
  cy.add(elements);
  
  return new Promise(resolve => {
    const layout = cy.layout({ name: 'fcose' });
    layout.on('layoutstop', resolve);
    layout.run();
  });
}
```

### Event Listener Cleanup

```javascript
// ❌ Wrong: Events accumulate over time
function setupInteractions() {
  cy.on('tap', 'node', handleNodeClick);
}

// ✅ Correct: Clean up before adding new listeners
function setupInteractions() {
  cy.removeListener('tap', 'node'); // Remove old listeners
  cy.on('tap', 'node', handleNodeClick);
}
```

### Style Update Timing

```javascript
// ❌ Wrong: Style changes don't apply immediately
node.addClass('highlighted');
const color = node.style('background-color'); // May not reflect new style

// ✅ Correct: Use setTimeout or style().update()
node.addClass('highlighted');
cy.style().update(); // Force style recalculation
const color = node.style('background-color');
```

## Debugging Tips

### Debug Mode Setup

```javascript
function enableDebugMode(cy) {
  // Log all events
  cy.on('*', function(evt) {
    console.log('Event:', evt.type, evt.target.id());
  });
  
  // Add debug styles
  cy.style()
    .selector('.debug')
    .style({
      'border-width': 2,
      'border-color': 'red',
      'text-outline-color': 'yellow',
      'text-outline-width': 2
    })
    .update();
  
  // Expose cy globally for console debugging
  window.cy = cy;
}
```

### Performance Monitoring

```javascript
function addPerformanceMonitoring(cy) {
  const startTime = performance.now();
  
  cy.on('layoutstart', () => {
    console.time('layout');
  });
  
  cy.on('layoutstop', () => {
    console.timeEnd('layout');
  });
  
  cy.on('render', () => {
    const fps = 1000 / (performance.now() - lastRenderTime);
    if (fps < 30) {
      console.warn('Low FPS detected:', fps);
    }
    lastRenderTime = performance.now();
  });
}
```

*Based on Cytoscape.js community best practices and performance optimization techniques (September 2025)*