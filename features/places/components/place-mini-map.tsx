"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  createPinElement,
  currentMapStyle,
  followSiteTheme,
  loadMapLibre,
  watchMapFailure,
} from "@/components/map/map-utils";

type PlaceMiniMapProps = {
  lat: number;
  lng: number;
};

export default function PlaceMiniMap({ lat, lng }: PlaceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let cleanup = () => {};

    async function init() {
      try {
        const maplibregl = await loadMapLibre();
        if (destroyed || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: currentMapStyle(),
          center: [lng, lat],
          zoom: 16,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );

        const marker = new maplibregl.Marker({
          element: createPinElement(),
          anchor: "bottom",
        })
          .setLngLat([lng, lat])
          .addTo(map);

        const stopTheme = followSiteTheme(map);

        let tornDown = false;
        const teardown = () => {
          if (tornDown) return;
          tornDown = true;
          stopWatch();
          stopTheme();
          marker.remove();
          map.remove();
        };

        // a blank map (style/tiles unreachable) -> show the fallback link
        const stopWatch = watchMapFailure(map, () => {
          setError("Не удалось загрузить карту.");
          queueMicrotask(teardown);
        });

        cleanup = teardown;

        if (destroyed) cleanup();
      } catch (e) {
        console.error("PlaceMiniMap init failed:", e);
        setError("Не удалось загрузить карту.");
      }
    }

    void init();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [lat, lng]);

  const osmHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <section className="clarify-card-elevated p-5">
      <div>
        <h2 className="text-base font-semibold">Расположение</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Точка филиала на карте.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-[16px] border bg-muted/40 p-4 text-sm text-muted-foreground">
          Карту не удалось показать на странице. Откройте место в{" "}
          <a
            href={osmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            OpenStreetMap
          </a>
          .
        </p>
      ) : (
        <div
          ref={containerRef}
          className="mt-4 h-72 w-full overflow-hidden rounded-[16px] border"
        />
      )}
    </section>
  );
}
