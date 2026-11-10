import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  ListOrdered,
  Camera,
  CheckSquare,
  Wrench,
  Bot,
  Settings,
  Activity,
  Layers,
  HardHat,
  ShieldCheck,
  Users,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { role, user } = useAuth();

  // Role-Specific Navigation Definitions
  const getNavItems = () => {
    if (role === 'citizen') {
      return [
        { to: '/', label: 'Citizen Safety Gateway', icon: <Compass className="w-4 h-4 text-teal-400" /> },
        { to: '/report', label: 'Report Defect (GeoProof)', icon: <Camera className="w-4 h-4 text-brand-400" />, highlight: true },
        { to: '/map', label: 'Public Road Map', icon: <Map className="w-4 h-4 text-sky-400" /> },
      ];
    }

    if (role === 'field_inspector') {
      return [
        { to: '/', label: 'Inspector Field Hub', icon: <HardHat className="w-4 h-4 text-amber-400" /> },
        { to: '/work-orders', label: 'Assigned Work Orders', icon: <Wrench className="w-4 h-4 text-indigo-400" /> },
        { to: '/report', label: 'On-Site GeoProof Capture', icon: <Camera className="w-4 h-4 text-brand-400" />, highlight: true },
        { to: '/map', label: 'Inspection Map', icon: <Map className="w-4 h-4 text-sky-400" /> },
        { to: '/queue', label: 'All Incident Records', icon: <ListOrdered className="w-4 h-4" /> },
      ];
    }

    if (role === 'operator') {
      return [
        { to: '/reviews', label: 'Review & Triage Centre', icon: <CheckSquare className="w-4 h-4 text-brand-400" />, highlight: true },
        { to: '/', label: 'Operations Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { to: '/map', label: 'Live Incident Map', icon: <Map className="w-4 h-4" /> },
        { to: '/queue', label: 'Incident Queue', icon: <ListOrdered className="w-4 h-4" /> },
        { to: '/work-orders', label: 'Work Orders Dispatch', icon: <Wrench className="w-4 h-4" /> },
        { to: '/copilot', label: 'AI Operations Copilot', icon: <Bot className="w-4 h-4 text-purple-400" /> },
      ];
    }

    // Default: Admin
    return [
      { to: '/', label: 'Executive Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: '/users', label: 'Team Deployment (10+)', icon: <Users className="w-4 h-4 text-teal-400" />, highlight: true },
      { to: '/queue', label: 'Incident Queue', icon: <ListOrdered className="w-4 h-4" /> },
      { to: '/map', label: 'Infrastructure Map', icon: <Map className="w-4 h-4" /> },
      { to: '/reviews', label: 'Review Centre', icon: <CheckSquare className="w-4 h-4" /> },
      { to: '/work-orders', label: 'Work Orders', icon: <Wrench className="w-4 h-4" /> },
      { to: '/copilot', label: 'AI Operations Copilot', icon: <Bot className="w-4 h-4 text-purple-400" /> },
      { to: '/settings', label: 'Settings & Architecture', icon: <Settings className="w-4 h-4" /> },
    ];
  };

  const navItems = getNavItems();

  const getRoleHeader = () => {
    switch (role) {
      case 'citizen': return { label: 'CITIZEN PORTAL', color: 'text-teal-400 bg-teal-950/60 border-teal-800' };
      case 'field_inspector': return { label: 'INSPECTOR FIELD PORTAL', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
      case 'operator': return { label: 'OPERATIONS CONTROL ROOM', color: 'text-brand-300 bg-brand-950/60 border-brand-800' };
      default: return { label: 'ADMINISTRATOR CONSOLE', color: 'text-purple-300 bg-purple-950/60 border-purple-800' };
    }
  };

  const roleHeader = getRoleHeader();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Activity className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-white">CivicPulse</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
              AI
            </span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-wider">BENGALURU INFRA CELL</p>
        </div>
      </div>

      {/* Role Indicator Banner in Sidebar */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Active View:</div>
        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border inline-block ${roleHeader.color}`}>
          {roleHeader.label}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-500">
          Role-Assigned Workspace
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `
              flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition
              ${isActive
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 font-semibold'
                : item.highlight
                  ? 'bg-slate-800/80 text-brand-300 hover:bg-slate-800 border border-brand-700/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.highlight && (
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">
                ACTIVE
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logged in User Tag */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 truncate">{user?.full_name || 'Guest User'}</span>
          <span className="text-[10px] font-mono text-slate-400 uppercase">{role}</span>
        </div>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">
          {user?.organization || 'BBMP Municipal Infrastructure'}
        </p>
      </div>
    </aside>
  );
};
