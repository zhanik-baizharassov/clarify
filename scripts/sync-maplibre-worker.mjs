// MapLibre's web worker cannot be bundled by Next/Turbopack ("Worker failed to
// load"), so we serve it as a static file and point MapLibre at it
// (see components/map/map-utils.ts). Copying from node_modules keeps the worker
// in lockstep with the installed library version.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "maplibre-gl", "dist");
const to = join(root, "public", "vendor", "maplibre");

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (!existsSync(from)) {
  console.warn("[sync-maplibre-worker] maplibre-gl is not installed, skipping");
  process.exit(0);
}

mkdirSync(to, { recursive: true });

for (const file of files) {
  copyFileSync(join(from, file), join(to, file));
}

console.log(`[sync-maplibre-worker] copied ${files.length} files to public/vendor/maplibre`);
