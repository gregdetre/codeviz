# Hybrid Layout Strategies: Combining ELK and fCoSE

Research into combining hierarchical (ELK) and force-directed (fCoSE) layouts in Cytoscape.js for code visualization.

## Executive Summary

ELK and fCoSE layouts cannot be directly combined in a single Cytoscape.js layout run, but several hybrid strategies enable leveraging both algorithms' strengths. This document explores practical approaches for code visualization projects requiring both hierarchical clarity and organic exploration.

## Background

### ELK Layout Characteristics
- **Algorithm**: Eclipse Layout Kernel (hierarchical/layered)
- **Strengths**: Clear dependency flows, orthogonal edge routing, minimal crossings
- **Best for**: Call graphs, module hierarchies, presentation-ready structure
- **Performance**: Deterministic, works well with large graphs when animation disabled

### fCoSE Layout Characteristics  
- **Algorithm**: Fast Compound Spring Embedder (force-directed)
- **Strengths**: Interactive exploration, constraint support, compound node handling
- **Best for**: Iterative discovery, organic clustering, refinement of existing layouts
- **Performance**: Fast, supports real-time interaction and incremental updates

*Source: docs/reference/cyto/LAYOUTS.md:9-21*

## Technical Limitations

### Why Direct Combination Fails
1. **Single Layout Execution**: Cytoscape.js applies one layout algorithm per `cy.layout().run()` call
2. **Algorithmic Incompatibility**: ELK uses layered positioning while fCoSE uses physics simulation
3. **Different Coordinate Systems**: ELK produces fixed hierarchical coordinates; fCoSE expects flexible positioning

### Current Implementation Context
CodeViz currently implements layout switching via configuration:
```typescript
const layoutName = (vcfg?.layout ?? 'elk').toLowerCase();
const layout = layoutName === 'fcose'
  ? { name: 'fcose', animate: true }
  : { name: 'elk', animate: false, /* ... */ };
```
*Source: ts/viewer/src/main.ts:29-68*

## Hybrid Strategies

### 1. Sequential Layout Application

**Approach**: Apply layouts in sequence, using constraints to preserve desired structure.

```javascript
// Phase 1: Establish hierarchy with ELK
cy.layout({
  name: 'elk',
  animate: false,
  elk: {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL'
  }
}).run().then(() => {
  
  // Phase 2: Refine with fCoSE using constraints
  const criticalNodes = cy.nodes('[type="entry"], [type="main"]');
  const fixedConstraints = [];
  
  criticalNodes.forEach(node => {
    fixedConstraints.push({
      nodeId: node.id(),
      position: node.position()
    });
  });
  
  cy.layout({
    name: 'fcose',
    animate: true,
    randomize: false,
    fixedNodeConstraint: fixedConstraints,
    numIter: 1000  // Reduced for refinement
  }).run();
});
```

### 2. Constraint-Based Hybrid

**Approach**: Use fCoSE's constraint system to maintain ELK-established structure while optimizing spacing.

```javascript
function applyConstrainedLayout() {
  // Run ELK to establish base positions
  const elkLayout = cy.layout({ name: 'elk', animate: false });
  elkLayout.run();
  
  elkLayout.on('layoutstop', () => {
    // Extract layer information from ELK result
    const layers = extractLayers(cy.nodes());
    
    // Apply fCoSE with alignment constraints
    cy.layout({
      name: 'fcose',
      animate: true,
      
      // Preserve vertical layers from ELK
      alignmentConstraint: {
        horizontal: layers.map(layer => layer.map(node => node.id()))
      },
      
      // Allow horizontal refinement
      relativePlacementConstraint: generateSpacingConstraints(layers),
      
      // Optimize for compound nodes
      nestingFactor: 0.1,
      gravity: 0.25
    }).run();
  });
}
```

### 3. Subgraph-Specific Layouts

**Approach**: Apply different layouts to different graph regions based on structural characteristics.

