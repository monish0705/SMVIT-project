import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet's default icon paths in bundled React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored pin generator for operations map
function createColoredIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.4);
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 10px;
          font-weight: bold;
          font-family: sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28]
  });
}

// Click listener for manual pin selection
function LocationPickerEvents({ onSelectLocation }: { onSelectLocation?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      if (onSelectLocation) {
        onSelectLocation(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface MapIncident {
  id: string;
  incident_number: string;
  title: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  risk_score: number;
  evidence_confidence?: string;
  thumbnail_url?: string | null;
  readable_address?: string | null;
}

interface Props {
  incidents?: MapIncident[];
  selectedLocation?: { lat: number; lon: number } | null;
  onSelectLocation?: (lat: number, lon: number) => void;
  interactiveSelection?: boolean;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const MapComponent: React.FC<Props> = ({
  incidents = [],
  selectedLocation,
  onSelectLocation,
  interactiveSelection = false,
  center = [12.9716, 77.5946], // Bengaluru center
  zoom = 12,
  height = '500px'
}) => {
  const navigate = useNavigate();

  const getMarkerColor = (inc: MapIncident) => {
    if (inc.status === 'closed') return '#64748b'; // slate
    if (inc.status === 'repair_claimed' || inc.status === 'resolution_pending_review') return '#06b6d4'; // cyan
    if (inc.status === 'in_progress') return '#a855f7'; // purple
    if (inc.risk_score >= 80) return '#ef4444'; // critical red
    if (inc.risk_score >= 60) return '#f59e0b'; // amber
    return '#3b82f6'; // blue
  };

  const getMarkerLetter = (cat: string) => {
    if (cat.includes('pothole')) return 'P';
    if (cat.includes('crack')) return 'C';
    if (cat.includes('manhole')) return 'M';
    return 'D';
  };

  return (
    <div style={{ height, width: '100%' }} className="relative rounded-xl overflow-hidden border border-slate-800 shadow-inner">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {interactiveSelection && (
          <LocationPickerEvents onSelectLocation={onSelectLocation} />
        )}

        {/* Selected location pin (for reporting or manual pin correction) */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lon]}
            icon={createColoredIcon('#14b8a6', '★')}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 text-slate-900 font-sans">
                <p className="font-bold text-xs text-brand-700">Selected Pin Location</p>
                <p className="text-[11px] font-mono text-slate-600">
                  {selectedLocation.lat.toFixed(5)}°, {selectedLocation.lon.toFixed(5)}°
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Incidents markers */}
        {incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          const color = getMarkerColor(inc);
          const letter = getMarkerLetter(inc.category);

          return (
            <React.Fragment key={inc.id}>
              {/* Optional accuracy radius circle */}
              {inc.accuracy_m && inc.accuracy_m > 5 && inc.accuracy_m <= 100 && (
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={inc.accuracy_m}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.12,
                    color: color,
                    weight: 1,
                    dashArray: '3 3'
                  }}
                />
              )}

              <Marker
                position={[inc.latitude, inc.longitude]}
                icon={createColoredIcon(color, letter)}
              >
                <Popup className="custom-popup">
                  <div className="p-2 max-w-xs text-slate-900 font-sans">
                    {inc.thumbnail_url && (
                      <div className="mb-2 rounded overflow-hidden h-24 bg-slate-100 flex items-center justify-center">
                        <img
                          src={inc.thumbnail_url}
                          alt={inc.incident_number}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-brand-700">{inc.incident_number}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                        Risk: {inc.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-slate-900 mt-1 line-clamp-1">{inc.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                      {inc.readable_address || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 capitalize">Status: {inc.status.replace(/_/g, ' ')}</span>
                      <button
                        onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1 rounded font-medium transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map legend overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-xl flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Critical (&ge;80)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Medium (60-79)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Standard (&lt;60)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span>Repair Claimed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span>Closed</span>
        </div>
      </div>
    </div>
  );
};

