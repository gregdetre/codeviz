# Shadcn UI Architecture Decision - 2025-09-11

---
Date: 2025-09-11
Duration: ~15 minutes
Type: Decision-making
Status: Resolved
Related Docs: [To be added when implementation begins]
---

## Context & Goals

User is considering migrating from vanilla JS UI widgets to Shadcn UI for the CodeViz viewer interface. Specifically triggered by wanting to add tabs to the left-hand widget pane, but represents a broader architectural decision about UI complexity as the project grows.

## Key Background

**Current Architecture**: "Right now we're just using vanilla JS for our UI widgets (e.g. the panes, checkboxes, etc)." Clean vanilla JS + TypeScript setup with Cytoscape.js for the graph visualization.

**Team Composition**: "My team are AI programmers like you, so the key thing is to pick popular, well-documented, well-designed, long-lasting libraries that will appear frequently in your pretraining. This is probably the most important thing."

**Development Philosophy**: "I really hate debugging CSS stuff, so my main motivation for considering this is to pick a really battle-tested approach that will simplify things and minimise the number of regressions and issues that might crop up as we add UI stuff."

**Growth Expectations**: "We probably will gradually add more and more UI complexity over time. But I'd prefer to keep things simple where we can."

**Technical Constraints**: "I'm not too fussed about keeping it lightweight."

## Main Discussion

### Shadcn Compatibility Assessment
Initial question was whether Shadcn could work with vanilla JS. Key finding: **Shadcn UI is React-only** - built on React components, hooks, and Radix UI primitives. Cannot be directly used in vanilla JS environments.

### AI-Friendly Development Criteria
The most important factor emerged as AI assistant compatibility: "React + Shadcn is extremely well-represented in AI training data. Every AI assistant can write React/Shadcn code fluently, whereas vanilla JS widget patterns are more scattered and inconsistent."

This aligns with the team being "AI programmers" who need libraries with strong representation in AI training data.

### Battle-Tested vs Custom Solutions
User's frustration with CSS debugging led to recognizing the value proposition: "Shadcn components handle all the CSS edge cases, accessibility, focus management, etc. that cause debugging headaches in vanilla implementations."

The choice framed as: "You're not really choosing between 'simple vanilla' vs 'complex React'. You're choosing between 'reinventing UI patterns badly' vs 'using proven patterns'."

## Alternatives Considered

1. **Pure vanilla JS continuation**: Keep current approach but build custom widgets
   - Pros: No architectural change, lightweight
   - Cons: Custom CSS debugging, scattered patterns, less AI-friendly

2. **Vanilla JS with Shadcn-inspired styling**: Use Tailwind CSS and copy design patterns
   - Pros: Design consistency without React
   - Cons: Still requires custom implementation, loses accessibility features

3. **Headless libraries**: Vanilla JS alternatives to React components
   - Pros: Behavior without React overhead
   - Cons: Less ecosystem, fewer AI-friendly patterns

4. **React + Shadcn migration**: Full architectural shift
   - Pros: Battle-tested, AI-friendly, complete design system
   - Cons: Architectural complexity, migration effort

## Decisions Made

**Decision**: "I think you should consider migrating to React + Shadcn" - User showed strong positive response to this recommendation.

**Rationale**: 
- Future-proofing for increasing UI complexity
- AI assistant productivity benefits
- Reduced CSS debugging burden
- Complete design system for long-term consistency

## Migration Strategy Recommended

**Hybrid Approach**: "Keep your current Cytoscape.js canvas in vanilla JS, but mount a React component just for the left widget pane. This minimizes risk."

**Gradual Implementation**:
1. Start with tabs feature as first React component (perfect test case)
2. Use Vite's React plugin alongside existing setup
3. Mount React only in specific DOM containers
4. Migrate other widgets incrementally as they're enhanced

**Technical Architecture**: 
- Cytoscape.js remains in vanilla JS (working well, no need to change)
- React components mounted in specific DOM containers
- Vite handles both vanilla and React builds

## Open Questions

User asked: "Want me to sketch out what the hybrid architecture would look like?" - suggesting interest in seeing concrete implementation details for the migration approach.

## Next Steps

1. Sketch hybrid architecture approach for React integration
2. Implement tabs feature as proof-of-concept React component
3. Establish build pipeline for React + vanilla JS coexistence
4. Create migration plan for existing widgets

## Sources & References

- **Current UI Documentation**: `docs/reference/UI_WIDGETS_ARRANGEMENT.md` - describes existing three-pane layout and widget organization
- **Shadcn UI**: React-only component library discussion
- **Vite React Plugin**: For hybrid build setup
- **Cytoscape.js**: Existing graph visualization that remains unchanged

## Related Work

- Current viewer architecture: `ts/viewer/` directory
- Widget arrangement: Left pane controls, center graph, right details panel
- Configuration: Uses TOML format with per-target configs
