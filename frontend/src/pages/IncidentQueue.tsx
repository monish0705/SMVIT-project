import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, RefreshCw, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary } from '../types';
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
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Incidents Queue</h1>
          <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
            Search, filter, and prioritize verified road failure incidents across Bengaluru.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F6F8FA] text-[#263746] text-xs font-medium transition border border-[#DDE4EC] self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#167C80]" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#DDE4EC] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5A6B7C] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by incident ID (INF-1001), road, or locality..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-[#167C80]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-3 py-2 focus:outline-none focus:border-[#167C80]"
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
            className="bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-3 py-2 focus:outline-none focus:border-[#167C80]"
          >
            <option value="">All Statuses</option>
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
              className="text-xs text-[#167C80] font-semibold hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F8FA] border-b border-[#DDE4EC] text-[#5A6B7C] uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="px-4 py-3">Incident</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location &amp; Provenance</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE4EC]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#5A6B7C]">Loading incident records...</td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#5A6B7C]">No incidents match your active filters.</td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-[#F6F8FA] transition cursor-pointer"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {inc.annotated_image_url || inc.original_image_url ? (
                          <img
                            src={inc.annotated_image_url || inc.original_image_url}
                            alt={inc.incident_number}
                            className="w-12 h-10 rounded object-cover border border-[#DDE4EC] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-10 rounded bg-slate-100 border border-[#DDE4EC] flex items-center justify-center text-[10px] text-[#5A6B7C] flex-shrink-0">
                            N/A
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-[#263746]">{inc.incident_number}</span>
                          <div className="text-[11px] text-[#5A6B7C] mt-0.5 line-clamp-1 max-w-[190px]">{inc.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#263746] font-medium capitalize">
                      {inc.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="line-clamp-1 text-[#263746] font-medium">
                        {inc.readable_address || (inc.latitude ? `${inc.latitude.toFixed(4)}, ${inc.longitude?.toFixed(4)}` : 'Location Pending')}
                      </div>
                      <div className="mt-1">
                        <ProvenanceTag source={inc.location_source} accuracy_m={inc.location_accuracy_m} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge score={inc.risk_score} size="sm" />
                    </td>
                    <td className="px-4 py-3.5">
                      <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-[#5A6B7C]">
                      {inc.assigned_team || <span className="italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={inc.current_status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${inc.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white transition font-medium text-xs"
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

      {/* Mobile Card List (Zero Horizontal Overflow) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-6 text-center text-xs text-[#5A6B7C]">
            Loading queue...
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-6 text-center text-xs text-[#5A6B7C]">
            No incidents match active filters.
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className="bg-white rounded-xl border border-[#DDE4EC] p-4 space-y-3 shadow-sm active:bg-[#F6F8FA]"
            >
              <div className="flex items-start gap-3">
                {inc.annotated_image_url || inc.original_image_url ? (
                  <img
                    src={inc.annotated_image_url || inc.original_image_url}
                    alt={inc.incident_number}
                    className="w-16 h-14 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                    <StatusBadge status={inc.current_status} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-[#263746] mt-1 line-clamp-1">{inc.title}</p>
                  <p className="text-[11px] text-[#5A6B7C] mt-0.5 truncate">{inc.readable_address || 'Location Pending'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DDE4EC]">
                <div className="flex items-center gap-2">
                  <PriorityBadge score={inc.risk_score} size="sm" />
                  <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#167C80]" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
