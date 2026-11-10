import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Flame } from 'lucide-react';
import { api } from '../services/api';
import { MapComponent, MapHotspot } from '../components/MapComponent';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { IncidentStatus } from '../types';

export const LiveIncidentMap: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<MapHotspot[]>([]);
  const [showHotspots, setShowHotspots] = useState(true);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minPriority, setMinPriority] = useState<number>(0);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetchMapData = () => {
    setLoading(true);
    Promise.all([
      api.getMapIncidents(categoryFilter || undefined, statusFilter || undefined, minPriority > 0 ? minPriority : undefined),
      api.getAnalytics().catch(() => null)
    ])
      .then(([res, analytics]) => {
        setIncidents(res);
        if (analytics?.recurring_clusters) {
          setHotspots(analytics.recurring_clusters);
        }
      })
      .catch(err => console.error('Failed to load map points:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMapData();
  }, [categoryFilter, statusFilter, minPriority]);

  return (
    <div className="flex flex-col lg:h-[calc(100vh-6rem)] space-y-4">
      {/* Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DDE4EC] shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-5 h-5 text-[#167C80]" />
          <h1 className="text-base sm:text-lg font-bold text-[#263746]">Bengaluru Infrastructure Map</h1>
          <span className="text-xs text-[#5A6B7C] bg-[#F6F8FA] border border-[#DDE4EC] px-2.5 py-0.5 rounded-full font-mono">
            {loading ? 'Loading...' : `${incidents.length} plotted`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#167C80]"
          >
            <option value="">All Categories</option>
            <option value="pothole">Potholes</option>
            <option value="road_crack">Road Cracks</option>
            <option value="surface_damage">Surface Damage</option>
            <option value="manhole_depression">Manhole Depressions</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#167C80]"
          >
            <option value="">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="candidate">Candidate</option>
            <option value="corroborated">Corroborated</option>
            <option value="field_verified">Field Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolution_pending_review">Resolution Pending</option>
            <option value="closed">Closed</option>
          </select>

          <div className="flex items-center gap-2 bg-[#F6F8FA] px-3 py-1.5 rounded-lg border border-[#DDE4EC] text-xs">
            <span className="text-[#5A6B7C]">Min Risk:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minPriority}
              onChange={e => setMinPriority(Number(e.target.value))}
              className="w-20 accent-[#167C80] cursor-pointer"
            />
            <span className="font-mono text-[#167C80] font-semibold">{minPriority}+</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHotspots(!showHotspots)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              showHotspots
                ? 'bg-red-50 text-[#DC4C4C] border-red-200'
                : 'bg-[#F6F8FA] text-[#5A6B7C] border-[#DDE4EC]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hotspots ({hotspots.length})</span>
          </button>

          {(categoryFilter || statusFilter || minPriority > 0) && (
            <button
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); setMinPriority(0); }}
              className="text-xs text-[#167C80] font-semibold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Map + Side Feed */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        <div className="lg:col-span-3 h-[380px] sm:h-[460px] lg:h-full">
          <MapComponent
            incidents={incidents}
            hotspots={showHotspots ? hotspots : []}
            height="100%"
            zoom={selectedIncident ? 15 : 12}
            center={selectedIncident ? [selectedIncident.latitude, selectedIncident.longitude] : [12.9716, 77.5946]}
          />
        </div>

        <div className="bg-white rounded-xl border border-[#DDE4EC] flex flex-col max-h-[380px] lg:max-h-none lg:min-h-0 overflow-hidden shadow-sm">
          <div className="p-3 border-b border-[#DDE4EC] bg-[#F6F8FA] flex items-center justify-between text-xs text-[#5A6B7C]">
            <span className="font-semibold text-[#263746]">Plotted ({incidents.length})</span>
            <span>By Risk Score</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#DDE4EC]">
            {incidents.map(inc => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-3 transition cursor-pointer text-xs ${
                  selectedIncident?.id === inc.id ? 'bg-teal-50/70' : 'hover:bg-[#F6F8FA]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-[#263746]">{inc.incident_number}</span>
                  <PriorityBadge score={inc.risk_score} size="sm" showLabel={false} />
                </div>
                <div className="text-[#263746] font-medium line-clamp-1">{inc.title}</div>
                <p className="text-[11px] text-[#5A6B7C] mt-0.5 line-clamp-1">{inc.readable_address}</p>
                <div className="mt-2 pt-2 border-t border-[#DDE4EC]/70 flex items-center justify-between">
                  <StatusBadge status={inc.status as IncidentStatus} size="sm" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${inc.id}`);
                    }}
                    className="text-xs font-semibold text-[#167C80] hover:underline flex items-center gap-0.5"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
