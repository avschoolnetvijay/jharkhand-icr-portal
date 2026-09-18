import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Building2,
  MapPin,
  Cpu,
  Layers,
  ArrowRight,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_BADGE_COLORS } from '../data/deviceSchemas';
import { generateIcrDocx, triggerBrowserDownload } from '../services/docGenerator';

export default function ICRPrepareView({
  schools = [],
  statusMap = {},
  selectedSchoolFromProps = null,
  onNavigateToDigitization
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [selectedSchool, setSelectedSchool] = useState(selectedSchoolFromProps || null);
  const [downloadingType, setDownloadingType] = useState(null); // 'ICT' | 'SMART' | 'BOTH' | null
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Filter completed schools ONLY
  const completedSchools = useMemo(() => {
    return schools.filter(s => {
      const info = statusMap[s.udise];
      return info && (info.status === 'Completed' || info.status === 'COMPLETED');
    });
  }, [schools, statusMap]);

  // 2. Districts list for filter dropdown (from completed schools)
  const districts = useMemo(() => {
    const set = new Set(completedSchools.map(s => s.district).filter(Boolean));
    return Array.from(set).sort();
  }, [completedSchools]);

  // 3. Search and district filtered list
  const filteredSchools = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return completedSchools.filter(s => {
      const matchDistrict = districtFilter === 'ALL' || s.district === districtFilter;
      if (!matchDistrict) return false;

      if (!term) return true;
      return (
        (s.school_name || '').toLowerCase().includes(term) ||
        String(s.udise || '').includes(term) ||
        (s.block || '').toLowerCase().includes(term) ||
        (s.snil || '').toLowerCase().includes(term)
      );
    });
  }, [completedSchools, searchTerm, districtFilter]);

  // Auto-select first school if none selected and list is available
  React.useEffect(() => {
    if (!selectedSchool && filteredSchools.length > 0) {
      setSelectedSchool(filteredSchools[0]);
    }
  }, [filteredSchools, selectedSchool]);

  // Get selected school status info
  const statusInfo = selectedSchool ? statusMap[selectedSchool.udise] : null;

  // Normalized devices for the selected school
  const devicesList = useMemo(() => {
    if (!statusInfo?.devicesJson) return [];
    try {
      const parsed = typeof statusInfo.devicesJson === 'string'
        ? JSON.parse(statusInfo.devicesJson)
        : statusInfo.devicesJson;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [statusInfo]);

  // Download Handler
  const handleDownload = async (targetType) => {
    if (!selectedSchool || !statusInfo) return;
    setErrorMsg(null);
    setDownloadSuccess(null);
    setDownloadingType(targetType);

    try {
      if (targetType === 'BOTH') {
        // Download ICT first
        const ictRes = await generateIcrDocx(selectedSchool, statusInfo, 'ICT');
        triggerBrowserDownload(ictRes.blob, ictRes.filename);

        // Small delay so browser triggers both downloads cleanly
        await new Promise(r => setTimeout(r, 600));

        // Download Smart Class next
        const smartRes = await generateIcrDocx(selectedSchool, statusInfo, 'SMART');
        triggerBrowserDownload(smartRes.blob, smartRes.filename);

        setDownloadSuccess(`Both ICR documents (.docx) downloaded successfully!`);
      } else {
        const res = await generateIcrDocx(selectedSchool, statusInfo, targetType);
        triggerBrowserDownload(res.blob, res.filename);
        setDownloadSuccess(`Official ${res.docType} ICR (.docx) downloaded successfully!`);
      }
    } catch (err) {
      console.error('Download error:', err);
      setErrorMsg(`Failed to generate document: ${err.message}`);
    } finally {
      setDownloadingType(null);
    }
  };

  const isCombined = selectedSchool?.category === 'ICT_05_INCS_WITH_SMART';
  const isSmartOnly = selectedSchool?.category === 'SMART_ONLY';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Official Government ICR Generator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            ICR Prepare & Word (.docx) Export
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Search completed digitized schools, verify all recorded hardware serial numbers, and download official pre-filled Word documents matching the exact JEPC / Schoolnet layout with zero formatting discrepancy.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 text-emerald-300 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              {completedSchools.length} Digitized Schools Ready
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 text-blue-200 font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-300" />
              100% Original Word Layout Fidelity
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left List (School Picker) & Right Details (Document & Serials) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Filter & School Selector (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Completed Schools</h2>
              <p className="text-[11px] text-slate-500">Only digitized schools are listed</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {filteredSchools.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by school, UDISE, block..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          {/* District Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="flex-1 py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="ALL">All Districts ({districts.length})</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Scrollable School List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredSchools.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No completed schools found</p>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Schools will appear here once submitted via the Digitization Link.
                </p>
                {onNavigateToDigitization && (
                  <button
                    onClick={onNavigateToDigitization}
                    className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center"
                  >
                    Go to Digitization Link <ArrowRight className="h-3 w-3 ml-1" />
                  </button>
                )}
              </div>
            ) : (
              filteredSchools.map(s => {
                const isSel = selectedSchool?.udise === s.udise;
                const info = statusMap[s.udise];
                return (
                  <button
                    key={s.udise}
                    onClick={() => {
                      setSelectedSchool(s);
                      setDownloadSuccess(null);
                      setErrorMsg(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                      isSel
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                        {s.school_name}
                      </h4>
                      {isSel && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                      <span>UDISE: {s.udise}</span>
                      <span>•</span>
                      <span>{s.district}</span>
                    </div>
                    {info?.installedBy && (
                      <div className="mt-1 text-[10px] text-slate-600 flex items-center">
                        <User className="h-2.5 w-2.5 mr-1 text-slate-400" />
                        <span className="truncate">{info.installedBy}</span>
                        {info.date && (
                          <span className="ml-auto text-slate-400 font-mono">{info.date}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: School Details, Serials Table & Download Actions (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSchool ? (
            <>
              {/* School Details Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        CATEGORY_BADGE_COLORS[selectedSchool.category] || 'bg-slate-100 text-slate-800'
                      }`}>
                        {CATEGORY_LABELS[selectedSchool.category] || selectedSchool.category}
                      </span>
                      <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Digitized & Verified
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
                      {selectedSchool.school_name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      UDISE: <strong className="text-slate-700">{selectedSchool.udise}</strong> • SNIL: <strong className="text-slate-700">{selectedSchool.snil || 'NA'}</strong> • Block: <strong className="text-slate-700">{selectedSchool.block}</strong> • District: <strong className="text-slate-700">{selectedSchool.district}</strong>
                    </p>
                  </div>
                </div>

                {/* Installation Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                      <User className="h-3 w-3 mr-1" /> Installed By
                    </div>
                    <div className="font-bold text-slate-900 mt-1 truncate">
                      {statusInfo?.installedBy || 'Not recorded'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                      <Phone className="h-3 w-3 mr-1" /> Contact Mobile
                    </div>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {statusInfo?.mobile || 'Not recorded'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                      <Calendar className="h-3 w-3 mr-1" /> Installation Date
                    </div>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {statusInfo?.date || 'Not recorded'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                      <Cpu className="h-3 w-3 mr-1" /> Total Assets
                    </div>
                    <div className="font-bold text-slate-900 mt-1">
                      {devicesList.length || selectedSchool.device_count || 0} Devices
                    </div>
                  </div>
                </div>

                {/* Download Actions Panel */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCheck2 className="h-5 w-5 text-blue-400" />
                      <h3 className="text-sm font-bold">Download Official ICR Document (.docx)</h3>
                    </div>
                    <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full font-mono">
                      Word Format (.docx)
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Downloads the official JEPC / Schoolnet installation report with School details and Hardware Serial numbers pre-filled. Photo placeholders and signatures remain blank for physical attestation.
                  </p>

                  {/* Feedback Messages */}
                  {downloadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{downloadSuccess}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs flex items-center space-x-2 animate-in fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Buttons logic based on Category */}
                  <div className="pt-2 flex flex-wrap gap-3">
                    {isCombined ? (
                      <>
                        <button
                          onClick={() => handleDownload('ICT')}
                          disabled={downloadingType !== null}
                          className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {downloadingType === 'ICT' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span>Download ICT ICR (8 Devices)</span>
                        </button>

                        <button
                          onClick={() => handleDownload('SMART')}
                          disabled={downloadingType !== null}
                          className="flex-1 min-w-[200px] flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {downloadingType === 'SMART' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span>Download Smart Class ICR (4 Devices)</span>
                        </button>

                        <button
                          onClick={() => handleDownload('BOTH')}
                          disabled={downloadingType !== null}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          {downloadingType === 'BOTH' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Layers className="h-4 w-4" />
                          )}
                          <span>Download Both Documents (2 Files)</span>
                        </button>
                      </>
                    ) : isSmartOnly ? (
                      <button
                        onClick={() => handleDownload('SMART')}
                        disabled={downloadingType !== null}
                        className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {downloadingType === 'SMART' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>Download Official Smart Class ICR (.docx)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload('ICT')}
                        disabled={downloadingType !== null}
                        className="flex-1 flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-[#1d68e2] hover:bg-blue-600 text-white text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {downloadingType === 'ICT' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>Download Official ICT ICR (.docx)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hardware Serials Table Preview */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-slate-600" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      Digitized Hardware Serials Mapped to Document
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    {devicesList.length} Serials Recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Device Description</th>
                        <th className="py-2.5 px-4">Make & Model</th>
                        <th className="py-2.5 px-4 font-mono">Serial Number</th>
                        <th className="py-2.5 px-4 w-28 text-center">Target File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {devicesList.map((dev, idx) => {
                        const serialNum = dev.serial_number || dev.serial || '(Not entered)';
                        const isSmartItem = (dev.id || '').startsWith('smart_') ||
                          (dev.item_name || dev.name || '').toLowerCase().includes('projector') ||
                          (dev.item_name || dev.name || '').toLowerCase().includes('kyan');
                        const targetDoc = isCombined
                          ? (isSmartItem ? 'Smart Class' : 'ICT Lab')
                          : (isSmartOnly ? 'Smart Class' : 'ICT Lab');

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {dev.item_name || dev.name || dev.itemName}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 font-medium">
                              {dev.make_model || `${dev.make || ''} ${dev.model || ''}`.trim() || '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {serialNum}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                targetDoc === 'Smart Class'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {targetDoc}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
                  <span className="flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    All serial numbers are verified and matched with official table rows.
                  </span>
                  <span className="italic text-slate-400">
                    Ready for one-click generation
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
              <FileCheck2 className="h-12 w-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Select a School to Prepare ICR</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose any completed school from the list on the left to preview serials and generate the official filled Word document.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
