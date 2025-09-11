# Vercel AI SDK Integration Guide

TypeScript-first AI SDK with multi-provider support, tool calling, and streaming capabilities for integrating LLM functionality into CodeViz.

## See also

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - Official comprehensive documentation and API reference
- [AI SDK GitHub Repository](https://github.com/vercel/ai) - Source code, issues, and community discussions  
- [Migration Guide v5.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0) - Breaking changes and upgrade paths
- [Provider Documentation](https://ai-sdk.dev/providers/ai-sdk-providers) - Complete list of supported LLM providers
- `docs/conversations/250911b_llm_cytoscape_command_interface_design.md` - CodeViz LLM integration architecture discussion
- `docs/reference/PRODUCT_VISION_FEATURES.md` - CodeViz vision including LLM integration goals
- `ts/viewer/` - CodeViz TypeScript viewer where chat interface will be integrated

## Principles, key decisions

- **Multi-provider from day one**: Unified interface supporting OpenAI, Anthropic, Google, and 10+ other providers
- **TypeScript-first design**: End-to-end type safety with full inference across the application stack
- **Framework agnostic**: Works with vanilla TypeScript without requiring React/Next.js dependencies
- **Tool calling priority**: Built-in structured output and function calling perfect for CodeViz command system
- **Production-ready**: Over 2M weekly downloads, actively maintained by Vercel team

## Library Overview

The Vercel AI SDK is the leading open-source TypeScript toolkit for building AI-powered applications. It provides a unified interface for interacting with multiple LLM providers while maintaining full type safety and supporting advanced features like tool calling, streaming, and structured outputs.

**Current Status**: Version 5.0 (2025) - Complete rebuild with enhanced type safety  
**Previous Stable**: Version 4.2 (2024) - Feature-complete with broad provider support  
**Community**: 2M+ weekly downloads, active GitHub community

### Core Architecture

The SDK consists of two main packages:
- **AI SDK Core**: Unified API for text generation, structured objects, tool calls, and agent building
- **AI SDK UI**: Framework-specific hooks for chat and generative user interfaces (optional for CodeViz)

## Installation & Setup

### Basic Installation
```bash
# Core packages for CodeViz integration
npm install ai @ai-sdk/openai @ai-sdk/anthropic

# TypeScript support (if needed)
npm install --save-dev typescript @types/node
```

### Provider Configuration
```typescript
// Environment variables required
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Basic Setup Example
```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

// OpenAI integration
const openaiResponse = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Analyze this code structure...',
});

// Switch to Anthropic easily
const claudeResponse = await generateText({
  model: anthropic('claude-3-sonnet-20240229'),
  prompt: 'Analyze this code structure...',
});
```

## Multi-Provider Support

### Supported Providers (2025)
**Major Providers:**
- **OpenAI**: GPT-4o, GPT-4o-mini, o3-mini with responses API
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus with reasoning support  
- **Google**: Gemini 2.0 Flash with image generation capability
- **Azure OpenAI**: Enterprise-grade OpenAI access

**Additional Providers:**
- Amazon Bedrock, Mistral AI, Groq, Together.ai, Cohere
- Fireworks, DeepSeek, Cerebras, Replicate, Perplexity

### Provider Switching Pattern
```typescript
// CodeViz provider abstraction example
class LLMProvider {
  constructor(private provider: 'openai' | 'anthropic' | 'google') {}
  
  async generateResponse(prompt: string) {
    const models = {
      openai: openai('gpt-4o'),
      anthropic: anthropic('claude-3-sonnet-20240229'),  
      google: google('gemini-2.0-flash-exp')
    };
    
    return generateText({
      model: models[this.provider],
      prompt,
    });
  }
}
```

### Provider-Specific Features
- **OpenAI**: Structured outputs, predicted outputs, prompt caching
- **Anthropic**: Computer use, reasoning models, long context windows
- **Google Gemini 2.0**: Native image generation in responses
- **Unified API**: Consistent interface regardless of provider choice

## Tool Calling for CodeViz Commands

Perfect fit for CodeViz’s compact command schema from `VIEWER_COMMANDS.md`. We use tool calls only (no JSON-in-prose parsing), and the client auto-applies returned commands.

### Basic Tool Definition (viewerCommands)
```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

