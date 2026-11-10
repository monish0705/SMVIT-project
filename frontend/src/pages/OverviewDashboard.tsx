import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertOctagon,
  Layers,
  ListOrdered,
  TrendingUp,
  Wrench,
  Clock,
  ArrowRight,
  ShieldAlert,
  MessageSquareText
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
    ])
      .then(([s, incs]) => {
        setStats(s);
        setTopIncidents(incs);
      })
      .catch(err => console.error('Failed to load dashboard metrics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#5A6B7C] text-xs gap-2">
        <div className="w-5 h-5 border-2 border-[#167C80] border-t-transparent rounded-full animate-spin" />
        <span>Loading operational dashboard metrics...</span>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Open Incidents',
      val: stats?.open_incidents ?? 0,
      sub: `${stats?.total_incidents ?? 0} total logged`,
      color: 'text-[#263746]',
      icon: <Layers className="w-5 h-5 text-[#167C80]" />
    },
    {
      label: 'Critical Risk',
      val: stats?.critical_incidents ?? 0,
      sub: 'Score >= 75.0',
      color: 'text-[#DC4C4C]',
      icon: <AlertOctagon className="w-5 h-5 text-[#DC4C4C]" />
    },
    {
      label: 'Awaiting Triage',
      val: stats?.awaiting_verification ?? 0,
      sub: 'Needs operator verification',
      color: 'text-[#D99A32]',
      icon: <Clock className="w-5 h-5 text-[#D99A32]" />
    },
    {
      label: 'Crews Assigned',
      val: stats?.assigned_incidents ?? 0,
      sub: 'Active road maintenance',
      color: 'text-[#3979B7]',
      icon: <Wrench className="w-5 h-5 text-[#3979B7]" />
    },
    {
      label: 'Resolution Review',
      val: stats?.resolution_pending_review ?? 0,
      sub: 'Repair sign-off pending',
      color: 'text-[#167C80]',
      icon: <ShieldAlert className="w-5 h-5 text-[#167C80]" />
    },
    {
      label: 'Verified Closed',
      val: stats?.resolved_incidents ?? 0,
      sub: 'Confirmed with audit trail',
      color: 'text-[#39866A]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#39866A]" />
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Operations Overview</h1>
          <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
            Road defect triage, evidence verification, risk ranking, and repair closure across Bengaluru.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/copilot')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F6F8FA] text-[#3979B7] border border-[#DDE4EC] text-xs font-semibold transition"
          >
            <MessageSquareText className="w-4 h-4" />
            <span>Query Operations Assistant</span>
          </button>
          <button
            onClick={() => navigate('/queue')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
          >
            <ListOrdered className="w-4 h-4" />
            <span>View Full Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[#DDE4EC] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#5A6B7C]">{k.label}</span>
              {k.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.val}</div>
              <div className="text-[11px] text-[#5A6B7C] mt-0.5 truncate">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown & Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-[#DDE4EC] shadow-sm">
          <h3 className="text-sm font-semibold text-[#263746] mb-4">Defects by Category</h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.by_category).map(([cat, count]) => {
              const total = stats.total_incidents || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#263746] capitalize font-medium">{cat.replace(/_/g, ' ')}</span>
                    <span className="text-[#5A6B7C] font-mono tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-[#167C80] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white p-5 rounded-xl border border-[#DDE4EC] shadow-sm">
          <h3 className="text-sm font-semibold text-[#263746] mb-4">Risk Priority Distribution</h3>
          <div className="space-y-3">
            {stats && Object.entries(stats.by_priority).map(([prio, count]) => {
              const total = stats.total_incidents || 1;
              const pct = Math.round((count / total) * 100);
              const colorClass = prio === 'High' ? 'bg-[#DC4C4C]' : prio === 'Medium' ? 'bg-[#D99A32]' : 'bg-[#3979B7]';
              return (
                <div key={prio} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#263746] font-medium">{prio} Priority</span>
                    <span className="text-[#5A6B7C] font-mono tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-[11px] text-[#5A6B7C]">
            Transparent 5-factor model: Severity (35%), Exposure (25%), Criticality (20%), Hazard (10%), Time Unresolved (10%).
          </div>
        </div>

        {/* 7-Day Volume */}
        <div className="bg-white p-5 rounded-xl border border-[#DDE4EC] shadow-sm">
          <h3 className="text-sm font-semibold text-[#263746] mb-4 flex items-center justify-between">
            <span>7-Day Report Volume</span>
            <TrendingUp className="w-4 h-4 text-[#167C80]" />
          </h3>
          <div className="flex items-end justify-between h-36 gap-2 pt-4">
            {stats?.daily_trend.map((d, idx) => {
              const maxVal = Math.max(...(stats.daily_trend.map(t => t.reports) || [1]), 5);
              const barHeight = Math.max(10, Math.round((d.reports / maxVal) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] text-[#5A6B7C] font-mono tabular-nums">{d.reports}</span>
                  <div
                    className="w-full bg-[#3979B7]/80 hover:bg-[#167C80] rounded-t transition"
                    style={{ height: `${barHeight}%` }}
                  />
                  <span className="text-[10px] text-[#5A6B7C] truncate">{d.date.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High-Risk Queue */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between bg-[#F6F8FA]">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-[#DC4C4C]" />
            <h3 className="text-sm font-semibold text-[#263746]">High-Priority Incidents Requiring Attention</h3>
          </div>
          <button
            onClick={() => navigate('/queue')}
            className="text-xs font-semibold text-[#167C80] hover:underline flex items-center gap-1"
          >
            <span>Open Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#DDE4EC]">
          {topIncidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className="p-4 hover:bg-[#F6F8FA] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                {inc.annotated_image_url || inc.original_image_url ? (
                  <img
                    src={inc.annotated_image_url || inc.original_image_url}
                    alt={inc.incident_number}
                    className="w-16 h-14 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-14 rounded-lg bg-slate-100 border border-[#DDE4EC] flex items-center justify-center flex-shrink-0 text-[#5A6B7C] text-xs">
                    No Img
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                    <span className="text-xs text-[#5A6B7C] capitalize">&middot; {inc.category.replace(/_/g, ' ')}</span>
                    <StatusBadge status={inc.current_status} size="sm" />
                  </div>
                  <h4 className="text-xs font-medium text-[#263746] mt-1 line-clamp-1">{inc.title}</h4>
                  <p className="text-[11px] text-[#5A6B7C] mt-0.5 truncate">{inc.readable_address || 'Bengaluru'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                <ConfidenceBadge confidence={inc.evidence_confidence} size="sm" />
                <PriorityBadge score={inc.risk_score} size="sm" />
                <ArrowRight className="w-4 h-4 text-[#5A6B7C]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
