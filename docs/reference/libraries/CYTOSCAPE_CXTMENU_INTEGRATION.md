# Cytoscape-cxtmenu Integration Reference

Circular context menu extension for Cytoscape.js providing radial, gesture-based interactions for graph elements.

## See also

- `ts/viewer/src/app.ts` - main viewer implementation where this would be integrated
- `ts/viewer/src/interaction-manager.ts` - current interaction handling that would work alongside context menus
- https://github.com/cytoscape/cytoscape.js-cxtmenu - official repository and documentation
- https://cytoscape.org/cytoscape.js-cxtmenu/ - live demo showcasing interactions
- `ARCHITECTURE.md` - system architecture overview for understanding viewer structure

## Overview

cytoscape-cxtmenu is an official Cytoscape.js extension that creates circular, swipeable context menus for graph interactions. Users trigger the menu on nodes/edges, then swipe or click along the circular menu to select commands. It provides a modern alternative to traditional dropdown menus, particularly suited for desktop applications with gesture support.

### Key Characteristics
- **Circular/radial menu design** - commands arranged in a circle around the target element
- **Gesture-based selection** - swipe from center to command or click directly
- **Official Cytoscape.js extension** - maintained by core team, guaranteed compatibility
- **Desktop-focused** - optimised for mouse interactions, limited touch support

## Installation & Setup

### Dependencies

```bash
npm install cytoscape-cxtmenu
npm install --save-dev @types/cytoscape-cxtmenu  # TypeScript types
```

**Version Requirements:**
- Cytoscape.js: ^3.2.0 or higher
- TypeScript: Types available via `@types/cytoscape-cxtmenu`

### Basic Integration

```typescript
// ts/viewer/src/app.ts
import cytoscape from "cytoscape";
import cxtmenu from "cytoscape-cxtmenu";

// Register extension (must be done before creating cy instance)
cytoscape.use(cxtmenu);

// After cy initialisation
const menu = cy.cxtmenu({
  selector: 'node',  // Elements that trigger the menu
  commands: [
    {
      content: 'Open in Editor',
      select: function(ele) {
        const nodeData = graph.nodes.find(n => n.id === ele.id());
        if (nodeData?.file && nodeData?.line) {
          openFileInEditor(nodeData.file, nodeData.line);
        }
      }
    },
    {
      content: 'Copy ID',
      select: function(ele) {
        navigator.clipboard.writeText(ele.id());
      }
    },
    {
      content: 'Focus',
      select: function(ele) {
        im.focus(ele.id());
      }
    }
  ]
});
```

### TypeScript Configuration

Common TypeScript integration patterns:

```typescript
// Method 1: Type assertion for cy instance
(cy as any).cxtmenu(options);

// Method 2: Module declaration if types not available
declare module 'cytoscape-cxtmenu';

// Method 3: Extended interface (if creating custom types)
interface CytoscapeCore {
  cxtmenu(options: CxtmenuOptions): CxtmenuInstance;
}
```

## Configuration Options

### Core Options

```typescript
interface CxtmenuOptions {
  // Element selector
  selector: string;  // Default: 'node'
  
  // Menu radius calculation
  menuRadius: number | ((ele: any) => number);  // Default: 100
  
  // Commands array or function
  commands: Command[] | ((ele: any) => Command[]);
  
  // Visual styling
  fillColor: string;  // Default: 'rgba(0, 0, 0, 0.75)'
  activeFillColor: string;  // Default: 'rgba(1, 105, 217, 0.75)'
  itemColor: string;  // Default: 'white'
  itemTextShadowColor: string;  // Default: 'transparent'
  
  // Layout configuration
  activePadding: number;  // Default: 20
  indicatorSize: number;  // Default: 24
  separatorWidth: number;  // Default: 3
  spotlightPadding: number;  // Default: 4
  
  // Adaptive sizing
  adaptativeNodeSpotlightRadius: boolean;  // Default: false
  minSpotlightRadius: number;  // Default: 24
  maxSpotlightRadius: number;  // Default: 38
  
  // Event configuration
  openMenuEvents: string;  // Default: 'cxttapstart taphold'
  
  // Element positioning
  atMouse: boolean;  // Default: false
  
  // Z-index
  zIndex: number;  // Default: 9999
  
  // Outside click behavior
  outsideMenuCancel: boolean | number;  // Default: false
}
```

### Command Structure

```typescript
interface Command {
  // Visual content
  content: string | HTMLElement;  // Text or custom HTML
  contentStyle?: Record<string, any>;  // CSS styles
  
  // Behavior
  select: (ele: any) => void;  // Action when selected
  hover?: (ele: any) => void;  // Optional hover action
  
  // State
  enabled?: boolean | ((ele: any) => boolean);  // Default: true
  
  // Custom styling
  fillColor?: string;  // Override menu fillColor
}
```

