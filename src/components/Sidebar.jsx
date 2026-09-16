import React, { useState } from 'react';
import {
  Home,
  FileText,
  ChevronDown,
  Building2,
  BarChart3,
  Users,
  Folder,
  Settings,
  HelpCircle,
  PlusCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import SchoolnetLogo from './SchoolnetLogo';

export default function Sidebar({
  currentView,
  setCurrentView,
  isOpen,
  onClose,
  onOpenSettings,
  completedCount = 0,
  pendingCount = 679
}) {
  const [dataCollectionExpanded, setDataCollectionExpanded] = useState(true);

  const handleNavClick = (view) => {
    setCurrentView(view);
    if (onClose) onClose();
  };

  const isDataCollectionActive = ['new_entry', 'my_entries', 'pending_entries'].includes(currentView);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0d1b2a] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-[#1a2d42] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 sm:h-18 px-5 flex items-center justify-between border-b border-[#1a2d42] shrink-0">
          <SchoolnetLogo invert={true} />
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2d42] lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-900/30'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* 2. Data Collection (Expandable) */}
          <div>
            <button
              onClick={() => setDataCollectionExpanded(!dataCollectionExpanded)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isDataCollectionActive
                  ? 'text-white bg-[#13253b]'
                  : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 shrink-0 text-[#1d68e2]" />
                <span>Data Collection</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 text-slate-400 ${
                  dataCollectionExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Sub-items */}
            {dataCollectionExpanded && (
              <div className="mt-1 ml-4 pl-3 border-l border-[#1a2d42] space-y-1">
                <button
                  onClick={() => handleNavClick('new_entry')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    currentView === 'new_entry'
                      ? 'bg-[#1d68e2] text-white font-bold'
                      : 'text-slate-400 hover:bg-[#13253b] hover:text-white'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                    <span>New Entry</span>
                  </span>
                  <PlusCircle className="h-3 w-3 opacity-60" />
                </button>

                <button
                  onClick={() => handleNavClick('my_entries')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    currentView === 'my_entries'
                      ? 'bg-[#1d68e2] text-white font-bold'
                      : 'text-slate-400 hover:bg-[#13253b] hover:text-white'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>My Entries</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                    {completedCount}
                  </span>
                </button>

                <button
                  onClick={() => handleNavClick('pending_entries')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    currentView === 'pending_entries'
                      ? 'bg-[#1d68e2] text-white font-bold'
                      : 'text-slate-400 hover:bg-[#13253b] hover:text-white'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    <span>Pending Entries</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                    {pendingCount}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Schools (All 679) */}
          <button
            onClick={() => handleNavClick('schools')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'schools'
                ? 'bg-[#1d68e2] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Schools (679)</span>
          </button>

          {/* 4. Reports (Analytics & Excel Export) */}
          <button
            onClick={() => handleNavClick('reports')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'reports'
                ? 'bg-[#1d68e2] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Reports</span>
          </button>

          {/* 5. Team */}
          <button
            onClick={() => handleNavClick('team')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'team'
                ? 'bg-[#1d68e2] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Team</span>
          </button>

          {/* 6. Documents */}
          <button
            onClick={() => handleNavClick('documents')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'documents'
                ? 'bg-[#1d68e2] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span>Documents</span>
          </button>

          {/* Divider */}
          <div className="pt-3 pb-1">
            <div className="h-px bg-[#1a2d42] w-full" />
          </div>

          {/* 7. Settings */}
          <button
            onClick={() => {
              if (onClose) onClose();
              if (onOpenSettings) onOpenSettings();
            }}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:bg-[#13253b] hover:text-white transition-all cursor-pointer"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Settings</span>
          </button>

          {/* 8. Help & Support */}
          <button
            onClick={() => handleNavClick('help')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'help'
                ? 'bg-[#1d68e2] text-white shadow-md'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Help & Support</span>
          </button>
        </nav>

        {/* Footer Brand Info */}
        <div className="p-3.5 m-3 rounded-xl bg-[#13253b] border border-[#1a2d42] text-[11px] text-slate-400">
          <div className="font-semibold text-slate-200">Jharkhand ICT Project</div>
          <div className="text-[10px] text-slate-400 mt-0.5">108 ICT Labs + 664 Smart Classes</div>
          <div className="mt-2 text-[9px] text-[#0284c7] font-semibold italic">Together for Smarter Schools</div>
        </div>
      </aside>
    </>
  );
}
