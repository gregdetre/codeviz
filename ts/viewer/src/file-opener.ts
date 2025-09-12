import type { ViewerConfig } from "./graph-types.js";

let workspaceRoot: string | null = null;

export function initFileOpener(config: ViewerConfig) {
  workspaceRoot = config.workspaceRoot || null;
}

export function openFileInEditor(filePath: string, line: number, editor: 'vscode' | 'cursor' = 'vscode') {
  if (!workspaceRoot) {
    showToast('Cannot open file: workspace root not configured. Ensure the server provides workspaceRoot (pass --target to CLI).');
    return false;
  }

  // Convert relative path to absolute
  const joined = filePath.startsWith('/')
    ? filePath
    : `${workspaceRoot}/${filePath}`;
  const absolutePath = joined.replace(/\\/g, '/');

  // Create editor URL
  if (!filePath || absolutePath.trim().length === 0) {
    showToast('Cannot open file: empty or invalid file path');
    return false;
  }
  const lineNum = Number(line);
  if (!Number.isFinite(lineNum) || lineNum <= 0) {
    showToast(`Invalid line number: ${String(line)}. Provide a positive integer.`);
    return false;
  }
  const lineSuffix = `:${lineNum}`;
  const url = `${editor}://file${encodeURI(absolutePath)}${lineSuffix}`;
  
  try {
    // Try to open the URL - this will either work or show a browser dialog
    window.open(url, '_self');
    return true;
  } catch (error) {
    showToast(`Failed to open editor URL. URL=${url}. Error=${String((error as any)?.message || error)}`);
    return false;
  }
}

function showToast(message: string) {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #7f1d1d;
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