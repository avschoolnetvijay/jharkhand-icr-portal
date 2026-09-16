import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  Lock,
  Settings,
  RefreshCw
} from 'lucide-react';
import { CATEGORY_LABELS } from '../data/deviceSchemas';
import {
  exportInventoryToExcel,
  getAllInventoryRows,
  formatDateDDMMMYYYY,
  exportFullProjectToExcel,
  exportDistrictReportToExcel,
  exportCategoryReportToExcel,
  exportFilteredSchoolsToExcel
} from '../services/api';

export default function AdminDashboard({
  schools,
  statusMap,
  onRefresh,
  onOpenSettings
}) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Export loading state
  const [isExporting, setIsExporting] = useState(false);

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'Admin@2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid administrator password. Please try again.');
    }
  };

  // Districts List
  const uniqueDistricts = useMemo(() => {
    const dSet = new Set(schools.map((s) => s.district).filter(Boolean));
    return Array.from(dSet).sort();
  }, [schools]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const totalSchools = schools.length; // 679
    let completedCount = 0;
    let totalSmartClasses = 0;
    let completedSmartClasses = 0;

    schools.forEach((s) => {
      const isDone = statusMap[s.udise]?.status === 'Completed';
      if (isDone) completedCount++;

      // Count smart classes
      if (s.category === 'SMART_ONLY' || s.including_smart === 'Yes') {
        totalSmartClasses++;
        if (isDone) completedSmartClasses++;
      }
    });

    const pendingCount = totalSchools - completedCount;
    const percent = Math.round((completedCount / totalSchools) * 100) || 0;
    const smartPercent = Math.round((completedSmartClasses / totalSmartClasses) * 100) || 0;

    return {
      totalSchools,
      completedCount,
      pendingCount,
      percent,
      totalSmartClasses,
      completedSmartClasses,
      smartPercent
    };
  }, [schools, statusMap]);

  // District-wise Analytics
  const districtAnalytics = useMemo(() => {
    const dMap = {};
    schools.forEach((s) => {
      if (!dMap[s.district]) {
        dMap[s.district] = { total: 0, completed: 0, pending: 0 };
      }
      dMap[s.district].total++;
      if (statusMap[s.udise]?.status === 'Completed') {
        dMap[s.district].completed++;
      } else {
        dMap[s.district].pending++;
      }
    });

    return Object.entries(dMap)
      .map(([district, data]) => ({
        district,
        total: data.total,
        completed: data.completed,
        pending: data.pending,
        percent: Math.round((data.completed / data.total) * 100) || 0
      }))
      .sort((a, b) => b.completed - a.completed || a.district.localeCompare(b.district));
  }, [schools, statusMap]);

  // Category-wise Analytics
  const categoryAnalytics = useMemo(() => {
    const cMap = {};
    schools.forEach((s) => {
      if (!cMap[s.category]) {
        cMap[s.category] = { total: 0, completed: 0, pending: 0 };
      }
      cMap[s.category].total++;
      if (statusMap[s.udise]?.status === 'Completed') {
        cMap[s.category].completed++;
      } else {
        cMap[s.category].pending++;
      }
    });

    return Object.entries(cMap).map(([cat, data]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      total: data.total,
      completed: data.completed,
      pending: data.pending,
      percent: Math.round((data.completed / data.total) * 100) || 0
    }));
  }, [schools, statusMap]);

  // Filtered Schools Table
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.udise.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.snil.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.block.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDistrict =
        selectedDistrict === 'ALL' || s.district === selectedDistrict;

      const matchesCategory =
        selectedCategory === 'ALL' || s.category === selectedCategory;

      const isDone = statusMap[s.udise]?.status === 'Completed';
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'COMPLETED' && isDone) ||
        (selectedStatus === 'PENDING' && !isDone);

      return matchesSearch && matchesDistrict && matchesCategory && matchesStatus;
    });
  }, [schools, statusMap, searchQuery, selectedDistrict, selectedCategory, selectedStatus]);

  // Handle Export to Excel in ROW-WISE format
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const inventory = await getAllInventoryRows();
      exportInventoryToExcel(inventory, schools, statusMap);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // If Not Authenticated -> Show Password Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-8 sm:my-16 p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm text-center">
        <div className="h-14 w-14 sm:h-16 sm:w-16 mx-auto mb-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Lock className="h-7 w-7 sm:h-8 sm:w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Administrator Access</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Enter admin credentials to view project progress, district analytics, and export row-wise ICR data.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Admin Password (e.g. Admin@2026)"
              className="w-full px-4 py-3 text-center bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-sm font-semibold focus:border-slate-600 focus:bg-white outline-hidden transition-all"
            />
            {authError && (
              <p className="text-xs text-red-600 font-medium mt-1.5">{authError}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Project Control & Analytics Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-Time Installation Completion Tracking across 24 Jharkhand Districts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            title="Refresh live data"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer transition-colors"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Database Config</span>
          </button>

          {/* EXCEL EXPORT BUTTON (ROW-WISE ASSET REGISTER) */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Generating Excel...' : 'Export Row-Wise Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Schools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Schools
            </span>
            <span className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Building2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {metrics.totalSchools}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              108 ICT Labs + 571 Smart Classes
            </span>
          </div>
        </div>

        {/* Completed Schools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Completed (Digitized)
            </span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-emerald-700 font-mono">
                {metrics.completedCount}
              </span>
              <span className="text-sm font-bold text-emerald-600">
                ({metrics.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.percent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Pending Schools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Pending Digitization
            </span>
            <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-amber-700 font-mono">
              {metrics.pendingCount}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              Field ICR reports awaiting entry
            </span>
          </div>
        </div>

        {/* Smart Classes Installed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total Smart Classes
            </span>
            <span className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <Layers className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                {metrics.completedSmartClasses}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                / {metrics.totalSmartClasses} ({metrics.smartPercent}%)
              </span>
            </div>
            <span className="text-xs text-slate-500 block mt-1">
              571 standalone + 93 composite
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Section: District-Wise & Category-Wise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* District-wise Progress */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                District-Wise Status ({districtAnalytics.length} Districts)
              </h3>
              <span className="text-xs text-slate-400 font-medium">Sorted by Done</span>
            </div>
            <button
              onClick={() => exportDistrictReportToExcel(districtAnalytics)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1d68e2] text-xs font-bold transition-colors cursor-pointer border border-blue-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export District (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-y-auto max-h-80 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3 text-center">Total</th>
                  <th className="py-2.5 px-3 text-center text-emerald-700">Done</th>
                  <th className="py-2.5 px-3 text-center text-amber-700">Pending</th>
                  <th className="py-2.5 px-3 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districtAnalytics.map((d) => (
                  <tr key={d.district} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{d.district}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">{d.total}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                      {d.completed}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-700">
                      {d.pending}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-14 sm:w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${d.percent}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-bold w-9 text-slate-700">{d.percent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category-wise Breakdown */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Lab Allocation Category Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-medium">5 Lab Formats</span>
            </div>
            <button
              onClick={() => exportCategoryReportToExcel(categoryAnalytics)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1d68e2] text-xs font-bold transition-colors cursor-pointer border border-blue-200"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Category (.xlsx)</span>
            </button>
          </div>

          <div className="space-y-3">
            {categoryAnalytics.map((c) => (
              <div key={c.category} className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-semibold text-slate-800">{c.label}</span>
                  <span className="font-mono font-bold text-slate-900">
                    {c.completed} / {c.total}{' '}
                    <span className="text-emerald-700 font-semibold">({c.percent}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-800 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${c.percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>Pending: {c.pending} schools</span>
                  <span>Target: {c.total} labs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filterable Schools Grid */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Master School Directory ({filteredSchools.length} Filtered / {schools.length} Total)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Filtered view by district, lab format, and status
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportFilteredSchoolsToExcel(filteredSchools, statusMap, `Filtered Schools (${filteredSchools.length})`)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Filtered ({filteredSchools.length}) (.xlsx)</span>
              </button>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search UDISE, SNIL, Name..."
                  className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Lab Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Only Completed</option>
              <option value="PENDING">Only Pending</option>
            </select>
          </div>
        </div>

        {/* Schools Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">UDISE / SNIL</th>
                <th className="py-3 px-4">School Name</th>
                <th className="py-3 px-4">District / Block</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Installed By</th>
                <th className="py-3 px-4">Installation Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSchools.slice(0, 100).map((s, idx) => {
                const info = statusMap[s.udise] || {};
                const isCompleted = info.status === 'Completed';
                const installedBy = info.installedBy || info.updatedBy;
                const formattedDate = info.date ? formatDateDDMMMYYYY(info.date) : '-';

                return (
                  <tr key={s.udise} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <div>{s.udise}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{s.snil}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {s.school_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.district}, {s.block}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {CATEGORY_LABELS[s.category] || s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isCompleted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {installedBy ? (
                        <div>
                          <span className="font-bold">{installedBy}</span>
                          <div className="text-[10px] text-slate-400 font-mono">{info.mobile}</div>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSchools.length > 100 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
            Showing first 100 of {filteredSchools.length} schools. Use filters above or click "Export Row-Wise Excel" to download the full dataset.
          </div>
        )}
      </div>
    </div>
  );
}
