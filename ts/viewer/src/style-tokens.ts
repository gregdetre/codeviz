export type Hsl = { h: number; s: number; l: number };

export type Tokens = {
  colors: {
    background: string;
    text: string;
    node: {
      function: string;
      class: string;
      variable: string;
      moduleBg: Hsl; // base for modules
    };
    edges: {
      calls: string;
      imports: string;
      runtime: string;
      build: string;
    };
    states: {
      fadedOpacity: number;
    };
  };
  sizes: {
    nodePadding: number;
    compoundPadding: number;
    font: number;
  };
};

export const defaultTokensLight: Tokens = {
  colors: {
    background: "#ffffff",
    text: "#111111",
    node: {
      function: "#e8f1ff",
      class: "#f7eefc",
      variable: "#fff6ec",
      moduleBg: { h: 210, s: 40, l: 92 }
    },
    edges: {
      calls: "#2563eb",
      imports: "#7c3aed",
      runtime: "#ea580c",
      build: "#111827"
    },
    states: {
      fadedOpacity: 0.15
    }
  },
  sizes: {
    nodePadding: 8,
    compoundPadding: 12,
    font: 10
  }
};

export function hashHslForModule(name: string, base: Hsl = defaultTokensLight.colors.node.moduleBg): Hsl {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const h = (base.h + (hash % 360)) % 360;
  const s = Math.min(60, base.s + (hash % 30));
  const l = Math.min(95, base.l + (hash % 8));
  return { h, s, l };
}

export function hslToCss(hsl: Hsl): string {
  return `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`;
}

export function contrastOn(bg: string): string {
  // naive luminance from hex or hsl
  if (bg.startsWith("#")) {
    const r = parseInt(bg.slice(1, 3), 16) / 255;
    const g = parseInt(bg.slice(3, 5), 16) / 255;
    const b = parseInt(bg.slice(5, 7), 16) / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return y > 0.5 ? "#111" : "#fff";
  }
  // fallback
  return "#111";
}


