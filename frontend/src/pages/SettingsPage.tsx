import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Cpu, 
  Database, 
  MapPin, 
  Shield, 
  Sliders, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const [settingsStatus, setSettingsStatus] = useState<any | null>(null);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, switchDemoRole } = useAuth();

  useEffect(() => {
    Promise.all([
      api.getSettingsStatus(),
      api.getDemoUsers()
    ])
      .then(([s, u]) => {
        setSettingsStatus(s);
        setDemoUsers(u);
      })
      .catch(err => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Architecture Diagnostics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Inspect operational AI model runtimes, risk formula weights, storage partitions, and testing role profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: AI Model Runtime */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">AI Vision & Defect Triage Engine</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-850">
              <span className="text-slate-400">Gemini API Status:</span>
              {settingsStatus?.gemini_api_configured ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured & Active
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Deterministic Heuristic Fallback
                </span>
              )}
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-850">
              <span className="text-slate-400">Default Runtime Model:</span>
              <span className="font-mono text-purple-300 font-semibold">
                {settingsStatus?.gemini_model || 'gemini-3.8-flash'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              CivicPulse AI uses structured JSON extraction with human-in-the-loop validation.
              AI output proposes candidate defect categories and visual severity clues, but never replaces on-site physical engineering authority.
            </p>
          </div>
        </div>

        {/* Card 2: Database & GIS Storage */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Database & GIS Storage Layer</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-850">
              <span className="text-slate-400">Active Storage Backend:</span>
              <span className="font-semibold text-slate-200">
                {settingsStatus?.database_backend || 'SQLite (Development Fallback)'}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-850">
              <span className="text-slate-400">Spatial Calculation Engine:</span>
              <span className="font-mono text-teal-300">
                Haversine Great-Circle / PostGIS Adapter
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-850">
              <span className="text-slate-400">Reverse Geocoder Provider:</span>
              <span className="text-slate-200">OpenStreetMap Nominatim</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Photographic media is retained in immutable partition storage with SHA-256 hashes computed at intake.
            </p>
          </div>
        </div>

        {/* Card 3: Priority Calculation Weights */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Prioritization Formula Weights (Version 1.0)</h3>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded font-mono">
              Normalized 0–100 Scale
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 uppercase text-[10px] block font-semibold">Severity</span>
              <span className="text-lg font-bold text-rose-400">35%</span>
              <span className="text-[10px] text-slate-400 block mt-1">Weight 0.35</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 uppercase text-[10px] block font-semibold">Exposure</span>
              <span className="text-lg font-bold text-amber-400">25%</span>
              <span className="text-[10px] text-slate-400 block mt-1">Weight 0.25</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 uppercase text-[10px] block font-semibold">Criticality</span>
              <span className="text-lg font-bold text-purple-400">20%</span>
              <span className="text-[10px] text-slate-400 block mt-1">Weight 0.20</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 uppercase text-[10px] block font-semibold">Hazard Likelihood</span>
              <span className="text-lg font-bold text-blue-400">10%</span>
              <span className="text-[10px] text-slate-400 block mt-1">Weight 0.10</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 uppercase text-[10px] block font-semibold">Time Unresolved</span>
              <span className="text-lg font-bold text-teal-400">10%</span>
              <span className="text-[10px] text-slate-400 block mt-1">Weight 0.10</span>
            </div>
          </div>
        </div>

        {/* Card 4: Demo Role Management */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 md:col-span-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Role-Based Access Control & Evaluator Profiles</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {demoUsers.map((u) => {
              const isActive = role === u.role;
              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    isActive ? 'bg-brand-950/50 border-brand-500' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 capitalize">{u.role.replace(/_/g, ' ')}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-bold text-brand-400 bg-brand-500/20 px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 font-medium">{u.full_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                  </div>

                  <button
                    onClick={() => switchDemoRole(u.role as UserRole)}
                    disabled={isActive}
                    className={`mt-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive 
                        ? 'bg-slate-800 text-slate-500 cursor-default' 
                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                    }`}
                  >
                    {isActive ? 'Current Active Role' : 'Switch to this Role'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

