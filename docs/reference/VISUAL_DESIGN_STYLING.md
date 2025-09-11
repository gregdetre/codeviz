# Visual Design & Styling

CodeViz visual design components, styling libraries, and UI/UX implementation patterns for the TypeScript-based graph visualization interface.

## See also

- `LAYOUT.md` - Graph layout algorithms, positioning, and spatial organization of visualization elements
- `FLOATING_UI_TOOLTIP_INTEGRATION.md` - Tooltip positioning, interaction design, and floating element styling
- `WORD_WRAP_LIBRARY_INTEGRATION.md` - Text formatting, line wrapping, and typography utilities
- `cyto/README.md` - Cytoscape.js styling, visual themes, and graph appearance customization
- `cyto/NODE_GROUPING.md` - Visual grouping, compound node styling, and hierarchical display patterns
- `ts/viewer/` - Frontend implementation where visual styling is applied (Vite + TypeScript + Cytoscape.js)

## Current Visual Components

### Graph Visualization
- **Layout algorithms**: ELK→fCoSE hybrid positioning for optimal node placement
- **Node styling**: Cytoscape.js-based visual themes with compound node grouping
- **Edge rendering**: Connection visualization with filtering and highlighting capabilities
- **Interactive elements**: Hover states, selection feedback, and neighbor highlighting

### UI Elements  
- **Tooltips**: Floating UI-based positioning with intelligent collision detection
- **Text formatting**: Word-wrap integration for clean typography and content display
- **Controls**: Layout switching toolbar and visualization mode toggles

### Typography
- **Text wrapping**: Configurable line length, indentation, and delimiter handling via word-wrap library
- **Content formatting**: CLI output, documentation generation, and error message presentation

## Design Principles

- **Performance-first styling**: Lightweight libraries optimized for interactive graph visualization
- **Accessibility**: ARIA attributes, focus management, and screen reader compatibility
- **Responsive layout**: Viewport-aware positioning and collision detection
- **Modular components**: Separation of concerns between layout, styling, and interaction

## Planned Visual Enhancements

### Near-term (not yet implemented)
- **Color theming**: Consistent color palette and dark/light mode support
- **Font system**: Typography hierarchy and font loading optimization  
- **Icon integration**: Visual symbols for different node types and relationships
- **Animation patterns**: Smooth transitions and interactive feedback

### Future considerations
- **Custom CSS properties**: Theme variables and customizable visual parameters
- **Mobile styling**: Touch-friendly interactions and responsive breakpoints
- **Accessibility patterns**: High contrast modes and reduced motion preferences
- **Export styling**: Print-friendly and image export visual optimizations

## Implementation Architecture

### Styling Stack
- **Base framework**: Vite + TypeScript for build pipeline and type safety
- **Graph rendering**: Cytoscape.js with custom visual themes and node styling
- **Floating elements**: Floating UI for tooltips, popovers, and contextual interfaces  
- **Text processing**: word-wrap for typography and content formatting
- **CSS organization**: Component-scoped styling with utility classes

### Integration Patterns
- **Component isolation**: Each visual component manages its own styling and behavior
- **Shared utilities**: Common styling functions and theme variables
- **Performance optimization**: Tree-shaking, minimal bundle size, efficient rendering

## Troubleshooting Visual Issues

### Common Problems
- **Layout conflicts**: Check ELK vs fCoSE algorithm selection and spacing configuration
- **Tooltip positioning**: Verify Floating UI middleware setup and virtual element boundaries  
- **Text overflow**: Ensure word-wrap configuration matches container constraints
- **Performance degradation**: Monitor styling recalculation frequency and DOM updates

### Debug Tools
- **Cytoscape debugger**: Graph layout and node positioning inspection
- **Browser dev tools**: CSS cascade, computed styles, and layout performance
- **Vite dev server**: Hot reload for styling changes during development

## Future Documentation

As CodeViz visual design evolves, this document will signpost to:

- `COLOR_PALETTE_THEMING.md` - Color systems, brand guidelines, and theme customization  
- `TYPOGRAPHY_SYSTEM.md` - Font hierarchy, text styling, and readability optimization
- `ICON_SYMBOL_SYSTEM.md` - Visual symbols, iconography, and graphical representations
- `ANIMATION_INTERACTION.md` - Motion design, transitions, and interactive feedback patterns
- `ACCESSIBILITY_PATTERNS.md` - Inclusive design, WCAG compliance, and assistive technology support

## Cross-References

This document connects visual design concerns across the codebase:

- **Layout systems** → Graph positioning and spatial organization
- **Interaction design** → User interface patterns and feedback mechanisms  
- **Typography** → Text presentation and content formatting
- **Performance** → Efficient rendering and styling optimization
- **Accessibility** → Inclusive design and universal usability