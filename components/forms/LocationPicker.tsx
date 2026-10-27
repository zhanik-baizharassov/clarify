"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { MapPin, X } from "lucide-react";
import {
  createPinElement,
  currentMapStyle,
  followSiteTheme,
  loadMapLibre,
} from "@/components/map/map-utils";
import { KZ_CITY_CENTERS, type KzCity } from "@/shared/kz/kz";

export type MapPoint = { lat: number; lng: number };

type LocationPickerProps = {
  city: string;
  value: MapPoint | null;
  onChange: (point: MapPoint | null) => void;
  disabled?: boolean;
};

function cityCenter(city: string): readonly [number, number] {
  return KZ_CITY_CENTERS[city as KzCity] ?? KZ_CITY_CENTERS["Алматы"];
}

/**
 * Lets the owner drop (and drag) a pin on the map. This replaces address
 * autocompletion: the owner knows where the place is, and an exact pin beats
 * a guessed geocode. Optional: without a pin the place just has no map.
 */
export default function LocationPicker({
  city,
  value,
  onChange,
  disabled = false,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [error, setError] = useState<string | null>(null);

  // keep the latest props reachable from long-lived map handlers
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const valueRef = useRef(value);
  const cityRef = useRef(city);

  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
    valueRef.current = value;
    cityRef.current = city;
  });

  useEffect(() => {
    let destroyed = false;
    let cleanup = () => {};

    async function init() {
      try {
        const maplibregl = await loadMapLibre();
        if (destroyed || !containerRef.current) return;

        const start = valueRef.current;
        const [cLat, cLng] = cityCenter(cityRef.current);

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: currentMapStyle(),
          center: start ? [start.lng, start.lat] : [cLng, cLat],
          zoom: start ? 16 : 11,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );

        const placeMarker = (point: MapPoint) => {
          if (!markerRef.current) {
            const marker = new maplibregl.Marker({
              element: createPinElement(),
              anchor: "bottom",
              draggable: true,
            })
              .setLngLat([point.lng, point.lat])
              .addTo(map);

            marker.on("dragend", () => {
              const { lat, lng } = marker.getLngLat();
              onChangeRef.current({ lat, lng });
            });

            markerRef.current = marker;
          } else {
            markerRef.current.setLngLat([point.lng, point.lat]);
          }
        };

        if (start) placeMarker(start);

        map.on("click", (e) => {
          if (disabledRef.current) return;
          const point = { lat: e.lngLat.lat, lng: e.lngLat.lng };
          placeMarker(point);
          onChangeRef.current(point);
        });

        const stopTheme = followSiteTheme(map);

        cleanup = () => {
          stopTheme();
          markerRef.current?.remove();
          markerRef.current = null;
          map.remove();
          mapRef.current = null;
        };

        if (destroyed) cleanup();
      } catch (e) {
        console.error("LocationPicker init failed:", e);
        setError(
          "Не удалось загрузить карту. Адрес можно сохранить и без точки.",
        );
      }
    }

    void init();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, []);

  // reflect external changes: a reset, or a different city
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (value) {
      markerRef.current?.setLngLat([value.lng, value.lat]);
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
      const [cLat, cLng] = cityCenter(city);
      map.flyTo({ center: [cLng, cLat], zoom: 11, essential: true });
    }
  }, [value, city]);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Точка на карте
          <span className="text-xs font-normal text-muted-foreground">
            (необязательно)
          </span>
        </div>

        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:bg-surface-soft hover:text-foreground disabled:opacity-60"
          >
            <X className="h-3 w-3" />
            Сбросить точку
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[16px] border bg-muted/40 p-4 text-sm text-muted-foreground">
          {error}
        </p>
      ) : (
        <div
          ref={containerRef}
          className={[
            "h-64 w-full overflow-hidden rounded-[16px] border",
            disabled ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Нажмите на карту, чтобы отметить место. Точку можно перетащить. Так
        карточка получит карту на странице.
      </p>
    </div>
  );
}
