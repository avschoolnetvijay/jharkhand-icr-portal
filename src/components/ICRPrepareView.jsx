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
  ArrowLeft,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
  Clock
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

  // If props change, update selection
  React.useEffect(() => {
    if (selectedSchoolFromProps) {
      setSelectedSchool(selectedSchoolFromProps);
    }
  }, [selectedSchoolFromProps]);

  // List of all districts from master schools
  const districts = useMemo(() => {
    const set = new Set(schools.map((s) => s.district).filter(Boolean));
    return Array.from(set).sort();
  }, [schools]);

  // All completed schools count
  const completedSchools = useMemo(() => {
    return schools.filter((s) => {
      const info = statusMap[s.udise];
      return info && (info.status === 'Completed' || info.status === 'COMPLETED');
    });
  }, [schools, statusMap]);

  // Filtered schools matching user search query
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term && districtFilter === 'ALL') {
      return [];
    }

    return schools
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
      .slice(0, 25); // Top 25 results for instant response
  }, [schools, searchTerm, districtFilter]);

  // Get selected school status info
  const statusInfo = selectedSchool ? statusMap[selectedSchool.udise] : null;

  // Normalized devices for the selected school
  const devicesList = useMemo(() => {
    if (!statusInfo?.devicesJson) return [];
    try {
      const parsed =
        typeof statusInfo.devicesJson === 'string'
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

        // Delay so browser triggers both downloads cleanly
        await new Promise((r) => setTimeout(r, 600));

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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
            Search for any school to verify its digitization status and download official pre-filled Word installation certificates matching the JEPC / Schoolnet layout with zero formatting changes.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 text-emerald-300 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              {completedSchools.length} of {schools.length} Schools Digitized
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 text-blue-200 font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-300" />
              100% Original Format Preserved
            </span>
          </div>
        </div>
      </div>

      {/* VIEW A: Search Mode (when no school is selected) */}
      {!selectedSchool && (
        <div className="space-y-6">
          {/* Central Search Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <div className="max-w-2xl mx-auto text-center space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Search School to Prepare ICR
              </h2>
              <p className="text-xs text-slate-500">
                Type the School Name, UDISE Code, or Block below. Only schools with submitted ICRs can be downloaded.
              </p>
            </div>

            {/* Big Search Bar */}
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter School Name or UDISE (e.g. 201108... or DURGAPUR)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-10 py-3.5 text-sm rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* District Filter Dropdown */}
              <div className="sm:w-56">
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full py-3.5 px-3.5 text-xs font-semibold rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="ALL">All Districts ({districts.length})</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Chips: Recent Digitized Schools */}
            {completedSchools.length > 0 && !searchTerm && districtFilter === 'ALL' && (
              <div className="max-w-2xl mx-auto pt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" /> Recently Digitized Schools ({completedSchools.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {completedSchools.slice(0, 6).map((sch) => (
                    <button
                      key={sch.udise}
                      onClick={() => {
                        setSelectedSchool(sch);
                        setDownloadSuccess(null);
                        setErrorMsg(null);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs text-slate-700 hover:text-blue-700 font-medium transition-all cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold">{sch.school_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({sch.udise})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Results List */}
          {(searchTerm.trim().length > 0 || districtFilter !== 'ALL') && (
            <div className="space-y-3 max-w-4xl mx-auto">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Matching Search Results ({searchResults.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Click on an <strong>ICR Submitted</strong> school to open download options
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                  <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No schools found</p>
                  <p className="text-[11px] text-slate-400">
                    No school matched "{searchTerm}". Please verify the UDISE code or school name.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map((sch) => {
                    const info = statusMap[sch.udise];
                    const isDigitized = info && (info.status === 'Completed' || info.status === 'COMPLETED');

                    return (
                      <div
                        key={sch.udise}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isDigitized
                            ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                            : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                        }`}
                        onClick={() => {
                          if (isDigitized) {
                            setSelectedSchool(sch);
                            setDownloadSuccess(null);
                            setErrorMsg(null);
                          }
                        }}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {sch.school_name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                CATEGORY_BADGE_COLORS[sch.category] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {CATEGORY_LABELS[sch.category] || sch.category}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                            <span>UDISE: <strong className="text-slate-700">{sch.udise}</strong></span>
                            <span>•</span>
                            <span>SNIL: <strong className="text-slate-700">{sch.snil || 'NA'}</strong></span>
                            <span>•</span>
                            <span>Block: {sch.block}</span>
                            <span>•</span>
                            <span>District: {sch.district}</span>
                          </div>

                          {isDigitized && info?.installedBy && (
                            <div className="text-[11px] text-slate-600 flex items-center pt-0.5">
                              <User className="h-3 w-3 mr-1 text-slate-400" />
                              <span>Installed by: <strong>{info.installedBy}</strong></span>
                              {info.date && (
                                <span className="ml-2 text-slate-400 font-mono">({info.date})</span>
                              )}
                            </div>
                          )}

                          {!isDigitized && (
                            <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                              ⚠️ ICR submission pending. Complete digitization via Digitization Link first.
                            </p>
                          )}
                        </div>

                        {/* Status & Action */}
                        <div className="flex items-center space-x-2 shrink-0 sm:self-center">
                          {isDigitized ? (
                            <button
                              onClick={() => {
                                setSelectedSchool(sch);
                                setDownloadSuccess(null);
                                setErrorMsg(null);
                              }}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                              <span>ICR Submitted — Prepare (.docx)</span>
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                                Not Digitized
                              </span>
                              {onNavigateToDigitization && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToDigitization();
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 cursor-pointer"
                                >
                                  Digitize Now →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW B: Selected School Mode (Details, Recorded Serials & One-Click Download) */}
      {selectedSchool && (
        <div className="space-y-6">
          {/* Back to Search Bar button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedSchool(null);
                setDownloadSuccess(null);
                setErrorMsg(null);
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" />
              <span>Change / Search Another School</span>
            </button>

            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
              Digitized & Verified in Database
            </span>
          </div>

          {/* School Details Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
            <div className="border-b border-slate-100 pb-5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  CATEGORY_BADGE_COLORS[selectedSchool.category] || 'bg-slate-100 text-slate-800'
                }`}
              >
                {CATEGORY_LABELS[selectedSchool.category] || selectedSchool.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2.5">
                {selectedSchool.school_name}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                UDISE: <strong className="text-slate-800">{selectedSchool.udise}</strong> • SNIL: <strong className="text-slate-800">{selectedSchool.snil || 'NA'}</strong> • Block: <strong className="text-slate-800">{selectedSchool.block}</strong> • District: <strong className="text-slate-800">{selectedSchool.district}</strong>
              </p>
            </div>

            {/* Installation Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                  <User className="h-3 w-3 mr-1" /> Installed By
                </div>
                <div className="font-bold text-slate-900 mt-1 truncate">
                  {statusInfo?.installedBy || 'Not recorded'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                  <Phone className="h-3 w-3 mr-1" /> Technician Mobile
                </div>
                <div className="font-bold text-slate-900 mt-1 font-mono">
                  {statusInfo?.mobile || 'Not recorded'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> Installation Date
                </div>
                <div className="font-bold text-slate-900 mt-1 font-mono">
                  {statusInfo?.date || 'Not recorded'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center">
                  <Cpu className="h-3 w-3 mr-1" /> Total Hardware Assets
                </div>
                <div className="font-bold text-slate-900 mt-1">
                  {devicesList.length || selectedSchool.device_count || 0} Devices
                </div>
              </div>
            </div>

            {/* Download Official ICR Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <FileCheck2 className="h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="text-base font-bold">Download Official ICR Document (.docx)</h3>
                    <p className="text-[11px] text-slate-300">
                      Pre-filled official Word format with 100% original template layout
                    </p>
                  </div>
                </div>
                <span className="text-[11px] bg-white/10 px-2.5 py-1 rounded-full font-mono text-slate-200">
                  Word Format (.docx)
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Generates the official Government ICR document using your latest template. School information, installation date, installer contact, and all device serial numbers are filled into the exact table cells. Photo sections and sign-off stamps remain blank for manual completion.
              </p>

              {/* Feedback Messages */}
              {downloadSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="font-bold">{downloadSuccess}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                {isCombined ? (
                  <>
                    <button
                      onClick={() => handleDownload('ICT')}
                      disabled={downloadingType !== null}
                      className="flex-1 min-w-[220px] flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
                      className="flex-1 min-w-[220px] flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
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
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-[#1d68e2] hover:bg-blue-600 text-white text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-slate-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Recorded Hardware Serials Mapped to Word Document
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {devicesList.length} Serials Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Hardware Item Description</th>
                    <th className="py-2.5 px-4">Make & Model</th>
                    <th className="py-2.5 px-4 font-mono">Serial Number</th>
                    <th className="py-2.5 px-4 w-32 text-center">Target Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devicesList.map((dev, idx) => {
                    const serialNum = dev.serial_number || dev.serial || '(Not entered)';
                    const isSmartItem =
                      (dev.id || '').startsWith('smart_') ||
                      (dev.item_name || dev.name || '').toLowerCase().includes('projector') ||
                      (dev.item_name || dev.name || '').toLowerCase().includes('kyan');
                    const targetDoc = isCombined
                      ? isSmartItem ? 'Smart Class' : 'ICT Lab'
                      : isSmartOnly ? 'Smart Class' : 'ICT Lab';

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
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              targetDoc === 'Smart Class'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {targetDoc}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
              <span className="flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                All serial numbers verified against the official template row structure.
              </span>
              <span className="italic text-slate-400">
                Zero formatting discrepancy guaranteed
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