// Compact command aligned with VIEWER_COMMANDS.md
const CompactCommand = z.object({
  q: z.string().optional(),
  op: z.string().optional(),
  arg: z.any().optional(),
  ops: z.array(z.tuple([z.string(), z.any()])).optional(),
});

export const viewerCommands = tool({
  description: 'Execute Cytoscape viewer commands (compact, Cytoscape-aligned)',
  inputSchema: z.object({ commands: z.array(CompactCommand) }),
  execute: async ({ commands }) => {
    // Server captures commands; actual execution happens on the client
    return { accepted: commands.length };
  },
});
```

### Invoke with tool calling (model replies with prose + tool calls)
```typescript
const result = await generateText({
  model: anthropic('claude-3-5-sonnet-latest'),
  messages: history,
  tools: { viewerCommands },
  maxToolRoundtrips: 1,
});

const prose = result.text; // Assistant explanation
const toolCalls = result.toolCalls; // Contains any viewerCommands invocations
```

### Server integration (CodeViz)
```typescript
// In /api/chat handler: define the tool, capture commands, return prose + commands
const CompactCommandSchema = z.object({ q: z.string().optional(), op: z.string().optional(), arg: z.any().optional(), ops: z.array(z.tuple([z.string(), z.any()])).optional() });
const captured: any[] = [];
const viewerCommandsTool = tool({
  description: 'Execute Cytoscape viewer commands (auto-applied on client)',
  inputSchema: z.object({ commands: z.array(CompactCommandSchema) }),
  execute: async ({ commands }) => { captured.push(...commands); return { accepted: commands.length }; }
});

const result = await generateText({
  model: anthropic(modelId),
  messages: history,
  tools: { viewerCommands: viewerCommandsTool },
  maxToolRoundtrips: 1,
});

reply.send({ reply: result.text, commands: captured.length ? captured : undefined });
```

### Client auto-apply
```typescript
// ts/viewer/src/chat/chat.ts (simplified)
const data = await fetch('/api/chat', { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json());
messages.push({ role: 'assistant', content: data.reply });
if (Array.isArray(data.commands)) {
  const { executeCompactCommands } = await import('../command-executor.js');
  await executeCompactCommands(cy, data.commands); // auto-apply
}
```

Policy: assistant must use the tool for commands; do not include the JSON array in the prose. This removes brittle parsing and keeps channels clean (text vs. commands).

### Structured Output Pattern
```typescript
// For when you need JSON without function calling
import { generateObject } from 'ai';

const codeAnalysis = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    importantFunctions: z.array(z.string()),
    suggestions: z.array(z.string()),
    cytoscapeCommands: z.array(z.object({
      type: z.enum(['highlight', 'fade']),
      target: z.object({
        type: z.string(),
        search: z.string().optional(),
      }),
    }))
  }),
  prompt: 'Analyze this codebase and suggest visualization changes',
});
```

## TypeScript Integration

### End-to-End Type Safety
```typescript
// Fully typed from input to output
interface CodeVizChatMessage {
  role: 'user' | 'assistant';
  content: string;
  commands?: CytoscapeCommand[];
  timestamp: Date;
}

interface CytoscapeCommand {
  type: 'highlight' | 'fade' | 'hide' | 'style' | 'layout';
  target: SelectorSpec;
  params?: Record<string, any>;
}

// Type-safe message handling
function processMessage(message: CodeVizChatMessage): Promise<CodeVizChatMessage> {
  // TypeScript ensures all properties are properly typed
}
```

### Schema Validation with Zod
```typescript
import { z } from 'zod';

