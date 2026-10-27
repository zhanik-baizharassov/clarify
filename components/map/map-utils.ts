import type { Map as MapLibreMap } from "maplibre-gl";

// Static copy of MapLibre's worker, see scripts/sync-maplibre-worker.mjs.
const WORKER_URL = "/vendor/maplibre/maplibre-gl-worker.mjs";

/**
 * Loads MapLibre in the browser and points it at the self-hosted worker.
 * Call this instead of importing "maplibre-gl" directly.
 */
export async function loadMapLibre() {
  const maplibregl = await import("maplibre-gl");
  maplibregl.setWorkerUrl(WORKER_URL);
  return maplibregl;
}

// Free vector tiles from OpenFreeMap (OpenStreetMap data), no API key.
// Swap these two constants to move to another provider (self-hosted tiles,
// MapTiler, ...): nothing else in the app knows where the tiles come from.
export const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";
export const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

export function currentMapStyle() {
  return document.documentElement.classList.contains("dark")
    ? MAP_STYLE_DARK
    : MAP_STYLE_LIGHT;
}

/** Re-applies the map style whenever the site theme (html.dark) changes. */
export function followSiteTheme(map: MapLibreMap) {
  let wasDark = document.documentElement.classList.contains("dark");

  const observer = new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark === wasDark) return;
    wasDark = isDark;
    map.setStyle(currentMapStyle());
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}

/** DOM element used as the map marker (brand-coloured pin). */
export function createPinElement() {
  const el = document.createElement("div");
  el.style.width = "34px";
  el.style.height = "42px";
  el.style.cursor = "grab";
  el.innerHTML = `
    <svg viewBox="0 0 34 42" width="34" height="42" aria-hidden="true">
      <path d="M17 41C17 41 31 26.5 31 16.5C31 8.5 24.7 2 17 2C9.3 2 3 8.5 3 16.5C3 26.5 17 41 17 41Z"
        fill="#4f46e5" stroke="#ffffff" stroke-width="2.5" />
      <circle cx="17" cy="16.5" r="5.5" fill="#ffffff" />
    </svg>`;
  return el;
}
