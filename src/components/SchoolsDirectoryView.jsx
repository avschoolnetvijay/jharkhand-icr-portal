import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { CATEGORY_LABELS } from '../data/deviceSchemas';
import { formatDateDDMMMYYYY, getAllInventoryRows, exportInventoryToExcel } from '../services/api';

export default function SchoolsDirectoryView({
  schools,
  statusMap,
  initialFilter = 'ALL', // 'ALL' | 'COMPLETED' | 'PENDING'
  title = 'Master School Directory',
  subtitle = 'List of all 679 Jharkhand schools across 24 districts',
  onDigitizeSchool,
  onViewSchool
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState(initialFilter);
  const [isExporting, setIsExporting] = useState(false);

  // Unique districts
  const uniqueDistricts = useMemo(() => {
    const dSet = new Set(schools.map((s) => s.district).filter(Boolean));
    return Array.from(dSet).sort();
  }, [schools]);

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.udise.toLowerCase().includes(q) ||
        s.snil.toLowerCase().includes(q) ||
        s.school_name.toLowerCase().includes(q) ||
        s.block.toLowerCase().includes(q);

      const matchesDistrict = selectedDistrict === 'ALL' || s.district === selectedDistrict;
      const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;

      const isDone = statusMap[s.udise]?.status === 'Completed';
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'COMPLETED' && isDone) ||
        (selectedStatus === 'PENDING' && !isDone);

      return matchesSearch && matchesDistrict && matchesCategory && matchesStatus;
    });
  }, [schools, statusMap, searchQuery, selectedDistrict, selectedCategory, selectedStatus]);

  // Handle Export
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle} ({filteredSchools.length} Filtered / {schools.length} Total)
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{isExporting ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Quick Search */}
          <div className="relative sm:col-span-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search UDISE, SNIL, Name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white outline-hidden font-medium"
            />
          </div>

          {/* District Filter */}
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Lab Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Only Completed</option>
              <option value="PENDING">Only Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 font-bold text-slate-600 border-b border-slate-200 z-10">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">School Code</th>
                <th className="py-3 px-4">School Name</th>
                <th className="py-3 px-4">District / Block</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Installed By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSchools.slice(0, 100).map((sch, idx) => {
                const info = statusMap[sch.udise] || {};
                const isCompleted = info.status === 'Completed';
                const installedBy = info.installedBy || info.updatedBy;
                const formattedDate = info.date ? formatDateDDMMMYYYY(info.date) : '-';

                return (
                  <tr key={sch.udise} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <div>{sch.snil}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{sch.udise}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                      {sch.school_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {sch.district}, {sch.block}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {CATEGORY_LABELS[sch.category] || sch.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isCompleted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isCompleted ? (
                        <button
                          onClick={() => onViewSchool(sch)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#1d68e2] hover:bg-blue-50 cursor-pointer"
                        >
                          View
                        </button>
                      ) : (
                        <button
                          onClick={() => onDigitizeSchool(sch)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-[#1d68e2] text-white hover:bg-blue-700 cursor-pointer shadow-2xs"
                        >
                          Digitize
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSchools.length > 100 && (
          <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
            Showing first 100 of {filteredSchools.length} schools. Use search or district filters above to refine.
          </div>
        )}
      </div>
    </div>
  );
}
