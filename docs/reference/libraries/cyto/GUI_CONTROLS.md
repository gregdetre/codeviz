# GUI Controls & User Interface

Guide to building user interface controls for Cytoscape.js visualizations including panels, sliders, buttons, and interactive widgets.

## Overview

Effective graph visualization requires intuitive controls for filtering, layout, navigation, and customization. This guide covers building GUI components that integrate seamlessly with Cytoscape.js graphs.

## See Also

- [Filtering](FILTERING.md) - Filter implementation connected to UI controls
- [Layouts](LAYOUTS.md) - Layout switching and configuration interfaces  
- [Interactivity](INTERACTIVITY.md) - Event handling for GUI components

## Control Panel Architecture

### Basic Panel Structure

```html
<!-- HTML Structure -->
<div id="app-container">
  <div id="control-panel" class="sidebar">
    <div class="panel-section" id="layout-controls">
      <h3>Layout</h3>
      <!-- Layout controls here -->
    </div>
    
    <div class="panel-section" id="filter-controls">
      <h3>Filters</h3>
      <!-- Filter controls here -->
    </div>
    
    <div class="panel-section" id="view-controls">
      <h3>View</h3>
      <!-- View controls here -->
    </div>
  </div>
  
  <div id="graph-container">
    <div id="cy"></div>
  </div>
  
  <div id="info-panel" class="sidebar right">
    <div id="node-info"></div>
    <div id="graph-stats"></div>
  </div>
</div>
```

```css
/* Basic Layout */
#app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 300px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  padding: 20px;
}

.sidebar.right {
  border-right: none;
  border-left: 1px solid #ddd;
}

#graph-container {
  flex: 1;
  position: relative;
}

#cy {
  width: 100%;
  height: 100%;
}

.panel-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}
```

## Layout Controls

### Layout Selector

```javascript
function createLayoutSelector() {
  const layoutSelect = document.createElement('select');
  layoutSelect.id = 'layout-selector';
  
  const layouts = [
    { value: 'fcose', label: 'Force Directed (fCoSE)' },
    { value: 'dagre', label: 'Hierarchical (Dagre)' },
    { value: 'circle', label: 'Circle' },
    { value: 'grid', label: 'Grid' },
    { value: 'cola', label: 'Cola (Constraints)' }
  ];
  
  layouts.forEach(layout => {
    const option = document.createElement('option');
    option.value = layout.value;
    option.textContent = layout.label;
    layoutSelect.appendChild(option);
  });
  
  layoutSelect.addEventListener('change', (e) => {
    applyLayout(e.target.value);
  });
  
  return layoutSelect;
}

function applyLayout(layoutName) {
  const layoutOptions = {
    fcose: { name: 'fcose', animate: true },
    dagre: { name: 'dagre', rankDir: 'TB', animate: true },
    circle: { name: 'circle', animate: true },
    grid: { name: 'grid', animate: true },
    cola: { name: 'cola', animate: true }
  };
  
  cy.layout(layoutOptions[layoutName]).run();
}
```

### Layout Configuration Panel

```javascript
function createLayoutConfigPanel() {
  const panel = document.createElement('div');
  panel.className = 'layout-config';
  
  // Animation toggle
  const animateToggle = createToggle('animate-layout', 'Animate Transitions', true);
  animateToggle.addEventListener('change', (e) => {
    layoutConfig.animate = e.target.checked;
  });
  
  // Fit viewport toggle
  const fitToggle = createToggle('fit-layout', 'Fit to Viewport', true);
  fitToggle.addEventListener('change', (e) => {
    layoutConfig.fit = e.target.checked;
  });
  
  // Layout-specific controls
  const advancedContainer = document.createElement('div');
  advancedContainer.id = 'advanced-layout-controls';
  
  panel.appendChild(animateToggle);
  panel.appendChild(fitToggle);
  panel.appendChild(advancedContainer);
  
  return panel;
}

function createToggle(id, label, checked = false) {
  const container = document.createElement('div');
  container.className = 'control-item';
  
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = id;
  toggle.checked = checked;
  
  const toggleLabel = document.createElement('label');
  toggleLabel.htmlFor = id;
  toggleLabel.textContent = label;
  
  container.appendChild(toggle);
  container.appendChild(toggleLabel);
  
  return container;
}
```

## Filter Controls

### Multi-Category Filters

