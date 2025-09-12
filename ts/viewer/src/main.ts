import { initApp } from "./app.js";
import "@phosphor-icons/web/regular";

function enableSidebarResize() {
  const root = document.documentElement as HTMLElement;
  const sidebar = document.querySelector('.sidebar') as HTMLElement | null;
  if (!sidebar) return;
  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  sidebar.prepend(resizer);
  let dragging = false;
  resizer.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const vw = window.innerWidth;
    const sidebarWidth = Math.max(340, Math.min(560, vw - e.clientX));
    root.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    try { const cy: any = (window as any).__cy; if (cy && typeof cy.resize === 'function') cy.resize(); } catch {}
  });
  window.addEventListener('mouseup', () => { dragging = false; try { const cy: any = (window as any).__cy; if (cy && typeof cy.resize === 'function') cy.resize(); } catch {} });
  window.addEventListener('resize', () => { try { const cy: any = (window as any).__cy; if (cy && typeof cy.resize === 'function') cy.resize(); } catch {} });
}

enableSidebarResize();
initApp();
