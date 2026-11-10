import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowRight, 
  Layers, 
  MapPin, 
  Calendar,
  Eye,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary, IncidentStatus, DefectCategory } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ProvenanceTag } from '../components/ProvenanceTag';

export const IncidentQueue: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    api.getIncidents({
      search: search || undefined,
      category: categoryFilter || undefined,
      status: statusFilter || undefined,
      limit: 100
    })
      .then(res => setIncidents(res))
      .catch(err => console.error('Failed to load incident queue:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Incident Operations Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, and prioritize verified road failure incidents for inspection and maintenance dispatch.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by incident ID (e.g. INF-1001), road, locality..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
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
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Operational Statuses</option>
            <option value="candidate">Candidate</option>
            <option value="needs_location">Needs Location</option>
            <option value="needs_review">Needs Review</option>
            <option value="corroborated">Corroborated</option>
            <option value="field_verified">Field Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="repair_claimed">Repair Claimed</option>
            <option value="resolution_pending_review">Resolution Pending</option>
            <option value="closed">Closed</option>
          </select>

          {(search || categoryFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Incident Queue Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Incident / Asset</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location & Provenance</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Evidence Conf.</th>
                <th className="px-4 py-3">Assigned Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading queue records...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No incidents match the active search and filter criteria.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-850/60 transition cursor-pointer"
                  >
                    {/* ID & Thumbnail */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {inc.annotated_image_url || inc.original_image_url ? (
                          <img
                            src={inc.annotated_image_url || inc.original_image_url}
                            alt={inc.incident_number}
                            className="w-12 h-10 rounded object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">
                            N/A
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-slate-100">{inc.incident_number}</span>
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[180px]">
                            {inc.title}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-slate-300 font-medium capitalize">
                      {inc.category.replace(/_/g, ' ')}
                    </td>

                    {/* Location & Provenance */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="line-clamp-1 text-slate-200 font-medium">
                        {inc.readable_address || (inc.latitude ? `${inc.latitude.toFixed(4)}, ${inc.longitude?.toFixed(4)}` : 'Location Pending')}
                      </div>
                      <div className="mt-1">
                        <ProvenanceTag source={inc.location_source} accuracy_m={inc.location_accuracy_m} />
                      </div>
                    </td>

                    {/* Risk Priority Score */}
                    <td className="px-4 py-3.5">
                      <PriorityBadge score={inc.risk_score} size="sm" />
                    </td>

                    {/* Evidence Confidence */}
                    <td className="px-4 py-3.5">
                      <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                    </td>

                    {/* Assigned Team */}
                    <td className="px-4 py-3.5 text-slate-400">
                      {inc.assigned_team || <span className="text-slate-600 italic">Unassigned</span>}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={inc.current_status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${inc.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white transition font-medium text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

