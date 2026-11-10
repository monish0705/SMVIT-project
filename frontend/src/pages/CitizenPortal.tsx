import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  HelpCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary, IncidentStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MapComponent } from '../components/MapComponent';

export const CitizenPortal: React.FC = () => {
  const navigate = useNavigate();
  const [recentReports, setRecentReports] = useState<IncidentSummary[]>([]);
  const [mapIncidents, setMapIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getIncidents({ limit: 8 }),
      api.getMapIncidents(),
      api.getStats()
    ])
      .then(([incs, mapPts, s]) => {
        setRecentReports(incs);
        setMapIncidents(mapPts);
        setStats(s);
      })
      .catch(err => console.error('Failed to load citizen portal:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Citizen Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-teal-900/60 via-slate-900 to-slate-900 border border-teal-700/40 p-6 md:p-8 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>CivicPulse Public Citizen Gateway — Bengaluru</span>
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Help Make Bengaluru Roads Safer with Verified Photo Evidence
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Report potholes and hazardous surface damage in seconds. GeoProof AI automatically extracts photo GPS and claimed timestamps to get your observation directly onto municipal repair schedules.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/report')}
              className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 transition flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Report a Pothole or Defect</span>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Explore Public Road Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Citizen Community Impact Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Verified Resolved</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats?.resolved_incidents || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Repaired & confirmed on site</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Active Maintenance</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {stats?.assigned_incidents || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Road crews dispatched</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Under Review</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {stats?.awaiting_verification || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Citizen reports being triaged</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Average Response</span>
          <div className="text-2xl font-bold text-brand-300 mt-1">
            48 hrs
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Arterial priority dispatch</span>
        </div>
      </div>

      {/* Recent Community Observations Feed */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Recent Public Road Observations</h3>
          </div>
          <span className="text-xs text-slate-400">Live Municipal Tracker</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading observations...</div>
          ) : recentReports.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No observations submitted yet.</div>
          ) : (
            recentReports.map(inc => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="p-4 hover:bg-slate-850/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-14 h-12 rounded object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
                      Photo
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{inc.incident_number}</span>
                      <span className="text-xs text-slate-400 capitalize">· {inc.category.replace(/_/g, ' ')}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{inc.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{inc.readable_address || 'Bengaluru'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs text-brand-400 flex items-center gap-1 font-semibold">
                    <span>Inspect Status</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Citizen Education & Workflow Explanation */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
        <h4 className="font-bold text-slate-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-400" />
          <span>How Your Report Moves to Resolution:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-400 pt-1">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
            <span className="font-bold text-teal-300 block">1. Intake & GeoProof</span>
            <p>Your photograph is watermarked with GPS coordinates and recorded with an immutable SHA-256 hash.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
            <span className="font-bold text-amber-300 block">2. Triage & Risk</span>
            <p>AI classifies defect severity and our 5-factor model prioritizes bus lanes and hospital routes.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
            <span className="font-bold text-indigo-300 block">3. Field Work Order</span>
            <p>Maintenance engineers receive an interactive checklist and dispatch repair crews.</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
            <span className="font-bold text-emerald-300 block">4. Verified Resolution</span>
            <p>Repairs require an after-photo and authorized supervisor review before closure.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
