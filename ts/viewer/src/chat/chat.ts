import DOMPurify from 'dompurify';
import { marked } from 'marked';

type Role = 'user' | 'assistant' | 'system';

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

const messages: ChatMessage[] = [];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function renderMessages(container: HTMLElement): void {
  container.innerHTML = '';
  for (const m of messages) {
    const bubble = document.createElement('div');
    bubble.style.padding = '8px 10px';
    bubble.style.borderRadius = '6px';
    bubble.style.maxWidth = '100%';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.wordBreak = 'break-word';
    bubble.style.fontSize = '13px';
    bubble.style.lineHeight = '1.5';
    bubble.style.margin = '2px 0';
    if (m.role === 'user') {
      bubble.style.background = '#e8f0fe';
      bubble.style.alignSelf = 'flex-end';
    } else {
      bubble.style.background = '#ffffff';
    }
    if (m.role === 'assistant') {
      // Use normal whitespace handling for HTML to avoid exaggerated spacing from preserved newlines
      bubble.style.whiteSpace = 'normal';
      const rawHtml = String(marked.parse(m.content, { breaks: true } as any) || '');
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      bubble.innerHTML = cleanHtml || m.content;
      // Post-process links and code blocks for better UX
      bubble.querySelectorAll('a').forEach((a) => {
        try {
          (a as HTMLAnchorElement).target = '_blank';
          (a as HTMLAnchorElement).rel = 'noopener noreferrer nofollow';
        } catch {}
      });
      bubble.querySelectorAll('p').forEach((p) => {
        (p as HTMLElement).style.margin = '4px 0 6px';
      });
      bubble.querySelectorAll('ul,ol').forEach((list) => {
        (list as HTMLElement).style.margin = '4px 0 6px 18px';
      });
      bubble.querySelectorAll('pre').forEach((pre) => {
        (pre as HTMLElement).style.overflow = 'auto';
        (pre as HTMLElement).style.background = '#f6f8fa';
        (pre as HTMLElement).style.padding = '10px';
        (pre as HTMLElement).style.borderRadius = '4px';
        (pre as HTMLElement).style.margin = '6px 0';
      });
      bubble.querySelectorAll('code').forEach((code) => {
        (code as HTMLElement).style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        (code as HTMLElement).style.fontSize = '12px';
        (code as HTMLElement).style.background = (code.parentElement?.tagName.toLowerCase() === 'pre') ? '' : '#f6f8fa';
        (code as HTMLElement).style.padding = (code.parentElement?.tagName.toLowerCase() === 'pre') ? '' : '1px 4px';
        (code as HTMLElement).style.borderRadius = (code.parentElement?.tagName.toLowerCase() === 'pre') ? '' : '3px';
      });
    } else {
      bubble.textContent = m.content;
    }
    container.appendChild(bubble);
  }
  container.scrollTop = container.scrollHeight;
}

async function sendToServer(payload: any): Promise<any> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Chat error ${res.status}: ${errText || res.statusText}`);
  }
  return await res.json();
}

export function initChat(): void {
  const messagesEl = document.getElementById('chatMessages') as HTMLElement | null;
  const formEl = document.getElementById('chatForm') as HTMLFormElement | null;
  const inputEl = document.getElementById('chatInput') as HTMLInputElement | null;
  if (!messagesEl || !formEl || !inputEl) return;

  renderMessages(messagesEl);

  formEl.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    const text = (inputEl.value || '').trim();
    if (!text) return;
    inputEl.value = '';
    messages.push({ id: uid(), role: 'user', content: text, timestamp: Date.now() });
    renderMessages(messagesEl);

    try {
      const cy: any = (window as any).__cy;
      let snapshot: any = undefined;
      try {
        const mod = await import('../state-snapshot.js');
        const exMod = await import('../command-executor.js');
        const supported = exMod.getSupportedOpsSummary();
        snapshot = mod.computeSnapshot(cy, supported, { mode: (document.getElementById('modeInfo')?.textContent || '').replace('Mode: ', ''), layout: (document.getElementById('layoutInfo')?.textContent || '').replace('Layout: ', '') });
      } catch {}

      const payload = { messages: messages.map(({ role, content }) => ({ role, content })), viewer: { snapshot } };
      const data = await sendToServer(payload);
      const replyText = String(data.reply ?? '');
      let combined = replyText;
      if (data.toolOutput) {
        const codeBlock = '```json\n' + String(data.toolOutput).trim() + '\n```';
        combined = combined ? (combined + '\n\n' + codeBlock) : codeBlock;
      }
      messages.push({ id: uid(), role: 'assistant', content: combined || '(empty reply)', timestamp: Date.now() });

      // Try to parse and execute commands if provided
      const commands = data.commands;
      if (Array.isArray(commands) && cy) {
        try {
          const { executeCompactCommands } = await import('../command-executor.js');
          await executeCompactCommands(cy, commands);
        } catch (err) {
          console.warn('Command execution error:', err);
        }
      }
    } catch (err: any) {
      const msg = String(err?.message || err) || 'Unknown error';
      messages.push({ id: uid(), role: 'assistant', content: `Error: ${msg}` , timestamp: Date.now()});
    } finally {
      renderMessages(messagesEl);
    }
  });
}


