import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  MapPin, 
  ShieldCheck, 
  Flame, 
  Cpu, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  Camera,
  Share2,
  FileCheck2,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentDetailResponse } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { MapComponent } from '../components/MapComponent';
import { EvidenceGraphViewer } from '../components/EvidenceGraphViewer';
import { AuditTimeline } from '../components/AuditTimeline';
import { ImageCompareModal } from '../components/ImageCompareModal';
import { useAuth } from '../context/AuthContext';

export const IncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const [incident, setIncident] = useState<IncidentDetailResponse | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evidence' | 'graph' | 'work_order' | 'audit'>('evidence');
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Review action modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Resolution evidence upload modal state
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairImage, setRepairImage] = useState<File | null>(null);
  const [repairNotes, setRepairNotes] = useState('');

  // Work order creation modal state
  const [woModalOpen, setWoModalOpen] = useState(false);
  const [woTitle, setWoTitle] = useState('');
  const [woTeam, setWoTeam] = useState('BBMP Road Infrastructure Division');
  const [woInspector, setWoInspector] = useState('Ramesh Babu (Ward Inspector)');

  const loadIncident = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getIncidentDetail(id),
      api.getIncidentEvidenceGraph(id)
    ])
      .then(([inc, graph]) => {
        setIncident(inc);
        setGraphData(graph);
      })
      .catch(err => {
        console.error('Failed to load incident detail:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  if (loading || !incident) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading incident intelligence dossier...</span>
        </div>
      </div>
    );
  }

  // Handle Review Decision Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewReason) return;
    setSubmittingAction(true);
    try {
      await api.reviewIncident(incident.id, {
        decision: reviewDecision,
        reason: reviewReason,
        notes: reviewNotes
      });
      setReviewModalOpen(false);
      setReviewReason('');
      setReviewNotes('');
      loadIncident();
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Repair Evidence Upload
  const handleRepairEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairImage) return;
    setSubmittingAction(true);
    try {
      const formData = new FormData();
      formData.append('image', repairImage);
      formData.append('notes', repairNotes);
      formData.append('repair_team', incident.assigned_team || 'Contractor Repair Unit');
      await api.uploadResolutionEvidence(incident.id, formData);
      setRepairModalOpen(false);
      setRepairImage(null);
      setRepairNotes('');
      loadIncident();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Resolution Verification & Final Closure
  const handleVerifyResolution = async (decision: 'verify_and_close' | 'reject_repair') => {
    const reasonPrompt = decision === 'verify_and_close' 
      ? 'Resolution criteria satisfied. After-repair photo confirmed.'
      : 'Repair quality insufficient; defect remains uneven.';
    const reason = prompt('Enter resolution audit reason:', reasonPrompt);
    if (!reason) return;

    setSubmittingAction(true);
    try {
      await api.verifyResolution(incident.id, decision, reason);
      loadIncident();
    } catch (err: any) {
      alert(`Resolution action failed: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Work Order Creation
  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woTitle) return;
    setSubmittingAction(true);
    try {
      await api.createWorkOrder(incident.id, {
        title: woTitle,
        assigned_team: woTeam,
        assigned_inspector: woInspector
      });
      setWoModalOpen(false);
      setWoTitle('');
      loadIncident();
    } catch (err: any) {
      alert(`Failed to create work order: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{incident.incident_number}</h1>
              <span className="text-xs uppercase text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded">
                {incident.category.replace(/_/g, ' ')}
              </span>
              <StatusBadge status={incident.current_status} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {new Date(incident.created_at).toLocaleString()} · Updated {new Date(incident.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons for Authorized Operators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Review Button */}
          {['operator', 'field_inspector', 'admin'].includes(role) && (
            <button
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Review Decision</span>
            </button>
          )}

          {/* Create Work Order Button */}
          {['operator', 'admin'].includes(role) && incident.current_status !== 'closed' && (
            <button
              onClick={() => {
                setWoTitle(`Road Maintenance: ${incident.title}`);
                setWoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Generate Work Order</span>
            </button>
          )}

          {/* Upload Repair Evidence Button */}
          {incident.current_status !== 'closed' && (
            <button
              onClick={() => setRepairModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Attach Repair Evidence</span>
            </button>
          )}

          {/* Resolution Verification Button (if repair claimed) */}
          {incident.current_status === 'resolution_pending_review' && ['operator', 'admin'].includes(role) && (
            <button
              onClick={() => handleVerifyResolution('verify_and_close')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition animate-pulse"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Close Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left side Evidence & Photo, Right side Priority & Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): GeoProof Evidence Asset & Location Provenance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photograph Card with GeoProof Overlay Toggle */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  GeoProof AI Evidence Photograph
                </h3>
              </div>
              <button
                onClick={() => setImageModalOpen(true)}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Side-by-Side Inspect</span>
              </button>
            </div>

            <div className="relative bg-slate-950 flex items-center justify-center min-h-[380px] p-2">
              {incident.annotated_image_url || incident.original_image_url ? (
                <img
                  src={incident.annotated_image_url || incident.original_image_url}
                  alt={incident.incident_number}
                  className="max-h-[460px] w-auto rounded-lg object-contain shadow-md"
                />
              ) : (
                <div className="text-slate-500 text-xs">No photographic evidence attached.</div>
              )}
            </div>

            <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-400">
                  SHA-256: {incident.sha256 ? `${incident.sha256.substring(0, 16)}...` : 'Computed at intake'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ProvenanceTag source={incident.location.source} accuracy_m={incident.location.accuracy_m} />
              </div>
            </div>
          </div>

          {/* Location Map & Provenance Box */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-slate-200">Location Provenance</h3>
              </div>
              <span className="text-xs text-slate-400">
                {incident.location.verified ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Field Verified
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Unverified Location
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Readable Address</span>
                  <p className="text-slate-200 font-medium text-sm mt-0.5">
                    {incident.location.readable_address || 'Address reverse lookup pending'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Coordinates</span>
                    <p className="font-mono text-slate-300 mt-0.5">
                      {incident.location.latitude ? `${incident.location.latitude.toFixed(5)}° N` : 'N/A'}
                    </p>
                    <p className="font-mono text-slate-300">
                      {incident.location.longitude ? `${incident.location.longitude.toFixed(5)}° E` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Accuracy</span>
                    <p className="text-slate-300 mt-0.5">
                      {incident.location.accuracy_m ? `±${Math.round(incident.location.accuracy_m)} metres` : 'Not provided by source'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Source Provenance</span>
                  <div className="mt-1">
                    <ProvenanceTag source={incident.location.source} accuracy_m={incident.location.accuracy_m} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    {incident.location.source === 'photo_exif' && "Coordinates extracted directly from JPEG EXIF header. Preserved as unverified claim."}
                    {incident.location.source === 'device_gps_at_submission' && "Captured from user device during gallery upload. Separated from historical photo origin."}
                    {incident.location.source === 'device_gps_at_capture' && "Sampled immediately when new photo was captured via device camera."}
                    {incident.location.source === 'manual_map_pin' && "Pin manually confirmed or corrected on interactive map by contributor."}
                    {incident.location.source === 'inspector_confirmed' && "On-site verified coordinates recorded during authorized field inspection."}
                  </p>
                </div>
              </div>

              {/* Map Point */}
              <div className="h-48 rounded-lg overflow-hidden border border-slate-800">
                {incident.location.latitude && incident.location.longitude ? (
                  <MapComponent
                    incidents={[{
                      id: incident.id,
                      incident_number: incident.incident_number,
                      title: incident.title,
                      category: incident.category,
                      status: incident.current_status,
                      latitude: incident.location.latitude,
                      longitude: incident.location.longitude,
                      accuracy_m: incident.location.accuracy_m,
                      risk_score: incident.risk_score
                    }]}
                    center={[incident.location.latitude, incident.location.longitude]}
                    zoom={15}
                    height="100%"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-950 text-slate-500 text-xs">
                    Coordinates pending
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Transparent Priority Score Breakdown & AI Assessment */}
        <div className="space-y-6">
          {/* Risk Priority Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Calculated Risk Priority</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {incident.risk_score.toFixed(1)}
                  </span>
                  <span className="text-slate-500 font-semibold text-sm">/ 100</span>
                  <PriorityBadge score={incident.risk_score} emergency={incident.risk_breakdown?.emergency_escalation} />
                </div>
              </div>
            </div>

            {incident.risk_breakdown?.emergency_escalation && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                <Flame className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>EMERGENCY ESCALATION:</strong> High physical severity situated along a critical commuter corridor or sensitive medical/school route.
                </span>
              </div>
            )}

            {/* 5-Factor Contributions Table */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Factor Contribution Breakdown (Formula V1.0)
              </span>

              <div className="space-y-2 text-xs">
                {/* Severity */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Severity (35%)</span>
                    <span className="font-mono">+{incident.risk_breakdown?.severity_contribution?.toFixed(1) ?? '0.0'} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${incident.risk_breakdown?.severity_score ?? 0}%` }}></div>
                  </div>
                </div>

                {/* Exposure */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Road-user Exposure (25%)</span>
                    <span className="font-mono">+{incident.risk_breakdown?.exposure_contribution?.toFixed(1) ?? '0.0'} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${incident.risk_breakdown?.exposure_score ?? 0}%` }}></div>
                  </div>
                </div>

                {/* Criticality */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Context Criticality (20%)</span>
                    <span className="font-mono">+{incident.risk_breakdown?.criticality_contribution?.toFixed(1) ?? '0.0'} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${incident.risk_breakdown?.criticality_score ?? 0}%` }}></div>
                  </div>
                </div>

                {/* Hazard Likelihood */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Hazard Likelihood (10%)</span>
                    <span className="font-mono">+{incident.risk_breakdown?.hazard_contribution?.toFixed(1) ?? '0.0'} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${incident.risk_breakdown?.hazard_score ?? 0}%` }}></div>
                  </div>
                </div>

                {/* Time Unresolved */}
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Time Unresolved (10%)</span>
                    <span className="font-mono">+{incident.risk_breakdown?.time_unresolved_contribution?.toFixed(1) ?? '0.0'} pts</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${incident.risk_breakdown?.time_unresolved_score ?? 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="pt-2 border-t border-slate-800 text-xs text-slate-300">
              <span className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Triage Recommendation</span>
              <p className="mt-1 font-medium text-brand-300">{incident.priority_recommendation}</p>
              {incident.risk_breakdown?.explanation && (
                <p className="mt-1 text-slate-400 text-[11px]">{incident.risk_breakdown.explanation}</p>
              )}
            </div>
          </div>

          {/* Evidence Confidence Card (Separated from Risk Priority) */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Evidence Confidence</span>
              <ConfidenceBadge confidence={incident.evidence_confidence} score={incident.evidence_confidence_score} />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Confidence is evaluated independently from physical risk: {incident.observations?.length || 1} report(s) on file with {incident.location.source} provenance.
            </p>
            <div className="text-[11px] text-slate-500">
              Rule: A high-risk defect with low evidence confidence is prioritized for urgent field validation rather than suppressed.
            </div>
          </div>

          {/* AI Defect Assessment */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">AI Defect Triage</h4>
              </div>
              <span className="text-[10px] text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800 font-mono">
                {incident.assessments[0]?.model_name || 'gemini-3.8-flash'}
              </span>
            </div>

            {incident.assessments.length > 0 ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Classified Defect:</span>
                  <span className="text-slate-200 capitalize font-medium">{incident.assessments[0].category.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Visible Severity:</span>
                  <span className="text-slate-200 capitalize font-medium">{incident.assessments[0].visible_severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Image Quality:</span>
                  <span className="text-slate-200 capitalize font-medium">{incident.assessments[0].image_quality}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Visual Evidence:</span>
                  <p className="text-slate-300 mt-1 italic bg-slate-950 p-2 rounded border border-slate-800">
                    "{incident.assessments[0].visual_evidence}"
                  </p>
                </div>
                {incident.assessments[0].uncertainties?.length > 0 && (
                  <div className="pt-2 text-[11px] text-amber-300">
                    <span className="font-semibold">Uncertainties: </span>
                    {incident.assessments[0].uncertainties.join('; ')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Automated triage assessment pending.</p>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Candidates Alert (if any linked) */}
      {incident.links && incident.links.some(l => l.relation_type === 'possible_duplicate_of') && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/50 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-200">
              Potential Duplicate Observation Detected
            </h4>
          </div>
          <div className="space-y-2">
            {incident.links.filter(l => l.relation_type === 'possible_duplicate_of').map(l => (
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 p-3 rounded-lg border border-slate-800 gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-white">{l.linked_incident_number}</span>
                  <span className="text-slate-400 ml-2">Match Score: {Math.round(l.score * 100)}%</span>
                  <p className="text-slate-300 mt-0.5">{l.reason}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/incidents/${l.linked_incident_id}`)}
                    className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                  >
                    Compare Case
                  </button>
                  {['operator', 'admin'].includes(role) && (
                    <div className="flex items-center gap-1.5">
                      {l.status !== 'confirmed' && (
                        <button
                          onClick={async () => {
                            try {
                              await api.updateIncidentLinkStatus(l.id, 'confirm', 'Operator verified spatial & visual duplicate');
                              loadIncident();
                            } catch (err: any) {
                              alert(`Failed to confirm link: ${err.message}`);
                            }
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition"
                        >
                          Confirm Link
                        </button>
                      )}
                      {l.status !== 'rejected' && (
                        <button
                          onClick={async () => {
                            try {
                              await api.updateIncidentLinkStatus(l.id, 'reject', 'Operator identified as distinct defect');
                              loadIncident();
                            } catch (err: any) {
                              alert(`Failed to reject link: ${err.message}`);
                            }
                          }}
                          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white font-medium transition"
                        >
                          Reject Match
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Section: Evidence Graph, Work Orders, Audit History */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-5 py-3 border-b-2 transition ${activeTab === 'evidence' ? 'border-brand-500 text-brand-300 font-bold bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Connected Observations ({incident.observations.length})
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-5 py-3 border-b-2 transition ${activeTab === 'graph' ? 'border-brand-500 text-brand-300 font-bold bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Relational Evidence Graph
          </button>
          <button
            onClick={() => setActiveTab('work_order')}
            className={`px-5 py-3 border-b-2 transition ${activeTab === 'work_order' ? 'border-brand-500 text-brand-300 font-bold bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Work Orders ({incident.work_orders.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-3 border-b-2 transition ${activeTab === 'audit' ? 'border-brand-500 text-brand-300 font-bold bg-slate-900' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Audit History ({incident.audit_events.length})
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {incident.observations.map((obs) => (
                <div key={obs.id} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex items-start gap-3">
                    {obs.annotated_asset_url || obs.original_asset_url ? (
                      <img
                        src={obs.annotated_asset_url || obs.original_asset_url}
                        alt={obs.observation_number}
                        className="w-20 h-16 rounded object-cover bg-slate-800 border border-slate-700 flex-shrink-0 cursor-pointer"
                        onClick={() => setImageModalOpen(true)}
                      />
                    ) : (
                      <div className="w-20 h-16 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                        No Img
                      </div>
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{obs.observation_number}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {obs.source_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-500">· Mode: {obs.capture_mode}</span>
                      </div>
                      <p className="text-slate-300">{obs.description || 'No text notes submitted.'}</p>
                      <div className="text-[11px] text-slate-500">
                        Submitted by: {obs.submitted_by} · {new Date(obs.submitted_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between text-xs text-slate-400">
                    {obs.locations[0] && (
                      <ProvenanceTag source={obs.locations[0].source} accuracy_m={obs.locations[0].accuracy_m} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'graph' && (
            <EvidenceGraphViewer graphData={graphData} />
          )}

          {activeTab === 'work_order' && (
            <div className="space-y-4">
              {incident.work_orders.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs">
                  No work orders generated yet for this incident.
                </div>
              ) : (
                incident.work_orders.map((wo) => (
                  <div key={wo.id} className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-brand-400" />
                        <span className="font-bold text-slate-100 text-sm">{wo.work_order_number}: {wo.title}</span>
                      </div>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                        {wo.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                      <div>
                        <span>Assigned Team:</span> <strong className="text-slate-200">{wo.assigned_team}</strong>
                      </div>
                      <div>
                        <span>Inspector:</span> <strong className="text-slate-200">{wo.assigned_inspector || 'Unassigned'}</strong>
                      </div>
                    </div>

                    {wo.checklist && wo.checklist.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">Field Checklist:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {wo.checklist.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2 rounded border border-slate-850">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                readOnly
                                className="accent-brand-500 rounded"
                              />
                              <span className={item.completed ? 'text-slate-400 line-through' : 'text-slate-200'}>
                                {item.item}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {wo.repair_notes && (
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300">
                        <strong>Repair Notes:</strong> {wo.repair_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <AuditTimeline events={incident.audit_events} />
          )}
        </div>
      </div>

      {/* Image Inspection Modal */}
      <ImageCompareModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        incidentNumber={incident.incident_number}
        originalUrl={incident.original_image_url}
        annotatedUrl={incident.annotated_image_url}
        sha256={incident.sha256}
      />

      {/* Human Review Decision Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleReviewSubmit} className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-400" />
              <span>Record Human Review Decision — {incident.incident_number}</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Operational Decision</label>
              <select
                value={reviewDecision}
                onChange={e => setReviewDecision(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              >
                <option value="corroborate">Corroborate Incident (Multiple consistent signals)</option>
                <option value="verify_field">Field Verified (Physical on-site defect confirmed)</option>
                <option value="approve">Approve for Maintenance Queue</option>
                <option value="request_evidence">Request Additional Evidence / Re-check</option>
                <option value="reject">Reject Report (False defect / Invalid claim)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Justification / Reason (Mandatory for Audit)</label>
              <input
                type="text"
                required
                placeholder="e.g. Visual confirmation of 10cm depth asphalt void on arterial lane."
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Inspector Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Additional instructions for maintenance team..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
              >
                {submittingAction ? 'Recording...' : 'Commit Review Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attach Repair Evidence Modal */}
      {repairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleRepairEvidenceSubmit} className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-cyan-400" />
              <span>Attach Repair Evidence — {incident.incident_number}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload an after-repair photograph. GeoProof will watermark the asset with the resolution status.
              This moves the case to <strong>resolution_pending_review</strong> for human sign-off; it will not close automatically.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">After-Repair Photograph</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={e => setRepairImage(e.target.files?.[0] || null)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Repair Notes / Materials Applied</label>
              <textarea
                rows={2}
                placeholder="e.g. Cold-mix asphalt compacted with roller. Surface leveled to grade."
                value={repairNotes}
                onChange={e => setRepairNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRepairModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction || !repairImage}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                {submittingAction ? 'Processing...' : 'Submit Repair Evidence'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Generate Work Order Modal */}
      {woModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleCreateWorkOrder} className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-400" />
              <span>Generate Maintenance Work Order</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Work Order Title</label>
              <input
                type="text"
                required
                value={woTitle}
                onChange={e => setWoTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Assigned Road Division</label>
              <input
                type="text"
                required
                value={woTeam}
                onChange={e => setWoTeam(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Designated Inspector</label>
              <input
                type="text"
                value={woInspector}
                onChange={e => setWoInspector(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setWoModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAction}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {submittingAction ? 'Generating...' : 'Dispatch Work Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

