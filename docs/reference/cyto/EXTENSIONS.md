# Cytoscape.js Extensions

Guide to essential extensions that enhance Cytoscape.js functionality for interactive visualizations.

## Overview

Cytoscape.js has a rich ecosystem of extensions that add specialized functionality. This guide covers the most useful extensions for building interactive graph applications, particularly for code visualization.

## See Also

- [Interactivity](INTERACTIVITY.md) - Using extensions for tooltips and context menus
- [Node Grouping](NODE_GROUPING.md) - Expand/collapse extensions
- [Cytoscape.js Extensions](https://js.cytoscape.org/#extensions) - Complete extension catalog

## Essential Extensions

### 1. cytoscape-popper (Tooltips & Popups)

**Purpose**: Rich tooltips and popup positioning  
**Best for**: Contextual information display

```bash
npm install cytoscape-popper
```

```javascript
import cytoscape from 'cytoscape';
import popper from 'cytoscape-popper';

cytoscape.use(popper);

// Basic tooltip setup
cy.nodes().forEach(node => {
  const popperRef = node.popperRef();
  
  const tooltip = tippy(popperRef, {
    content: `
      <div>
        <h3>${node.data('label')}</h3>
        <p>Type: ${node.data('type')}</p>
      </div>
    `,
    allowHTML: true,
    placement: 'top'
  });
});
```

### 2. cytoscape-expand-collapse (Node Grouping)

**Purpose**: Interactive expand/collapse for compound nodes  
**Best for**: Hierarchical navigation

```bash
npm install cytoscape-expand-collapse
```

```javascript
import expandCollapse from 'cytoscape-expand-collapse';
cytoscape.use(expandCollapse);

const api = cy.expandCollapse({
  layoutBy: {
    name: 'fcose',
    animate: true
  },
  fisheye: true,
  animate: true,
  undoable: false
});

// Programmatic control
api.collapseAll();
api.expandAll();
```

### 3. cytoscape-context-menus (Right-Click Menus)

**Purpose**: Context-sensitive action menus  
**Best for**: Element-specific operations

```bash
npm install cytoscape-context-menus
```

```javascript
import contextMenus from 'cytoscape-context-menus';
cytoscape.use(contextMenus);

cy.contextMenus({
  menuItems: [
    {
      id: 'view-source',
      content: 'View Source',
      selector: 'node[type = "function"]',
      onClickFunction: function(evt) {
        openInEditor(evt.target.data('file'));
      }
    },
    {
      id: 'hide-node',
      content: 'Hide',
      selector: 'node',
      onClickFunction: function(evt) {
        evt.target.style('display', 'none');
      }
    }
  ]
});
```

### 4. cytoscape-fcose (Advanced Force Layout)

**Purpose**: High-quality force-directed layout with constraints  
**Best for**: Large graphs and compound nodes

```bash
npm install cytoscape-fcose
```

```javascript
import fcose from 'cytoscape-fcose';
cytoscape.use(fcose);

cy.layout({
  name: 'fcose',
  
  // Quality settings
  quality: 'default',
  numIter: 2500,
  
  // Compound node support
  nestingFactor: 0.1,
  gravity: 0.25,
  
  // Constraints
  fixedNodeConstraint: [
    { nodeId: 'header', position: { x: 0, y: 0 } }
  ],
  
  alignmentConstraint: {
    vertical: [['sidebar', 'content']],
    horizontal: [['header', 'nav']]
  }
}).run();
```

### 5. cytoscape-dagre (Hierarchical Layout)

**Purpose**: Tree and hierarchical layouts  
**Best for**: Call graphs and dependency trees

```bash
npm install cytoscape-dagre
```

```javascript
import dagre from 'cytoscape-dagre';
cytoscape.use(dagre);

cy.layout({
  name: 'dagre',
  rankDir: 'TB',        // Top to bottom
  align: 'UL',          // Upper left alignment
  rankSep: 70,          // Separation between ranks
  nodeSep: 50,          // Separation between nodes
  edgeSep: 10,          // Separation between edge labels
  marginX: 20,
  marginY: 20
}).run();
```

## Interaction Extensions

### 6. cytoscape-compound-drag-and-drop

**Purpose**: Drag nodes into/out of parent containers  
**Best for**: Dynamic grouping

```javascript
import compoundDragAndDrop from 'cytoscape-compound-drag-and-drop';
cytoscape.use(compoundDragAndDrop);

cy.compoundDragAndDrop({
  grabbedNode: function(node) {
    return !node.isParent();
  },
  dropTarget: function(dropTarget, grabbedNode) {
    return dropTarget.isParent();
  },
  overThreshold: 10,
  outThreshold: 10
});
```

### 7. cytoscape-edgehandles (Interactive Edge Creation)

**Purpose**: Draw edges between nodes interactively  
**Best for**: Graph editing interfaces

```bash
npm install cytoscape-edgehandles
```

```javascript
import edgehandles from 'cytoscape-edgehandles';
cytoscape.use(edgehandles);

const eh = cy.edgehandles({
  canConnect: function(sourceNode, targetNode) {
    return !sourceNode.same(targetNode);
  },
  edgeParams: function(sourceNode, targetNode) {
    return {
      data: {
        id: `${sourceNode.id()}-${targetNode.id()}`,
        source: sourceNode.id(),
        target: targetNode.id(),
        type: 'user-created'
      }
    };
  },
  hoverDelay: 150,
  snap: true,
  snapThreshold: 50,
  snapFrequency: 15,
  noEdgeEventsInDraw: true
});

// Enable/disable edge creation mode
eh.enableDrawMode();
eh.disableDrawMode();
```

### 8. cytoscape-clipboard (Copy/Paste)

**Purpose**: Copy and paste graph elements  
**Best for**: Graph editing and duplication

```javascript
import clipboard from 'cytoscape-clipboard';
cytoscape.use(clipboard);

// Copy selected elements
cy.clipboard();

// Paste with offset
cy.paste({ x: 100, y: 100 });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'c') {
    cy.clipboard();
  }
  if (e.ctrlKey && e.key === 'v') {
    cy.paste();
  }
});
```

## Utility Extensions

### 9. cytoscape-node-html-label

**Purpose**: Render HTML content as node labels  
**Best for**: Rich node content and custom styling

```bash
npm install cytoscape-node-html-label
```

```javascript
import nodeHtmlLabel from 'cytoscape-node-html-label';
cytoscape.use(nodeHtmlLabel);

cy.nodeHtmlLabel([
  {
    query: 'node[type = "function"]',
    cssClass: 'function-label',
    valign: 'center',
    halign: 'center',
    valignBox: 'center',
    halignBox: 'center',
    tpl: function(data) {
      return `
        <div class="node-content">
          <div class="icon">🔧</div>
          <div class="name">${data.label}</div>
          <div class="complexity">${data.complexity || 0}</div>
        </div>
      `;
    }
  }
]);
```

### 10. cytoscape-grid-guide (Alignment Guides)

**Purpose**: Snap-to-grid and alignment guides  
**Best for**: Precise node positioning

```javascript
import gridGuide from 'cytoscape-grid-guide';
cytoscape.use(gridGuide);

const gg = cy.gridGuide({
  snapToGridOnRelease: true,
  snapToGridDuringDrag: true,
  snapToAlignmentLocationOnRelease: true,
  snapToAlignmentLocationDuringDrag: true,
  distributionGuidelines: true,
  geometricGuideline: true,
  initPosAlignment: true,
  centerToEdgeAlignment: true,
  resize: true,
  parentPadding: false,
  drawGrid: true,
  zoomDash: true,
  panGrid: true,
  gridStackOrder: -1,
  snapToGridCenter: true,
  snapToEdgeCenter: true,
  gridSpacing: 20,
  snapToGridOnRelease: true
});
```

## Export and Import Extensions

### 11. cytoscape-svg (SVG Export)

**Purpose**: Export graphs as SVG files  
**Best for**: High-quality graphics export

```bash
npm install cytoscape-svg
```

```javascript
import svg from 'cytoscape-svg';
cytoscape.use(svg);

// Export as SVG string
const svgContent = cy.svg({
  scale: 1,
  full: true,
  bg: 'white'
});

// Download SVG file
function downloadSVG() {
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'graph.svg';
  link.click();
  
  URL.revokeObjectURL(url);
}
```

### 12. cytoscape-canvas (Canvas Export)

**Purpose**: Export graphs as canvas/PNG  
**Best for**: Raster image export

```javascript
// Built-in PNG export
function exportPNG() {
  const pngData = cy.png({
    scale: 2,           // Higher resolution
    full: true,         // Include entire graph
    bg: '#ffffff'       // Background color
  });
  
  // Download PNG
  const link = document.createElement('a');
  link.href = pngData;
  link.download = 'graph.png';
  link.click();
}

// Export current viewport only
function exportViewport() {
  const pngData = cy.png({
    scale: 1,
    full: false,        // Current viewport only
    maxWidth: 1920,
    maxHeight: 1080
  });
  
  return pngData;
}
```

## Extension Integration Patterns

### Combined Extension Setup

```javascript
// Complete setup with multiple extensions
import cytoscape from 'cytoscape';
import popper from 'cytoscape-popper';
import contextMenus from 'cytoscape-context-menus';
import expandCollapse from 'cytoscape-expand-collapse';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';

// Register all extensions
cytoscape.use(popper);
cytoscape.use(contextMenus);
cytoscape.use(expandCollapse);
cytoscape.use(fcose);
cytoscape.use(dagre);

class EnhancedGraph {
  constructor(container) {
    this.cy = cytoscape({
      container: container,
      elements: [],
      style: this.getStyleSheet()
    });
    
    this.setupExtensions();
  }
  
  setupExtensions() {
    // Expand/collapse for compound nodes
    this.expandCollapseAPI = this.cy.expandCollapse({
      layoutBy: { name: 'fcose', animate: true },
      fisheye: true,
      animate: true
    });
    
    // Context menus
    this.setupContextMenus();
    
    // Tooltips
    this.setupTooltips();
  }
  
  setupContextMenus() {
    this.cy.contextMenus({
      menuItems: [
        {
          id: 'expand-collapse',
          content: function(ele) {
            return ele.data('collapsed') ? 'Expand' : 'Collapse';
          },
          selector: 'node:parent',
          onClickFunction: (evt) => {
            if (evt.target.data('collapsed')) {
              this.expandCollapseAPI.expand(evt.target);
            } else {
              this.expandCollapseAPI.collapse(evt.target);
            }
          }
        }
      ]
    });
  }
  
  setupTooltips() {
    this.cy.nodes().forEach(node => {
      const ref = node.popperRef();
      tippy(ref, {
        content: this.getTooltipContent(node),
        allowHTML: true
      });
    });
  }
}
```

### Extension Cleanup

```javascript
class ManagedGraph {
  constructor(container) {
    this.cy = cytoscape({ container });
    this.extensions = {};
  }
  
  addExtension(name, setupFn) {
    this.extensions[name] = setupFn(this.cy);
  }
  
  cleanup() {
    // Clean up extension-specific resources
    Object.values(this.extensions).forEach(ext => {
      if (ext && typeof ext.destroy === 'function') {
        ext.destroy();
      }
    });
    
    // Destroy main instance
    this.cy.destroy();
  }
}
```

## Performance Considerations

### Extension Loading Strategy

```javascript
// Lazy load extensions based on features needed
const extensionLoaders = {
  async contextMenus() {
    const { default: contextMenus } = await import('cytoscape-context-menus');
    cytoscape.use(contextMenus);
    return contextMenus;
  },
  
  async expandCollapse() {
    const { default: expandCollapse } = await import('cytoscape-expand-collapse');
    cytoscape.use(expandCollapse);
    return expandCollapse;
  }
};

// Load extensions on demand
async function enableContextMenus(cy) {
  await extensionLoaders.contextMenus();
  
  return cy.contextMenus({
    // configuration
  });
}
```

### Memory Management

```javascript
// Clean up extension instances
function cleanupExtensions(cy) {
  // Remove context menus
  if (cy.contextMenus) {
    cy.contextMenus('destroy');
  }
  
  // Destroy tooltips
  cy.nodes().forEach(node => {
    const tooltip = node.data('tooltip');
    if (tooltip && tooltip.destroy) {
      tooltip.destroy();
    }
  });
  
  // Clean up expand/collapse
  if (cy.expandCollapse) {
    cy.expandCollapse('destroy');
  }
}
```

*Based on Cytoscape.js extension ecosystem as of September 2025*