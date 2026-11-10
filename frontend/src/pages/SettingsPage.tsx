import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Database,
  Sliders,
  Users,
  CheckCircle2,
  Info,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settingsStatus, setSettingsStatus] = useState<any | null>(null);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [weights, setWeights] = useState({
    severity: 0.35,
    exposure: 0.25,
    criticality: 0.20,
    hazard: 0.10,
    time_unresolved: 0.10
  });
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightMsg, setWeightMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const { role, switchDemoRole } = useAuth();

  useEffect(() => {
    Promise.all([api.getSettingsStatus(), api.getDemoUsers()])
      .then(([s, u]) => {
        setSettingsStatus(s);
        setDemoUsers(u);
        if (s?.risk_weights) {
          setWeights({
            severity: s.risk_weights.severity,
            exposure: s.risk_weights.exposure,
            criticality: s.risk_weights.criticality,
            hazard: s.risk_weights.hazard,
            time_unresolved: s.risk_weights.time_unresolved
          });
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, []);

  const weightSum = Number(
    (weights.severity + weights.exposure + weights.criticality + weights.hazard + weights.time_unresolved).toFixed(2)
  );

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Math.abs(weightSum - 1.0) > 0.02) {
      setWeightMsg({ type: 'err', text: `Weights must sum to 1.00 (currently ${weightSum.toFixed(2)}).` });
      return;
    }
    setSavingWeights(true);
    setWeightMsg(null);
    try {
      const res = await api.updateRiskWeights({ ...weights, recalculate_open: true });
      setWeightMsg({
        type: 'ok',
        text: `Updated risk weights and recalculated ${res.recalculated} open incident priority score(s).`
      });
    } catch (err: any) {
      setWeightMsg({ type: 'err', text: err.message || 'Failed to update risk weights.' });
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">System Settings &amp; Configuration</h1>
          <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
            Inspect active computer vision runtimes, database persistence, configurable risk weights, and role accounts.
          </p>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition self-start sm:self-auto"
          >
            <Users className="w-4 h-4" />
            <span>Manage Team Members</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Vision & Model Runtime */}
        <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#3979B7]" />
            <h2 className="text-sm font-semibold text-[#263746]">Road Damage Analysis Runtime</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
              <span className="text-[#5A6B7C]">Local Pixel Analyzer:</span>
              <span className="text-[#39866A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> CivicPulse-Vision-CV-1.0
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
              <span className="text-[#5A6B7C]">Gemini Visual Interpretation:</span>
              {settingsStatus?.gemini_api_configured ? (
                <span className="text-[#39866A] font-semibold">Enabled ({settingsStatus?.gemini_model})</span>
              ) : (
                <span className="text-[#D99A32] font-medium flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Not configured (CV + Heuristics active)
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5A6B7C] leading-relaxed">
              Every uploaded photograph runs local Pillow sharpness, exposure, and patch-contrast segmentation. Gemini optionally supplements visual interpretation without replacing human engineering approval.
            </p>
          </div>
        </div>

        {/* Card 2: Database & GIS Storage */}
        <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Database &amp; Spatial Layer</h2>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
              <span className="text-[#5A6B7C]">Database Engine:</span>
              <span className="font-semibold text-[#263746]">
                {settingsStatus?.database_backend || 'SQLite'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
              <span className="text-[#5A6B7C]">Spatial Distance Engine:</span>
              <span className="font-mono text-[#167C80]">Haversine Great-Circle</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC]">
              <span className="text-[#5A6B7C]">Reverse Geocoder:</span>
              <span className="text-[#263746]">OpenStreetMap Nominatim</span>
            </div>
          </div>
        </div>

        {/* Card 3: Configurable Risk Weights */}
        <form onSubmit={handleSaveWeights} className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 md:col-span-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#D99A32]" />
              <h2 className="text-sm font-semibold text-[#263746]">Configurable Risk Prioritization Weights</h2>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded font-mono border ${
              Math.abs(weightSum - 1.0) <= 0.02
                ? 'bg-emerald-50 text-[#39866A] border-emerald-200'
                : 'bg-red-50 text-[#DC4C4C] border-red-200'
            }`}>
              Sum: {weightSum.toFixed(2)} (Target: 1.00)
            </span>
          </div>

          {weightMsg && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              weightMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-[#39866A]'
                : 'bg-red-50 border-red-200 text-[#DC4C4C]'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{weightMsg.text}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {[
              { key: 'severity', label: 'Severity' },
              { key: 'exposure', label: 'Road Exposure' },
              { key: 'criticality', label: 'Criticality' },
              { key: 'hazard', label: 'Hazard' },
              { key: 'time_unresolved', label: 'Time Unresolved' }
            ].map((item) => (
              <div key={item.key} className="bg-[#F6F8FA] p-3 rounded-lg border border-[#DDE4EC] space-y-1.5">
                <label className="text-[#5A6B7C] uppercase text-[10px] font-semibold block">{item.label}</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  disabled={!['admin', 'operator'].includes(role)}
                  value={(weights as any)[item.key]}
                  onChange={(e) => setWeights({ ...weights, [item.key]: Number(e.target.value) })}
                  className="w-full bg-white border border-[#DDE4EC] rounded px-2.5 py-1.5 font-mono text-sm font-bold text-[#263746]"
                />
              </div>
            ))}
          </div>

          {['admin', 'operator'].includes(role) && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingWeights}
                className="px-4 py-2 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold transition"
              >
                {savingWeights ? 'Recalculating...' : 'Apply Weights & Recalculate Open Queue'}
              </button>
            </div>
          )}
        </form>

        {/* Card 4: Role Profiles */}
        <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 md:col-span-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Role-Based Access Profiles</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {demoUsers.slice(0, 8).map((u) => {
              const isActive = role === u.role;
              return (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    isActive ? 'bg-teal-50/70 border-[#167C80]' : 'bg-[#F6F8FA] border-[#DDE4EC]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#263746] capitalize">{u.role.replace(/_/g, ' ')}</span>
                      {isActive && (
                        <span className="text-[10px] uppercase font-bold text-[#167C80] bg-white border border-teal-200 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[#263746] font-medium truncate">{u.full_name}</p>
                    <p className="text-[11px] text-[#5A6B7C] font-mono truncate">{u.email}</p>
                  </div>

                  {['citizen', 'field_inspector', 'operator', 'admin'].includes(u.role) && (
                    <button
                      onClick={() => switchDemoRole(u.role as UserRole)}
                      disabled={isActive}
                      className={`mt-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-white text-[#5A6B7C] border border-[#DDE4EC] cursor-default'
                          : 'bg-[#167C80] hover:bg-[#116265] text-white'
                      }`}
                    >
                      {isActive ? 'Active View' : 'Switch Role'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
