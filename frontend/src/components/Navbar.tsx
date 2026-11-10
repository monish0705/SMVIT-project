import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  UserCircle2, 
  Shield, 
  Bell, 
  AlertOctagon,
  ChevronDown
} from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    await switchDemoRole(newRole);
    navigate('/');
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between z-20 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
          <span>SYNTHETIC DEMO ENVIRONMENT — BENGALURU</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Instant Role Switcher for Evaluators */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Shield className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs text-slate-400 font-medium">Active Role:</span>
          <select
            value={role}
            onChange={handleRoleChange}
            aria-label="Active Role"
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="operator" className="bg-slate-900 text-slate-200">Operator (Priya Sharma)</option>
            <option value="field_inspector" className="bg-slate-900 text-slate-200">Field Inspector (Ramesh Babu)</option>
            <option value="admin" className="bg-slate-900 text-slate-200">Admin (Dr. Monish Kumar)</option>
            <option value="citizen" className="bg-slate-900 text-slate-200">Citizen (Sunita Rao)</option>
          </select>
        </div>

        {/* Quick Report Button */}
        <button
          onClick={() => navigate('/report')}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs px-3.5 py-2 rounded-lg font-semibold shadow-md shadow-brand-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Report</span>
        </button>

        {/* User Identity */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs text-slate-300">
          <UserCircle2 className="w-6 h-6 text-slate-400" />
          <div className="hidden md:block">
            <div className="font-medium text-slate-200 leading-tight">{user?.full_name || 'Guest Contributor'}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role || 'Citizen'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

