import type { ViewerConfig } from "./graph-types.js";

let workspaceRoot: string | null = null;

export function initFileOpener(config: ViewerConfig) {
  workspaceRoot = config.workspaceRoot || null;
}

export function openFileInEditor(filePath: string, line: number, editor: 'vscode' | 'cursor' = 'vscode') {
  if (!workspaceRoot) {
    console.warn('Cannot open file: workspace root not configured');
    return false;
  }

  // Convert relative path to absolute
  const absolutePath = filePath.startsWith('/') 
    ? filePath 
    : `${workspaceRoot}/${filePath}`;

  // Create editor URL
  const url = `${editor}://file${absolutePath}:${line}`;
  
  try {
    // Try to open the URL - this will either work or show a browser dialog
    window.open(url, '_self');
    return true;
  } catch (error) {
    console.error('Failed to open file in editor:', error);
    // Fallback: copy command to clipboard
    copyOpenCommand(absolutePath, line, editor);
    return false;
  }
}

function copyOpenCommand(absolutePath: string, line: number, editor: string) {
  const command = `${editor} "${absolutePath}:${line}"`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(command).then(() => {
      showToast(`Copied to clipboard: ${command}`);
    }).catch(() => {
      showToast(`Failed to copy. Manual command: ${command}`);
    });
  } else {
    showToast(`Manual command: ${command}`);
  }
}

function showToast(message: string) {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #374151;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    max-width: 400px;
    word-wrap: break-word;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 4000);
}