import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Layers, 
  ListOrdered, 
  TrendingUp, 
  Wrench,
  Clock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { IncidentStats, IncidentSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfidenceBadge } from '../components/ConfidenceBadge';

export const OverviewDashboard: React.FC = () => {
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [topIncidents, setTopIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getIncidents({ limit: 6 })
    ]).then(([s, incs]) => {
      setStats(s);
      setTopIncidents(incs);
    }).catch(err => {
      console.error('Failed to load dashboard metrics:', err);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading operational intelligence metrics...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Open Incidents',
      val: stats?.open_incidents ?? 0,
      sub: `${stats?.total_incidents ?? 0} total logged`,
      color: 'text-white',
      bg: 'bg-slate-900 border-slate-800',
      icon: <Layers className="w-5 h-5 text-brand-400" />
    },
    {
      label: 'Critical Priority',
      val: stats?.critical_incidents ?? 0,
      sub: 'Score >= 75.0 (Elevated triage)',
      color: 'text-rose-400',
      bg: 'bg-rose-950/30 border-rose-900/50',
      icon: <Flame className="w-5 h-5 text-rose-400" />
    },
    {
      label: 'Awaiting Verification',
      val: stats?.awaiting_verification ?? 0,
      sub: 'Needs human review / location',
      color: 'text-amber-400',
      bg: 'bg-amber-950/20 border-amber-900/40',
      icon: <Clock className="w-5 h-5 text-amber-400" />
    },
    {
      label: 'In Field / Assigned',
      val: stats?.assigned_incidents ?? 0,
      sub: 'Active road work crews',
      color: 'text-indigo-400',
      bg: 'bg-indigo-950/20 border-indigo-900/40',
      icon: <Wrench className="w-5 h-5 text-indigo-400" />
    },
    {
      label: 'Resolution Review',
      val: stats?.resolution_pending_review ?? 0,
      sub: 'Repair claimed by contractor',
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/30 border-cyan-800/40',
      icon: <ShieldAlert className="w-5 h-5 text-cyan-400" />
    },
    {
      label: 'Verified Resolved',
      val: stats?.resolved_incidents ?? 0,
      sub: 'Formally closed with audit proof',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-900/40',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operations Intelligence Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure defect discovery, GeoProof verification, and risk-prioritized triage across Bengaluru.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/copilot')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/50 text-purple-300 border border-purple-800/50 text-xs font-semibold transition"
          >
            <span>Ask Operations Copilot</span>
          </button>
          <button
            onClick={() => navigate('/queue')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <ListOrdered className="w-4 h-4" />
            <span>View Full Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className={`p-4 rounded-xl border ${k.bg} flex flex-col justify-between transition hover:border-slate-700`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{k.label}</span>
              {k.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>Defects by Category</span>
          </h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.by_category).map(([cat, count]) => {
              const total = stats.total_incidents || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{cat.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span>Risk Priority Distribution</span>
          </h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.by_priority).map(([prio, count]) => {
              const total = stats.total_incidents || 1;
              const pct = Math.round((count / total) * 100);
              const colorClass = prio === 'High' ? 'bg-rose-500' : (prio === 'Medium' ? 'bg-amber-500' : 'bg-blue-500');
              return (
                <div key={prio} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{prio} Priority</span>
                    <span className="text-slate-400 font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${colorClass} rounded-full`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            Computed by deterministic 5-factor model: Severity (35%), Exposure (25%), Criticality (20%), Hazard (10%), Time (10%).
          </div>
        </div>

        {/* 7-Day Trend */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
            <span>7-Day Report Volume</span>
            <TrendingUp className="w-4 h-4 text-brand-400" />
          </h3>
          <div className="flex items-end justify-between h-36 gap-2 pt-4">
            {stats?.daily_trend.map((d, idx) => {
              const maxVal = Math.max(...(stats.daily_trend.map(t => t.reports) || [1]), 5);
              const barHeight = Math.max(12, Math.round((d.reports / maxVal) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] text-slate-400 font-mono">{d.reports}</span>
                  <div
                    className="w-full bg-brand-600/70 hover:bg-brand-500 rounded-t transition"
                    style={{ height: `${barHeight}%` }}
                  ></div>
                  <span className="text-[9px] text-slate-400 truncate">{d.date.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Urgent Priority Incidents List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              High-Risk Incidents Requiring Field Attention
            </h3>
          </div>
          <button
            onClick={() => navigate('/queue')}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <span>Full Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {topIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className="p-4 hover:bg-slate-850/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                {inc.annotated_image_url || inc.original_image_url ? (
                  <img
                    src={inc.annotated_image_url || inc.original_image_url}
                    alt={inc.incident_number}
                    className="w-16 h-14 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400 text-xs">
                    No Img
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">{inc.incident_number}</span>
                    <span className="text-xs text-slate-400 capitalize">· {inc.category.replace(/_/g, ' ')}</span>
                    <StatusBadge status={inc.current_status} size="sm" />
                  </div>
                  <h4 className="text-xs text-slate-300 mt-1 line-clamp-1">{inc.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {inc.readable_address || 'Bengaluru'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                <PriorityBadge score={inc.risk_score} size="sm" />
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

