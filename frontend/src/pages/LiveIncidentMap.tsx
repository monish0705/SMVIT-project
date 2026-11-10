import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, 
  MapPin, 
  Layers, 
  Search, 
  ArrowRight,
  Flame
} from 'lucide-react';
import { api } from '../services/api';
import { MapComponent } from '../components/MapComponent';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { DefectCategory, IncidentStatus } from '../types';

export const LiveIncidentMap: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minPriority, setMinPriority] = useState<number>(0);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetchMapData = () => {
    setLoading(true);
    api.getMapIncidents(categoryFilter || undefined, statusFilter || undefined, minPriority > 0 ? minPriority : undefined)
      .then(res => {
        setIncidents(res);
      })
      .catch(err => {
        console.error('Failed to load map points:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMapData();
  }, [categoryFilter, statusFilter, minPriority]);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-4">
      {/* Filters Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-bold text-white">Bengaluru Infrastructure Map</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
            {incidents.length} plotted points
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Categories</option>
            <option value="pothole">Potholes</option>
            <option value="road_crack">Road Cracks</option>
            <option value="surface_damage">Surface Damage</option>
            <option value="manhole_depression">Manhole Depressions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="candidate">Candidate</option>
            <option value="corroborated">Corroborated</option>
            <option value="field_verified">Field Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="repair_claimed">Repair Claimed</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Slider */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400">Min Risk:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minPriority}
              onChange={e => setMinPriority(Number(e.target.value))}
              className="w-20 accent-brand-500 cursor-pointer"
            />
            <span className="font-mono text-brand-300 font-semibold">{minPriority}+</span>
          </div>

          {(categoryFilter || statusFilter || minPriority > 0) && (
            <button
              onClick={() => { setCategoryFilter(''); setStatusFilter(''); setMinPriority(0); }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Map + Side List Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Leaflet Map (3 cols) */}
        <div className="lg:col-span-3 h-full min-h-[450px]">
          <MapComponent
            incidents={incidents}
            height="100%"
            zoom={12}
            center={selectedIncident ? [selectedIncident.latitude, selectedIncident.longitude] : [12.9716, 77.5946]}
          />
        </div>

        {/* Side Incident Cards Feed (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Filtered Incidents ({incidents.length})</span>
            <span>Sorted by Risk</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-2">
            {incidents.map(inc => (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-3 rounded-lg border transition cursor-pointer text-xs ${selectedIncident?.id === inc.id ? 'bg-slate-800 border-brand-500' : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-slate-100">{inc.incident_number}</span>
                  <PriorityBadge score={inc.risk_score} size="sm" showLabel={false} />
                </div>
                <div className="text-slate-300 font-medium line-clamp-1">{inc.title}</div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {inc.readable_address}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <StatusBadge status={inc.status as IncidentStatus} size="sm" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${inc.id}`);
                    }}
                    className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-semibold"
                  >
                    <span>Details</span>
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

