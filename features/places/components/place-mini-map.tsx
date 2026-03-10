"use client";

import { useEffect, useRef, useState } from "react";
import { load } from "@2gis/mapgl";

type PlaceMiniMapProps = {
  lat: number;
  lng: number;
  title: string;
};

type MapGLAPI = Awaited<ReturnType<typeof load>>;
type MapInstance = InstanceType<MapGLAPI["Map"]>;
type MarkerInstance = InstanceType<MapGLAPI["Marker"]>;

export default function PlaceMiniMap({
  lat,
  lng,
  title,
}: PlaceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: MapInstance | null = null;
    let marker: MarkerInstance | null = null;
    let destroyed = false;

    async function init() {
      try {
        const key = process.env.NEXT_PUBLIC_TWOGIS_MAPGL_API_KEY;

        if (!key) {
          setError(
            "Карта временно недоступна: не задан NEXT_PUBLIC_TWOGIS_MAPGL_API_KEY.",
          );
          return;
        }

        if (!containerRef.current) return;

        const mapglAPI = await load();

        if (destroyed || !containerRef.current) return;

        map = new mapglAPI.Map(containerRef.current, {
          key,
          center: [lng, lat],
          zoom: 16,
          pitch: 0,
          rotation: 0,
          disableRotationByUserInteraction: true,
        });

        marker = new mapglAPI.Marker(map, {
          coordinates: [lng, lat],
        });
      } catch (e) {
        console.error("PlaceMiniMap init failed:", e);
        setError("Не удалось загрузить карту.");
      }
    }

    init();

    return () => {
      destroyed = true;

      try {
        marker?.destroy();
      } catch {}

      try {
        map?.destroy();
      } catch {}
    };
  }, [lat, lng]);

  const openIn2gisHref = `https://2gis.kz/search/${encodeURIComponent(
    `${title} ${lat},${lng}`,
  )}`;

  return (
    <section className="mt-6 rounded-2xl border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Расположение</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Точка филиала на карте 2GIS.
          </p>
        </div>

        <a
          href={openIn2gisHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium transition hover:bg-muted/30"
        >
          Открыть в 2GIS
        </a>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="mt-4 h-72 w-full overflow-hidden rounded-xl border"
      />
    </section>
  );
}