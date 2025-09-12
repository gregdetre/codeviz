# Floating UI Tooltip Integration

Comprehensive guide for integrating Floating UI tooltips into the CodeViz TypeScript viewer application.

## See also

- [Floating UI Official Documentation](https://floating-ui.com/docs/getting-started) - Complete library documentation and tutorials
- [Floating UI GitHub Repository](https://github.com/floating-ui/floating-ui) - Source code and issue tracking
- `ts/viewer/` - Vite + TypeScript + Cytoscape.js frontend where tooltips will be implemented
- `ts/src/server/server.ts` - Fastify server serving viewer + data
- `package.json` - Current project dependencies that will include @floating-ui/dom
- `WORD_WRAP_LIBRARY_INTEGRATION.md` - Text wrapping for tooltip content formatting

## Principles, key decisions

- **TypeScript-first approach**: Chosen for native TypeScript support and active development
- **Framework-agnostic design**: Works with vanilla TypeScript/Vite setup without React/Vue dependencies
- **Performance priority**: Ultra-lightweight (0.6KB compressed) with tree-shaking support
- **Positioning excellence**: Superior collision detection and smart placement for complex graph visualizations
- **Future-proof choice**: Active maintenance vs Tippy.js which is no longer maintained

## Library Overview

Floating UI is a low-level library for positioning floating elements like tooltips, popovers, and dropdowns. It provides intelligent positioning that automatically adjusts to viewport constraints, making it ideal for complex visualizations where tooltips need to work around graph nodes and edges.

### Core Features
- **Intelligent positioning**: Auto-flip, collision detection, smart placement
- **Virtual element support**: Attach tooltips to coordinates or custom shapes
- **Middleware system**: Extensible positioning logic
- **Accessibility built-in**: ARIA attributes and focus management
- **Performance optimized**: Minimal reflows, efficient calculations

## Installation & Setup

```bash
npm install @floating-ui/dom
```

### TypeScript Configuration
Floating UI requires TypeScript 4.1+ for template literal types. Current project uses TypeScript ^5.6.2, so compatibility is ensured.

## Basic Implementation

### Simple Tooltip Example

```typescript
import { computePosition, flip, shift, offset } from '@floating-ui/dom';

function createTooltip(referenceElement: Element, tooltipElement: Element, content: string) {
  tooltipElement.textContent = content;
  
  function updatePosition() {
    computePosition(referenceElement, tooltipElement, {
      placement: 'top',
      middleware: [
        offset(8),
        flip(),
        shift({ padding: 5 })
      ],
    }).then(({ x, y, placement, middlewareData }) => {
      Object.assign(tooltipElement.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  }

  // Show tooltip
  function showTooltip() {
    tooltipElement.style.display = 'block';
    updatePosition();
  }

  // Hide tooltip  
  function hideTooltip() {
    tooltipElement.style.display = 'none';
  }

  // Event listeners
  referenceElement.addEventListener('mouseenter', showTooltip);
  referenceElement.addEventListener('mouseleave', hideTooltip);
  
  return { showTooltip, hideTooltip, updatePosition };
}
```

### Cytoscape.js Integration

```typescript
import { computePosition, autoUpdate } from '@floating-ui/dom';

function setupCytoscapeTooltips(cy: cytoscape.Core) {
  const tooltip = document.createElement('div');
  tooltip.className = 'cytoscape-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    display: none;
  `;
  document.body.appendChild(tooltip);

  let cleanup: (() => void) | null = null;

  cy.on('mouseover', 'node', (event) => {
    const node = event.target;
    const nodeData = node.data();
    
    // Create virtual element for Cytoscape node position
    const virtualElement = {
      getBoundingClientRect() {
        const bbox = node.renderedBoundingBox();
        const container = cy.container()!.getBoundingClientRect();
        
        return {
          x: container.left + bbox.x1,
          y: container.top + bbox.y1,
          width: bbox.w,
          height: bbox.h,
          top: container.top + bbox.y1,
          left: container.left + bbox.x1,
          right: container.left + bbox.x2,
          bottom: container.top + bbox.y2,
        };
      },
    };

    tooltip.textContent = `${nodeData.label || nodeData.id}`;
    tooltip.style.display = 'block';

    // Setup auto-updating position
    cleanup = autoUpdate(virtualElement, tooltip, () => {
      computePosition(virtualElement, tooltip, {
        placement: 'top',
        middleware: [
          offset(8),
          flip(),
          shift({ padding: 5 })
        ],
      }).then(({ x, y }) => {
        Object.assign(tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    });
  });

  cy.on('mouseout', 'node', () => {
    tooltip.style.display = 'none';
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });
}
```

## Common Gotchas & Solutions

Based on extensive research from GitHub issues and Stack Overflow discussions, here are the most critical gotchas when implementing Floating UI:

### 1. Memory Leaks with autoUpdate

**Problem**: Memory leaks when `autoUpdate` is not properly cleaned up, especially severe with many floating elements.
**Source**: [Memory leak when autoUpdate iframe gets swapped out · Issue #2969](https://github.com/floating-ui/floating-ui/issues/2969), [Memory leak in the tutorial example · Issue #1858](https://github.com/floating-ui/floating-ui/issues/1858)

**Solution**:
```typescript
// ❌ Wrong - causes memory leak
const cleanup = autoUpdate(reference, floating, updatePosition);

// ✅ Correct - always clean up
useEffect(() => {
  const cleanup = autoUpdate(reference, floating, updatePosition);
  return cleanup; // Cleanup on unmount
}, []);

// ✅ For vanilla JS
let cleanup: (() => void) | null = null;

function showTooltip() {
  cleanup = autoUpdate(reference, floating, updatePosition);
}

function hideTooltip() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}
```

### 2. Conditional Rendering vs CSS Hiding

**Problem**: Using `whileElementsMounted` with CSS-hidden elements causes performance issues.
**Source**: [autoUpdate | Floating UI Documentation](https://floating-ui.com/docs/autoupdate)

**Solution**:
```typescript
// ✅ For conditionally rendered elements
const cleanup = autoUpdate(
  reference,
  floating,
  updatePosition,
  { whileElementsMounted: true }
);

// ✅ For CSS-hidden elements - manual control
if (tooltip.style.display !== 'none') {
  cleanup = autoUpdate(reference, floating, updatePosition);
}
```

### 3. TypeScript Ref Type Issues

**Problem**: Floating UI uses callback refs, not RefObjects, breaking custom component integration.
**Source**: [Floating UI setFloating with custom component that accepts RefObject - Stack Overflow](https://stackoverflow.com/questions/78564522/floating-ui-setfloating-with-custom-component-that-accepts-refobject)

**Solution**:
```typescript
// ✅ Use refs.reference for element access
const { refs, floatingStyles } = useFloating();

// Access actual element
const referenceElement = refs.reference.current;

// ✅ For custom components, wrap in div
<div ref={refs.setReference}>
  <CustomComponent />
</div>
```

### 4. TypeScript Version Compatibility  

**Problem**: Requires TypeScript 4.1+ for template literal types.
**Source**: [Oldest supported typescript version and validation · Issue #1584](https://github.com/floating-ui/floating-ui/issues/1584)

**Solution**: Ensure TypeScript >= 4.1. Current project uses 5.6.2 ✅

### 5. Testing with act() Warnings

**Problem**: React act() warnings in tests due to async position updates.
**Source**: [Floating UI Documentation](https://floating-ui.com/docs/react)

**Solution**:
```typescript
// ✅ Flush microtasks in tests
await act(async () => {}); // Flush microtasks after floating element renders
```

### 6. Disabled Elements Don't Fire Events

**Problem**: Tooltips on disabled buttons don't show because disabled elements don't fire mouse events.
**Source**: [React Examples | Floating UI](https://floating-ui.com/docs/react-examples)

**Solution**:
```typescript
// ❌ Disabled button won't show tooltip
<button disabled>Hover me</button>

// ✅ Visually disabled instead
<button 
  aria-disabled="true"
  style={{ opacity: 0.5, cursor: 'not-allowed' }}
  onClick={(e) => e.preventDefault()}
>
  Hover me
</button>
```

### 7. Performance with Multiple Elements

**Problem**: Unnecessary autoUpdate calls during animations cause performance degradation.
**Source**: [Unnecessary autoUpdate when content changes through animation · Issue #2922](https://github.com/floating-ui/floating-ui/issues/2922)

**Solution**:
```typescript
// ✅ Only update when position actually needs updating
const shouldUpdate = useCallback(() => {
  // Check if reference element actually moved
  return referenceRect.current !== reference.getBoundingClientRect();
}, []);

if (shouldUpdate()) {
  updatePosition();
}
```

### 8. Focus Management Issues

**Problem**: Complex floating elements with multiple reference points break focus management.
**Source**: [Focus management and prop getters for external reference · Issue #2128](https://github.com/floating-ui/floating-ui/issues/2128)

**Solution**: Keep reference elements in shared context when possible, or handle focus manually for complex cases.

## Advanced Usage Patterns

### Virtual Elements for Graph Nodes

Perfect for Cytoscape.js where nodes aren't DOM elements:

```typescript
function createVirtualElement(node: cytoscape.NodeSingular, cy: cytoscape.Core) {
  return {
    getBoundingClientRect() {
      const bbox = node.renderedBoundingBox();
      const container = cy.container()!.getBoundingClientRect();
      
      return {
        x: container.left + bbox.x1,
        y: container.top + bbox.y1,
        width: bbox.w,
        height: bbox.h,
        top: container.top + bbox.y1,
        left: container.left + bbox.x1,
        right: container.left + bbox.x2,
        bottom: container.top + bbox.y2,
      };
    },
  };
}
```

### Middleware Combinations

```typescript
// For graph tooltips that need to avoid edges and nodes
const middleware = [
  offset(10),                    // Distance from reference
  flip(),                        // Flip when no space
  shift({ padding: 8 }),         // Shift to stay in viewport
  size({                         // Limit maximum size
    apply({ availableWidth, availableHeight, elements }) {
      Object.assign(elements.floating.style, {
        maxWidth: `${availableWidth}px`,
        maxHeight: `${availableHeight}px`,
      });
    },
  }),
];
```

### Custom Arrow Positioning

```typescript
import { arrow } from '@floating-ui/dom';

const arrowElement = document.querySelector('#arrow');

computePosition(reference, floating, {
  middleware: [arrow({ element: arrowElement })],
}).then(({ placement, middlewareData }) => {
  const { x, y } = middlewareData.arrow!;
  
  Object.assign(arrowElement.style, {
    left: x != null ? `${x}px` : '',
    top: y != null ? `${y}px` : '',
  });
});
```

## Integration with CodeViz Viewer

### Recommended Implementation Strategy

1. **Create tooltip manager class**:
   ```typescript
   // ts/viewer/src/tooltips/TooltipManager.ts
   export class TooltipManager {
     private cleanup: Map<string, () => void> = new Map();
     
     setupNodeTooltips(cy: cytoscape.Core) { /* ... */ }
     setupEdgeTooltips(cy: cytoscape.Core) { /* ... */ }
     destroy() { /* cleanup all */ }
   }
   ```

2. **Initialize in main viewer**:
   ```typescript
   // ts/viewer/src/main.ts
   import { TooltipManager } from './tooltips/TooltipManager';
   
   const tooltipManager = new TooltipManager();
   tooltipManager.setupNodeTooltips(cy);
   ```

3. **Add CSS for styling**:
   ```css
   .codeviz-tooltip {
     position: absolute;
     background: var(--tooltip-bg, rgba(0, 0, 0, 0.9));
     color: var(--tooltip-color, white);
     padding: 8px 12px;
     border-radius: 6px;
     font-size: 12px;
     line-height: 1.4;
     pointer-events: none;
     z-index: 1000;
     max-width: 300px;
     word-wrap: break-word;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
   }
   ```

## Troubleshooting

### Common Issues

1. **Tooltip flickers**: Usually caused by tooltip intercepting mouse events. Ensure `pointer-events: none`.

2. **Position not updating**: Check that `autoUpdate` cleanup is properly managed and reference element is stable.

3. **TypeScript errors**: Verify TypeScript version >= 4.1 and proper type imports.

4. **Performance issues**: Ensure `autoUpdate` is only active when tooltip is visible.

## Performance Considerations

- **Bundle size**: 0.6KB compressed with tree-shaking
- **Runtime performance**: Minimal reflows due to efficient calculation algorithms  
- **Memory usage**: Proper cleanup prevents memory leaks
- **Large datasets**: Consider throttling/debouncing for datasets with hundreds of tooltips

## Migration from Other Libraries

### From Tippy.js

Main differences:
- Floating UI handles positioning only; you control styling and behavior
- More granular control but requires more setup
- Better TypeScript support and ongoing maintenance
- Smaller bundle size

### Key API Differences

```typescript
// Tippy.js (old)
tippy(element, {
  content: 'Tooltip text',
  placement: 'top',
});

// Floating UI (new)
computePosition(reference, floating, {
  placement: 'top',
  middleware: [offset(8), flip(), shift()],
}).then(({ x, y }) => {
  Object.assign(floating.style, {
    left: `${x}px`,
    top: `${y}px`,
  });
});
```

## Future Considerations

- **React migration**: If CodeViz moves to React, upgrade to `@floating-ui/react` for better integration
- **Additional middleware**: Arrow positioning, custom collision detection for graph edges
- **Accessibility enhancements**: ARIA live regions for dynamic content updates
- **Mobile support**: Touch event handling when mobile support is added

## References

- [Floating UI Getting Started Guide](https://floating-ui.com/docs/getting-started)
- [TypeScript Tutorial](https://floating-ui.com/docs/tutorial) 
- [GitHub Issues & Discussions](https://github.com/floating-ui/floating-ui/issues)
- [Stack Overflow Questions](https://stackoverflow.com/questions/tagged/floating-ui)
- [Migration Guide from Popper.js](https://floating-ui.com/docs/migration)
- [Virtual Elements Documentation](https://floating-ui.com/docs/virtual-elements)
- [AutoUpdate API Reference](https://floating-ui.com/docs/autoupdate)
- [Middleware Documentation](https://floating-ui.com/docs/middleware)