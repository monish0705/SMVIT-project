import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  AlertTriangle, 
  Flame, 
  Layers, 
  FileCheck2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary, IncidentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { useAuth } from '../context/AuthContext';

export const ReviewCentre: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState<'resolution' | 'critical' | 'unverified' | 'duplicates' | 'missing_location'>('resolution');
  const navigate = useNavigate();
  const { role } = useAuth();

  const loadIncidents = () => {
    setLoading(true);
    let statusFilter: string | undefined;
    let minPriority: number | undefined;

    if (activeQueue === 'resolution') {
      statusFilter = 'resolution_pending_review';
    } else if (activeQueue === 'critical') {
      minPriority = 75;
    } else if (activeQueue === 'unverified') {
      statusFilter = 'needs_review';
    } else if (activeQueue === 'missing_location') {
      statusFilter = 'needs_location';
    } else if (activeQueue === 'duplicates') {
      statusFilter = 'candidate';
    }

    api.getIncidents({ status: statusFilter, min_priority: minPriority, limit: 50 })
      .then(res => setIncidents(res))
      .catch(err => console.error('Failed to load review queue:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIncidents();
  }, [activeQueue]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Review & Triage Centre</h1>
        <p className="text-sm text-slate-400 mt-1">
          Authorized human operator review gates for high-risk triage, duplicate correlation, and contractor repair verification.
        </p>
      </div>

      {/* Triage Queue Categories Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveQueue('resolution')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeQueue === 'resolution' ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Resolution Review</span>
            <FileCheck2 className={`w-4 h-4 ${activeQueue === 'resolution' ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Repairs claimed</span>
        </button>

        <button
          onClick={() => setActiveQueue('critical')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeQueue === 'critical' ? 'bg-rose-950/60 border-rose-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Critical Priority</span>
            <Flame className={`w-4 h-4 ${activeQueue === 'critical' ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Risk &ge; 75 pts</span>
        </button>

        <button
          onClick={() => setActiveQueue('unverified')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeQueue === 'unverified' ? 'bg-amber-950/60 border-amber-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Needs Review</span>
            <AlertTriangle className={`w-4 h-4 ${activeQueue === 'unverified' ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Stale or uncertain</span>
        </button>

        <button
          onClick={() => setActiveQueue('duplicates')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeQueue === 'duplicates' ? 'bg-purple-950/60 border-purple-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Duplicate Candidates</span>
            <Layers className={`w-4 h-4 ${activeQueue === 'duplicates' ? 'text-purple-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Spatial/image match</span>
        </button>

        <button
          onClick={() => setActiveQueue('missing_location')}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
            activeQueue === 'missing_location' ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Missing Location</span>
            <MapPin className={`w-4 h-4 ${activeQueue === 'missing_location' ? 'text-indigo-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Pending GPS / map pin</span>
        </button>
      </div>

      {/* Incidents Queue in Active Category */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            Actionable Cases ({incidents.length})
          </span>
          <span>Click any case to inspect and record operational action</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading review items...
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No cases currently pending in this triage queue.
            </div>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="p-4 hover:bg-slate-850/60 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-20 h-16 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                      No Img
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">{inc.incident_number}</span>
                      <span className="text-xs text-slate-400 capitalize font-medium">· {inc.category.replace(/_/g, ' ')}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                    </div>
                    <h4 className="text-xs text-slate-200 font-semibold">{inc.title}</h4>
                    <p className="text-[11px] text-slate-400">
                      {inc.readable_address || 'Location Pending'}
                    </p>
                    <div className="pt-1">
                      <ProvenanceTag source={inc.location_source} accuracy_m={inc.location_accuracy_m} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                  <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                  <PriorityBadge score={inc.risk_score} size="sm" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${inc.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
                  >
                    <span>Action Case</span>
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