```javascript
function createFilterControls() {
  const container = document.createElement('div');
  container.className = 'filter-controls';
  
  // Node type filters
  const nodeTypeFilters = createCheckboxGroup('Node Types', [
    { id: 'show-functions', label: 'Functions', checked: true, selector: '[type = "function"]' },
    { id: 'show-classes', label: 'Classes', checked: true, selector: '[type = "class"]' },
    { id: 'show-variables', label: 'Variables', checked: true, selector: '[type = "variable"]' }
  ]);
  
  // Edge type filters
  const edgeTypeFilters = createCheckboxGroup('Edge Types', [
    { id: 'show-calls', label: 'Function Calls', checked: true, selector: 'edge[type = "call"]' },
    { id: 'show-imports', label: 'Imports', checked: true, selector: 'edge[type = "import"]' },
    { id: 'show-inherits', label: 'Inheritance', checked: true, selector: 'edge[type = "inherits"]' }
  ]);
  
  // Search filter
  const searchFilter = createSearchFilter();
  
  container.appendChild(searchFilter);
  container.appendChild(nodeTypeFilters);
  container.appendChild(edgeTypeFilters);
  
  return container;
}

function createCheckboxGroup(title, items) {
  const group = document.createElement('div');
  group.className = 'checkbox-group';
  
  const header = document.createElement('h4');
  header.textContent = title;
  group.appendChild(header);
  
  items.forEach(item => {
    const container = document.createElement('div');
    container.className = 'checkbox-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item.id;
    checkbox.checked = item.checked;
    
    checkbox.addEventListener('change', (e) => {
      const elements = cy.$(item.selector);
      elements.style('display', e.target.checked ? 'element' : 'none');
    });
    
    const label = document.createElement('label');
    label.htmlFor = item.id;
    label.textContent = item.label;
    
    container.appendChild(checkbox);
    container.appendChild(label);
    group.appendChild(container);
  });
  
  return group;
}

function createSearchFilter() {
  const container = document.createElement('div');
  container.className = 'search-filter';
  
  const label = document.createElement('label');
  label.textContent = 'Search:';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Filter by name...';
  input.id = 'search-input';
  
  let searchTimeout;
  input.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  });
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '×';
  clearBtn.className = 'clear-search';
  clearBtn.onclick = () => {
    input.value = '';
    performSearch('');
  };
  
  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(clearBtn);
  
  return container;
}
```

### Range Sliders

```javascript
function createRangeSlider(label, min, max, value, callback) {
  const container = document.createElement('div');
  container.className = 'range-slider';
  
  const sliderLabel = document.createElement('label');
  sliderLabel.textContent = label;
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.value = value;
  
  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'range-value';
  valueDisplay.textContent = value;
  
  slider.addEventListener('input', (e) => {
    const val = e.target.value;
    valueDisplay.textContent = val;
    callback(val);
  });
  
  container.appendChild(sliderLabel);
  container.appendChild(slider);
  container.appendChild(valueDisplay);
  
  return container;
}

// Example usage: Node size control
function createNodeSizeSlider() {
  return createRangeSlider('Node Size', 10, 100, 30, (value) => {
    cy.nodes().style('width', value);
    cy.nodes().style('height', value);
  });
}

// Example usage: Edge opacity control
function createEdgeOpacitySlider() {
  return createRangeSlider('Edge Opacity', 0.1, 1.0, 0.8, (value) => {
    cy.edges().style('opacity', value);
  });
}
```

## View Controls

### Zoom and Navigation

