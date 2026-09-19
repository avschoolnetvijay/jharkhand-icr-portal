import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Search,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  X,
  Building2,
  Calendar,
  User,
  Phone,
  Cpu,
  Layers,
  FileText,
  Eye,
  EyeOff,
  Loader2,
  HelpCircle,
  Filter,
  Check,
  Edit3
} from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_BADGE_COLORS, getCategoryDevices } from '../data/deviceSchemas';
import {
  updateSchoolSerials,
  deleteSchoolSubmission,
  isExcludedFromDuplicateCheck,
  formatDateDDMMMYYYY
} from '../services/api';

const SUPER_ADMIN_PASS = 'Snetansh@2026';
const SESSION_AUTH_KEY = 'icr_super_admin_authenticated';

export default function AdminControlView({
  schools = [],
  statusMap = {},
  onRefresh,
  onNavigateToDigitization
}) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // School Search & Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [filterMode, setFilterMode] = useState('COMPLETED'); // 'COMPLETED' | 'ALL'
  const [selectedSchool, setSelectedSchool] = useState(null);

  // Editable Form State for Selected School
  const [editableDevices, setEditableDevices] = useState([]);
  const [technicianName, setTechnicianName] = useState('');
  const [technicianMobile, setTechnicianMobile] = useState('');
  const [installationDate, setInstallationDate] = useState('');

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState(null);

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState(null);

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    const clean = (passwordInput || '').trim();
    if (clean === SUPER_ADMIN_PASS) {
      setIsAuthenticated(true);
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Invalid Super Admin password. Please check and try again.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setSelectedSchool(null);
    setEditableDevices([]);
  };

  // Unique Districts list
  const districts = useMemo(() => {
    const dSet = new Set(schools.map((s) => s.district).filter(Boolean));
    return Array.from(dSet).sort();
  }, [schools]);

  // Completed schools list
  const completedSchools = useMemo(() => {
    return schools.filter((s) => {
      const info = statusMap[s.udise];
      return info && (info.status === 'Completed' || info.status === 'COMPLETED');
    });
  }, [schools, statusMap]);

  // Search Results
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const baseList = filterMode === 'COMPLETED' ? completedSchools : schools;

    if (!term && districtFilter === 'ALL') {
      return baseList.slice(0, 30);
    }

    return baseList
      .filter((s) => {
        const matchDistrict = districtFilter === 'ALL' || s.district === districtFilter;
        if (!matchDistrict) return false;

        if (!term) return true;
        return (
          (s.school_name || '').toLowerCase().includes(term) ||
          String(s.udise || '').includes(term) ||
          (s.block || '').toLowerCase().includes(term) ||
          (s.snil || '').toLowerCase().includes(term) ||
          (s.district || '').toLowerCase().includes(term)
        );
      })
      .slice(0, 50);
  }, [schools, completedSchools, filterMode, searchTerm, districtFilter]);

  // Load School Data into Edit State when selected
  useEffect(() => {
    if (!selectedSchool) {
      setEditableDevices([]);
      setTechnicianName('');
      setTechnicianMobile('');
      setInstallationDate('');
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
      return;
    }

    const info = statusMap[selectedSchool.udise];
    let parsedDevices = [];

    if (info?.devicesJson) {
      try {
        parsedDevices =
          typeof info.devicesJson === 'string'
            ? JSON.parse(info.devicesJson)
            : info.devicesJson;
      } catch (e) {
        console.error('Failed to parse devicesJson:', e);
      }
    }

    // Fallback if devicesJson is empty or school not completed yet
    if (!parsedDevices || parsedDevices.length === 0) {
      const template = getCategoryDevices(selectedSchool.category);
      parsedDevices = template.map((t) => ({
        id: t.id,
        item_name: t.itemName,
        make_model: `${t.make || ''} ${t.model || ''}`.trim(),
        serial_number: ''
      }));
    } else {
      // Ensure normalized format
      parsedDevices = parsedDevices.map((d, index) => ({
        id: d.id || `dev_${index + 1}`,
        item_name: d.item_name || d.name || d.itemName || d.label || `Device ${index + 1}`,
        make_model: d.make_model || d.make || '',
        serial_number: d.serial_number || d.serial || ''
      }));
    }

    setEditableDevices(parsedDevices);
    setTechnicianName(info?.installedBy || '');
    setTechnicianMobile(info?.mobile || '');

    // Format raw date for input[type="date"] if available (YYYY-MM-DD)
    if (info?.rawDate && /^\d{4}-\d{2}-\d{2}$/.test(info.rawDate)) {
      setInstallationDate(info.rawDate);
    } else if (info?.date) {
      setInstallationDate(info.date);
    } else {
      setInstallationDate(new Date().toISOString().split('T')[0]);
    }

    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  }, [selectedSchool, statusMap]);

  // Update a single device's serial number
  const handleSerialChange = (index, value) => {
    setEditableDevices((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        serial_number: value.toUpperCase().trimStart()
      };
      return next;
    });
  };

  // Intra-form Duplicate Detection
  const duplicateSerialMap = useMemo(() => {
    const serialCounts = {};
    const duplicates = new Set();

    editableDevices.forEach((dev) => {
      const sn = String(dev.serial_number || '').trim().toUpperCase();
      if (!sn) return;
      if (isExcludedFromDuplicateCheck(dev.item_name, dev.id)) return;

      serialCounts[sn] = (serialCounts[sn] || 0) + 1;
      if (serialCounts[sn] > 1) {
        duplicates.add(sn);
      }
    });

    return duplicates;
  }, [editableDevices]);

  // Handle Save Serials
  const handleSaveSerials = async () => {
    if (!selectedSchool) return;

    if (duplicateSerialMap.size > 0) {
      setSaveErrorMsg('Please resolve duplicate serial numbers within the form before saving.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      await updateSchoolSerials(selectedSchool.udise, editableDevices, {
        installed_by: technicianName,
        mobile: technicianMobile,
        installation_date: installationDate
      });

      setSaveSuccessMsg(
        `Hardware serial numbers and details for ${selectedSchool.school_name} were successfully updated and synchronized across all portal views!`
      );

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update school serials:', err);
      setSaveErrorMsg(err.message || 'An error occurred while saving the updated serials.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Submission
  const handleDeleteSchoolSubmission = async () => {
    if (!selectedSchool) return;

    setIsDeleting(true);
    setDeleteErrorMsg(null);

    try {
      await deleteSchoolSubmission(selectedSchool.udise);

      const deletedSchoolName = selectedSchool.school_name;
      setIsDeleteModalOpen(false);
      setDeleteConfirmInput('');
      setSelectedSchool(null);
      setEditableDevices([]);

      setDeleteSuccessToast(
        `Submission for "${deletedSchoolName}" has been permanently deleted. The school is now reset to "Pending" state.`
      );

      if (onRefresh) {
        onRefresh();
      }

      // Auto-hide toast after 7s
      setTimeout(() => {
        setDeleteSuccessToast(null);
      }, 7000);
    } catch (err) {
      console.error('Failed to delete school submission:', err);
      setDeleteErrorMsg(err.message || 'Failed to delete school submission.');
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // 1. PASSWORD AUTHENTICATION SCREEN
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="h-16 w-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Restricted Access</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Control</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Authorized management panel for serial correction and submission controls. Enter the administrator security key to proceed.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Security Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 pr-11 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center space-x-1">
            <Lock className="h-3 w-3" />
            <span>Schoolnet ICR Data Governance & Security</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. AUTHENTICATED SUPER ADMIN CONTROL PANEL
  // -------------------------------------------------------------
  const selectedStatusInfo = selectedSchool ? statusMap[selectedSchool.udise] : null;
  const isSelectedCompleted =
    selectedStatusInfo &&
    (selectedStatusInfo.status === 'Completed' || selectedStatusInfo.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Session Status */}
      <div className="bg-gradient-to-r from-slate-900 via-[#102a45] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Super Admin Control Panel
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                Authorized
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live Hardware Serial Number Editing, Duplicate Resolution & Submission Reset
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer transition-all"
              title="Refresh database records"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout Admin</span>
          </button>
        </div>
      </div>

      {/* Delete Success Toast */}
      {deleteSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{deleteSuccessToast}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessToast(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid: Left Search Panel, Right Edit/Management Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: SCHOOL SEARCH & SELECTION LIST */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-[#1d68e2]" />
              <h2 className="text-sm font-bold text-slate-900">Select School to Manage</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {completedSchools.length} Digitized
            </span>
          </div>

          {/* Filter Mode Pills: Completed Only vs All */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterMode('COMPLETED')}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                filterMode === 'COMPLETED'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({completedSchools.length})
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Schools ({schools.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search UDISE, name, block..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* District Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter by District
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Districts ({districts.length})</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Results List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No matching schools found.
              </div>
            ) : (
              searchResults.map((school) => {
                const isSelected = selectedSchool?.udise === school.udise;
                const statusInfo = statusMap[school.udise];
                const isDone =
                  statusInfo &&
                  (statusInfo.status === 'Completed' || statusInfo.status === 'COMPLETED');

                return (
                  <div
                    key={school.udise}
                    onClick={() => setSelectedSchool(school)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#1d68e2] shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                          {school.school_name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 font-mono">
                          <span>{school.udise}</span>
                          <span>•</span>
                          <span className="truncate">{school.district}</span>
                        </div>
                      </div>
                      {isDone ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Digitized
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: EDIT SERIALS & DANGER ZONE */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedSchool ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
              <div className="h-16 w-16 bg-blue-50 text-[#1d68e2] rounded-2xl flex items-center justify-center mx-auto">
                <Edit3 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No School Selected</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Please search or pick a school from the list on the left to edit its registered hardware serial numbers or manage its submission records.
              </p>
            </div>
          ) : (
            <>
              {/* Selected School Header Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          CATEGORY_BADGE_COLORS[selectedSchool.category] ||
                          'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {CATEGORY_LABELS[selectedSchool.category] || selectedSchool.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        UDISE: {selectedSchool.udise}
                      </span>
                      {selectedSchool.snil && (
                        <span className="text-xs font-mono text-slate-500">
                          SNIL: {selectedSchool.snil}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {selectedSchool.school_name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Block: <strong>{selectedSchool.block}</strong> • District:{' '}
                      <strong>{selectedSchool.district}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    {isSelectedCompleted ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Digitized (Completed)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        Pending Digitization
                      </span>
                    )}
                  </div>
                </div>

                {/* Not digitized yet note */}
                {!isSelectedCompleted && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
                    <div className="font-bold flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>This school has not been submitted yet</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      No serial numbers are recorded in the database for this school. If you want to perform the initial digitization entry, click below.
                    </p>
                    {onNavigateToDigitization && (
                      <button
                        onClick={onNavigateToDigitization}
                        className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Go to Digitization Form</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Technician & Installation Metadata Form */}
                {isSelectedCompleted && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Technician Name
                      </label>
                      <input
                        type="text"
                        value={technicianName}
                        onChange={(e) => setTechnicianName(e.target.value)}
                        placeholder="Installed by..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        value={technicianMobile}
                        onChange={(e) => setTechnicianMobile(e.target.value)}
                        placeholder="10-digit mobile..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Installation Date
                      </label>
                      <input
                        type="date"
                        value={installationDate}
                        onChange={(e) => setInstallationDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware Serial Numbers Edit Card */}
              {isSelectedCompleted && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Cpu className="h-4 w-4 text-[#1d68e2]" />
                        <span>Hardware Asset Serial Numbers ({editableDevices.length} Items)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Edit serial numbers directly. Changes will update both inventory and Central Database records.
                      </p>
                    </div>

                    <div className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                      <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                      <span>Auto-converts to UPPERCASE</span>
                    </div>
                  </div>

                  {/* Feedback Messages */}
                  {saveSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}

                  {saveErrorMsg && (
                    <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{saveErrorMsg}</span>
                    </div>
                  )}

                  {/* Device List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3">Make / Model</th>
                          <th className="py-2.5 px-3">Serial Number (Editable)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editableDevices.map((device, idx) => {
                          const isExempt = isExcludedFromDuplicateCheck(device.item_name, device.id);
                          const isDup =
                            !isExempt &&
                            device.serial_number &&
                            duplicateSerialMap.has(device.serial_number.toUpperCase().trim());

                          return (
                            <tr
                              key={device.id || idx}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isDup ? 'bg-rose-50/50' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{device.item_name}</div>
                                {isExempt && (
                                  <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    Exempt from duplicate check
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-medium">
                                {device.make_model || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="space-y-1 max-w-sm">
                                  <input
                                    type="text"
                                    value={device.serial_number}
                                    onChange={(e) => handleSerialChange(idx, e.target.value)}
                                    placeholder="Enter serial number..."
                                    className={`w-full px-3 py-1.5 font-mono text-xs font-bold rounded-lg border focus:outline-none transition-all ${
                                      isDup
                                        ? 'bg-rose-50 border-rose-400 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                                        : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                    }`}
                                  />
                                  {isDup && (
                                    <div className="text-[10px] text-rose-600 font-bold flex items-center space-x-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Duplicate serial in this school form!</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Button Bar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Excludes <strong>Web Cam</strong> & <strong>Speaker</strong> from duplicate restrictions.
                    </div>

                    <button
                      type="button"
                      disabled={isSaving || duplicateSerialMap.size > 0}
                      onClick={handleSaveSerials}
                      className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                        isSaving || duplicateSerialMap.size > 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-[#1d68e2] hover:bg-blue-600 text-white active:scale-98'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving & Updating Database...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save & Update Serials</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* DANGER ZONE: DELETE SCHOOL SUBMISSION */}
              {isSelectedCompleted && (
                <div className="bg-rose-50/50 rounded-2xl sm:rounded-3xl border border-rose-200 p-5 sm:p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <h3 className="text-sm font-bold text-rose-900">
                          Danger Zone: Delete School Submission
                        </h3>
                      </div>
                      <p className="text-xs text-rose-800/80 leading-relaxed max-w-2xl">
                        Permanently delete this school's digitization record and clear all {editableDevices.length} registered hardware serial numbers from the central inventory. The school will be immediately reset back to <strong>Pending</strong> state.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmInput('');
                        setDeleteErrorMsg(null);
                        setIsDeleteModalOpen(true);
                      }}
                      className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete School Data</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CONFIRM SCHOOL SUBMISSION DELETION */}
      {/* ========================================================= */}
      {isDeleteModalOpen && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 text-rose-600">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Confirm Deletion</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">
                You are about to permanently delete the submission data for:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
                <div className="font-bold text-slate-900 text-sm">{selectedSchool.school_name}</div>
                <div className="text-slate-500">
                  UDISE: <span className="font-bold text-slate-800">{selectedSchool.udise}</span> • District: {selectedSchool.district}
                </div>
                <div className="text-rose-600 text-[11px] font-semibold pt-1">
                  ⚠️ Will delete {editableDevices.length} hardware serial numbers and reset status to Pending.
                </div>
              </div>

              <p className="text-slate-500">
                To confirm permanent deletion, please type the school's UDISE code{' '}
                <strong className="text-slate-900 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {selectedSchool.udise}
                </strong>{' '}
                below:
              </p>

              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value.trim())}
                placeholder={`Type ${selectedSchool.udise} to confirm`}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />

              {deleteErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {deleteErrorMsg}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting || deleteConfirmInput !== String(selectedSchool.udise).trim()}
                onClick={handleDeleteSchoolSubmission}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                  deleteConfirmInput === String(selectedSchool.udise).trim() && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Permanently Delete Submission</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
