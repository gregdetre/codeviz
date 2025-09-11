export const Extensions = {
  async enable(name: 'contextMenus'|'tooltips'|'expandCollapse') {
    switch (name) {
      case 'contextMenus':
        // Placeholder for lazy import
        return;
      case 'tooltips':
        return (await import('./tooltips/TooltipManager.js')).installTooltips;
      case 'expandCollapse':
        return;
    }
  }
};


