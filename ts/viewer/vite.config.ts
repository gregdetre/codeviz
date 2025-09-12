import { defineConfig } from "vite";
import { resolve } from "node:path";

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yy}${MM}${dd}_${HH}${mm}`;
}

function buildTimestampPlugin() {
  let buildStartMs = 0;
  return {
    name: "build-timestamp",
    apply: "build" as const,
    buildStart() {
      buildStartMs = Date.now();
    },
    buildEnd() {
      const finished = new Date();
      const durationMs = Date.now() - buildStartMs;
      // Intentionally print a concise marker that can be spotted easily alongside Vite's output
      // Example: [250912_1252] Build finished (5371ms)
      // Keep this on a single line so it doesn't get split by some terminals
      console.log(`[${formatTimestamp(finished)}] Build finished (${durationMs}ms)`);
    }
  };
}

export default defineConfig({
  root: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true
  },
  plugins: [buildTimestampPlugin()],
  server: {
    port: 5173
  }
});
