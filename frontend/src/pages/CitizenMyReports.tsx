import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  RefreshCw,
  Trash2,
  WifiOff,
  ArrowRight,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { IncidentSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { deleteOfflineDraft, getRecordedSubmittedIncidentNumbers, syncSingleDraft } from '../services/offlineDrafts';

export const CitizenMyReports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { drafts, isOnline, refreshDrafts, syncAllDrafts, syncing } = usePWA();

  const [reports, setReports] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const recordedNums = getRecordedSubmittedIncidentNumbers();
      const authorName = user?.full_name;
      const [byAuthor, recent] = await Promise.all([
        authorName ? api.getIncidents({ submitted_by: authorName, limit: 50 }) : Promise.resolve([]),
        api.getIncidents({ limit: 50 })
      ]);

      const mergedMap: Record<string, IncidentSummary> = {};
      for (const r of byAuthor) mergedMap[r.id] = r;
      for (const r of recent) {
        if (recordedNums.includes(r.incident_number)) {
          mergedMap[r.id] = r;
        }
      }
      setReports(Object.values(mergedMap).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {
      // Keep UI graceful if offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user?.full_name]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupId.trim().toUpperCase();
    if (!cleaned) return;
    setLookupError(null);
    try {
      const inc = await api.getIncidentDetail(cleaned);
      navigate(`/incidents/${inc.id}`);
    } catch {
      setLookupError(`No incident found matching reference "${cleaned}".`);
    }
  };

  const handleSyncOne = async (draftId: string) => {
    const target = drafts.find((d) => d.id === draftId);
    if (!target) return;
    try {
      const res = await syncSingleDraft(target);
      await refreshDrafts();
      setSyncMessage(`Synced draft as ${res.incident_number || res.report_number}.`);
      loadReports();
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteOfflineDraft(draftId);
    await refreshDrafts();
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746]">My Reports &amp; Offline Drafts</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Track reports submitted from your account or device, look up any reference number, and upload pending offline drafts.
        </p>
      </div>

      {/* Reference Number Quick Lookup */}
      <form onSubmit={handleLookup} className="bg-white rounded-xl border border-[#DDE4EC] p-4 space-y-2 shadow-sm">
        <label className="text-xs font-semibold text-[#263746] block">Look Up Report by Incident Reference #</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5A6B7C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="e.g. INF-1001 or INF-1021"
              className="w-full bg-[#F6F8FA] border border-[#DDE4EC] rounded-lg pl-9 pr-3 py-2 text-xs text-[#263746] focus:outline-none focus:border-[#167C80]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
          >
            Track
          </button>
        </div>
        {lookupError && <p className="text-xs text-[#DC4C4C]">{lookupError}</p>}
      </form>

      {syncMessage && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-[#167C80] font-medium">
          {syncMessage}
        </div>
      )}

      {/* Offline Drafts Queue */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex flex-wrap items-center justify-between gap-2 bg-[#F6F8FA]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D99A32]" />
            <h2 className="text-sm font-semibold text-[#263746]">
              Pending Offline Drafts ({drafts.length})
            </h2>
          </div>
          {drafts.length > 0 && (
            <button
              onClick={async () => {
                const res = await syncAllDrafts();
                setSyncMessage(`Synced ${res.synced} draft(s)${res.failed ? `, ${res.failed} failed` : ''}.`);
                loadReports();
              }}
              disabled={!isOnline || syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#167C80] disabled:opacity-50 text-white text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{isOnline ? 'Sync All' : 'Waiting for Connection'}</span>
            </button>
          )}
        </div>

        {drafts.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#5A6B7C]">
            No offline drafts waiting for upload.
          </div>
        ) : (
          <div className="divide-y divide-[#DDE4EC]">
            {drafts.map((d) => (
              <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img
                    src={d.imageDataUrl}
                    alt={d.fileName}
                    className="w-16 h-14 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#263746]">{d.fileName}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-[#9A6700] border border-amber-200 text-[10px] font-semibold">
                        Offline Draft
                      </span>
                    </div>
                    <p className="text-[#5A6B7C] line-clamp-1">{d.description || 'No description added'}</p>
                    <p className="text-[11px] text-[#5A6B7C]">
                      {d.addressLabel || (d.latitude ? `${d.latitude.toFixed(4)}, ${d.longitude?.toFixed(4)}` : 'Location pending')} &middot; Saved {new Date(d.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleSyncOne(d.id)}
                    disabled={!isOnline}
                    className="px-3 py-1.5 rounded-lg bg-[#167C80] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    {!isOnline && <WifiOff className="w-3 h-3" />}
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={() => handleDeleteDraft(d.id)}
                    aria-label="Delete draft"
                    className="p-1.5 rounded-lg bg-red-50 text-[#DC4C4C] border border-red-200 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submitted Reports History */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Submitted Reports ({reports.length})</h2>
          </div>
          <button
            onClick={() => navigate('/report')}
            className="text-xs font-semibold text-[#167C80] hover:underline"
          >
            + New Report
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#5A6B7C]">Loading your submissions...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-[#5A6B7C]">No reports submitted from this profile on this device yet.</p>
            <button
              onClick={() => navigate('/report')}
              className="px-4 py-2 rounded-lg bg-[#167C80] text-white text-xs font-semibold"
            >
              Submit Your First Report
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#DDE4EC]">
            {reports.map((inc) => (
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
                      className="w-14 h-12 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                    </div>
                    <p className="text-xs text-[#263746] mt-0.5 truncate">{inc.title}</p>
                    <p className="text-[11px] text-[#5A6B7C] truncate">
                      {inc.readable_address || 'Bengaluru'} &middot; {new Date(inc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#5A6B7C] flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

