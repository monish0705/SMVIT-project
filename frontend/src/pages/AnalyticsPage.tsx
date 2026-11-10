import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Flame, Clock, MapPin, ShieldCheck, MessageSquareText, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { AnalyticsResponse } from '../types';
import { MapComponent } from '../components/MapComponent';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [mapIncidents, setMapIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getMapIncidents()])
      .then(([a, m]) => {
        setAnalytics(a);
        setMapIncidents(m);
      })
      .catch(err => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5A6B7C] text-xs gap-2">
        <div className="w-5 h-5 border-2 border-[#167C80] border-t-transparent rounded-full animate-spin" />
        <span>Computing geospatial hotspot clusters and operational SLA analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#263746]">Hotspot &amp; Operations Analytics</h1>
          <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
            Identify recurring infrastructure corridors, location provenance quality, and division resolution efficiency.
          </p>
        </div>

        <button
          onClick={() => navigate('/copilot')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition self-start sm:self-auto"
        >
          <MessageSquareText className="w-4 h-4" />
          <span>Open Operations Assistant</span>
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Recurring Hotspot Corridors</span>
          <div className="text-2xl font-bold text-[#DC4C4C] mt-1 tabular-nums">{analytics.recurring_clusters.length}</div>
          <span className="text-[11px] text-[#5A6B7C]">450m radius clusters (&ge;2 incidents)</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Critical SLA Breaches (&gt;48h)</span>
          <div className="text-2xl font-bold text-[#D99A32] mt-1 tabular-nums">{analytics.sla_breaches_48h_critical}</div>
          <span className="text-[11px] text-[#5A6B7C]">Open risk &ge; 75 over 48 hours</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Avg Resolution Time</span>
          <div className="text-2xl font-bold text-[#39866A] mt-1 tabular-nums">
            {analytics.avg_resolution_hours ? `${analytics.avg_resolution_hours}h` : 'N/A'}
          </div>
          <span className="text-[11px] text-[#5A6B7C]">Mean time to verified closure</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#DDE4EC]">
          <span className="text-xs text-[#5A6B7C] font-medium">Geolocated Coverage</span>
          <div className="text-2xl font-bold text-[#3979B7] mt-1 tabular-nums">
            {analytics.geolocated_incidents}/{analytics.total_incidents}
          </div>
          <span className="text-[11px] text-[#5A6B7C]">Incidents with verified/pinned GPS</span>
        </div>
      </div>

      {/* Hotspot Map + Corridor Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-[#DDE4EC] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#263746] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#DC4C4C]" />
              <span>Recurring Road Defect Hotspot Clusters</span>
            </h2>
            <span className="text-xs text-[#5A6B7C]">420m spatial grouping</span>
          </div>
          <div className="h-[360px]">
            <MapComponent
              incidents={mapIncidents}
              hotspots={analytics.recurring_clusters}
              zoom={12}
              height="100%"
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DDE4EC] shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA]">
            <h2 className="text-sm font-semibold text-[#263746] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#167C80]" />
              <span>Top Recurring Corridors</span>
            </h2>
          </div>
          <div className="divide-y divide-[#DDE4EC] flex-1 overflow-y-auto max-h-[380px]">
            {analytics.all_corridors.map((c) => (
              <div key={c.cluster_id} className="p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#263746]">{c.cluster_id} &middot; {c.incident_count} incident(s)</span>
                  <span className={`px-2 py-0.5 rounded font-semibold ${
                    c.avg_risk_score >= 75 ? 'bg-red-50 text-[#DC4C4C]' : 'bg-blue-50 text-[#3979B7]'
                  }`}>
                    Avg Risk {c.avg_risk_score}
                  </span>
                </div>
                <p className="text-[#5A6B7C] line-clamp-1">{c.corridor_label}</p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {c.incident_numbers.map((num) => (
                    <button
                      key={num}
                      onClick={() => navigate(`/incidents/${num}`)}
                      className="px-2 py-0.5 rounded bg-[#F6F8FA] hover:bg-teal-50 text-[#167C80] border border-[#DDE4EC] font-mono text-[11px]"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Division Workload & Provenance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#3979B7]" />
            <h2 className="text-sm font-semibold text-[#263746]">Division Workload Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FA] text-[#5A6B7C] text-[10px] uppercase border-b border-[#DDE4EC]">
                <tr>
                  <th className="px-4 py-2.5">Division / Team</th>
                  <th className="px-4 py-2.5">Open</th>
                  <th className="px-4 py-2.5">Resolved</th>
                  <th className="px-4 py-2.5">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE4EC]">
                {analytics.divisions.map((d) => (
                  <tr key={d.team}>
                    <td className="px-4 py-2.5 font-medium text-[#263746]">{d.team}</td>
                    <td className="px-4 py-2.5 font-mono text-[#D99A32] font-semibold">{d.open}</td>
                    <td className="px-4 py-2.5 font-mono text-[#39866A] font-semibold">{d.resolved}</td>
                    <td className="px-4 py-2.5 font-mono text-[#263746]">{d.avg_risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Location Provenance Reliability</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(analytics.provenance_breakdown).map(([src, cnt]) => {
              const pct = Math.round((cnt / Math.max(1, analytics.total_incidents)) * 100);
              return (
                <div key={src} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#263746] capitalize font-medium">{src.replace(/_/g, ' ')}</span>
                    <span className="text-[#5A6B7C] font-mono">{cnt} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#3979B7] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

