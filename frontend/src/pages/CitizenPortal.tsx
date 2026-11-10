import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { usePWA } from '../context/PWAContext';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const { pendingDraftCount, isOnline, syncAllDrafts, syncing } = usePWA();
  const [recentReports, setRecentReports] = useState<IncidentSummary[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getIncidents({ limit: 6 }),
      api.getStats()
    ])
      .then(([incs, s]) => {
        setRecentReports(incs);
        setStats(s);
      })
      .catch(err => setError(err.message || 'Unable to load road reports right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Offline Draft Sync Prompt */}
      {pendingDraftCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-[#9A6700]">
            <AlertCircle className="w-4 h-4 text-[#D99A32] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">
                {pendingDraftCount} offline report draft{pendingDraftCount > 1 ? 's' : ''} saved on this device
              </strong>
              <span>
                {isOnline
                  ? 'Connection restored. Upload drafts so they enter municipal triage.'
                  : 'Will synchronize automatically once internet connectivity returns.'}
              </span>
            </div>
          </div>
          {isOnline && (
            <button
              onClick={() => syncAllDrafts()}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Drafts Now'}</span>
            </button>
          )}
        </div>
      )}

      {/* Civic Greeting & Direct Photo Action Card */}
      <div className="bg-white rounded-2xl border border-[#DDE4EC] p-5 sm:p-7 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#167C80]">
            Bengaluru Road Safety Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#263746] tracking-tight">
            {getGreeting()}. Help keep Bengaluru roads safe.
          </h1>
          <p className="text-sm text-[#5A6B7C] max-w-2xl">
            Submit photographs of potholes, road cracks, or sunken surface hazards. Each photo is checked for EXIF location metadata and queued for municipal verification.
          </p>
        </div>

        {/* Large Mobile-Friendly Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => navigate('/report?mode=camera')}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#167C80] hover:bg-[#116265] text-white text-left shadow-sm transition active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-base block">Take a Photo</span>
              <span className="text-xs text-teal-100 block mt-0.5">Use camera with live GPS capture</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/report?mode=gallery')}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] text-left transition active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-[#DDE4EC] flex items-center justify-center text-[#3979B7] flex-shrink-0">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-base block">Upload from Gallery</span>
              <span className="text-xs text-[#5A6B7C] block mt-0.5">Reads photo GPS &amp; timestamp if present</span>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => navigate('/map')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3979B7] hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>View Bengaluru Road Map</span>
          </button>
          <span className="text-[#DDE4EC]">|</span>
          <button
            onClick={() => navigate('/my-reports')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#167C80] hover:underline"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Track My Reports</span>
          </button>
        </div>
      </div>

      {/* Live Municipal Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Open Incidents</span>
          <div className="text-2xl font-bold text-[#263746] mt-1 tabular-nums">{stats?.open_incidents ?? 0}</div>
          <span className="text-[11px] text-[#5A6B7C] mt-0.5 block">Active citywide records</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Under Review</span>
          <div className="text-2xl font-bold text-[#D99A32] mt-1 tabular-nums">{stats?.awaiting_verification ?? 0}</div>
          <span className="text-[11px] text-[#5A6B7C] mt-0.5 block">Pending triage</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Crews Assigned</span>
          <div className="text-2xl font-bold text-[#3979B7] mt-1 tabular-nums">{stats?.assigned_incidents ?? 0}</div>
          <span className="text-[11px] text-[#5A6B7C] mt-0.5 block">Maintenance active</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Verified Resolved</span>
          <div className="text-2xl font-bold text-[#39866A] mt-1 tabular-nums">{stats?.resolved_incidents ?? 0}</div>
          <span className="text-[11px] text-[#5A6B7C] mt-0.5 block">Closed after audit</span>
        </div>
      </div>

      {/* Nearby / Recent Reported Issues */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Nearby &amp; Recent Reported Issues</h2>
          </div>
          <button
            onClick={() => navigate('/map')}
            className="text-xs font-semibold text-[#167C80] hover:underline"
          >
            Open Map
          </button>
        </div>

        {error && (
          <div className="p-4 text-xs text-[#DC4C4C] bg-red-50 border-b border-red-100">{error}</div>
        )}

        <div className="divide-y divide-[#DDE4EC]">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">Loading recent observations...</div>
          ) : recentReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">No road issues reported yet.</div>
          ) : (
            recentReports.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="p-4 hover:bg-[#F6F8FA] transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-14 h-14 rounded-lg object-cover bg-slate-100 border border-[#DDE4EC] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-[#DDE4EC] flex items-center justify-center text-[11px] text-[#5A6B7C] flex-shrink-0">
                      No Img
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                    </div>
                    <p className="text-xs font-medium text-[#263746] mt-1 truncate">{inc.title}</p>
                    <p className="text-[11px] text-[#5A6B7C] mt-0.5 truncate">
                      {inc.readable_address || 'Bengaluru'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#5A6B7C] flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Clear Process Guide */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#263746] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#167C80]" />
          <span>How CivicPulse Processes Citizen Evidence</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
            <span className="font-semibold text-[#167C80] block mb-1">1. Evidence Intake</span>
            <p className="text-[#5A6B7C]">Original bytes are hashed with SHA-256 and EXIF metadata is extracted separately from uploader GPS.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
            <span className="font-semibold text-[#3979B7] block mb-1">2. Defect &amp; Duplicate Check</span>
            <p className="text-[#5A6B7C]">Computer vision assesses image quality and checks nearby records to consolidate duplicate reports.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
            <span className="font-semibold text-[#D99A32] block mb-1">3. Field Inspection</span>
            <p className="text-[#5A6B7C]">Ward inspectors validate physical dimensions and issue maintenance work orders.</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
            <span className="font-semibold text-[#39866A] block mb-1">4. Verified Closure</span>
            <p className="text-[#5A6B7C]">After-repair photos are compared against the initial defect and require supervisor approval.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
