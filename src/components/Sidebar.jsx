import {
  FileEdit,
  FileCheck2,
  Home,
  BarChart3,
  ShieldAlert,
  Settings,
  X
} from 'lucide-react';
import SchoolnetLogo from './SchoolnetLogo';

export default function Sidebar({
  currentView,
  setCurrentView,
  isOpen,
  onClose,
  onOpenSettings
}) {
  const handleNavClick = (view) => {
    setCurrentView(view);
    if (onClose) onClose();
  };

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
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {/* 1. Digitization Link (TOP ITEM) */}
          <button
            onClick={() => handleNavClick('new_entry')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentView === 'new_entry'
                ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-900/40'
                : 'text-slate-200 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <FileEdit className="h-4 w-4 shrink-0 text-blue-400" />
            <span>Digitization Link</span>
          </button>

          {/* 2. ICR Prepare (Word .docx Generation) */}
          <button
            onClick={() => handleNavClick('icr_prepare')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentView === 'icr_prepare'
                ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-900/40'
                : 'text-slate-200 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="flex items-center justify-between flex-1">
              <span>ICR Prepare</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-normal">
                .docx
              </span>
            </div>
          </button>

          {/* 3. Dashboard */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-900/40'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* 4. Reports */}
          <button
            onClick={() => handleNavClick('reports')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'reports'
                ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-900/40'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>Reports</span>
          </button>

          {/* 5. Admin Control (Super Admin: Edit Serials & Delete Submissions) */}
          <button
            onClick={() => handleNavClick('admin_control')}
            className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              currentView === 'admin_control'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'text-slate-300 hover:bg-[#13253b] hover:text-white'
            }`}
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex items-center justify-between flex-1">
              <span>Admin Control</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-normal">
                Super
              </span>
            </div>
          </button>
        </nav>

        {/* Bottom Project Branding */}
        <div className="p-3 border-t border-[#1a2d42]">
          <div className="p-2.5 rounded-xl bg-[#13253b]/70 border border-[#1a2d42] text-[11px] text-slate-400">
            <div className="font-semibold text-slate-200">Jharkhand ICR Portal</div>
            <div className="text-[10px] text-slate-400 mt-0.5">ICT 108 & SC 664 Project</div>
          </div>
        </div>
      </aside>
    </>
  );
}
