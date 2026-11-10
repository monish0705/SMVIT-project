import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Layers,
  FileCheck2,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ProvenanceTag } from '../components/ProvenanceTag';

export const ReviewCentre: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState<'resolution' | 'critical' | 'unverified' | 'duplicates' | 'missing_location'>('resolution');
  const navigate = useNavigate();

  const loadIncidents = () => {
    setLoading(true);
    let statusFilter: string | undefined;
    let minPriority: number | undefined;

    if (activeQueue === 'resolution') {
      statusFilter = 'resolution_pending_review,repair_claimed';
    } else if (activeQueue === 'critical') {
      minPriority = 75;
    } else if (activeQueue === 'unverified') {
      statusFilter = 'needs_review';
    } else if (activeQueue === 'missing_location') {
      statusFilter = 'needs_location';
    } else if (activeQueue === 'duplicates') {
      statusFilter = 'candidate,needs_review,corroborated';
    }

    api.getIncidents({ status: statusFilter, min_priority: minPriority, limit: 50 })
      .then(res => setIncidents(res))
      .catch(err => console.error('Failed to load review queue:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIncidents();
  }, [activeQueue]);

  const tabs = [
    { id: 'resolution', title: 'Resolution Review', sub: 'Repairs awaiting sign-off', icon: <FileCheck2 className="w-4 h-4 text-[#167C80]" /> },
    { id: 'critical', title: 'Critical Risk', sub: 'Priority score >= 75', icon: <AlertOctagon className="w-4 h-4 text-[#DC4C4C]" /> },
    { id: 'unverified', title: 'Needs Review', sub: 'Stale or uncertain cases', icon: <AlertTriangle className="w-4 h-4 text-[#D99A32]" /> },
    { id: 'duplicates', title: 'Duplicate Review', sub: 'Consolidation queue', icon: <Layers className="w-4 h-4 text-[#3979B7]" /> },
    { id: 'missing_location', title: 'Missing Location', sub: 'Needs manual map pin', icon: <MapPin className="w-4 h-4 text-[#DC4C4C]" /> }
  ] as const;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Review Queue</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Human operator verification gates for repair sign-off, high-risk escalation, duplicate linking, and missing pins.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tabs.map((t) => {
          const active = activeQueue === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveQueue(t.id)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                active
                  ? 'bg-white border-[#167C80] ring-2 ring-[#167C80]/20 shadow-sm'
                  : 'bg-white border-[#DDE4EC] hover:bg-[#F6F8FA]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${active ? 'text-[#167C80]' : 'text-[#263746]'}`}>{t.title}</span>
                {t.icon}
              </div>
              <span className="text-[11px] text-[#5A6B7C] mt-1">{t.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#263746] uppercase tracking-wider text-[11px]">
            Actionable Cases ({incidents.length})
          </span>
          <span className="text-[#5A6B7C]">Select any case to inspect evidence and record decision</span>
        </div>

        <div className="divide-y divide-[#DDE4EC]">
          {loading ? (
            <div className="p-8 text-center text-[#5A6B7C] text-xs">Loading review queue...</div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center text-[#5A6B7C] text-xs">No cases currently pending in this queue.</div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="p-4 hover:bg-[#F6F8FA] transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-18 h-14 w-16 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-14 rounded-lg bg-slate-100 border border-[#DDE4EC] flex items-center justify-center text-xs text-[#5A6B7C] flex-shrink-0">
                      No Img
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                      <span className="text-xs text-[#5A6B7C] capitalize">&middot; {inc.category.replace(/_/g, ' ')}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                    </div>
                    <h4 className="text-xs text-[#263746] font-semibold line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-[#5A6B7C] truncate">{inc.readable_address || 'Location Pending'}</p>
                    <div className="pt-0.5">
                      <ProvenanceTag source={inc.location_source} accuracy_m={inc.location_accuracy_m} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center flex-shrink-0">
                  <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                  <PriorityBadge score={inc.risk_score} size="sm" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${inc.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
