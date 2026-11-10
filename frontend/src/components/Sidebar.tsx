import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  ListOrdered,
  Camera,
  CheckSquare,
  Wrench,
  BarChart3,
  Settings,
  HardHat,
  Users,
  Home,
  FileText,
  User,
  History,
  ClipboardCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { role, user } = useAuth();

  const getNavItems = () => {
    if (role === 'citizen') {
      return [
        { to: '/', label: 'Home', icon: <Home className="w-4 h-4" /> },
        { to: '/report', label: 'Report Issue', icon: <Camera className="w-4 h-4" /> },
        { to: '/map', label: 'Map', icon: <Map className="w-4 h-4" /> },
        { to: '/my-reports', label: 'My Reports', icon: <FileText className="w-4 h-4" /> },
        { to: '/profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
      ];
    }

    if (role === 'field_inspector') {
      return [
        { to: '/', label: 'Tasks', icon: <ClipboardCheck className="w-4 h-4" /> },
        { to: '/map', label: 'Map', icon: <Map className="w-4 h-4" /> },
        { to: '/work-orders', label: 'Inspections', icon: <Wrench className="w-4 h-4" /> },
        { to: '/history', label: 'History', icon: <History className="w-4 h-4" /> },
        { to: '/report', label: 'Field Capture', icon: <Camera className="w-4 h-4" /> },
      ];
    }

    // Operations Console (operator & admin)
    const items = [
      { to: '/', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: '/queue', label: 'Incidents', icon: <ListOrdered className="w-4 h-4" /> },
      { to: '/map', label: 'Incident Map', icon: <Map className="w-4 h-4" /> },
      { to: '/reviews', label: 'Review Queue', icon: <CheckSquare className="w-4 h-4" /> },
      { to: '/work-orders', label: 'Work Orders', icon: <Wrench className="w-4 h-4" /> },
      { to: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    ];
    if (role === 'admin') {
      items.push({ to: '/users', label: 'Team Members', icon: <Users className="w-4 h-4" /> });
    }
    return items;
  };

  const navItems = getNavItems();

  const roleWorkspaceLabel =
    role === 'citizen'
      ? 'Citizen Portal'
      : role === 'field_inspector'
      ? 'Field Inspector'
      : role === 'admin'
      ? 'Operations Admin'
      : 'Operations Console';

  const sidebarContent = (
    <div className="w-64 bg-[#172B3A] text-white flex flex-col h-full flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/icon-192.svg" alt="CivicPulse" className="w-8 h-8 rounded-lg border border-white/15" />
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-none">
              CIVICPULSE
            </span>
            <p className="text-[11px] text-slate-300 mt-1 leading-none">{roleWorkspaceLabel}</p>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => onCloseMobile?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#167C80] text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-[#1F384B] hover:text-white'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Account Footer */}
      <div className="p-4 border-t border-white/10 bg-[#12222E]">
        <div className="flex items-center gap-2.5 text-xs">
          {role === 'field_inspector' ? (
            <HardHat className="w-4 h-4 text-[#D99A32] flex-shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#39866A] flex-shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{user?.full_name || 'Guest User'}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.organization || 'Bengaluru Roads'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:flex h-full z-30">{sidebarContent}</aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#172B3A]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full shadow-2xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