```javascript
function createViewControls() {
  const container = document.createElement('div');
  container.className = 'view-controls';
  
  // Zoom controls
  const zoomContainer = document.createElement('div');
  zoomContainer.className = 'zoom-controls';
  
  const zoomInBtn = createButton('Zoom In', () => {
    cy.zoom(cy.zoom() * 1.2);
    cy.center();
  });
  
  const zoomOutBtn = createButton('Zoom Out', () => {
    cy.zoom(cy.zoom() * 0.8);
    cy.center();
  });
  
  const fitBtn = createButton('Fit All', () => {
    cy.fit();
  });
  
  const resetBtn = createButton('Reset View', () => {
    cy.zoom(1);
    cy.center();
  });
  
  zoomContainer.appendChild(zoomInBtn);
  zoomContainer.appendChild(zoomOutBtn);
  zoomContainer.appendChild(fitBtn);
  zoomContainer.appendChild(resetBtn);
  
  // Selection controls
  const selectionContainer = createSelectionControls();
  
  container.appendChild(zoomContainer);
  container.appendChild(selectionContainer);
  
  return container;
}

function createButton(text, clickHandler) {
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', clickHandler);
  return button;
}

function createSelectionControls() {
  const container = document.createElement('div');
  container.className = 'selection-controls';
  
  const selectAllBtn = createButton('Select All', () => {
    cy.nodes().select();
  });
  
  const clearSelectionBtn = createButton('Clear Selection', () => {
    cy.elements().unselect();
  });
  
  const invertSelectionBtn = createButton('Invert Selection', () => {
    const selected = cy.$(':selected');
    const unselected = cy.elements().difference(selected);
    
    selected.unselect();
    unselected.select();
  });
  
  container.appendChild(selectAllBtn);
  container.appendChild(clearSelectionBtn);
  container.appendChild(invertSelectionBtn);
  
  return container;
}
```

### Mini-Map Control

```javascript
function createMiniMap() {
  const miniMapContainer = document.createElement('div');
  miniMapContainer.id = 'mini-map';
  miniMapContainer.style.cssText = `
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 200px;
    height: 150px;
    border: 2px solid #333;
    background: white;
    z-index: 1000;
  `;
  
  // Create mini cytoscape instance
  const miniCy = cytoscape({
    container: miniMapContainer,
    elements: cy.elements().jsons(),
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#666',
          'width': 4,
          'height': 4
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color': '#999',
          'width': 1
        }
      }
    ],
    zoomingEnabled: false,
    panningEnabled: false,
    boxSelectionEnabled: false,
    autoungrabify: true
  });
  
  miniCy.fit();
  
  // Update mini-map when main graph changes
  cy.on('add remove', () => {
    miniCy.elements().remove();
    miniCy.add(cy.elements().jsons());
    miniCy.fit();
  });
  
  // Show viewport indicator
  function updateViewportIndicator() {
    const extent = cy.extent();
    const zoom = cy.zoom();
    
    // Add viewport rectangle to mini-map
    // Implementation depends on your specific needs
  }
  
  cy.on('zoom pan', updateViewportIndicator);
  
  return miniMapContainer;
}
```

## Information Panels

### Node Details Panel

```javascript
function createNodeInfoPanel() {
  const panel = document.createElement('div');
  panel.id = 'node-info-panel';
  panel.className = 'info-panel';
  
  const header = document.createElement('h3');
  header.textContent = 'Node Information';
  panel.appendChild(header);
  
  const content = document.createElement('div');
  content.id = 'node-info-content';
  content.innerHTML = '<p>Select a node to view details</p>';
  panel.appendChild(content);
  
  // Listen for node selection
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    updateNodeInfo(node);
  });
  
  return panel;
}

function updateNodeInfo(node) {
  const data = node.data();
  const content = document.getElementById('node-info-content');
  
  content.innerHTML = `
    <div class="node-details">
      <h4>${data.label}</h4>
      <div class="detail-row">
        <span class="label">Type:</span>
        <span class="value">${data.type}</span>
      </div>
      <div class="detail-row">
        <span class="label">File:</span>
        <span class="value">${data.file}</span>
      </div>
      <div class="detail-row">
        <span class="label">Connections:</span>
        <span class="value">${node.degree()}</span>
      </div>
      ${data.description ? `
        <div class="detail-row">
          <span class="label">Description:</span>
          <span class="value">${data.description}</span>
        </div>
      ` : ''}
      
      <div class="node-actions">
        <button onclick="focusOnNode('${node.id()}')">Focus</button>
        <button onclick="highlightNeighbors('${node.id()}')">Show Connections</button>
        <button onclick="hideNode('${node.id()}')">Hide</button>
      </div>
    </div>
  `;
}
```

### Statistics Panel