```javascript
function applyMixedLayouts() {
  // Identify graph regions
  const hierarchicalNodes = cy.nodes('[type="class"], [type="module"]');
  const clusterNodes = cy.nodes('[type="function"]').difference(hierarchicalNodes);
  
  // Apply ELK to hierarchical components
  hierarchicalNodes.layout({
    name: 'elk',
    animate: false,
    elk: { 'elk.algorithm': 'layered' }
  }).run();
  
  // Apply fCoSE to clustered components  
  setTimeout(() => {
    clusterNodes.layout({
      name: 'fcose',
      animate: true,
      fit: false,
      randomize: false,
      numIter: 1500
    }).run();
  }, 100);
}
```

### 4. Progressive Layout Refinement

**Approach**: Use ELK for initial structure, then progressive fCoSE refinement in response to user interaction.

```javascript
class LayoutManager {
  constructor(cy) {
    this.cy = cy;
    this.isRefined = false;
  }
  
  applyInitialLayout() {
    // Start with ELK for clarity
    this.cy.layout({
      name: 'elk',
      animate: false,
      nodeDimensionsIncludeLabels: true
    }).run();
    
    this.isRefined = false;
  }
  
  refineLayout() {
    if (this.isRefined) return;
    
    // Refine with fCoSE while preserving structure
    const currentPositions = {};
    this.cy.nodes().forEach(node => {
      currentPositions[node.id()] = node.position();
    });
    
    this.cy.layout({
      name: 'fcose',
      animate: true,
      randomize: false,
      // Use current positions as starting point
      positions: currentPositions,
      numIter: 800
    }).run();
    
    this.isRefined = true;
  }
}
```

## Implementation Recommendations

### For CodeViz Integration

1. **Extend Configuration Schema**
   ```typescript
   interface ViewerConfig {
     layout: 'elk' | 'fcose' | 'hybrid';
     hybridMode?: 'sequential' | 'constrained' | 'subgraph';
   }
   ```

2. **Add Layout Manager**
   - Implement `LayoutManager` class in `ts/viewer/src/`
   - Support mode switching and progressive refinement
   - Cache layout results for performance

3. **User Interface Controls**
   ```html
   <div class="layout-controls">
     <button id="applyElk">Hierarchical (ELK)</button>
     <button id="applyFcose">Force-directed (fCoSE)</button>
     <button id="applyHybrid">Hybrid Layout</button>
     <button id="refineLayout">Refine Current</button>
   </div>
   ```

### Performance Considerations

- **Large Graphs**: Disable animation for ELK phase, enable for fCoSE refinement
- **Incremental Updates**: Use constraint-based approach for dynamic graph changes
- **Memory Usage**: Cache layout results but implement cleanup for long sessions

## Research Sources

### Primary Documentation
- `docs/reference/cyto/LAYOUTS.md` - Mixed layout strategies and constraint-based positioning
- `docs/reference/LAYOUT.md` - CodeViz layout principles and current implementation
- `ts/viewer/src/main.ts` - Current layout switching implementation

### External References
- [Cytoscape.js Layout Blog Post](https://blog.js.cytoscape.org/2020/05/11/layouts/) - Official layout guidance
- [cytoscape.js-elk GitHub](https://github.com/cytoscape/cytoscape.js-elk) - ELK adapter documentation
- [cytoscape.js-fcose GitHub](https://github.com/iVis-at-Bilkent/cytoscape.js-fcose) - fCoSE constraint documentation
- [Observable Layout Comparisons](https://observablehq.com/@ckanz/cytoscape-layout-comparisons) - Performance and visual comparisons

### Web Search Results
Query: "cytoscape.js combine ELK and fCoSE layouts hybrid mixed" revealed:
- Sequential layout application patterns
- Constraint-based positioning approaches  
- Component packing utilities for disconnected subgraphs
- Performance considerations for large graphs

## Conclusion

While ELK and fCoSE cannot be directly combined, hybrid approaches enable leveraging both algorithms' strengths. For code visualization, the recommended strategy is **constraint-based sequential application**: use ELK for initial hierarchical structure, then apply fCoSE with fixed-node constraints to refine spacing while preserving call flow clarity.

The current CodeViz implementation provides a solid foundation for extending to hybrid layouts through configuration-driven layout management and progressive refinement.

*Research conducted September 2025 using Cytoscape.js 3.31.0 layout algorithms*