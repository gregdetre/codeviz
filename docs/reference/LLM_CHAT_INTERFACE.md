# LLM Chat Interface Requirements

Short conversations with LLMs integrated into the CodeViz browser application for analyzing and manipulating code visualizations.

## See also

- `docs/conversations/250911b_llm_cytoscape_command_interface_design.md` - Architecture decisions for LLM-Cytoscape command system
- `docs/reference/libraries/VERCEL_AI_SDK.md` - Technical implementation details for chosen SDK
- `docs/reference/PRODUCT_VISION_FEATURES.md` - Overall CodeViz vision including LLM integration goals
- `ts/viewer/` - TypeScript viewer where chat interface will be implemented

## Context & Intent

**User Goal**: "I want to be able to have short conversations with an LLM (probably Claude) in my CodeViz browser application."

**Primary Use Case**: LLM outputs commands or JSON that affects the state of the viewer, deciding which nodes to show, highlight, or manipulate in the Cytoscape.js visualization.

**Example Interactions**:
- "Highlight the most important functions for preprocessing"
- "Fade functions related to logging"
- User asks about code structure → LLM responds with analysis + visualization commands

## Requirements

### Must-have
- **Claude Support**: Primary integration with Anthropic Claude
- **Quality Library**: 3rd-party library with long-lasting community, good docs, well-designed API
- **Simple Start**: 80-20 approach - 20% effort for 80% of value, gradually layer complexity
- **Browser Integration**: Chat interface in viewer's left-hand pane

### Should-have  
- **UI Extensibility**: Easy to add message editing, voice input later
- **Multiple Threads**: Support for managing multiple conversation threads
- **Serialization Ready**: Easy to store conversations (database, localStorage)
- **Multi-Provider**: Support OpenAI GPT-5 and other LLMs

### Nice-to-have
- **Tool Use/MCPs**: Support for function calling capabilities
- **Advanced Features**: As ecosystem evolves

## Technical Decisions

**Library Choice**: Vercel AI SDK - meets all requirements with excellent multi-provider TypeScript support

**Storage Strategy**: Start with in-memory storage, design for easy serialization later

**Integration Point**: Left-hand pane UI component in existing TypeScript viewer

## Architecture Approach

**Phase 1**: Embedded chat panel with direct LLM integration
- Simple message/response pairs stored in memory  
- JSON command output executed on Cytoscape instance
- Single conversation thread

**Phase 2**: Enhanced conversation management
- Multiple thread support
- Message editing capabilities  
- Persistent storage (localStorage initially)

**Phase 3**: Advanced features
- Multi-provider support expansion
- Tool calling integration
- Voice input capabilities

## Implementation Location

**Target Directory**: `ts/viewer/src/chat/`
**Integration**: Left-hand pane component in existing Vite + TypeScript + Cytoscape.js viewer
**Command System**: Leverage existing JSON command architecture from LLM-Cytoscape design

## Success Criteria

1. User can type message in left pane and receive LLM response
2. LLM can generate JSON commands that successfully manipulate Cytoscape visualization  
3. Conversation history maintained during session
4. Clean, extensible codebase ready for future enhancements
5. Smooth integration with existing CodeViz viewer architecture