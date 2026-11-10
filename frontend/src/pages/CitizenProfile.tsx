import React from 'react';
import {
  User,
  Download,
  CheckCircle2,
  Wifi,
  WifiOff,
  ShieldCheck,
  MapPin,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

export const CitizenProfile: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const { isOnline, canInstall, isInstalled, promptInstall, pendingDraftCount } = usePWA();

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746]">Contributor Profile &amp; App Setup</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Manage your active profile, mobile PWA installation, offline draft queue, and location privacy disclosures.
        </p>
      </div>

      {/* Account Summary */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 flex items-center gap-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#172B3A] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
          {(user?.full_name || 'SR').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#263746] truncate">{user?.full_name || 'Citizen Contributor'}</h2>
          <p className="text-xs text-[#5A6B7C] truncate">{user?.email || 'citizen@gmail.com'}</p>
          <span className="inline-block mt-1.5 text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-teal-50 text-[#167C80] border border-teal-200">
            Active Role: {role.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* PWA Install & Connectivity Card */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#167C80]" />
            <h3 className="text-sm font-semibold text-[#263746]">Mobile App &amp; Offline Support (PWA)</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded border ${
            isOnline ? 'bg-emerald-50 text-[#39866A] border-emerald-200' : 'bg-red-50 text-[#DC4C4C] border-red-200'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[#5A6B7C]">Install Status:</span>
            <span className="font-semibold text-[#263746]">
              {isInstalled ? 'Installed on Home Screen' : canInstall ? 'Ready to Install' : 'Browser Mode'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5A6B7C]">Offline Drafts Stored Locally:</span>
            <span className="font-semibold text-[#263746]">{pendingDraftCount} pending</span>
          </div>
        </div>

        {canInstall ? (
          <button
            onClick={promptInstall}
            className="w-full py-2.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Install CivicPulse to Home Screen</span>
          </button>
        ) : isInstalled ? (
          <div className="flex items-center gap-2 text-xs text-[#39866A] font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>CivicPulse is installed as a standalone app.</span>
          </div>
        ) : (
          <p className="text-xs text-[#5A6B7C]">
            Tip: On mobile Chrome or Safari, open your browser menu and select <strong>Add to Home Screen</strong> to install CivicPulse. Note: offline mode stores unfinished report drafts locally; live street tiles and server triage require an active internet connection.
          </p>
        )}
      </div>

      {/* Location Provenance Transparency */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-2.5 shadow-sm text-xs">
        <div className="flex items-center gap-2 font-semibold text-[#263746] text-sm">
          <MapPin className="w-4 h-4 text-[#167C80]" />
          <span>GeoProof Location Privacy Guarantee</span>
        </div>
        <p className="text-[#5A6B7C] leading-relaxed">
          CivicPulse never fabricates GPS coordinates and never overwrites original photo EXIF coordinates with current submission GPS. If an older gallery photograph lacks EXIF GPS, browser geolocation is recorded separately as <em>Uploader location at submission</em> only after your explicit consent.
        </p>
      </div>

      {/* Demo Role Switcher Helper */}
      <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#263746]">
          <ShieldCheck className="w-4 h-4 text-[#3979B7]" />
          <span>Switch Role View (Evaluation)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {(['citizen', 'field_inspector', 'operator', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => switchDemoRole(r)}
              className={`py-2 px-3 rounded-lg border font-medium capitalize transition ${
                role === r
                  ? 'bg-[#172B3A] text-white border-[#172B3A]'
                  : 'bg-[#F6F8FA] text-[#263746] border-[#DDE4EC] hover:bg-slate-200/60'
              }`}
            >
              {r.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

