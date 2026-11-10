import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Home,
  Camera,
  Map,
  FileText,
  User,
  ClipboardCheck,
  Wrench,
  History
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role } = useAuth();
  const { pendingDraftCount } = usePWA();

  interface MobileTab {
    to: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }

  const citizenMobileTabs: MobileTab[] = [
    { to: '/', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { to: '/report', label: 'Report', icon: <Camera className="w-5 h-5" /> },
    { to: '/map', label: 'Map', icon: <Map className="w-5 h-5" /> },
    { to: '/my-reports', label: 'My Reports', icon: <FileText className="w-5 h-5" />, badge: pendingDraftCount },
    { to: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  const inspectorMobileTabs: MobileTab[] = [
    { to: '/', label: 'Tasks', icon: <ClipboardCheck className="w-5 h-5" /> },
    { to: '/map', label: 'Map', icon: <Map className="w-5 h-5" /> },
    { to: '/work-orders', label: 'Inspections', icon: <Wrench className="w-5 h-5" /> },
    { to: '/history', label: 'History', icon: <History className="w-5 h-5" /> },
  ];

  const mobileTabs =
    role === 'citizen' ? citizenMobileTabs : role === 'field_inspector' ? inspectorMobileTabs : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F6F8FA] text-[#263746] font-sans">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className={`flex-1 overflow-y-auto px-3 py-4 sm:p-6 bg-[#F6F8FA] ${mobileTabs ? 'pb-24 lg:pb-6' : ''}`}>
          <Outlet />
        </main>

        {/* Mobile Bottom Tab Bar for Citizen & Field Inspector */}
        {mobileTabs && (
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#DDE4EC] pb-safe shadow-lg"
          >
            <div className={`grid ${mobileTabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} h-16`}>
              {mobileTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === '/'}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                      isActive ? 'text-[#167C80] font-semibold' : 'text-[#5A6B7C]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`p-1 rounded-lg ${isActive ? 'bg-teal-50 text-[#167C80]' : ''}`}>
                        {tab.icon}
                      </span>
                      <span className="truncate max-w-full px-1">{tab.label}</span>
                      {(tab.badge ?? 0) > 0 && (
                        <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#D99A32] text-white text-[10px] font-bold flex items-center justify-center">
                          {tab.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};
