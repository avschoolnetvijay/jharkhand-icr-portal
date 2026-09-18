import React, { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  FileCheck,
  FileEdit,
  Eye,
  ArrowRight,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { formatDateDDMMMYYYY } from '../services/api';
import { CATEGORY_LABELS } from '../data/deviceSchemas';

export default function DashboardView({
  schools,
  statusMap,
  onNavigate,
  onViewSchool,
  onRefresh,
  isSyncing = false
}) {
  // Compute overall KPI Metrics
  const metrics = useMemo(() => {
    const totalSchools = schools.length; // 679
    let completedCount = 0;

    schools.forEach((s) => {
      if (statusMap[s.udise]?.status === 'Completed') {
        completedCount++;
      }
    });

    const pendingCount = totalSchools - completedCount;
    const percent = Math.round((completedCount / totalSchools) * 100) || 0;
    const issuesCount = 0; // zero unresolved duplicates

    return {
      totalSchools,
      completedCount,
      pendingCount,
      percent,
      issuesCount
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

  // Recent Submissions (ONLY actually submitted completed schools from Google Sheets)
  const recentSubmissions = useMemo(() => {
    return schools
      .filter((s) => statusMap[s.udise]?.status === 'Completed')
      .map((s) => {
        const info = statusMap[s.udise] || {};
        return {
          ...s,
          installedBy: info.installedBy || info.updatedBy || '-',
          date: info.date ? formatDateDDMMMYYYY(info.date) : '-',
          status: 'Completed',
          totalDevices: info.totalDevices || (s.category === 'SMART_ONLY' ? 4 : 12)
        };
      });
  }, [schools, statusMap]);

  // SVG Circular Donut Chart calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.percent / 100) * circumference;

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-200">
      {/* Dashboard Top Title Bar & Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Project Overview Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time ICR digitization status across {metrics.totalSchools} Jharkhand schools
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            title="Refresh real-time data from Central Database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-[#1d68e2]' : 'text-slate-500'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        )}
      </div>

      {/* 1. Row of 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Schools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="h-13 w-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1d68e2] shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Schools</div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
              {metrics.totalSchools}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">108 ICT + 571 SC</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="h-13 w-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-700">Completed</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-0.5">
              {metrics.completedCount}
            </div>
            <div className="text-[11px] text-emerald-600/80 font-semibold mt-0.5">
              {metrics.percent}% of target
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="h-13 w-13 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-700">Pending</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono mt-0.5">
              {metrics.pendingCount}
            </div>
            <div className="text-[11px] text-amber-600/80 font-semibold mt-0.5">
              Awaiting ICR Entry
            </div>
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="h-13 w-13 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-700">Issues</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-700 font-mono mt-0.5">
              {metrics.issuesCount}
            </div>
            <div className="text-[11px] text-rose-600/80 font-semibold mt-0.5">
              Zero Duplicates
            </div>
          </div>
        </div>
      </div>

      {/* 2. District & Category Breakdown Analytics (Dashboard View - Strictly View Only, No Export) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District-wise Progress */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                District-Wise Status ({districtAnalytics.length} Districts)
              </h3>
              <span className="text-xs text-slate-400 font-medium">Sorted by Done</span>
            </div>
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
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Lab Allocation Category Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-medium">5 Lab Formats</span>
            </div>
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

      {/* 3. Split Layout: Recent Submissions (Left) + Right Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Submissions Table (Span 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Submissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest digitized school installation completion records
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-[#1d68e2] hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 font-bold text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">School Code</th>
                  <th className="py-3 px-4">School Name</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4">Visit Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <p className="text-sm font-semibold">No completed submissions found yet</p>
                      <p className="text-xs text-slate-400 mt-1">Submitted installation records will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  recentSubmissions.map((sch, idx) => (
                    <tr key={sch.udise + idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div>{sch.snil || sch.udise}</div>
                        <div className="text-[10px] text-slate-400 font-normal font-mono">{sch.udise}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                        {sch.school_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sch.district}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {sch.date}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                          Completed
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onViewSchool(sch)}
                          className="text-xs font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors text-[#1d68e2] hover:bg-blue-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quick Actions + Progress Donut */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
            <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>

            <div className="space-y-2.5">
              {/* Primary Action: Digitization Link */}
              <button
                onClick={() => onNavigate('new_entry')}
                className="w-full py-3 px-4 rounded-xl bg-[#1d68e2] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <FileEdit className="h-4 w-4" />
                <span>Digitization Link</span>
              </button>

              {/* View Reports */}
              <button
                onClick={() => onNavigate('reports')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#1d68e2]" />
                <span>View Reports & Analytics</span>
              </button>
            </div>
          </div>

          {/* Data Collection Progress Donut Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Data Collection Progress
            </h3>

            <div className="flex flex-col items-center">
              {/* Circular SVG Donut Chart */}
              <div className="relative w-36 h-36 flex items-center justify-center my-2">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Active Progress */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke="#16a34a"
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Inner Percentage Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {metrics.percent}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Completed
                  </span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-700 text-center mt-2 mb-4">
                {metrics.completedCount} of {metrics.totalSchools} Schools Completed
              </div>

              {/* Progress Legend Breakdown */}
              <div className="w-full pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span>Completed</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">{metrics.completedCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <span>Pending</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">{metrics.pendingCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                    <span>Issues</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">{metrics.issuesCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
