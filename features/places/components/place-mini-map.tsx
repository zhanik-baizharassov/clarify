"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  createPinElement,
  currentMapStyle,
  followSiteTheme,
  loadMapLibre,
} from "@/components/map/map-utils";

type PlaceMiniMapProps = {
  lat: number;
  lng: number;
  title: string;
};

export default function PlaceMiniMap({ lat, lng, title }: PlaceMiniMapProps) {
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

        cleanup = () => {
          stopTheme();
          marker.remove();
          map.remove();
        };

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

  const query = encodeURIComponent(`${title} ${lat},${lng}`);
  const twoGisHref = `https://2gis.kz/search/${query}`;
  const osmHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <section className="clarify-card-elevated p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Расположение</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Точка филиала на карте.
          </p>
        </div>

        <a
          href={twoGisHref}
          target="_blank"
          rel="noopener noreferrer"
          className="clarify-button-secondary-sm"
        >
          Открыть в 2GIS
        </a>
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
          </a>{" "}
          или 2GIS.
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
