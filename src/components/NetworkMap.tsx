import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Point {
  id: string;
  name: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function NetworkMap() {
  const el = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const [{ default: L }, res] = await Promise.all([
        import("leaflet"),
        supabase
          .from("screens")
          .select("id,name,neighborhood,city,state,latitude,longitude")
          .eq("show_on_map", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null),
      ]);
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !el.current) return;
      const points = (res.data ?? []) as Point[];
      setCount(points.length);

      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView([-15.8, -47.9], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<span class="network-pin"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const bounds: [number, number][] = [];
      for (const p of points) {
        const place = [p.neighborhood, [p.city, p.state].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
        L.marker([p.latitude, p.longitude], { icon })
          .addTo(map)
          .bindPopup(`<strong>${escape(p.name)}</strong>${place ? `<br/><span>${escape(place)}</span>` : ""}`);
        bounds.push([p.latitude, p.longitude]);
      }
      if (bounds.length === 1 && bounds[0]) map.setView(bounds[0], 14);
      else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <div>
      <div ref={el} className="network-map h-[420px] w-full overflow-hidden rounded-xl border border-border" />
      {count !== null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {count === 0 ? "Novos pontos em breve." : `${count} ${count === 1 ? "ponto ativo" : "pontos ativos"} na rede.`}
        </p>
      ) : null}
    </div>
  );
}