## Implementation Examples

### Context Menu for CodeViz Viewer

```typescript
// Comprehensive menu for code visualisation
function setupContextMenu(cy: Core, graph: Graph, im: InteractionManager) {
  const menu = cy.cxtmenu({
    selector: 'node[type = "function"], node[type = "class"]',
    menuRadius: 120,
    commands: [
      {
        content: '📂 Open',
        select: (ele) => {
          const node = graph.nodes.find(n => n.id === ele.id());
          if (node?.file && node?.line) {
            openFileInEditor(node.file, node.line);
          }
        }
      },
      {
        content: '🔍 Focus',
        select: (ele) => {
          im.focus(ele.id());
          cy.center(ele);
        }
      },
      {
        content: '📋 Copy',
        select: (ele) => {
          const node = graph.nodes.find(n => n.id === ele.id());
          const text = `${node?.module || ''}.${node?.label || ele.id()}`;
          navigator.clipboard.writeText(text);
        }
      },
      {
        content: '👁️ Hide',
        select: (ele) => {
          ele.style('display', 'none');
        }
      },
      {
        content: '🔗 Deps',
        fillColor: 'rgba(50, 150, 50, 0.75)',
        select: (ele) => {
          // Show dependencies in details panel
          const detailsEl = document.getElementById('details');
          if (detailsEl) {
            renderDetails(detailsEl, ele);
          }
        }
      }
    ],
    fillColor: 'rgba(0, 0, 0, 0.85)',
    activeFillColor: 'rgba(92, 184, 92, 0.85)',
    indicatorSize: 30,
    separatorWidth: 2,
    atMouse: false,
    openMenuEvents: 'cxttapstart'  // Right-click only
  });
  
  return menu;
}
```

### Dynamic Commands Based on Node Type

```typescript
cy.cxtmenu({
  selector: 'node',
  commands: function(ele) {
    const nodeType = ele.data('type');
    const baseCommands = [
      { content: 'Focus', select: () => im.focus(ele.id()) },
      { content: 'Copy ID', select: () => navigator.clipboard.writeText(ele.id()) }
    ];
    
    // Add type-specific commands
    if (nodeType === 'folder' || nodeType === 'module') {
      baseCommands.push({
        content: ele.hasClass('cy-expand-collapse-collapsed-node') ? 'Expand' : 'Collapse',
        select: () => {
          const api = (cy as any).expandCollapse('get');
          if (api.isExpandable(ele)) api.expand(ele);
          else if (api.isCollapsible(ele)) api.collapse(ele);
        }
      });
    }
    
    if (nodeType === 'function' || nodeType === 'class') {
      baseCommands.push({
        content: 'Open in Editor',
        select: () => {
          const node = graph.nodes.find(n => n.id === ele.id());
          if (node?.file && node?.line) {
            openFileInEditor(node.file, node.line);
          }
        }
      });
    }
    
    return baseCommands;
  }
});
```

### Cleanup and Memory Management

```typescript
// Store menu instance for cleanup
let contextMenu: any = null;

function initContextMenu(cy: Core) {
  contextMenu = cy.cxtmenu({ /* options */ });
}

function cleanup() {
  // Destroy menu when viewer is unmounted
  if (contextMenu) {
    contextMenu.destroy();
    contextMenu = null;
  }
}
```

## Known Issues & Gotchas

### Critical Limitations

1. **Touch Device Support** - Major limitation for mobile/tablet users
   - Does NOT work with touch-tap & hold on Windows/Android
   - iOS support is limited and inconsistent
   - **Mitigation**: Provide alternative interaction methods for mobile users

2. **Browser Compatibility Issues**
   - IE9/10: Context menu only works once then fails
   - Menu stays open when left-clicking while holding right-click
   - **Mitigation**: Test thoroughly in target browsers, provide fallbacks

3. **TypeScript Integration**
   - Property 'cxtmenu' does not exist on type 'Core'
   - Requires type assertions or custom declarations
   - **Solution**: Use `(cy as any).cxtmenu()` or install `@types/cytoscape-cxtmenu`

4. **Z-index Conflicts**
   - Default z-index (9999) may conflict with other UI elements
   - Menu may appear behind modal dialogs or tooltips
   - **Solution**: Adjust `zIndex` option based on your UI stack

### Performance Considerations

- **Memory Leaks**: Always call `menu.destroy()` when removing the graph
- **Event Handlers**: Multiple menus on same elements can cause conflicts
- **Large Graphs**: Consider using more specific selectors to reduce event binding overhead

