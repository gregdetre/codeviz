# Visual Design & Styling

CodeViz visual design components, styling libraries, and UI/UX implementation patterns for the TypeScript-based graph visualization interface.

## See also

- `LAYOUT.md` - Graph layout algorithms, positioning, and spatial organization of visualization elements
- `libraries/FLOATING_UI_TOOLTIP_INTEGRATION.md` - Tooltip positioning, interaction design, and floating element styling
- `libraries/WORD_WRAP_LIBRARY_INTEGRATION.md` - Text formatting, line wrapping, and typography utilities
- `libraries/CHALK_USAGE_GUIDE.md` - Terminal color formatting with chalk library for CLI output
- `libraries/cyto/README.md` - Cytoscape.js styling, visual themes, and graph appearance customization
- `libraries/cyto/NODE_GROUPING.md` - Visual grouping, compound node styling, and hierarchical display patterns
- `ts/viewer/` - Frontend implementation where visual styling is applied (Vite + TypeScript + Cytoscape.js)

## Current Visual Components

### Graph Visualization
- **Layout algorithms**: ELK→fCoSE hybrid positioning for optimal node placement
- **Node styling**: Cytoscape.js-based visual themes with compound node grouping
- **Edge rendering**: Connection visualization with filtering and highlighting capabilities
- **Interactive elements**: Hover states, selection feedback, and neighbor highlighting


## Implementation Architecture

### Styling Stack
- **Base framework**: Vite + TypeScript for build pipeline and type safety
- **Graph rendering**: Cytoscape.js with custom visual themes and node styling
- **Floating elements**: Floating UI for tooltips, popovers, and contextual interfaces  
- **Text processing**: word-wrap for typography and content formatting
- **CSS organization**: Component-scoped styling with utility classes



## Future Documentation

As CodeViz visual design evolves, this document will signpost to:

- `COLOR_PALETTE_THEMING.md` - Color systems, brand guidelines, and theme customization  
- `FONTS_TYPOGRAPHY_SYSTEM.md` - Font hierarchy, text styling, and readability optimization
- `ICONS_SYMBOLS.md` - Visual symbols, iconography, external editor integration icons, and graphical representations
- `ANIMATION_INTERACTION.md` - Motion design, transitions, and interactive feedback patterns
- `ACCESSIBILITY.md` - Inclusive design, WCAG compliance, and assistive technology support

