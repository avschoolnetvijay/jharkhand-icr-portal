import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import NewDataCollectionView from './components/NewDataCollectionView';
import SchoolsDirectoryView from './components/SchoolsDirectoryView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import ReadOnlySubmissionView from './components/ReadOnlySubmissionView';
import defaultSchools from './data/schools_master.json';
import {
  fetchSchoolStatusMap,
  fetchMasterSchools,
  getApiUrl,
  getCachedStatusMap,
  getCachedMasterSchools
} from './services/api';
import { RefreshCw, AlertTriangle, Cloud, Users, FileText, HelpCircle, X } from 'lucide-react';

export default function App() {
  const [schools, setSchools] = useState(() => getCachedMasterSchools());
  const [statusMap, setStatusMap] = useState(() => getCachedStatusMap());
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [inspectingSchool, setInspectingSchool] = useState(null); // For viewing completed school details in modal

  // Navigation View: 'new_entry' (default) | 'dashboard' | 'reports'
  const [currentView, setCurrentView] = useState('new_entry');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialSyncing, setIsInitialSyncing] = useState(true);

  const isApiConnected = Boolean(getApiUrl());

  // Load real-time status first (fast), and update master schools in background
  const refreshAllData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsInitialSyncing(true);
    }
    setLoading(true);
    try {
      // 1. Fetch real-time status map FIRST (takes ~2-3s instead of 25s, guarantees accurate search status)
      const map = await fetchSchoolStatusMap();
      if (map && Object.keys(map).length > 0) {
        setStatusMap(map);
      }

      // 2. Fetch dynamic master schools in background without blocking status view
      fetchMasterSchools()
        .then((dynamicSchools) => {
          if (dynamicSchools && dynamicSchools.length > 0) {
            setSchools(dynamicSchools);
          }
        })
        .catch((err) => console.warn('Background master schools update note:', err));
    } catch (e) {
      console.error('Error refreshing data from Google Sheets:', e);
    } finally {
      setLoading(false);
      setIsInitialSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData(true);

    // Failsafe timer: If network takes > 7s (e.g. slow 2G), automatically unlock using cached data
    const failsafeTimer = setTimeout(() => {
      setIsInitialSyncing(false);
    }, 7000);

    return () => clearTimeout(failsafeTimer);
  }, [refreshAllData]);

  // Handle successful digitization
  const handleSubmissionSuccess = (udise) => {
    refreshAllData(false);
  };

  // Compute counts
  const completedCount = React.useMemo(() => {
    return Object.values(statusMap).filter((s) => s?.status === 'Completed').length;
  }, [statusMap]);

  const pendingCount = schools.length - completedCount;

  // Handlers for starting entry or viewing
  const handleDigitizeSchool = (school) => {
    setSelectedSchool(school);
    setCurrentView('new_entry');
  };

  const handleViewSchool = (school) => {
    setInspectingSchool(school);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-row selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. Dark Navy Schoolnet Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        completedCount={completedCount}
        pendingCount={pendingCount}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          completedCount={completedCount}
          totalSchools={schools.length}
          isSyncing={loading}
        />

        {/* Body Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isInitialSyncing ? (
            /* Smooth Initial Sync Screen */
            <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center animate-in fade-in duration-300">
              <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1d68e2]">
                <RefreshCw className="h-7 w-7 animate-spin" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Synchronizing Real-Time Status
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Connecting with Google Sheets to verify live installation records across 679 Jharkhand schools...
              </p>
              <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-1.5 mt-5 overflow-hidden border border-slate-200/60">
                <div className="bg-[#1d68e2] h-1.5 rounded-full w-2/3 animate-pulse"></div>
              </div>
              <div className="mt-4 flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Google Sheets Cloud Verification Active</span>
              </div>
            </div>
          ) : (
            /* Views Switching */
            <>
              {/* VIEW 1: Dashboard */}
              {currentView === 'dashboard' && (
                <DashboardView
                  schools={schools}
                  statusMap={statusMap}
                  onNavigate={setCurrentView}
                  onViewSchool={handleViewSchool}
                />
              )}

              {/* VIEW 2: New Entry (Stepper Flow) */}
              {currentView === 'new_entry' && (
                <NewDataCollectionView
                  schools={schools}
                  statusMap={statusMap}
                  selectedSchool={selectedSchool}
                  onSelectSchool={setSelectedSchool}
                  onSubmissionSuccess={handleSubmissionSuccess}
                  onNavigate={setCurrentView}
                />
              )}

              {/* VIEW 3: My Entries (Completed Schools) */}
              {currentView === 'my_entries' && (
                <SchoolsDirectoryView
                  schools={schools}
                  statusMap={statusMap}
                  initialFilter="COMPLETED"
                  title="My Entries — Completed Schools"
                  subtitle="Listing all successfully digitized schools with row-wise asset registers"
                  onDigitizeSchool={handleDigitizeSchool}
                  onViewSchool={handleViewSchool}
                />
              )}

              {/* VIEW 4: Pending Entries */}
              {currentView === 'pending_entries' && (
                <SchoolsDirectoryView
                  schools={schools}
                  statusMap={statusMap}
                  initialFilter="PENDING"
                  title="Pending Entries — Awaiting Digitization"
                  subtitle="Listing schools awaiting field installation completion entry"
                  onDigitizeSchool={handleDigitizeSchool}
                  onViewSchool={handleViewSchool}
                />
              )}

              {/* VIEW 5: Schools Directory (All 679) */}
              {currentView === 'schools' && (
                <SchoolsDirectoryView
                  schools={schools}
                  statusMap={statusMap}
                  initialFilter="ALL"
                  title="Master School Directory (679 Schools)"
                  subtitle="All 108 ICT Labs and 571 Smart Classes across Jharkhand"
                  onDigitizeSchool={handleDigitizeSchool}
                  onViewSchool={handleViewSchool}
                />
              )}

              {/* VIEW 6: Reports & Analytics */}
              {currentView === 'reports' && (
                <AdminDashboard
                  schools={schools}
                  statusMap={statusMap}
                  onRefresh={() => refreshAllData(false)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              )}

              {/* VIEW 7: Team Info */}
              {currentView === 'team' && (
                <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1d68e2] flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Project Operations Team</h3>
                      <p className="text-xs text-slate-500">Jharkhand ICT 108 & SC 664 Installation Implementation</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">Vijay Kumar Ray</div>
                      <div className="text-xs text-[#1d68e2] font-semibold">Project Manager</div>
                      <div className="text-xs text-slate-500 mt-1">Project Oversight, Quality Verification & Data Governance</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="font-bold text-slate-900">Field Engineering Network</div>
                      <div className="text-xs text-emerald-700 font-semibold">24 Districts of Jharkhand</div>
                      <div className="text-xs text-slate-500 mt-1">On-Site Hardware Installation, Lab Commissioning & ICR Reporting</div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 8: Documents */}
              {currentView === 'documents' && (
                <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1d68e2] flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Project Reference Documents</h3>
                      <p className="text-xs text-slate-500">Guidelines, Schemas & Installation Protocols</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Row-Wise Asset Register Protocol</div>
                        <div className="text-slate-500">1 Row per physical hardware asset in Google Sheet Device_Serial_Inventory</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Active</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">Date Format Standard</div>
                        <div className="text-slate-500">Enforced dd-mmm-yyyy (e.g. 13-Sep-2026)</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold">Enforced</span>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 9: Help & Support */}
              {currentView === 'help' && (
                <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#1d68e2] flex items-center justify-center">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Help & Support Desk</h3>
                      <p className="text-xs text-slate-500">Technical assistance for ICR digitization portal</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 leading-relaxed space-y-2">
                    <p>
                      For duplicate serial alerts, master school corrections, or Google Apps Script Web App sync inquiries, please contact the Jharkhand ICT Project Operations team.
                    </p>
                    <p className="font-bold text-slate-900">
                      Portal Version: 2.5 (Schoolnet Enterprise Edition)
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <span>
              Schoolnet India • <strong>Jharkhand ICT 108 & SC 664 Project</strong>
            </span>
            <span className="italic text-[#0284c7]">
              Together for Smarter Schools
            </span>
          </div>
        </footer>
      </div>

      {/* Inspecting School Read-Only Modal */}
      {inspectingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectingSchool.school_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  UDISE: {inspectingSchool.udise} • SNIL: {inspectingSchool.snil} • {inspectingSchool.district}
                </p>
              </div>
              <button
                onClick={() => setInspectingSchool(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ReadOnlySubmissionView
              school={inspectingSchool}
              statusInfo={statusMap[inspectingSchool.udise]}
            />

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setInspectingSchool(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={() => refreshAllData(false)}
      />
    </div>
  );
}