```javascript
function createStatsPanel() {
  const panel = document.createElement('div');
  panel.id = 'stats-panel';
  panel.className = 'info-panel';
  
  const header = document.createElement('h3');
  header.textContent = 'Graph Statistics';
  panel.appendChild(header);
  
  const content = document.createElement('div');
  content.id = 'stats-content';
  panel.appendChild(content);
  
  updateStats();
  
  // Update stats when graph changes
  cy.on('add remove', updateStats);
  
  return panel;
}

function updateStats() {
  const nodes = cy.nodes();
  const edges = cy.edges();
  const visibleNodes = cy.nodes(':visible');
  const visibleEdges = cy.edges(':visible');
  
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    visibleNodes: visibleNodes.length,
    visibleEdges: visibleEdges.length,
    selectedElements: cy.$(':selected').length
  };
  
  // Calculate node type distribution
  const nodeTypes = {};
  nodes.forEach(node => {
    const type = node.data('type') || 'unknown';
    nodeTypes[type] = (nodeTypes[type] || 0) + 1;
  });
  
  const content = document.getElementById('stats-content');
  content.innerHTML = `
    <div class="stat-group">
      <h4>Overview</h4>
      <div class="stat-item">Nodes: ${stats.visibleNodes}/${stats.totalNodes}</div>
      <div class="stat-item">Edges: ${stats.visibleEdges}/${stats.totalEdges}</div>
      <div class="stat-item">Selected: ${stats.selectedElements}</div>
    </div>
    
    <div class="stat-group">
      <h4>Node Types</h4>
      ${Object.entries(nodeTypes).map(([type, count]) => 
        `<div class="stat-item">${type}: ${count}</div>`
      ).join('')}
    </div>
  `;
}
```

## Toolbar and Action Buttons

### Main Toolbar

```javascript
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'main-toolbar';
  toolbar.className = 'toolbar';
  
  const actions = [
    { icon: '🔍', label: 'Search', action: showSearchDialog },
    { icon: '⚙️', label: 'Settings', action: showSettings },
    { icon: '📁', label: 'Load File', action: loadFile },
    { icon: '💾', label: 'Save', action: saveGraph },
    { icon: '📷', label: 'Export Image', action: exportImage },
    { icon: '🔄', label: 'Refresh Layout', action: refreshLayout },
    { icon: '❓', label: 'Help', action: showHelp }
  ];
  
  actions.forEach(action => {
    const button = document.createElement('button');
    button.className = 'toolbar-button';
    button.title = action.label;
    button.innerHTML = action.icon;
    button.addEventListener('click', action.action);
    toolbar.appendChild(button);
  });
  
  return toolbar;
}
```

### Floating Action Menu

```javascript
function createFloatingActionMenu() {
  const fab = document.createElement('div');
  fab.className = 'floating-action-button';
  fab.innerHTML = '+';
  
  const menu = document.createElement('div');
  menu.className = 'fab-menu hidden';
  
  const actions = [
    { label: 'Add Node', action: () => addNodeDialog() },
    { label: 'Add Edge', action: () => addEdgeDialog() },
    { label: 'Import Data', action: () => importDialog() }
  ];
  
  actions.forEach(action => {
    const item = document.createElement('div');
    item.className = 'fab-menu-item';
    item.textContent = action.label;
    item.addEventListener('click', action.action);
    menu.appendChild(item);
  });
  
  fab.addEventListener('click', () => {
    menu.classList.toggle('hidden');
  });
  
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });
  
  const container = document.createElement('div');
  container.appendChild(fab);
  container.appendChild(menu);
  
  return container;
}
```

## Responsive Design

### Mobile-Friendly Controls

```css
/* Responsive breakpoints */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 200px;
    position: absolute;
    bottom: 0;
    z-index: 1000;
    transform: translateY(calc(100% - 40px));
    transition: transform 0.3s ease;
  }
  
  .sidebar.expanded {
    transform: translateY(0);
  }
  
  .sidebar-toggle {
    display: block;
    position: absolute;
    top: 0;
    right: 20px;
    background: #333;
    color: white;
    border: none;
    padding: 10px;
  }
  
  #graph-container {
    height: calc(100vh - 40px);
  }
}
```

### Touch-Friendly Controls

```javascript
function makeTouchFriendly() {
  // Larger touch targets
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.style.minHeight = '44px';
    button.style.minWidth = '44px';
  });
  
  // Swipe gestures for mobile
  let startX, startY;
  
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  
  document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Detect swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50) {
        // Swipe right - show left panel
        togglePanel('left', true);
      } else if (deltaX < -50) {
        // Swipe left - hide left panel
        togglePanel('left', false);
      }
    }
  });
}
```

*Based on modern web UI patterns and Cytoscape.js 3.31.0 integration capabilities (September 2025)*