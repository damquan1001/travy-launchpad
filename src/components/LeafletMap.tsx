import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Itinerary } from "@/lib/itinerary";

// Day color palette — distinct, accessible on OSM tiles
const DAY_COLORS = [
  "#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#4f46e5",
];

function makeIcon(color: string, label: string) {
  const html = `
    <div style="
      background:${color};
      color:white;
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
      border:2px solid white;
      font-family:system-ui,sans-serif;font-weight:600;font-size:12px;
    ">
      <span style="transform:rotate(45deg);">${label}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "travy-marker",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });
}

export default function LeafletMap({ itinerary, focus }: { itinerary: Itinerary | null; focus?: { lat: number; lng: number; zoom: number; label: string } | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const pins = useMemo(() => {
    const out: { lat: number; lng: number; name: string; blurb: string; day: number }[] = [];
    itinerary?.days.forEach((d) => {
      d.places.forEach((p) => {
        if (p.lat != null && p.lng != null) {
          out.push({ lat: p.lat, lng: p.lng, name: p.name, blurb: p.blurb, day: d.day });
        }
      });
    });
    return out;
  }, [itinerary]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.setView([16.05, 107.5], 5); // Vietnam default
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!pins.length) return;
    pins.forEach((p) => {
      const color = DAY_COLORS[(p.day - 1) % DAY_COLORS.length];
      const m = L.marker([p.lat, p.lng], { icon: makeIcon(color, String(p.day)) });
      m.bindPopup(
        `<div style="font-family:system-ui,sans-serif;max-width:220px">
           <div style="font-weight:600;margin-bottom:2px">${escapeHtml(p.name)}</div>
           <div style="font-size:12px;color:#555">Day ${p.day}</div>
           <div style="font-size:12px;margin-top:4px">${escapeHtml(p.blurb)}</div>
         </div>`
      );
      m.addTo(layer);
    });
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 14, duration: 1.2 });
  }, [pins]);

  // Fly to focus when there are no pins yet (early UX: user mentions a region)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus || pins.length) return;
    map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.9 });
  }, [focus, pins.length]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
