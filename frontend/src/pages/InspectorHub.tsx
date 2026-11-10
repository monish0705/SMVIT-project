import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  MapPin,
  CheckCircle2,
  ClipboardList,
  HardHat,
  Ruler,
  FileCheck2,
  AlertCircle
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
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Field Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentSummary | null>(null);
  const [measurementDepth, setMeasurementDepth] = useState('8 cm');
  const [measurementWidth, setMeasurementWidth] = useState('65 cm');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Quick Repair Evidence Modal
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairTarget, setRepairTarget] = useState<IncidentSummary | null>(null);
  const [repairImage, setRepairImage] = useState<File | null>(null);
  const [repairNotes, setRepairNotes] = useState('');

  const loadInspectorData = () => {
    setLoading(true);
    Promise.all([
      api.getIncidents({ status: 'candidate,needs_review,corroborated,assigned,in_progress', limit: 30 }),
      api.getWorkOrders()
    ])
      .then(([incs, wos]) => {
        setPendingInspections(incs);
        setAssignedWorkOrders(wos);
      })
      .catch(err => setBannerMsg({ type: 'err', text: err.message || 'Failed to load inspection tasks.' }))
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
        reason: `On-site field inspection confirmed defect (Depth: ${measurementDepth}, Width: ${measurementWidth}).`,
        notes: inspectorNotes
      });
      setVerifyModalOpen(false);
      setBannerMsg({ type: 'ok', text: `${selectedIncident.incident_number} marked Field Verified.` });
      setSelectedIncident(null);
      setInspectorNotes('');
      loadInspectorData();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: `Field verification failed: ${err.message}` });
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleQuickRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairTarget || !repairImage) return;
    setSubmittingVerification(true);
    try {
      const formData = new FormData();
      formData.append('image', repairImage);
      formData.append('notes', repairNotes);
      formData.append('repair_team', user?.organization || 'Field Engineering Team');
      const res = await api.uploadResolutionEvidence(repairTarget.id, formData);
      setRepairModalOpen(false);
      setRepairImage(null);
      setRepairNotes('');
      setBannerMsg({
        type: 'ok',
        text: `After-repair photo uploaded for ${repairTarget.incident_number}. ${res.resolution_comparison?.summary || 'Moved to pending resolution review.'}`
      });
      loadInspectorData();
    } catch (err: any) {
      setBannerMsg({ type: 'err', text: `Upload failed: ${err.message}` });
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#DDE4EC] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#172B3A] text-white flex items-center justify-center flex-shrink-0">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#263746]">Field Inspector Tasks</h1>
            <p className="text-xs text-[#5A6B7C] mt-0.5">
              {user?.full_name || 'Ramesh Babu'} &middot; {user?.organization || 'BBMP Field Division'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/report?mode=camera')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#116265] text-white font-semibold text-xs transition"
          >
            <Camera className="w-4 h-4" />
            <span>Capture Field Photo</span>
          </button>
          <button
            onClick={() => navigate('/work-orders')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] font-semibold text-xs transition"
          >
            <span>Checklists ({assignedWorkOrders.length})</span>
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
          bannerMsg.type === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-[#39866A]'
            : 'bg-red-50 border-red-200 text-[#DC4C4C]'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Actionable Tasks</span>
          <div className="text-2xl font-bold text-[#263746] mt-1 tabular-nums">{pendingInspections.length}</div>
          <span className="text-[11px] text-[#5A6B7C]">Awaiting check or repair</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">High Risk (&ge;75)</span>
          <div className="text-2xl font-bold text-[#DC4C4C] mt-1 tabular-nums">
            {pendingInspections.filter(i => i.risk_score >= 75).length}
          </div>
          <span className="text-[11px] text-[#5A6B7C]">Urgent physical check</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Active Work Orders</span>
          <div className="text-2xl font-bold text-[#3979B7] mt-1 tabular-nums">{assignedWorkOrders.length}</div>
          <span className="text-[11px] text-[#5A6B7C]">Crew checklists</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Pending Audits</span>
          <div className="text-2xl font-bold text-[#167C80] mt-1 tabular-nums">
            {assignedWorkOrders.filter(w => w.status === 'repair_claimed').length}
          </div>
          <span className="text-[11px] text-[#5A6B7C]">After-repair check</span>
        </div>
      </div>

      {/* Assigned Road Defects Queue */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between bg-[#F6F8FA]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Field Inspection &amp; Repair Queue</h2>
          </div>
          <span className="text-xs text-[#5A6B7C]">Sorted by Priority</span>
        </div>

        <div className="divide-y divide-[#DDE4EC]">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">Loading field assignments...</div>
          ) : pendingInspections.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">No pending field inspections.</div>
          ) : (
            pendingInspections.map((inc) => (
              <div
                key={inc.id}
                className="p-4 hover:bg-[#F6F8FA] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      onClick={() => navigate(`/incidents/${inc.id}`)}
                      className="w-16 h-16 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0 cursor-pointer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 border border-[#DDE4EC] flex items-center justify-center text-xs text-[#5A6B7C] flex-shrink-0">
                      No Img
                    </div>
                  )}

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                      <PriorityBadge score={inc.risk_score} size="sm" />
                    </div>
                    <h3 className="text-xs font-semibold text-[#263746] line-clamp-1">{inc.title}</h3>
                    <p className="text-[11px] text-[#5A6B7C] flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#167C80] flex-shrink-0" />
                      <span className="truncate">{inc.readable_address || 'Bengaluru'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  {['candidate', 'needs_review', 'corroborated'].includes(inc.current_status) && (
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setVerifyModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white font-semibold text-xs transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify On Site</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setRepairTarget(inc);
                      setRepairModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3979B7] hover:bg-blue-700 text-white font-semibold text-xs transition"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Upload After-Photo</span>
                  </button>

                  <button
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="px-3 py-2 rounded-lg bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] font-medium text-xs transition"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Physical Verification Modal */}
      {verifyModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleFieldVerifySubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#167C80]">
              <Ruler className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#263746]">
                Field Verification — {selectedIncident.incident_number}
              </h3>
            </div>
            <p className="text-xs text-[#5A6B7C]">
              Record physical measurements and surface condition observed on site.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#263746]">Measured Depth</label>
                <input
                  type="text"
                  required
                  value={measurementDepth}
                  onChange={(e) => setMeasurementDepth(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#263746]">Surface Width</label>
                <input
                  type="text"
                  required
                  value={measurementWidth}
                  onChange={(e) => setMeasurementWidth(e.target.value)}
                  className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Inspection Findings &amp; Repair Spec</label>
              <textarea
                rows={3}
                required
                value={inspectorNotes}
                onChange={(e) => setInspectorNotes(e.target.value)}
                placeholder="e.g. Base layer exposed near bus stop curb; requires 50mm hot-mix asphalt patching."
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button
                type="button"
                onClick={() => setVerifyModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingVerification}
                className="px-4 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold"
              >
                {submittingVerification ? 'Saving...' : 'Confirm Field Verification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload After-Repair Evidence Modal */}
      {repairModalOpen && repairTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleQuickRepairSubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#3979B7]">
              <FileCheck2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#263746]">
                Upload After-Repair Photo — {repairTarget.incident_number}
              </h3>
            </div>
            <p className="text-xs text-[#5A6B7C]">
              Photo is compared automatically against the original defect image and routed to supervisor resolution review before closure.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">After-Repair Photograph</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                required
                onChange={(e) => setRepairImage(e.target.files?.[0] || null)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Repair Materials &amp; Notes</label>
              <textarea
                rows={2}
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="e.g. Hot mix asphalt compacted and leveled."
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button
                type="button"
                onClick={() => setRepairModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingVerification || !repairImage}
                className="px-4 py-2 rounded-lg bg-[#3979B7] hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {submittingVerification ? 'Comparing...' : 'Submit Repair Proof'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