// CodeViz command schema validation
const CommandSchema = z.object({
  type: z.enum(['highlight', 'fade', 'hide', 'style', 'layout']),
  target: z.object({
    type: z.string(),
    nodeType: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Runtime validation with TypeScript inference
type Command = z.infer<typeof CommandSchema>;
```

## Common Gotchas & Solutions

Based on extensive community research and GitHub issues:

### 1. Stream Management Issues
**Problem**: "The data stream is hanging. Did you forget to close it with `data.close()`?"

**Solution**:
```typescript
// Always handle stream cleanup properly
const stream = await streamText({
  model: openai('gpt-4o'),
  prompt: userInput,
});

// Proper cleanup
try {
  for await (const textPart of stream.textStream) {
    // Process streaming text
    console.log(textPart);
  }
} finally {
  // Ensure stream is properly closed
  await stream.finishReason;
}
```

### 2. TypeScript Performance Issues (v5.0)
**Problem**: "AI SDK v5 has insanely slow TypeScript performance"

**Solutions**:
- **Option 1**: Use AI SDK 4.2 for better TypeScript performance
- **Option 2**: Optimize TypeScript config for large projects
- **Option 3**: Selective imports to reduce type inference load

```typescript
// Prefer specific imports over barrel exports
import { generateText } from 'ai/core';  // More specific
// vs
import { generateText } from 'ai';       // Barrel export
```

### 3. Bundle Size Concerns
**Problem**: 186kB+ bundle size for basic functionality

**Solutions**:
```typescript
// Tree-shake unused providers
import { openai } from '@ai-sdk/openai';  // Only import what you need
// Don't import entire provider ecosystem unless needed

// Consider dynamic imports for non-critical paths
const { anthropic } = await import('@ai-sdk/anthropic');
```

### 4. Error Handling Patterns
```typescript
// Comprehensive error handling for CodeViz
import { 
  NoSuchToolError, 
  InvalidToolArgumentsError, 
  ToolExecutionError 
} from 'ai';

try {
  const result = await generateText({
    model: openai('gpt-4o'),
    tools: { cytoscape: cytoscapeCommandTool },
    prompt: userInput,
  });
} catch (error) {
  if (error instanceof NoSuchToolError) {
    // Handle undefined tool calls
  } else if (error instanceof InvalidToolArgumentsError) {
    // Handle schema validation failures
  } else if (error instanceof ToolExecutionError) {
    // Handle runtime execution issues
  }
}
```

### 5. Memory Management with Multiple Providers
```typescript
// Prevent memory leaks with provider switching
class ProviderManager {
  private providers = new Map();
  
  getProvider(type: 'openai' | 'anthropic') {
    if (!this.providers.has(type)) {
      const provider = type === 'openai' ? openai : anthropic;
      this.providers.set(type, provider);
    }
    return this.providers.get(type);
  }
  
  cleanup() {
    this.providers.clear();
  }
}
```

## Security & Best Practices

### API Key Management
```typescript
// Environment variable validation
const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### Rate Limiting Implementation
```typescript
// CodeViz rate limiting pattern
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  async checkLimit(userId: string, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
  }
}
```

### Input Validation & Sanitization
```typescript
// Validate user inputs before sending to LLM
function sanitizeUserInput(input: string): string {
  // Remove potentially harmful content
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .trim()
    .slice(0, 2000); // Limit length
}

// Token limiting
const maxTokens = 1000; // Prevent excessive usage
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: sanitizeUserInput(userPrompt),
  maxTokens,
});
```

## Migration Between Versions

### AI SDK 4.x → 5.0 Migration
**Major Breaking Changes:**
- Message structure now uses `parts` array instead of `content`
- Tool parameters renamed: `parameters` → `inputSchema`, `result` → `output`
- Hook changes: `initialMessages` → `messages`

```typescript
// v4.x pattern
const tool = {
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => ({ result: weatherData })
};

// v5.0 pattern  
const tool = tool({
  inputSchema: z.object({ location: z.string() }),
  execute: async ({ location }) => weatherData  // Direct return
});
```

### Automated Migration
```bash
# Use official codemod for migration
npx @ai-sdk/codemod upgrade
```

## Performance Considerations

### Bundle Size Impact
- **Core Package**: ~186kB for basic OpenAI functionality
- **Provider Specific**: Additional ~20-50kB per provider
- **Tree Shaking**: Supported but limited due to deep TypeScript inference
- **Recommendation**: Start with single provider, add others as needed

### Runtime Performance
```typescript
// Optimize for production
const optimizedConfig = {
  model: openai('gpt-4o-mini'), // Faster, cheaper model for simple tasks
  maxTokens: 500,               // Limit response length
  temperature: 0.1,             // More deterministic responses
};

// Stream for better perceived performance
const stream = await streamText({
  ...optimizedConfig,
  prompt: userInput,
});
```

### Memory Usage Patterns
- **Streaming**: Memory-efficient for large responses
- **Tool Calling**: Additional memory for schema validation
- **Multiple Providers**: Keep provider instances in memory for performance

## Integration with CodeViz Viewer

### Recommended Architecture
```typescript
// ts/viewer/src/chat/ChatManager.ts
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

export class ChatManager {
  private provider = openai('gpt-4o');
  
  async processMessage(userMessage: string, cytoscapeInstance: any) {
    const response = await generateText({
      model: this.provider,
      system: `You help users analyze code visualizations. Use tools to 
               manipulate the Cytoscape.js graph when users request visual changes.`,
      prompt: userMessage,
      tools: {
        cytoscape: this.createCytoscapeCommandTool(cytoscapeInstance)
      },
    });
    
    return {
      message: response.text,
      commands: response.toolCalls?.map(call => call.args) || []
    };
  }
  
  private createCytoscapeCommandTool(cy: any) {
    return tool({
      description: 'Execute Cytoscape commands to modify the visualization',
      inputSchema: z.object({
        commands: z.array(CytoscapeCommandSchema)
      }),
      execute: async ({ commands }) => {
        // Execute commands on Cytoscape instance
        commands.forEach(cmd => this.executeCytoscapeCommand(cy, cmd));
        return { executed: commands.length };
      }
    });
  }
}
```

### Chat Interface Implementation
```typescript
// Simple in-memory chat for initial implementation
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  commands?: CytoscapeCommand[];
  timestamp: Date;
}

class InMemoryChatStore {
  private messages: ChatMessage[] = [];
  
  addMessage(message: ChatMessage) {
    this.messages.push(message);
  }
  
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }
  
  clearMessages() {
    this.messages = [];
  }
}
```

## Future Considerations

### Planned Features
- **Agent Workflows**: Multi-step reasoning and planning capabilities
- **Enhanced Multimodal**: Support for more file types and media formats
- **Improved Performance**: Ongoing optimization for TypeScript compilation
- **Extended Provider Support**: New LLM providers as they become available

### CodeViz-Specific Enhancements
- **Code Understanding**: Specialized prompts for code analysis tasks
- **Visual Command Language**: Extended command vocabulary for complex visualizations
- **Conversation Memory**: Persistent chat history and context management
- **Multi-threaded Chat**: Support for multiple conversation threads

## Troubleshooting

### Common Issues
1. **API Key Errors**: Ensure environment variables are properly set
2. **Stream Hanging**: Always handle stream cleanup and timeouts
3. **TypeScript Errors**: Verify TypeScript version compatibility (4.1+)
4. **Bundle Size**: Monitor bundle analyzer for unexpected size increases
5. **Rate Limits**: Implement proper rate limiting to prevent API abuse

### Debug Configuration
```typescript
// Enable detailed logging for development
process.env.AI_SDK_DEBUG = 'true';

// Add request/response logging
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: userInput,
  onFinish: ({ text, toolCalls, usage }) => {
    console.log('Generated text:', text);
    console.log('Tool calls:', toolCalls);
    console.log('Token usage:', usage);
  },
});
```

## References

**Official Documentation:**
- [AI SDK Documentation](https://ai-sdk.dev/docs/introduction) - Complete API reference and guides
- [Provider Documentation](https://ai-sdk.dev/providers/ai-sdk-providers) - All supported LLM providers
- [Migration Guides](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0) - Version upgrade instructions

**Community Resources:**
- [GitHub Repository](https://github.com/vercel/ai) - Source code and issue tracking
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vercel-ai) - Community Q&A
- [Vercel Blog](https://vercel.com/blog/ai-sdk-5) - Release announcements and deep dives

**CodeViz Integration:**
- `docs/conversations/250911b_llm_cytoscape_command_interface_design.md` - Architecture decisions
- `docs/reference/PRODUCT_VISION_FEATURES.md` - Overall product vision
- `ts/viewer/` - Implementation location for chat interface