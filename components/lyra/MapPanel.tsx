"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin as MapPinIcon, Route, Share2, Save, Layers, Satellite } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPinData {
  position: LatLng;
  label?: string;
  title?: string;
}

export interface MapRoute {
  waypoints: LatLng[];
  label?: string;
}

export interface LyraMapEvent {
  type: "pin" | "route" | "center" | "highlight";
  pin?: MapPinData;
  route?: MapRoute;
  center?: LatLng;
  zoom?: number;
  label?: string;
}

export interface MapPanelProps {
  pins?: MapPinData[];
  route?: MapRoute;
  center?: LatLng;
  zoom?: number;
  onSaveRoute?: (route: MapRoute) => void;
}

// ── Augment Window with lyraMapEvent (single definition) ─────────────────────
// NOTE: MessageRenderer.tsx also declares lyraMapEvent as (event: any) => void.
// We use the same loose signature here to avoid duplicate-declaration conflicts.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initLyraMap?: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lyraMapEvent?: (event: any) => void;
  }
}

// ── Default center (New York City) ─────────────────────────────────────────────
const DEFAULT_CENTER: LatLng = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 12;

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    const existing = document.getElementById("lyra-gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Script load error")));
      return;
    }
    const script = document.createElement("script");
    script.id = "lyra-gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapPanel({
  pins = [],
  route,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  onSaveRoute,
}: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routePolylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendererRef = useRef<any>(null);

  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePins, setActivePins] = useState<MapPinData[]>(pins);
  const [activeRoute, setActiveRoute] = useState<MapRoute | undefined>(route);
  const [activeCenter, setActiveCenter] = useState<LatLng>(center);
  const [activeZoom, setActiveZoom] = useState<number>(zoom);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key not configured.");
      return;
    }
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const gmaps = window.google.maps;
        const map = new gmaps.Map(containerRef.current, {
          center: activeCenter,
          zoom: activeZoom,
          mapTypeId: mapType,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#a0a0c0" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d4a" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d0d1a" }] },
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
        mapRef.current = map;
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load Google Maps.");
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // ── Sync map type ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapType);
  }, [mapType]);

  // ── Render pins ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const gmaps = window.google.maps;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    activePins.forEach((pin) => {
      const marker = new gmaps.Marker({
        position: pin.position,
        map: mapRef.current,
        title: pin.title ?? pin.label,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          fillColor: "#a855f7",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 8,
        },
      });

      if (pin.label) {
        const infoWindow = new gmaps.InfoWindow({
          content: `<div style="color:#1a1a2e;font-size:12px;font-weight:600;">${pin.label}</div>`,
        });
        marker.addListener("click", () => infoWindow.open(mapRef.current, marker));
      }

      markersRef.current.push(marker);
    });

    if (activePins.length > 0) {
      mapRef.current.panTo(activePins[0].position);
    }
  }, [activePins, loaded]);

  // ── Render route ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const gmaps = window.google.maps;

    routePolylineRef.current?.setMap(null);
    directionsRendererRef.current?.setMap(null);

    if (!activeRoute || activeRoute.waypoints.length < 2) return;

    const waypoints = activeRoute.waypoints;

    if (waypoints.length === 2) {
      const ds = new gmaps.DirectionsService();
      const dr = new gmaps.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#a855f7",
          strokeWeight: 4,
          strokeOpacity: 0.85,
        },
      });
      directionsRendererRef.current = dr;

      ds.route(
        {
          origin: waypoints[0],
          destination: waypoints[waypoints.length - 1],
          travelMode: gmaps.TravelMode.DRIVING,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result: any, status: string) => {
          if (status === "OK" && result) dr.setDirections(result);
        }
      );
    } else {
      const polyline = new gmaps.Polyline({
        path: waypoints,
        map: mapRef.current,
        strokeColor: "#a855f7",
        strokeWeight: 4,
        strokeOpacity: 0.85,
      });
      routePolylineRef.current = polyline;

      const bounds = new gmaps.LatLngBounds();
      waypoints.forEach((wp: LatLng) => bounds.extend(wp));
      mapRef.current.fitBounds(bounds);
    }
  }, [activeRoute, loaded]);

  // ── Pan/zoom on center/zoom change ─────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    mapRef.current.panTo(activeCenter);
    mapRef.current.setZoom(activeZoom);
  }, [activeCenter, activeZoom, loaded]);

  // ── Register window.lyraMapEvent ───────────────────────────────────────────
  const handleLyraMapEvent = useCallback((event: LyraMapEvent) => {
    if (event.type === "pin" && event.pin) {
      setActivePins((prev) => [...prev, event.pin!]);
      if (event.center) setActiveCenter(event.center);
    } else if (event.type === "route" && event.route) {
      setActiveRoute(event.route);
      if (event.center) setActiveCenter(event.center);
    } else if (event.type === "center" && event.center) {
      setActiveCenter(event.center);
      if (event.zoom != null) setActiveZoom(event.zoom);
    } else if (event.type === "highlight" && event.center) {
      setActivePins((prev) => [
        ...prev,
        { position: event.center!, label: event.label ?? "Highlighted", title: event.label },
      ]);
      setActiveCenter(event.center);
      if (event.zoom != null) setActiveZoom(event.zoom);
    }
  }, []);

  useEffect(() => {
    // Cast through any to satisfy the loose window.lyraMapEvent type from MessageRenderer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).lyraMapEvent = handleLyraMapEvent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).lyraMapEvent; };
  }, [handleLyraMapEvent]);

  // ── Save Route ─────────────────────────────────────────────────────────────
  function handleSaveRoute() {
    if (!activeRoute || activeRoute.waypoints.length < 2) return;
    onSaveRoute?.(activeRoute);
  }

  // ── Share Location ─────────────────────────────────────────────────────────
  function handleShareLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://maps.google.com/?q=${latitude},${longitude}`;
        alert(`Your location:\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n${url}`);
        const userLoc = { lat: latitude, lng: longitude };
        setActiveCenter(userLoc);
        setActivePins((prev) => [
          ...prev,
          { position: userLoc, label: "You are here", title: "Your Location" },
        ]);
      },
      () => {
        alert("Unable to retrieve your location. Please check browser permissions.");
      }
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d0d1a]">
      {/* Map container */}
      <div
        ref={containerRef}
        style={{ height: 300 }}
        className="w-full relative"
      >
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d1a]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              <span className="text-[11px] text-white/30">Loading map…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d1a]">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <MapPinIcon className="w-5 h-5 text-red-400/60" />
              <span className="text-[11px] text-red-400/70">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/[0.06] bg-black/30 flex-wrap">
        {/* Map type toggle */}
        <button
          onClick={() => setMapType((t) => (t === "roadmap" ? "satellite" : "roadmap"))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.07] text-white/50 hover:text-white/80 transition-all"
          title={mapType === "roadmap" ? "Switch to satellite" : "Switch to roadmap"}
        >
          {mapType === "roadmap" ? (
            <Satellite className="w-3 h-3" />
          ) : (
            <Layers className="w-3 h-3" />
          )}
          {mapType === "roadmap" ? "Satellite" : "Roads"}
        </button>

        {/* Pin count indicator */}
        {activePins.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <MapPinIcon className="w-3 h-3" />
            {activePins.length} pin{activePins.length !== 1 ? "s" : ""}
          </div>
        )}

        {/* Route indicator */}
        {activeRoute && activeRoute.waypoints.length >= 2 && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Route className="w-3 h-3" />
            {activeRoute.waypoints.length} pts
          </div>
        )}

        <div className="flex-1" />

        {/* Save Route */}
        <button
          onClick={handleSaveRoute}
          disabled={!activeRoute || activeRoute.waypoints.length < 2}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/25 text-violet-400 hover:text-violet-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Save current route"
        >
          <Save className="w-3 h-3" />
          Save Route
        </button>

        {/* Share Location */}
        <button
          onClick={handleShareLocation}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.07] text-white/50 hover:text-white/80 transition-all"
          title="Share your location"
        >
          <Share2 className="w-3 h-3" />
          Share
        </button>
      </div>
    </div>
  );
}
