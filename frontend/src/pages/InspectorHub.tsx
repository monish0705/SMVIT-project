import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Wrench, 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ClipboardList,
  HardHat,
  Clock,
  Ruler
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary, WorkOrderDetail } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { useAuth } from '../context/AuthContext';

export const InspectorHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pendingInspections, setPendingInspections] = useState<IncidentSummary[]>([]);
  const [assignedWorkOrders, setAssignedWorkOrders] = useState<WorkOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Field Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentSummary | null>(null);
  const [measurementDepth, setMeasurementDepth] = useState('8 cm');
  const [measurementWidth, setMeasurementWidth] = useState('65 cm');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const loadInspectorData = () => {
    setLoading(true);
    Promise.all([
      api.getIncidents({ status: 'candidate', limit: 20 }),
      api.getWorkOrders()
    ])
      .then(([incs, wos]) => {
        setPendingInspections(incs);
        setAssignedWorkOrders(wos);
      })
      .catch(err => console.error('Failed to load inspector hub:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInspectorData();
  }, []);

  const handleFieldVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    setSubmittingVerification(true);
    try {
      await api.reviewIncident(selectedIncident.id, {
        decision: 'verify_field',
        reason: `Physical on-site inspection confirmed defect dimensions (Depth: ${measurementDepth}, Width: ${measurementWidth}).`,
        notes: inspectorNotes
      });
      setVerifyModalOpen(false);
      setSelectedIncident(null);
      setInspectorNotes('');
      loadInspectorData();
    } catch (err: any) {
      alert(`Field verification failed: ${err.message}`);
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Inspector Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-700/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-md">
            <HardHat className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Field Inspector Command Hub</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ON-SITE DISPATCH
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Inspector: <strong>{user?.full_name || 'Ramesh Babu'}</strong> · Division: <strong>{user?.organization || 'BBMP Yelahanka Division'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 transition"
          >
            <Camera className="w-4 h-4" />
            <span>On-Site GeoProof Capture</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Awaiting Field Check</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingInspections.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Requires on-site physical check</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Active Work Orders</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{assignedWorkOrders.length}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Contractor repair tracking</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Repair Audits Pending</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {assignedWorkOrders.filter(w => w.status === 'repair_claimed').length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">After-photos needing sign-off</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">GPS Accuracy Standard</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">&plusmn;5m</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Survey-grade validation</span>
        </div>
      </div>

      {/* Priority Defect Inspection Queue */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Assigned Road Defects for Physical Verification
            </h3>
          </div>
          <span className="text-xs text-slate-400">Prioritized by Risk Score</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading inspection assignments...</div>
          ) : pendingInspections.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No pending inspections in this zone.</div>
          ) : (
            pendingInspections.map(inc => (
              <div
                key={inc.id}
                className="p-4 hover:bg-slate-850/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-16 h-14 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                    />
                  ) : (
                    <div className="w-16 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                      Img
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{inc.incident_number}</span>
                      <span className="text-xs text-slate-400 capitalize font-medium">· {inc.category.replace(/_/g, ' ')}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                      <PriorityBadge score={inc.risk_score} size="sm" />
                    </div>
                    <h4 className="text-xs text-slate-200 font-semibold">{inc.title}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{inc.readable_address || 'Bengaluru Road Network'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => {
                      setSelectedIncident(inc);
                      setVerifyModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Perform Field Verification</span>
                  </button>

                  <button
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                  >
                    Dossier
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Field Inspection Dialog Modal */}
      {verifyModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleFieldVerifySubmit} className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <Ruler className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">
                Record Physical Field Verification — {selectedIncident.incident_number}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Certify that you have physically inspected this road defect on site and verified its geographic location and pavement condition.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Measured Depth</label>
                <input
                  type="text"
                  required
                  value={measurementDepth}
                  onChange={e => setMeasurementDepth(e.target.value)}
                  placeholder="e.g. 10 cm"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Approx. Surface Width</label>
                <input
                  type="text"
                  required
                  value={measurementWidth}
                  onChange={e => setMeasurementWidth(e.target.value)}
                  placeholder="e.g. 75 cm"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Inspector Observations & Repair Specs</label>
              <textarea
                rows={3}
                required
                value={inspectorNotes}
                onChange={e => setInspectorNotes(e.target.value)}
                placeholder="e.g. Edge crumbling present along center carriageway. Recommend 50mm hot-mix asphalt patching with prior tack coat application."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Transitions incident status to <strong>field_verified</strong> and records immutable audit credentials.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingVerification}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
              >
                {submittingVerification ? 'Certifying...' : 'Certify Field Verification'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

