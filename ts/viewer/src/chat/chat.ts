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
    bubble.style.padding = '6px 8px';
    bubble.style.borderRadius = '6px';
    bubble.style.maxWidth = '100%';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.style.wordBreak = 'break-word';
    bubble.style.fontSize = '13px';
    bubble.style.lineHeight = '1.35';
    if (m.role === 'user') {
      bubble.style.background = '#e8f0fe';
      bubble.style.alignSelf = 'flex-end';
    } else {
      bubble.style.background = '#ffffff';
    }
    bubble.textContent = m.content;
    container.appendChild(bubble);
  }
  container.scrollTop = container.scrollHeight;
}

async function sendToServer(): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Chat error ${res.status}: ${errText || res.statusText}`);
  }
  const data = await res.json();
  return String(data.reply ?? '');
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
    const pendingId = uid();
    messages.push({ id: pendingId, role: 'assistant', content: '…', timestamp: Date.now() });
    renderMessages(messagesEl);

    try {
      const reply = await sendToServer();
      const idx = messages.findIndex(m => m.id === pendingId);
      if (idx >= 0) messages[idx] = { ...messages[idx], content: reply || '(empty reply)' };
    } catch (err: any) {
      const idx = messages.findIndex(m => m.id === pendingId);
      const msg = String(err?.message || err) || 'Unknown error';
      if (idx >= 0) messages[idx] = { ...messages[idx], content: `Error: ${msg}` };
    } finally {
      renderMessages(messagesEl);
    }
  });
}


