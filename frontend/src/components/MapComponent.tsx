import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

// Fix Leaflet's default icon paths in bundled React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createColoredIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(23,43,58,0.35);
      ">
        <div style="
          transform: rotate(45deg);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          font-family: system-ui, sans-serif;
        ">
          ${label}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26]
  });
}

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

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom, map]);
  return null;
}

export interface MapHotspot {
  cluster_id: string;
  corridor_label: string;
  latitude: number;
  longitude: number;
  incident_count: number;
  avg_risk_score: number;
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
  hotspots?: MapHotspot[];
  selectedLocation?: { lat: number; lon: number } | null;
  onSelectLocation?: (lat: number, lon: number) => void;
  interactiveSelection?: boolean;
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const MapComponent: React.FC<Props> = ({
  incidents = [],
  hotspots = [],
  selectedLocation,
  onSelectLocation,
  interactiveSelection = false,
  center = [12.9716, 77.5946],
  zoom = 12,
  height = '500px'
}) => {
  const navigate = useNavigate();

  const getMarkerColor = (inc: MapIncident) => {
    if (inc.status === 'closed' || inc.status === 'resolution_verified') return '#39866A';
    if (inc.status === 'repair_claimed' || inc.status === 'resolution_pending_review') return '#167C80';
    if (inc.risk_score >= 75) return '#DC4C4C';
    if (inc.risk_score >= 55) return '#D99A32';
    return '#3979B7';
  };

  const getMarkerLetter = (cat: string) => {
    if (cat.includes('pothole')) return 'P';
    if (cat.includes('crack')) return 'C';
    if (cat.includes('manhole')) return 'M';
    return 'D';
  };

  return (
    <div style={{ height, width: '100%' }} className="relative rounded-xl overflow-hidden border border-[#DDE4EC] bg-slate-100">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', backgroundColor: '#F1F5F9' }}
      >
        <MapRecenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {interactiveSelection && (
          <LocationPickerEvents onSelectLocation={onSelectLocation} />
        )}

        {/* Spatial Hotspot Clusters */}
        {hotspots.map((hs) => (
          <Circle
            key={hs.cluster_id}
            center={[hs.latitude, hs.longitude]}
            radius={420}
            pathOptions={{
              fillColor: '#DC4C4C',
              fillOpacity: 0.14,
              color: '#DC4C4C',
              weight: 1.5,
              dashArray: '4 4'
            }}
          >
            <Popup>
              <div className="p-1 font-sans text-[#263746]">
                <p className="font-bold text-xs text-[#DC4C4C]">Hotspot Cluster {hs.cluster_id}</p>
                <p className="text-xs font-medium mt-0.5">{hs.corridor_label}</p>
                <p className="text-[11px] text-[#5A6B7C] mt-1">
                  {hs.incident_count} incidents &middot; Avg Risk: {hs.avg_risk_score}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Selected pin (report submission or manual pin correction) */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.lat, selectedLocation.lon]}
            icon={createColoredIcon('#167C80', '★')}
          >
            <Popup>
              <div className="p-1 text-[#263746] font-sans">
                <p className="font-bold text-xs text-[#167C80]">Selected Pin Location</p>
                <p className="text-[11px] font-mono text-[#5A6B7C]">
                  {selectedLocation.lat.toFixed(5)}°, {selectedLocation.lon.toFixed(5)}°
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Incident Markers */}
        {incidents.map((inc) => {
          if (!inc.latitude || !inc.longitude) return null;
          const color = getMarkerColor(inc);
          const letter = getMarkerLetter(inc.category);

          return (
            <React.Fragment key={inc.id}>
              {inc.accuracy_m && inc.accuracy_m > 5 && inc.accuracy_m <= 120 && (
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={inc.accuracy_m}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.10,
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
                <Popup>
                  <div className="p-1.5 max-w-[220px] text-[#263746] font-sans">
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
                      <span className="font-bold text-xs text-[#167C80]">{inc.incident_number}</span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-[#263746] font-semibold">
                        Risk: {inc.risk_score.toFixed(0)}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-[#263746] mt-1 line-clamp-1">{inc.title}</p>
                    <p className="text-[11px] text-[#5A6B7C] mt-0.5 line-clamp-2">
                      {inc.readable_address || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#5A6B7C] capitalize">{inc.status.replace(/_/g, ' ')}</span>
                      <button
                        onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="text-xs bg-[#167C80] hover:bg-[#116265] text-white px-2.5 py-1 rounded font-medium transition"
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

      {/* Clean Civic Legend */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto z-[400] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#DDE4EC] text-[11px] text-[#263746] shadow-md flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC4C4C]"></span>
          <span>Critical (&ge;75)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D99A32]"></span>
          <span>Moderate (55-74)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3979B7]"></span>
          <span>Low (&lt;55)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#167C80]"></span>
          <span>Repair Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#39866A]"></span>
          <span>Verified / Closed</span>
        </div>
      </div>
    </div>
  );
};
