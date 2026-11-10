import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  AlertOctagon,
  Cpu,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Camera,
  FileCheck2,
  ArrowLeftRight
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
  const { role } = useAuth();

  const [incident, setIncident] = useState<IncidentDetailResponse | null>(null);
  const [graphData, setGraphData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'evidence' | 'graph' | 'work_order' | 'audit'>('evidence');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [showDetections, setShowDetections] = useState(true);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  // Resolution Verification Approval Modal (replaces window.prompt)
  const [verifyResolutionModalOpen, setVerifyResolutionModalOpen] = useState(false);
  const [resolutionDecision, setResolutionDecision] = useState<'verify_and_close' | 'reject_repair'>('verify_and_close');
  const [resolutionReason, setResolutionReason] = useState('After-repair surface photo verified; asphalt restored cleanly.');

  // Location Pin Update Modal (for needs_location or correction)
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lon: number } | null>(null);

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
      .catch(err => setFeedbackBanner({ type: 'err', text: err.message || 'Failed to load incident details.' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  if (loading || !incident) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5A6B7C] text-xs gap-2">
        <div className="w-5 h-5 border-2 border-[#167C80] border-t-transparent rounded-full animate-spin" />
        <span>Loading incident intelligence dossier...</span>
      </div>
    );
  }

  const primaryAssessment = incident.assessments.find(a => !a.resolution_comparison) || incident.assessments[0];
  const detectedRegions = primaryAssessment?.detected_regions || [];
  const visionMetrics = primaryAssessment?.vision_metrics || {};

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
      setFeedbackBanner({ type: 'ok', text: 'Review decision logged in audit history.' });
      loadIncident();
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: `Review action failed: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  };

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
      setFeedbackBanner({ type: 'ok', text: 'After-repair photo uploaded and compared. Case queued for supervisor sign-off.' });
      loadIncident();
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: `Upload failed: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleVerifyResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionReason.trim()) return;
    setSubmittingAction(true);
    try {
      await api.verifyResolution(incident.id, resolutionDecision, resolutionReason);
      setVerifyResolutionModalOpen(false);
      setFeedbackBanner({
        type: 'ok',
        text: resolutionDecision === 'verify_and_close'
          ? 'Resolution verified and incident formally closed.'
          : 'Repair rejected; incident returned to in_progress.'
      });
      loadIncident();
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: `Resolution verification failed: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handlePinLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCoords) return;
    setSubmittingAction(true);
    try {
      await api.updateIncidentLocation(incident.id, {
        latitude: pinCoords.lat,
        longitude: pinCoords.lon,
        accuracy_m: 15.0,
        source: role === 'field_inspector' ? 'inspector_confirmed' : 'manual_map_pin',
        reason: 'Location pin added/updated from Incident Dossier.'
      });
      setPinModalOpen(false);
      setFeedbackBanner({ type: 'ok', text: 'Location coordinates attached while preserving historical provenance records.' });
      loadIncident();
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: `Failed to update location: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  };

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
      setFeedbackBanner({ type: 'ok', text: 'Maintenance work order created and assigned.' });
      loadIncident();
    } catch (err: any) {
      setFeedbackBanner({ type: 'err', text: `Failed to create work order: ${err.message}` });
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 rounded-lg bg-white border border-[#DDE4EC] text-[#5A6B7C] hover:text-[#263746] transition flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-[#263746]">{incident.incident_number}</h1>
              <span className="text-xs uppercase text-[#5A6B7C] font-semibold bg-slate-100 border border-[#DDE4EC] px-2 py-0.5 rounded">
                {incident.category.replace(/_/g, ' ')}
              </span>
              <StatusBadge status={incident.current_status} size="sm" />
            </div>
            <p className="text-xs text-[#5A6B7C] mt-0.5 truncate">
              Logged {new Date(incident.created_at).toLocaleString()} &middot; Updated {new Date(incident.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Role-gated Operational Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {['operator', 'field_inspector', 'admin'].includes(role) && (
            <button
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Review</span>
            </button>
          )}

          {['operator', 'admin'].includes(role) && incident.current_status !== 'closed' && (
            <button
              onClick={() => {
                setWoTitle(`Road Maintenance: ${incident.title}`);
                setWoModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#3979B7] hover:bg-blue-700 text-white text-xs font-semibold transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Create Work Order</span>
            </button>
          )}

          {['operator', 'field_inspector', 'admin'].includes(role) && incident.current_status !== 'closed' && (
            <button
              onClick={() => setRepairModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F6F8FA] text-[#263746] border border-[#DDE4EC] text-xs font-semibold transition"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#167C80]" />
              <span>Attach Repair Photo</span>
            </button>
          )}

          {['resolution_pending_review', 'repair_claimed'].includes(incident.current_status) &&
            ['operator', 'admin'].includes(role) && (
              <button
                onClick={() => setVerifyResolutionModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#39866A] hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Resolution</span>
              </button>
            )}
        </div>
      </div>

      {feedbackBanner && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
          feedbackBanner.type === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-[#39866A]'
            : 'bg-red-50 border-red-200 text-[#DC4C4C]'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{feedbackBanner.text}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Evidence Photography, Before/After Comparison, Location */}
        <div className="lg:col-span-2 space-y-5">
          {/* Photograph + Candidate CV Defect Overlay */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#167C80]" />
                <h2 className="text-sm font-semibold text-[#263746]">GeoProof Evidence Photograph</h2>
              </div>
              <div className="flex items-center gap-3">
                {detectedRegions.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs text-[#263746] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showDetections}
                      onChange={(e) => setShowDetections(e.target.checked)}
                      className="accent-[#167C80] rounded"
                    />
                    <span>Show CV Regions ({detectedRegions.length})</span>
                  </label>
                )}
                <button
                  onClick={() => setImageModalOpen(true)}
                  className="flex items-center gap-1 text-xs text-[#167C80] font-semibold hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Assets</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-100 flex items-center justify-center p-3">
              {incident.annotated_image_url || incident.original_image_url ? (
                <div className="relative inline-block max-w-full">
                  <img
                    src={incident.annotated_image_url || incident.original_image_url}
                    alt={incident.incident_number}
                    className="max-h-[420px] w-auto rounded-lg object-contain border border-[#DDE4EC]"
                  />
                  {/* Candidate CV Region Overlay (drawn inside top ~84% above GeoProof bottom bar) */}
                  {showDetections &&
                    detectedRegions.map((reg, idx) => {
                      const [x, y, w, h] = reg.bbox;
                      return (
                        <div
                          key={idx}
                          style={{
                            left: `${x * 100}%`,
                            top: `${y * 84}%`,
                            width: `${w * 100}%`,
                            height: `${h * 84}%`,
                          }}
                          className="absolute border-2 border-[#D99A32] bg-[#D99A32]/15 rounded pointer-events-none"
                        >
                          <span className="inline-block bg-[#172B3A] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-br whitespace-nowrap">
                            {reg.label.replace(/_candidate|_patch/g, '').replace(/_/g, ' ')} {Math.round(reg.confidence * 100)}%
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#5A6B7C] text-xs">
                  No photographic evidence attached.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#F6F8FA] border-t border-[#DDE4EC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A6B7C]">
              <span className="font-mono text-[11px]">
                SHA-256: {incident.sha256 ? `${incident.sha256.substring(0, 18)}...` : 'Pending'}
              </span>
              <ProvenanceTag source={incident.location.source} accuracy_m={incident.location.accuracy_m} />
            </div>
          </div>

          {/* Before & After Repair Comparison Card (when repair photo exists) */}
          {incident.after_repair_image_url && (
            <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#DDE4EC] bg-emerald-50/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#39866A]" />
                  <h2 className="text-sm font-semibold text-[#263746]">Before &amp; After Resolution Verification</h2>
                </div>
                {incident.resolution_comparison && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-white border border-emerald-200 text-[#39866A]">
                    Change Score: {incident.resolution_comparison.visual_change_score}/100
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-[#DDE4EC] rounded-lg p-2 bg-[#F6F8FA]">
                    <span className="text-[11px] font-semibold text-[#DC4C4C] block mb-1.5 uppercase">Before: Reported Defect</span>
                    <img
                      src={incident.annotated_image_url || incident.original_image_url}
                      alt="Before repair"
                      className="w-full h-44 object-cover rounded"
                    />
                  </div>
                  <div className="border border-emerald-200 rounded-lg p-2 bg-emerald-50/40">
                    <span className="text-[11px] font-semibold text-[#39866A] block mb-1.5 uppercase">After: Repair Proof</span>
                    <img
                      src={incident.after_repair_image_url}
                      alt="After repair"
                      className="w-full h-44 object-cover rounded"
                    />
                  </div>
                </div>

                {incident.resolution_comparison && (
                  <div className="p-3.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs space-y-1.5">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-semibold text-[#263746]">
                        Assessment: {incident.resolution_comparison.defect_reduction_assessment.replace(/_/g, ' ')}
                      </span>
                      {incident.resolution_comparison.scene_similarity_pct !== null && (
                        <span className="text-[#5A6B7C]">
                          Scene framing similarity: {incident.resolution_comparison.scene_similarity_pct}%
                        </span>
                      )}
                    </div>
                    <p className="text-[#263746]">{incident.resolution_comparison.summary}</p>
                    <p className="text-[#5A6B7C] text-[11px]">{incident.resolution_comparison.scene_consistency_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Provenance Box */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#167C80]" />
                <h2 className="text-sm font-semibold text-[#263746]">Location Provenance</h2>
              </div>
              <div className="flex items-center gap-3">
                {incident.location.verified ? (
                  <span className="text-xs text-[#39866A] flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Field Verified
                  </span>
                ) : (
                  <span className="text-xs text-[#D99A32] flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" /> Unverified Pin
                  </span>
                )}
                <button
                  onClick={() => {
                    setPinCoords(
                      incident.location.latitude && incident.location.longitude
                        ? { lat: incident.location.latitude, lon: incident.location.longitude }
                        : { lat: 12.9716, lon: 77.5946 }
                    );
                    setPinModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#167C80] hover:underline"
                >
                  {incident.location.latitude ? 'Add / Adjust Pin' : 'Pin Missing Location'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#5A6B7C] uppercase text-[10px] font-semibold tracking-wider">Address</span>
                  <p className="text-[#263746] font-semibold text-sm mt-0.5">
                    {incident.location.readable_address || 'Location coordinates pending'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDE4EC]">
                  <div>
                    <span className="text-[#5A6B7C] uppercase text-[10px] font-semibold tracking-wider">Coordinates</span>
                    <p className="font-mono text-[#263746] mt-0.5">
                      {incident.location.latitude ? `${incident.location.latitude.toFixed(5)}° N` : 'N/A'}
                    </p>
                    <p className="font-mono text-[#263746]">
                      {incident.location.longitude ? `${incident.location.longitude.toFixed(5)}° E` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#5A6B7C] uppercase text-[10px] font-semibold tracking-wider">Accuracy</span>
                    <p className="text-[#263746] mt-0.5">
                      {incident.location.accuracy_m ? `±${Math.round(incident.location.accuracy_m)} metres` : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#DDE4EC]">
                  <span className="text-[#5A6B7C] uppercase text-[10px] font-semibold tracking-wider block mb-1">Provenance Source</span>
                  <ProvenanceTag source={incident.location.source} accuracy_m={incident.location.accuracy_m} />
                </div>
              </div>

              <div className="h-48 rounded-lg overflow-hidden">
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
                  <div className="h-full flex items-center justify-center bg-[#F6F8FA] border border-[#DDE4EC] text-[#5A6B7C] text-xs rounded-lg">
                    Location pending manual map pin
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Risk Breakdown, Evidence Confidence, CV Analysis */}
        <div className="space-y-5">
          {/* Risk Priority Breakdown */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#5A6B7C] font-semibold">Risk Priority Score</span>
              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="text-3xl font-bold text-[#263746] tabular-nums">{incident.risk_score.toFixed(1)}</span>
                <span className="text-[#5A6B7C] font-medium text-sm">/ 100</span>
                <PriorityBadge score={incident.risk_score} emergency={incident.risk_breakdown?.emergency_escalation} />
              </div>
            </div>

            {incident.risk_breakdown?.emergency_escalation && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC4C4C] flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Emergency Escalation:</strong> High severity on arterial commuter route or sensitive hospital/school zone.
                </span>
              </div>
            )}

            <div className="space-y-2.5 pt-2 border-t border-[#DDE4EC] text-xs">
              <span className="text-[11px] font-semibold text-[#5A6B7C] uppercase tracking-wider block">
                5-Factor Score Contribution
              </span>
              {[
                { label: 'Severity (35%)', score: incident.risk_breakdown?.severity_score, pts: incident.risk_breakdown?.severity_contribution, bar: 'bg-[#DC4C4C]' },
                { label: 'Road Exposure (25%)', score: incident.risk_breakdown?.exposure_score, pts: incident.risk_breakdown?.exposure_contribution, bar: 'bg-[#D99A32]' },
                { label: 'Context Criticality (20%)', score: incident.risk_breakdown?.criticality_score, pts: incident.risk_breakdown?.criticality_contribution, bar: 'bg-[#3979B7]' },
                { label: 'Hazard Likelihood (10%)', score: incident.risk_breakdown?.hazard_score, pts: incident.risk_breakdown?.hazard_contribution, bar: 'bg-[#167C80]' },
                { label: 'Time Unresolved (10%)', score: incident.risk_breakdown?.time_unresolved_score, pts: incident.risk_breakdown?.time_unresolved_contribution, bar: 'bg-[#39866A]' },
              ].map((row, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-[#263746]">
                    <span>{row.label}</span>
                    <span className="font-mono">+{(row.pts ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.score ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#DDE4EC] text-xs">
              <span className="text-[#5A6B7C] uppercase text-[10px] font-semibold tracking-wider">Recommendation</span>
              <p className="mt-1 font-semibold text-[#167C80]">{incident.priority_recommendation}</p>
              {incident.risk_breakdown?.explanation && (
                <p className="mt-1 text-[#5A6B7C] text-[11px]">{incident.risk_breakdown.explanation}</p>
              )}
            </div>
          </div>

          {/* Evidence Confidence (Independent from Risk) */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-[#5A6B7C] font-semibold">Evidence Confidence</span>
              <ConfidenceBadge confidence={incident.evidence_confidence} score={incident.evidence_confidence_score} />
            </div>
            <p className="text-xs text-[#263746]">
              Evaluated independently from physical hazard: {incident.observations?.length || 1} submission(s), source <code className="font-mono text-[#167C80]">{incident.location.source}</code>.
            </p>
            <p className="text-[11px] text-[#5A6B7C]">
              High-risk defects with lower evidence confidence are prioritized for urgent field validation rather than down-ranked.
            </p>
          </div>

          {/* Computer Vision Defect Analysis Card */}
          <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#3979B7]" />
                <h3 className="text-xs font-semibold text-[#263746] uppercase tracking-wider">CV Defect Assessment</h3>
              </div>
              <span className="text-[10px] text-[#3979B7] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                {primaryAssessment?.model_name || 'Vision-CV'}
              </span>
            </div>

            {primaryAssessment ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#5A6B7C]">Category:</span>
                  <span className="text-[#263746] capitalize font-semibold">{primaryAssessment.category.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7C]">Visible Severity:</span>
                  <span className="text-[#263746] capitalize font-semibold">{primaryAssessment.visible_severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7C]">Image Quality:</span>
                  <span className="text-[#263746] capitalize font-medium">{primaryAssessment.image_quality.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A6B7C]">Model Score:</span>
                  <span className="font-mono text-[#263746] font-semibold">{Math.round(primaryAssessment.confidence_score * 100)}%</span>
                </div>
                {visionMetrics.sharpness_variance !== undefined && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DDE4EC] text-[11px]">
                    <div className="bg-[#F6F8FA] p-2 rounded border border-[#DDE4EC]">
                      <span className="text-[#5A6B7C] block">Sharpness</span>
                      <strong className="text-[#263746] font-mono">{visionMetrics.sharpness_variance}</strong>
                    </div>
                    <div className="bg-[#F6F8FA] p-2 rounded border border-[#DDE4EC]">
                      <span className="text-[#5A6B7C] block">Anomaly Area</span>
                      <strong className="text-[#263746] font-mono">{visionMetrics.defect_area_pct ?? 0}%</strong>
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-[#DDE4EC]">
                  <span className="text-[#5A6B7C] block mb-1">Visual Analysis:</span>
                  <p className="text-[#263746] bg-[#F6F8FA] p-2.5 rounded border border-[#DDE4EC]">
                    {primaryAssessment.visual_evidence}
                  </p>
                </div>
                {primaryAssessment.uncertainties?.length > 0 && (
                  <div className="pt-1 text-[11px] text-[#9A6700]">
                    <strong>Uncertainties:</strong> {primaryAssessment.uncertainties.join('; ')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#5A6B7C]">Automated assessment pending.</p>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Candidate Alerts */}
      {incident.links && incident.links.some(l => l.relation_type === 'possible_duplicate_of') && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#D99A32]" />
            <h3 className="text-sm font-semibold text-[#9A6700]">Potential Duplicate Incident Correlation</h3>
          </div>
          <div className="space-y-2">
            {incident.links.filter(l => l.relation_type === 'possible_duplicate_of').map(l => (
              <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3.5 rounded-lg border border-amber-200 gap-3">
                <div className="text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#263746]">{l.linked_incident_number}</span>
                    <span className="text-[#5A6B7C]">Similarity: {Math.round(l.score * 100)}%</span>
                    <span className="uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-[#263746]">
                      {l.status}
                    </span>
                  </div>
                  <p className="text-[#5A6B7C] mt-1">{l.reason}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/incidents/${l.linked_incident_id}`)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] font-medium"
                  >
                    Compare Case
                  </button>
                  {['operator', 'admin'].includes(role) && l.status !== 'confirmed' && (
                    <button
                      onClick={async () => {
                        await api.updateIncidentLinkStatus(l.id, 'confirm', 'Operator confirmed spatial & visual duplicate');
                        loadIncident();
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white font-semibold"
                    >
                      Confirm Duplicate
                    </button>
                  )}
                  {['operator', 'admin'].includes(role) && l.status !== 'rejected' && (
                    <button
                      onClick={async () => {
                        await api.updateIncidentLinkStatus(l.id, 'reject', 'Distinct physical defect');
                        loadIncident();
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 text-[#DC4C4C] border border-red-200 font-medium"
                    >
                      Keep Separate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Timeline, Graph, Work Orders, Audit History Tabs */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="flex overflow-x-auto border-b border-[#DDE4EC] bg-[#F6F8FA] text-xs font-medium">
          {[
            { id: 'evidence', label: `Observations (${incident.observations.length})` },
            { id: 'graph', label: 'Evidence Graph' },
            { id: 'work_order', label: `Work Orders (${incident.work_orders.length})` },
            { id: 'audit', label: `Audit History (${incident.audit_events.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 sm:px-5 py-3 border-b-2 whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'border-[#167C80] text-[#167C80] font-semibold bg-white'
                  : 'border-transparent text-[#5A6B7C] hover:text-[#263746]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'evidence' && (
            <div className="space-y-3">
              {incident.observations.map((obs) => (
                <div key={obs.id} className="p-4 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] flex flex-col md:flex-row gap-4 justify-between">
                  <div className="flex items-start gap-3">
                    {obs.annotated_asset_url || obs.original_asset_url ? (
                      <img
                        src={obs.annotated_asset_url || obs.original_asset_url}
                        alt={obs.observation_number}
                        className="w-20 h-16 rounded object-cover border border-[#DDE4EC] flex-shrink-0 cursor-pointer"
                        onClick={() => setImageModalOpen(true)}
                      />
                    ) : null}
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#263746]">{obs.observation_number}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white border border-[#DDE4EC] text-[#5A6B7C]">
                          {obs.source_type.replace(/_/g, ' ')}
                        </span>
                        {obs.is_repair_evidence && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#39866A] font-semibold">
                            Repair Proof
                          </span>
                        )}
                      </div>
                      <p className="text-[#263746]">{obs.description || 'No description submitted.'}</p>
                      <div className="text-[11px] text-[#5A6B7C]">
                        Submitted by: {obs.submitted_by} &middot; {new Date(obs.submitted_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end justify-between text-xs">
                    {obs.locations[0] && (
                      <ProvenanceTag source={obs.locations[0].source} accuracy_m={obs.locations[0].accuracy_m} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'graph' && <EvidenceGraphViewer graphData={graphData} />}

          {activeTab === 'work_order' && (
            <div className="space-y-4">
              {incident.work_orders.length === 0 ? (
                <div className="text-center p-8 text-[#5A6B7C] text-xs">No work orders generated yet.</div>
              ) : (
                incident.work_orders.map((wo) => (
                  <div key={wo.id} className="p-4 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-[#167C80]" />
                        <span className="font-bold text-[#263746] text-sm">{wo.work_order_number}: {wo.title}</span>
                      </div>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-white text-[#3979B7] border border-[#DDE4EC] font-semibold">
                        {wo.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#5A6B7C]">
                      <div>Division: <strong className="text-[#263746]">{wo.assigned_team}</strong></div>
                      <div>Inspector: <strong className="text-[#263746]">{wo.assigned_inspector || 'Unassigned'}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audit' && <AuditTimeline events={incident.audit_events} />}
        </div>
      </div>

      {/* Inspection Modal */}
      <ImageCompareModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        incidentNumber={incident.incident_number}
        originalUrl={incident.original_image_url}
        annotatedUrl={incident.annotated_image_url}
        afterRepairUrl={incident.after_repair_image_url}
        resolutionComparison={incident.resolution_comparison}
        sha256={incident.sha256}
      />

      {/* Review Decision Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleReviewSubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#263746]">Record Review Decision — {incident.incident_number}</h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Decision</label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              >
                <option value="corroborate">Corroborate Incident</option>
                <option value="verify_field">Field Verified (Physical Check Confirmed)</option>
                <option value="approve">Approve for Maintenance Queue</option>
                <option value="request_evidence">Request Additional Evidence</option>
                <option value="reject">Reject Report (Invalid / False Positive)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Justification (Required)</label>
              <input
                type="text"
                required
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="e.g. Confirmed 10cm asphalt crater on main carriageway."
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Notes (Optional)</label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button type="button" onClick={() => setReviewModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]">
                Cancel
              </button>
              <button type="submit" disabled={submittingAction} className="px-4 py-2 rounded-lg bg-[#167C80] text-white text-xs font-semibold">
                {submittingAction ? 'Saving...' : 'Commit Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attach Repair Evidence Modal */}
      {repairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleRepairEvidenceSubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#263746]">Attach After-Repair Evidence — {incident.incident_number}</h3>
            <p className="text-xs text-[#5A6B7C]">
              Upload an after-repair photo. The system runs a before/after visual comparison and moves the case to pending resolution review.
            </p>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setRepairImage(e.target.files?.[0] || null)}
              className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2"
            />
            <textarea
              rows={2}
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="e.g. Hot mix asphalt compacted and perimeter sealed."
              className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button type="button" onClick={() => setRepairModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]">
                Cancel
              </button>
              <button type="submit" disabled={submittingAction || !repairImage} className="px-4 py-2 rounded-lg bg-[#167C80] text-white text-xs font-semibold">
                {submittingAction ? 'Uploading...' : 'Submit Repair Proof'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Verify / Reject Resolution Approval Modal */}
      {verifyResolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleVerifyResolutionSubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#263746]">Resolution Verification Sign-Off — {incident.incident_number}</h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Verification Decision</label>
              <select
                value={resolutionDecision}
                onChange={(e) => setResolutionDecision(e.target.value as any)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              >
                <option value="verify_and_close">Approve Repair &amp; Formally Close Incident</option>
                <option value="reject_repair">Reject Repair (Return to In Progress)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Audit Reason</label>
              <textarea
                rows={2}
                required
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button type="button" onClick={() => setVerifyResolutionModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]">
                Cancel
              </button>
              <button type="submit" disabled={submittingAction} className="px-4 py-2 rounded-lg bg-[#39866A] text-white text-xs font-semibold">
                {submittingAction ? 'Recording...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Update Location Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handlePinLocationSubmit} className="bg-white border border-[#DDE4EC] rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#263746]">Pin or Adjust Incident Location</h3>
            <p className="text-xs text-[#5A6B7C]">
              Tap on the map to add a verified pin or manual correction. Original photo EXIF observations remain preserved separately.
            </p>
            <div className="h-64 rounded-lg overflow-hidden">
              <MapComponent
                interactiveSelection={true}
                onSelectLocation={(lat, lon) => setPinCoords({ lat, lon })}
                selectedLocation={pinCoords}
                center={pinCoords ? [pinCoords.lat, pinCoords.lon] : [12.9716, 77.5946]}
                zoom={14}
                height="100%"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#5A6B7C]">
              <span className="font-mono">{pinCoords ? `${pinCoords.lat.toFixed(5)}, ${pinCoords.lon.toFixed(5)}` : 'Click map'}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPinModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746]">
                  Cancel
                </button>
                <button type="submit" disabled={submittingAction || !pinCoords} className="px-4 py-2 rounded-lg bg-[#167C80] text-white font-semibold">
                  {submittingAction ? 'Saving...' : 'Save Pin'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Generate Work Order Modal */}
      {woModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172B3A]/70 backdrop-blur-sm">
          <form onSubmit={handleCreateWorkOrder} className="bg-white border border-[#DDE4EC] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#263746]">Generate Maintenance Work Order</h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Work Order Title</label>
              <input
                type="text"
                required
                value={woTitle}
                onChange={(e) => setWoTitle(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Assigned Division</label>
              <input
                type="text"
                required
                value={woTeam}
                onChange={(e) => setWoTeam(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#263746]">Lead Inspector</label>
              <input
                type="text"
                value={woInspector}
                onChange={(e) => setWoInspector(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746] rounded-lg p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE4EC]">
              <button type="button" onClick={() => setWoModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]">
                Cancel
              </button>
              <button type="submit" disabled={submittingAction} className="px-4 py-2 rounded-lg bg-[#3979B7] text-white text-xs font-semibold">
                {submittingAction ? 'Creating...' : 'Create Work Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
