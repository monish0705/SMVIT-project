import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Shield,
  Menu,
  WifiOff,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { UserRole } from '../types';

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, role, switchDemoRole } = useAuth();
  const { isOnline, pendingDraftCount, canInstall, promptInstall, syncAllDrafts, syncing } = usePWA();
  const navigate = useNavigate();

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    await switchDemoRole(newRole);
    navigate('/');
  };

  return (
    <header className="h-14 sm:h-16 bg-[#172B3A] lg:bg-white border-b border-white/10 lg:border-[#DDE4EC] px-3 sm:px-6 flex items-center justify-between gap-2 z-20 flex-shrink-0">
      {/* Left: Mobile Menu / Brand + Environment Notice */}
      <div className="flex items-center gap-2.5 min-w-0">
        {['operator', 'admin'].includes(role) && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 lg:hidden">
          <img src="/icon-192.svg" alt="CivicPulse" className="w-7 h-7 rounded-md" />
          <span className="font-bold text-sm text-white tracking-tight">CivicPulse</span>
        </div>

        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-[#9A6700] border border-amber-200 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-[#D99A32]" />
          <span>Bengaluru Road Operations (Demo Dataset Included)</span>
        </span>
      </div>

      {/* Right: Offline / Sync Badge, Install PWA, Role Switcher, Report Action */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline / Draft Sync Status */}
        {!isOnline && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-[#DC4C4C] border border-red-200 text-[11px] font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}

        {pendingDraftCount > 0 && (
          <button
            onClick={() => (isOnline ? syncAllDrafts() : navigate('/my-reports'))}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-[#9A6700] border border-amber-200 text-[11px] font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{pendingDraftCount} Draft{pendingDraftCount > 1 ? 's' : ''}</span>
          </button>
        )}

        {canInstall && (
          <button
            onClick={promptInstall}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F6F8FA] hover:bg-slate-200/60 text-[#263746] border border-[#DDE4EC] text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-[#167C80]" />
            <span>Install App</span>
          </button>
        )}

        {/* Active Role Switcher */}
        <div className="flex items-center gap-1.5 bg-white/10 lg:bg-[#F6F8FA] px-2.5 py-1.5 rounded-lg border border-white/20 lg:border-[#DDE4EC]">
          <Shield className="w-3.5 h-3.5 text-teal-300 lg:text-[#167C80] flex-shrink-0" />
          <span className="hidden md:inline text-xs text-[#5A6B7C] font-medium">Role:</span>
          <select
            value={role}
            onChange={handleRoleChange}
            aria-label="Active Role"
            className="bg-transparent text-xs font-semibold text-white lg:text-[#263746] focus:outline-none cursor-pointer max-w-[115px] sm:max-w-none"
          >
            <option value="operator" className="bg-white text-[#263746]">Operator</option>
            <option value="field_inspector" className="bg-white text-[#263746]">Field Inspector</option>
            <option value="admin" className="bg-white text-[#263746]">Administrator</option>
            <option value="citizen" className="bg-white text-[#263746]">Citizen</option>
          </select>
        </div>

        {/* Desktop Quick Report Button */}
        <button
          onClick={() => navigate('/report')}
          className="hidden sm:flex items-center gap-1.5 bg-[#167C80] hover:bg-[#116265] text-white text-xs px-3.5 py-2 rounded-lg font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report Issue</span>
        </button>

        {/* User Avatar Pill (Desktop) */}
        <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-[#DDE4EC] text-xs">
          <div className="w-7 h-7 rounded-full bg-[#172B3A] text-white flex items-center justify-center font-bold text-[11px]">
            {(user?.full_name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[#263746]">{user?.full_name || 'Guest'}</div>
            <div className="text-[10px] text-[#5A6B7C] capitalize">{user?.role?.replace(/_/g, ' ') || 'Citizen'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
