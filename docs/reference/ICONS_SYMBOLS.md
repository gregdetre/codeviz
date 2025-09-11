# Icons & Symbols

Visual symbols, iconography, and graphical representations used throughout the CodeViz interface.

## Current Icons

### External Editor Integration

- **VS Code Icon**: Official Microsoft Visual Studio Code SVG icon (`static/img/vscode-icon.svg`) used in the right details pane next to file paths to indicate external editor integration. Clicking opens files directly in VS Code via `vscode://file/path:line` protocol.
- **⚡ Lightning bolt**: Previously used for Cursor integration (deprecated in favor of VS Code)

### Test & Debug Icons  

- **📝 Document with pencil**: Used in the left toolbar test section to indicate editable code files that can be opened in external editors.

## Icon Usage Principles

### Selection Criteria
- **Universally recognizable**: Choose symbols that have clear, established meanings
- **Functional clarity**: Icons should immediately communicate their purpose  
- **Visual consistency**: Maintain consistent styling and sizing across the interface
- **Accessibility**: Ensure icons work well with screen readers and at different sizes

### Implementation Guidelines
- **Unicode preferred**: Use Unicode symbols when possible for simplicity and compatibility
- **Fallback support**: Provide text alternatives for accessibility
- **Contextual sizing**: Scale appropriately for the UI element (16px for inline, larger for primary actions)
- **Color considerations**: Icons should work in both light and dark themes

## Integration Points

### Details Panel (`ts/viewer/src/details-panel.ts`)
- Lightning bolt icon appears next to file paths
- Double-click functionality opens files in Cursor via `cursor://` protocol
- Icon opacity set to 0.7 for subtle visual presence
- 16px font size for inline context

### Left Toolbar (`ts/viewer/index.html`)
- Document icon used in test links for external editor integration
- Styled with consistent padding and background
- Part of the overall toolbar visual hierarchy

## Future Icon Expansions

As the CodeViz interface grows, consider adding:

### File Type Indicators
- **🐍 Python snake**: Python files
- **📄 Generic file**: Unknown file types
- **📁 Folder**: Directory representations

### Action Icons  
- **🔍 Magnifying glass**: Search functionality
- **⚙️ Gear**: Settings and configuration
- **↻ Refresh arrow**: Reload/refresh actions
- **📊 Chart**: Analytics and metrics

### Status Indicators
- **✅ Check mark**: Success states
- **⚠️ Warning triangle**: Warning states  
- **❌ X mark**: Error states
- **ℹ️ Information**: Informational messages

## Technical Implementation

### Current Approach
- **SVG assets**: Official editor icons stored in `static/img/` directory
- **Unicode symbols**: Simple symbols embedded directly in HTML strings
- **CSS styling**: Size, opacity, and positioning via stylesheets
- **Inline SVG**: External SVG icons loaded and styled dynamically

### Future Considerations
- **Icon fonts**: Consider icon fonts like Font Awesome for more variety
- **SVG icons**: Custom SVG icons for brand consistency
- **Icon components**: React/Vue components for complex icon logic
- **Theme support**: Icons that adapt to light/dark themes

## Accessibility

### Current Support
- Icons paired with descriptive text labels
- Semantic HTML structure for screen readers
- Cursor pointer styles for interactive elements

### Best Practices
- Always provide `aria-label` attributes for icon-only elements
- Use `role="img"` for decorative icons
- Ensure sufficient color contrast
- Test with screen readers and keyboard navigation

## See Also

- `VISUAL_DESIGN_STYLING.md`: Overall visual design components, styling libraries, and UI/UX implementation patterns
- `UI_WIDGETS_ARRANGEMENT.md`: Layout context for icon placement and control organization
- `USER_GUIDE.md`: User-facing features that utilize icons and visual symbols
- `libraries/PHOSPHOR_ICONS.md`: Phosphor Icons reference and loading spinner pattern (LLM chat)
- `static/img/`: Icon asset files and visual resources directory
- `ts/viewer/src/details-panel.ts`: Implementation of external editor integration icons
- `ts/viewer/index.html`: Toolbar icon implementations and markup