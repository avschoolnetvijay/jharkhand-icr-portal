import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SchoolSearch from './components/SchoolSearch';
import SchoolCard from './components/SchoolCard';
import DigitizationForm from './components/DigitizationForm';
import ReadOnlySubmissionView from './components/ReadOnlySubmissionView';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import defaultSchools from './data/schools_master.json';
import { fetchSchoolStatusMap, fetchMasterSchools, getApiUrl } from './services/api';
import { Search, ShieldCheck, Database, RefreshCw, AlertTriangle, Cloud } from 'lucide-react';

export default function App() {
  const [schools, setSchools] = useState(defaultSchools);
  const [statusMap, setStatusMap] = useState({});
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [currentView, setCurrentView] = useState('technician'); // 'technician' | 'admin'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const isApiConnected = Boolean(getApiUrl());

  // Load both Master Schools and Status Map dynamically from Google Sheets
  const refreshAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch dynamic master schools from Google Sheet (Master_Schools tab)
      const dynamicSchools = await fetchMasterSchools();
      if (dynamicSchools && dynamicSchools.length > 0) {
        setSchools(dynamicSchools);
      }

      // 2. Fetch completion status map
      const map = await fetchSchoolStatusMap();
      setStatusMap(map);
    } catch (e) {
      console.error('Error refreshing data from Google Sheets:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle successful digitization
  const handleSubmissionSuccess = (udise) => {
    refreshAllData();
  };

  // Calculate completed count
  const completedCount = React.useMemo(() => {
    return Object.values(statusMap).filter((s) => s?.status === 'Completed').length;
  }, [statusMap]);

  const selectedStatusInfo = selectedSchool ? statusMap[selectedSchool.udise] : null;
  const isSchoolCompleted = selectedStatusInfo?.status === 'Completed';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        completedCount={completedCount}
        totalSchools={schools.length}
      />

      {/* Prominent Warning Banner if Google Sheet is NOT connected */}
      {!isApiConnected && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200 animate-bounce" />
              <span>
                <strong>Google Sheet Not Connected!</strong> You must connect your Google Apps Script URL on this site for data to sync to your Google Sheet.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white text-orange-800 font-bold rounded-lg hover:bg-orange-50 shadow-xs cursor-pointer transition-all"
            >
              <Cloud className="h-3.5 w-3.5 text-orange-600" />
              <span>Connect Google Sheet Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'technician' ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero Search Section */}
            <div className="text-center max-w-3xl mx-auto space-y-3 pt-2 pb-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-100/70 text-brand-800 border border-brand-200/60 shadow-2xs">
                  Field Digitization Portal • Live Synchronization
                </span>
                <button
                  onClick={refreshAllData}
                  title="Sync with Google Sheets"
                  className="p-1 text-slate-400 hover:text-brand-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
                </button>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Installation Completion Report (ICR) Digitizer
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Search your school by <strong>UDISE Code</strong>, <strong>SNIL Code</strong>, or <strong>School Name</strong> to verify status and digitize device serial numbers.
              </p>

              {/* Search Bar */}
              <div className="pt-3">
                <SchoolSearch
                  schools={schools}
                  statusMap={statusMap}
                  onSelectSchool={setSelectedSchool}
                  selectedSchool={selectedSchool}
                />
              </div>
            </div>

            {/* School Profile and Form / ReadOnly view */}
            {selectedSchool ? (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* School Master Details & Status Card */}
                <SchoolCard
                  school={selectedSchool}
                  statusInfo={selectedStatusInfo}
                />

                {/* Conditional View: Read-Only if Already Updated, Digitization Form if Pending */}
                {isSchoolCompleted ? (
                  <ReadOnlySubmissionView
                    school={selectedSchool}
                    statusInfo={selectedStatusInfo}
                  />
                ) : (
                  <DigitizationForm
                    school={selectedSchool}
                    onSubmissionSuccess={handleSubmissionSuccess}
                  />
                )}
              </div>
            ) : (
              /* Informational Placeholder Cards */
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-brand-300 transition-colors">
                  <div className="h-11 w-11 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    1. Search School
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Type UDISE code, SNIL code, or school name to instantly check if the school is pending or already digitized.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    2. Zero Duplicates
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Real-time duplicate detection alerts field technicians if a serial number is already registered in any school.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-purple-300 transition-colors">
                  <div className="h-11 w-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    3. Live Google Sheet Sync
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Master schools and device rows are synced directly with your Google Sheet in real-time.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Admin Dashboard View */
          <AdminDashboard
            schools={schools}
            statusMap={statusMap}
            onRefresh={refreshAllData}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <span>
            Jharkhand ICT & Smart Class Project • <strong>108 ICT Labs & 664 Smart Classes</strong>
          </span>
          <span>
            Row-Wise Asset Register System • Real-Time Cloud Sync
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={refreshAllData}
      />
    </div>
  );
}
