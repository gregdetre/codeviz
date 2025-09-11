# Interactivity: Events, Tooltips & Custom Actions

Guide to implementing rich user interactions in Cytoscape.js including click handlers, tooltips, context menus, and custom behaviors.

## Overview

Cytoscape.js provides a comprehensive event system based on jQuery's event model, enabling rich interactive experiences. Events can be bound to specific elements, element types, or the core graph instance itself.

## See Also

- [Node Grouping](NODE_GROUPING.md) - Interactive expand/collapse functionality
- [Filtering](FILTERING.md) - Interactive filtering controls
- [Extensions](EXTENSIONS.md) - Interaction-enhancing extensions
- [Cytoscape.js Events](https://js.cytoscape.org/#events) - Complete event reference

## Event Handling System

### Basic Event Binding

```javascript
// Click on any node
cy.on('tap', 'node', function(evt) {
  const node = evt.target;
  console.log('Clicked node:', node.id());
});

// Hover events
cy.on('mouseover', 'node', function(evt) {
  const node = evt.target;
  node.addClass('highlighted');
});

cy.on('mouseout', 'node', function(evt) {
  const node = evt.target;
  node.removeClass('highlighted');
});

// Background click (clicking empty space)
cy.on('tap', function(evt) {
  if (evt.target === cy) {
    console.log('Clicked background');
    clearSelections();
  }
});
```

### Event Delegation and Selectors

```javascript
// Specific node types
cy.on('tap', 'node[type = "function"]', handleFunctionClick);
cy.on('tap', 'node[type = "class"]', handleClassClick);

// Edge interactions
cy.on('tap', 'edge', function(evt) {
  const edge = evt.target;
  showEdgeInfo(edge);
});

// Multiple event types
cy.on('tap dbltap', 'node', function(evt) {
  if (evt.type === 'tap') {
    handleSingleClick(evt.target);
  } else if (evt.type === 'dbltap') {
    handleDoubleClick(evt.target);
  }
});
```

## Custom Click Actions

### Navigation Actions

```javascript
function handleFunctionClick(evt) {
  const functionNode = evt.target;
  const functionName = functionNode.data('label');
  const fileName = functionNode.data('file');
  
  // Custom action: navigate to source code
  if (evt.originalEvent.ctrlKey) {
    // Ctrl+click: open in new tab
    openInEditor(fileName, functionName, true);
  } else {
    // Regular click: highlight and show details
    highlightFunction(functionNode);
    showFunctionDetails(functionNode);
  }
}

function handleClassClick(evt) {
  const classNode = evt.target;
  
  // Custom action: show class hierarchy
  showClassHierarchy(classNode);
  
  // Expand to show methods if collapsed
  if (classNode.data('collapsed')) {
    expandNode(classNode);
  }
}
```

### Multi-Select and Bulk Actions

```javascript
let selectedNodes = cy.collection();

cy.on('tap', 'node', function(evt) {
  const node = evt.target;
  
  if (evt.originalEvent.ctrlKey) {
    // Ctrl+click: add to selection
    if (selectedNodes.contains(node)) {
      selectedNodes = selectedNodes.difference(node);
      node.removeClass('selected');
    } else {
      selectedNodes = selectedNodes.union(node);
      node.addClass('selected');
    }
  } else {
    // Regular click: clear selection and select this node
    selectedNodes.removeClass('selected');
    selectedNodes = cy.collection().union(node);
    node.addClass('selected');
  }
  
  updateSelectionUI();
});

function updateSelectionUI() {
  const count = selectedNodes.length;
  document.getElementById('selection-count').textContent = 
    count > 0 ? `${count} items selected` : 'No selection';
    
  // Enable/disable bulk action buttons
  document.getElementById('bulk-actions').style.display = 
    count > 1 ? 'block' : 'none';
}
```

## Tooltip Implementation

### Using Tippy.js Extension

```javascript
// Install: npm install cytoscape-popper tippy.js
import cytoscape from 'cytoscape';
import popper from 'cytoscape-popper';
import tippy from 'tippy.js';

cytoscape.use(popper);

// Basic tooltip setup
cy.nodes().forEach(node => {
  const ref = node.popperRef();
  
  const tip = tippy(ref, {
    content: () => {
      const data = node.data();
      return `
        <div class="node-tooltip">
          <h3>${data.label}</h3>
          <p>Type: ${data.type}</p>
          <p>File: ${data.file}</p>
          ${data.description ? `<p>${data.description}</p>` : ''}
        </div>
      `;
    },
    allowHTML: true,
    placement: 'top',
    hideOnClick: false,
    sticky: true
  });
  
  // Store reference for cleanup
  node.data('tooltip', tip);
});
```

### Rich Tooltip Content

```javascript
function createRichTooltip(node) {
  const data = node.data();
  
  const content = document.createElement('div');
  content.className = 'rich-tooltip';
  
  // Title
  const title = document.createElement('h3');
  title.textContent = data.label;
  content.appendChild(title);
  
  // Metadata
  const metadata = document.createElement('div');
  metadata.className = 'metadata';
  metadata.innerHTML = `
    <div><strong>Type:</strong> ${data.type}</div>
    <div><strong>File:</strong> ${data.file}</div>
    <div><strong>Lines:</strong> ${data.startLine}-${data.endLine}</div>
  `;
  content.appendChild(metadata);
  
  // Connected elements
  if (node.degree() > 0) {
    const connections = document.createElement('div');
    connections.className = 'connections';
    connections.innerHTML = `
      <h4>Connections</h4>
      <div>Calls: ${node.outdegree()}</div>
      <div>Called by: ${node.indegree()}</div>
    `;
    content.appendChild(connections);
  }
  
  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'tooltip-actions';
  
  const viewSourceBtn = document.createElement('button');
  viewSourceBtn.textContent = 'View Source';
  viewSourceBtn.onclick = () => openInEditor(data.file, data.label);
  
  const showDepsBtn = document.createElement('button');
  showDepsBtn.textContent = 'Show Dependencies';
  showDepsBtn.onclick = () => highlightDependencies(node);
  
  actions.appendChild(viewSourceBtn);
  actions.appendChild(showDepsBtn);
  content.appendChild(actions);
  
  return content;
}
```

### Contextual Tooltips

```javascript
// Different tooltips based on node state or type
function getTooltipContent(node) {
  const type = node.data('type');
  
  switch (type) {
    case 'function':
      return createFunctionTooltip(node);
    case 'class':
      return createClassTooltip(node);
    case 'variable':
      return createVariableTooltip(node);
    default:
      return createGenericTooltip(node);
  }
}

function createFunctionTooltip(node) {
  const data = node.data();
  return `
    <div class="function-tooltip">
      <h3>${data.label}()</h3>
      <div class="signature">${data.signature || 'No signature available'}</div>
      <div class="params">Parameters: ${data.parameters?.length || 0}</div>
      <div class="complexity">Complexity: ${data.complexity || 'Unknown'}</div>
      ${data.docstring ? `<div class="docs">${data.docstring}</div>` : ''}
    </div>
  `;
}
```

## Context Menus

### Using Context Menu Extension

```javascript
// Install: npm install cytoscape-context-menus
import contextMenus from 'cytoscape-context-menus';
cytoscape.use(contextMenus);

const contextMenu = cy.contextMenus({
  menuItems: [
    {
      id: 'view-source',
      content: 'View Source',
      tooltipText: 'Open in editor',
      selector: 'node',
      onClickFunction: function(evt) {
        const node = evt.target;
        openInEditor(node.data('file'), node.data('label'));
      }
    },
    {
      id: 'highlight-deps',
      content: 'Highlight Dependencies',
      selector: 'node[type = "function"]',
      onClickFunction: function(evt) {
        highlightDependencies(evt.target);
      }
    },
    {
      id: 'expand-collapse',
      content: function(ele) {
        return ele.data('collapsed') ? 'Expand' : 'Collapse';
      },
      selector: 'node:parent',
      onClickFunction: function(evt) {
        toggleNodeExpansion(evt.target);
      }
    },
    {
      id: 'separator1',
      content: '---' // Separator
    },
    {
      id: 'copy-name',
      content: 'Copy Name',
      selector: 'node',
      onClickFunction: function(evt) {
        navigator.clipboard.writeText(evt.target.data('label'));
      }
    }
  ],
  
  // Context menu styling
  menuRadius: 100,
  selector: 'node, edge',
  fillColor: 'rgba(0, 0, 0, 0.75)',
  activeFillColor: 'rgba(92, 194, 237, 0.75)',
  activePadding: 20,
  indicatorSize: 24,
  separatorWidth: 3,
  spotlightPadding: 4,
  minSpotlightRadius: 24,
  maxSpotlightRadius: 38
});
```

### Custom Context Menu Implementation

```javascript
let contextMenuVisible = false;
let contextMenuElement = null;

cy.on('cxttap', 'node', function(evt) {
  evt.preventDefault();
  
  const node = evt.target;
  const position = evt.position || evt.cyPosition;
  
  showCustomContextMenu(node, position);
});

function showCustomContextMenu(element, position) {
  hideContextMenu();
  
  const menu = document.createElement('div');
  menu.className = 'custom-context-menu';
  menu.style.left = position.x + 'px';
  menu.style.top = position.y + 'px';
  
  const menuItems = getContextMenuItems(element);
  
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    menuItem.textContent = item.label;
    menuItem.onclick = () => {
      item.action(element);
      hideContextMenu();
    };
    menu.appendChild(menuItem);
  });
  
  document.body.appendChild(menu);
  contextMenuElement = menu;
  contextMenuVisible = true;
}

function getContextMenuItems(element) {
  const type = element.data('type');
  const items = [];
  
  if (type === 'function') {
    items.push(
      { label: 'View Source', action: node => openInEditor(node.data('file'), node.data('label')) },
      { label: 'Show Callers', action: showCallers },
      { label: 'Show Callees', action: showCallees }
    );
  }
  
  if (element.isParent()) {
    const isCollapsed = element.data('collapsed');
    items.push({
      label: isCollapsed ? 'Expand' : 'Collapse',
      action: toggleNodeExpansion
    });
  }
  
  items.push(
    { label: 'Focus on This', action: focusOnNode },
    { label: 'Hide', action: hideNode }
  );
  
  return items;
}
```

## Advanced Interaction Patterns

### Keyboard Shortcuts

```javascript
document.addEventListener('keydown', function(evt) {
  if (evt.target.tagName === 'INPUT') return; // Don't interfere with inputs
  
  switch (evt.key) {
    case 'f':
      if (evt.ctrlKey) {
        evt.preventDefault();
        showSearchDialog();
      }
      break;
      
    case 'Escape':
      clearSelections();
      hideAllTooltips();
      break;
      
    case 'Delete':
      if (selectedNodes.length > 0) {
        hideSelectedNodes();
      }
      break;
      
    case '1':
    case '2':
    case '3':
      if (evt.ctrlKey) {
        switchToLayoutMode(parseInt(evt.key));
      }
      break;
  }
});
```

### Gesture Recognition

```javascript
// Double-click to focus
cy.on('dbltap', 'node', function(evt) {
  const node = evt.target;
  focusOnNode(node);
});

// Drag to pan (built-in), but custom drag behaviors
cy.on('dragstart', 'node', function(evt) {
  const node = evt.target;
  
  // Show connection preview during drag
  node.neighborhood().addClass('drag-preview');
});

cy.on('dragend', 'node', function(evt) {
  cy.elements().removeClass('drag-preview');
});

// Mouse wheel for custom zoom behavior
cy.on('wheel', function(evt) {
  if (evt.originalEvent.ctrlKey) {
    // Ctrl+wheel: zoom to cursor position
    const zoom = cy.zoom();
    const position = evt.position;
    
    // Custom zoom logic here
  }
});
```

### State Management for Interactions

```javascript
class InteractionState {
  constructor(cy) {
    this.cy = cy;
    this.mode = 'default'; // default, select, focus, filter
    this.selection = cy.collection();
    this.history = [];
  }
  
  setMode(newMode) {
    this.exitMode(this.mode);
    this.mode = newMode;
    this.enterMode(newMode);
  }
  
  enterMode(mode) {
    switch (mode) {
      case 'select':
        this.cy.autoungrabify(true); // Disable dragging
        this.cy.on('tap', 'node', this.selectModeHandler.bind(this));
        break;
        
      case 'focus':
        this.cy.on('tap', 'node', this.focusModeHandler.bind(this));
        break;
        
      case 'filter':
        this.cy.on('tap', 'node', this.filterModeHandler.bind(this));
        break;
    }
    
    document.body.className = `mode-${mode}`;
  }
  
  exitMode(mode) {
    switch (mode) {
      case 'select':
        this.cy.autoungrabify(false);
        this.cy.off('tap', 'node', this.selectModeHandler);
        break;
        
      case 'focus':
        this.cy.off('tap', 'node', this.focusModeHandler);
        break;
        
      case 'filter':
        this.cy.off('tap', 'node', this.filterModeHandler);
        break;
    }
  }
  
  selectModeHandler(evt) {
    const node = evt.target;
    this.toggleSelection(node);
  }
  
  focusModeHandler(evt) {
    const node = evt.target;
    this.focusOnNode(node);
  }
}
```

## Performance Optimization

### Efficient Event Handling

```javascript
// Debounce expensive operations
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedSearch = debounce(function(searchTerm) {
  performSearch(searchTerm);
}, 300);

// Use event delegation for dynamic content
cy.on('tap', 'node[type = "function"]', handleFunctionClick);
// This automatically applies to nodes added later
```

### Memory Management

```javascript
// Clean up tooltips when nodes are removed
cy.on('remove', 'node', function(evt) {
  const node = evt.target;
  const tooltip = node.data('tooltip');
  
  if (tooltip) {
    tooltip.destroy();
    node.removeData('tooltip');
  }
});

// Remove event listeners when switching contexts
function cleanup() {
  cy.removeAllListeners();
  
  // Clean up external elements
  document.querySelectorAll('.custom-context-menu').forEach(menu => {
    menu.remove();
  });
}
```

*Based on Cytoscape.js 3.31.0 event system and interaction extensions (September 2025)*