### Common Pitfalls

1. **Registration Order**
   ```typescript
   // WRONG - cy created before extension registered
   const cy = cytoscape({ /* ... */ });
   cytoscape.use(cxtmenu);
   
   // CORRECT - register extension first
   cytoscape.use(cxtmenu);
   const cy = cytoscape({ /* ... */ });
   ```

2. **Selector Specificity**
   ```typescript
   // Too broad - triggers on all elements
   selector: '*'
   
   // Better - specific to interactive elements
   selector: 'node[type = "function"], node[type = "class"]'
   ```

3. **Command State Management**
   ```typescript
   // Commands evaluated once at creation
   commands: [
     {
       content: someVariable,  // Won't update if variable changes
       select: () => { }
     }
   ]
   
   // Use function for dynamic commands
   commands: (ele) => [
     {
       content: getCurrentLabel(ele),  // Evaluated per menu open
       select: () => { }
     }
   ]
   ```

## Alternatives Comparison

### When to Use cytoscape-cxtmenu

**Best for:**
- Desktop-first applications
- Modern UI with gesture support
- Simple command sets (3-8 items)
- Visual distinction from OS menus

**Not suitable for:**
- Mobile/touch-first applications
- Complex hierarchical menus
- Accessibility-critical applications
- Traditional enterprise UIs

### Alternative: cytoscape-context-menus

**Choose if you need:**
- Traditional dropdown menus
- Mobile/touch support
- Submenus and complex hierarchies
- Better accessibility

**Trade-offs:**
- Less visually distinctive
- More familiar but less modern
- Requires additional CSS

### Alternative: Custom Implementation

**Choose if you need:**
- Full control over appearance/behavior
- Integration with existing UI framework
- Specific accessibility requirements
- Minimal dependencies

**Trade-offs:**
- More development effort
- Maintenance burden
- No community support

## Migration Guide

### From Custom Right-Click Handler

```typescript
// Before: Custom implementation
cy.on('cxttap', 'node', (evt) => {
  evt.preventDefault();
  showCustomMenu(evt.position, evt.target);
});

// After: Using cxtmenu
cy.cxtmenu({
  selector: 'node',
  commands: menuItems.map(item => ({
    content: item.label,
    select: () => item.action(evt.target)
  }))
});
```

### From cytoscape-context-menus

```typescript
// Before: context-menus
cy.contextMenus({
  menuItems: [
    {
      id: 'open',
      content: 'Open',
      selector: 'node',
      onClickFunction: (event) => { /* ... */ }
    }
  ]
});

// After: cxtmenu
cy.cxtmenu({
  selector: 'node',
  commands: [
    {
      content: 'Open',
      select: (ele) => { /* ... */ }
    }
  ]
});
```

## Resources

### Official Documentation
- **GitHub**: https://github.com/cytoscape/cytoscape.js-cxtmenu
- **Demo**: https://cytoscape.org/cytoscape.js-cxtmenu/
- **NPM**: https://www.npmjs.com/package/cytoscape-cxtmenu
- **Types**: https://www.npmjs.com/package/@types/cytoscape-cxtmenu

### Community Resources
- **Stack Overflow**: Tagged with `cytoscape.js` and `context-menu`
- **GitHub Issues**: Active issue tracker for bug reports
- **CodeSandbox**: Search for `cytoscape-cxtmenu` for examples

### Version History
- **v3.5.0** (2024-02-07): Latest stable release
- **v3.4.0** (2023-02-23): Previous major version
- Weekly downloads: ~6,250 (stable usage)

## Recommendations

1. **Test on all target devices** - Especially mobile if required
2. **Provide keyboard alternatives** - For accessibility
3. **Keep command count limited** - 3-8 items optimal for circular layout
4. **Use clear icons/labels** - Compensate for non-traditional layout
5. **Consider fallback UI** - For touch devices or accessibility needs
6. **Monitor for updates** - Touch support may improve in future versions

## Appendix

### CSS Customisation

```css
/* Style command text */
.cxtmenu-content {
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
}

/* Style disabled commands */
.cxtmenu-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Adjust canvas container for menu */
.cxtmenu-canvas {
  z-index: 10000 !important;  /* Override if needed */
}
```

### Debugging Tips

```typescript
// Enable debug logging
cy.on('cxttap', (evt) => {
  console.log('Context tap at:', evt.position);
});

// Check if extension is loaded
console.log('cxtmenu available:', typeof (cy as any).cxtmenu === 'function');

// Monitor menu lifecycle
const menu = cy.cxtmenu({
  selector: 'node',
  commands: [/* ... */]
});

// Check menu state
console.log('Menu instance:', menu);
```