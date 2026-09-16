import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  Send,
  ShieldCheck,
  Phone,
  User,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  Check,
  Layers
} from 'lucide-react';
import { CATEGORY_LABELS, getCategoryDevices } from '../data/deviceSchemas';
import {
  checkSerialDuplicate,
  submitICR,
  formatDateDDMMMYYYY,
  getAllInventoryRows
} from '../services/api';
import {
  exportSingleSchoolICRToExcel,
  exportFullProjectToExcel
} from '../services/excelStyles';
import SchoolSearch from './SchoolSearch';
import ReadOnlySubmissionView from './ReadOnlySubmissionView';

export default function NewDataCollectionView({
  schools,
  statusMap,
  selectedSchool,
  onSelectSchool,
  onSubmissionSuccess,
  onNavigate
}) {
  // Form State
  const [installedBy, setInstalledBy] = useState('');
  const [techMobile, setTechMobile] = useState('');
  const [installDate, setInstallDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [deviceList, setDeviceList] = useState([]);
  const [serialValues, setSerialValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSerialId, setCheckingSerialId] = useState(null);
  const [submissionSuccessData, setSubmissionSuccessData] = useState(null);
  const [isExportingMaster, setIsExportingMaster] = useState(false);

  // When selectedSchool changes, initialize device list
  useEffect(() => {
    if (selectedSchool) {
      const devs = getCategoryDevices(selectedSchool.category);
      setDeviceList(devs);
      const initialSerials = {};
      devs.forEach((d) => {
        initialSerials[d.id] = '';
      });
      setSerialValues(initialSerials);
      setFieldErrors({});
      setSubmissionSuccessData(null);
    } else {
      setDeviceList([]);
      setSerialValues({});
      setFieldErrors({});
    }
  }, [selectedSchool]);

  const isCompleted = selectedSchool && statusMap[selectedSchool.udise]?.status === 'Completed';

  // Count filled serials
  const filledCount = useMemo(() => {
    return Object.values(serialValues).filter((v) => (v || '').trim().length > 0).length;
  }, [serialValues]);

  // Group devices into clear sub-sections with separation headers (e.g. ICT Lab vs Smart Class)
  const deviceSections = useMemo(() => {
    if (!selectedSchool || deviceList.length === 0) return [];

    if (selectedSchool.category === 'ICT_05_INCS_WITH_SMART') {
      const ictDevices = deviceList.filter((d) => (d.section || '').includes('ICT'));
      const smartDevices = deviceList.filter((d) => (d.section || '').includes('Smart'));
      return [
        {
          title: 'ICT Lab Section (8 Devices)',
          subtitle: 'Chromebooks, INCS Hub, Multifunctional Printer & Dedicated UPS',
          icon: 'ict',
          devices: ictDevices
        },
        {
          title: 'Smart Class Section (4 Devices)',
          subtitle: 'Integrated Interactive Projector (KYAN Units) & Dedicated UPS',
          icon: 'smart',
          devices: smartDevices
        }
      ];
    }

    if (selectedSchool.category === 'SMART_ONLY') {
      return [
        {
          title: 'Smart Class Section (4 Devices)',
          subtitle: 'Integrated Interactive Projector (KYAN Units) & Dedicated UPS',
          icon: 'smart',
          devices: deviceList
        }
      ];
    }

    if (selectedSchool.category === 'ICT_05_INCS_ONLY') {
      return [
        {
          title: 'ICT Lab Section (8 Devices)',
          subtitle: 'Chromebooks, INCS Hub, Multifunctional Printer & Dedicated UPS',
          icon: 'ict',
          devices: deviceList
        }
      ];
    }

    return [
      {
        title: `${CATEGORY_LABELS[selectedSchool.category] || 'ICT Lab Infrastructure'} (${deviceList.length} Devices)`,
        subtitle: 'Hardware Devices, AV & Power Equipment',
        icon: 'ict',
        devices: deviceList
      }
    ];
  }, [selectedSchool, deviceList]);

  // Serial Change handler (Force Uppercase)
  const handleSerialChange = (id, val) => {
    const upperVal = val.trim().toUpperCase();
    setSerialValues((prev) => ({ ...prev, [id]: upperVal }));

    // Clear error for this field
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // Real-time serial duplicate check on blur
  const handleSerialBlur = async (id, currentVal) => {
    if (!currentVal || !selectedSchool) return;

    // 1. Intra-form duplicate check (same serial entered twice in current form)
    const duplicateId = Object.keys(serialValues).find(
      (key) => key !== id && serialValues[key] === currentVal
    );
    if (duplicateId) {
      setFieldErrors((prev) => ({
        ...prev,
        [id]: `Duplicate! Same serial entered for another device in this form.`
      }));
      return;
    }

    // 2. Cross-school duplicate check against Google Sheets
    setCheckingSerialId(id);
    try {
      const res = await checkSerialDuplicate(currentVal, selectedSchool.udise);
      if (res.exists) {
        setFieldErrors((prev) => ({
          ...prev,
          [id]: `Duplicate! Serial already registered in ${res.match.schoolName} (${res.match.udise})`
        }));
      }
    } catch (e) {
      console.warn('Duplicate check warning:', e);
    } finally {
      setCheckingSerialId(null);
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSchool) {
      alert('Please search and select a school first.');
      return;
    }

    if (isCompleted) {
      alert('This school has already been digitized and completed.');
      return;
    }

    // Validation
    const errors = {};
    if (!installedBy.trim()) errors['installedBy'] = 'Technician name is required.';
    if (!techMobile.trim()) errors['techMobile'] = 'Mobile number is required.';
    if (!installDate) errors['installDate'] = 'Installation date is required.';

    deviceList.forEach((d) => {
      const val = (serialValues[d.id] || '').trim();
      if (!val) {
        errors[d.id] = `${d.itemName || d.item_name || d.label || 'Device'} serial is required.`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      alert(`Please fill all required fields: ${firstError}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionPayload = {
        udise: selectedSchool.udise,
        snil: selectedSchool.snil,
        school_name: selectedSchool.school_name,
        district: selectedSchool.district,
        block: selectedSchool.block,
        category: selectedSchool.category,
        installed_by: installedBy.trim(),
        technician_mobile: techMobile.trim(),
        installation_date: installDate,
        devices: deviceList.map((d) => ({
          id: d.id,
          name: d.itemName || d.item_name || d.label,
          make: `${d.make || ''} ${d.model || d.specs || ''}`.trim() || 'Standard Spec',
          serial: serialValues[d.id].trim().toUpperCase()
        }))
      };

      const result = await submitICR(submissionPayload);
      setSubmissionSuccessData({
        ...result,
        school: selectedSchool,
        devices: deviceList,
        serialValues: { ...serialValues },
        installedBy,
        technicianMobile: techMobile,
        installDate
      });

      if (onSubmissionSuccess) {
        onSubmissionSuccess(selectedSchool.udise);
      }
    } catch (err) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export handlers
  const handleExportSingleICR = () => {
    if (!submissionSuccessData) return;
    exportSingleSchoolICRToExcel({
      school: submissionSuccessData.school,
      devices: submissionSuccessData.devices,
      serialValues: submissionSuccessData.serialValues,
      installedBy: submissionSuccessData.installedBy,
      technicianMobile: submissionSuccessData.technicianMobile,
      installDate: submissionSuccessData.installDate,
      submissionId: submissionSuccessData.submissionId
    });
  };

  const handleExportMaster = async () => {
    setIsExportingMaster(true);
    try {
      const inventory = await getAllInventoryRows();
      exportFullProjectToExcel(inventory, schools, statusMap);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExportingMaster(false);
    }
  };

  // -------------------------------------------------------------
  // SUCCESS SCREEN (Visible right after submission with Excel option)
  // -------------------------------------------------------------
  if (submissionSuccessData) {
    return (
      <div className="max-w-2xl mx-auto my-6 sm:my-10 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 text-center shadow-sm animate-in fade-in duration-300">
        <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-black text-slate-900">
          School Successfully Digitized!
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          {submissionSuccessData.school.school_name} (UDISE: {submissionSuccessData.school.udise}) has been recorded row-wise into Google Sheets.
        </p>

        {/* Details Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left font-mono space-y-1.5 max-w-md mx-auto">
          <div className="flex justify-between">
            <span className="text-slate-500">Submission ID:</span>
            <span className="font-bold text-slate-900">{submissionSuccessData.submissionId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Installed By:</span>
            <span className="font-bold text-slate-900">{submissionSuccessData.installedBy}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Installation Date:</span>
            <span className="font-bold text-slate-900">{formatDateDDMMMYYYY(submissionSuccessData.installDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Devices Recorded:</span>
            <span className="font-bold text-emerald-700">{submissionSuccessData.devices.length} Physical Devices</span>
          </div>
        </div>

        {/* EXCEL EXPORT OPTIONS (Highlighted & Colorful) */}
        <div className="mt-6 p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 max-w-md mx-auto space-y-2.5">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center justify-center space-x-1.5">
            <FileSpreadsheet className="h-4 w-4 text-[#1d68e2]" />
            <span>Official Excel Reports</span>
          </div>

          <button
            onClick={handleExportSingleICR}
            className="w-full py-3 px-4 rounded-xl bg-[#1d68e2] hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download School Installation ICR (.xlsx)</span>
          </button>

          <button
            onClick={handleExportMaster}
            disabled={isExportingMaster}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-emerald-700" />
            <span>{isExportingMaster ? 'Generating Excel...' : 'Download Full Master Register (.xlsx)'}</span>
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              setSubmissionSuccessData(null);
              if (onSelectSchool) onSelectSchool(null);
            }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            + Digitize Another School
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN SINGLE-PAGE DIGITIZATION VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Title strictly: "ICT 108 & SC 664 Project Digitization" */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          ICT 108 & SC 664 Project Digitization
        </h2>
      </div>

      {/* Search Box Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
          Search School (UDISE, SNIL, or Name) *
        </label>
        <SchoolSearch
          schools={schools}
          statusMap={statusMap}
          onSelectSchool={onSelectSchool}
          selectedSchool={selectedSchool}
        />
      </div>

      {/* When a School is Selected: Show Everything on ONE Single Page */}
      {selectedSchool && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* School Header Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-[#1d68e2] border border-blue-200">
                    UDISE: {selectedSchool.udise}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    SNIL: {selectedSchool.snil}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedSchool.school_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  District: <strong className="text-slate-700">{selectedSchool.district}</strong> | Block: <strong className="text-slate-700">{selectedSchool.block}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {isCompleted ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Already Digitized
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Pending Entry
                  </span>
                )}
                <button
                  onClick={() => onSelectSchool(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  Change School
                </button>
              </div>
            </div>

            {/* If Already Completed -> Show ReadOnly View */}
            {isCompleted ? (
              <div className="mt-4">
                <ReadOnlySubmissionView
                  school={selectedSchool}
                  statusInfo={statusMap[selectedSchool.udise]}
                />
              </div>
            ) : (
              /* If Pending -> Show Entire Single-Page Form */
              <form onSubmit={handleSubmit} className="mt-5 space-y-6">
                {/* 1. Installation Details Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-[#1d68e2]" />
                    <span>Installation & Field Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Installed By */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Installed By *
                      </label>
                      <input
                        type="text"
                        value={installedBy}
                        onChange={(e) => setInstalledBy(e.target.value)}
                        placeholder="Enter the Installation Team Name"
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#1d68e2] outline-hidden transition-all ${
                          fieldErrors['installedBy'] ? 'border-red-400 bg-red-50/40' : 'border-slate-200'
                        }`}
                      />
                      {fieldErrors['installedBy'] && (
                        <p className="text-[10px] text-red-600 font-medium mt-1">
                          {fieldErrors['installedBy']}
                        </p>
                      )}
                    </div>

                    {/* Mobile No. */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Mobile No. *
                      </label>
                      <input
                        type="tel"
                        value={techMobile}
                        onChange={(e) => setTechMobile(e.target.value)}
                        placeholder="Enter 10-digit Mobile No."
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#1d68e2] outline-hidden transition-all ${
                          fieldErrors['techMobile'] ? 'border-red-400 bg-red-50/40' : 'border-slate-200'
                        }`}
                      />
                      {fieldErrors['techMobile'] && (
                        <p className="text-[10px] text-red-600 font-medium mt-1">
                          {fieldErrors['techMobile']}
                        </p>
                      )}
                    </div>

                    {/* Installation Date */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Installation Date *
                      </label>
                      <input
                        type="date"
                        value={installDate}
                        onChange={(e) => setInstallDate(e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#1d68e2] outline-hidden transition-all ${
                          fieldErrors['installDate'] ? 'border-red-400 bg-red-50/40' : 'border-slate-200'
                        }`}
                      />
                      {fieldErrors['installDate'] && (
                        <p className="text-[10px] text-red-600 font-medium mt-1">
                          {fieldErrors['installDate']}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Hardware Devices & Serial Numbers Section (with ICT and Smart Class separation) */}
                <div className="space-y-5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <Cpu className="h-3.5 w-3.5 text-[#1d68e2]" />
                      <span>
                        Hardware Serial Numbers ({deviceList.length} Devices Required)
                      </span>
                    </h4>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {filledCount} / {deviceList.length} Serials Entered
                    </span>
                  </div>

                  {deviceSections.map((sec) => (
                    <div key={sec.title} className="space-y-3 pt-2">
                      {/* Section Separation Header (ICT Lab vs Smart Class) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-3 rounded-xl bg-slate-100/90 border border-slate-200/90">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-7 w-7 rounded-lg bg-white shadow-2xs flex items-center justify-center text-[#1d68e2] shrink-0">
                            {sec.icon === 'smart' ? (
                              <Layers className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Cpu className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                              {sec.title}
                            </h5>
                            <p className="text-[10px] text-slate-500">
                              {sec.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 self-start sm:self-auto">
                          {sec.devices.filter((d) => (serialValues[d.id] || '').trim().length > 0).length} / {sec.devices.length} Entered
                        </span>
                      </div>

                      {/* Device Input Cards for this Section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {sec.devices.map((dev) => {
                          const isChecking = checkingSerialId === dev.id;
                          const hasError = fieldErrors[dev.id];
                          const val = serialValues[dev.id] || '';
                          const globalIdx = deviceList.findIndex((d) => d.id === dev.id);

                          return (
                            <div
                              key={dev.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                hasError
                                  ? 'border-red-300 bg-red-50/20'
                                  : val
                                  ? 'border-emerald-200 bg-emerald-50/10'
                                  : 'border-slate-200 bg-slate-50/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-xs font-bold text-slate-900 leading-tight">
                                  {globalIdx + 1}. {dev.itemName || dev.item_name || dev.label || 'Device'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                  {dev.make} {dev.model ? `• ${dev.model}` : ''}
                                </span>
                              </div>

                              <div className="relative">
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleSerialChange(dev.id, e.target.value)}
                                  onBlur={(e) => handleSerialBlur(dev.id, e.target.value)}
                                  placeholder={dev.placeholder || `Enter ${dev.itemName || 'Device'} Serial Number`}
                                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:border-[#1d68e2] focus:ring-1 focus:ring-blue-500 outline-hidden transition-all ${
                                    hasError ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                                  }`}
                                />
                                {isChecking && (
                                  <div className="absolute right-2.5 top-2.5">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                  </div>
                                )}
                                {val && !hasError && !isChecking && (
                                  <div className="absolute right-2.5 top-2.5 text-emerald-600">
                                    <Check className="h-4 w-4" />
                                  </div>
                                )}
                              </div>

                              {hasError && (
                                <p className="text-[11px] text-red-600 font-medium mt-1">
                                  {hasError}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Submit Action Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    All hardware serials will be stored row-wise into Google Sheets.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#1d68e2] hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting to Google Sheets...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit & Digitize ICR ({filledCount}/{deviceList.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
