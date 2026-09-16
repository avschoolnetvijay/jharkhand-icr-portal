import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  User,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
  ShieldAlert,
  Info,
  Calendar
} from 'lucide-react';
import { getCategoryDevices } from '../data/deviceSchemas';
import { checkSerialDuplicate, submitICR, formatDateDDMMMYYYY } from '../services/api';

export default function DigitizationForm({ school, onSubmissionSuccess }) {
  const [installedBy, setInstalledBy] = useState('');
  const [techMobile, setTechMobile] = useState('');
  const [installDate, setInstallDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [deviceList, setDeviceList] = useState([]);
  const [serialValues, setSerialValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateModalData, setDuplicateModalData] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSerialId, setCheckingSerialId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const inputRefs = useRef({});

  useEffect(() => {
    if (school) {
      const devs = getCategoryDevices(school.category);
      setDeviceList(devs);
      const initialSerials = {};
      devs.forEach((d) => {
        initialSerials[d.id] = '';
      });
      setSerialValues(initialSerials);
      setFieldErrors({});
    }
  }, [school]);

  const groupedSections = React.useMemo(() => {
    const sections = {};
    deviceList.forEach((dev) => {
      const sec = dev.section || 'Lab Devices';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(dev);
    });
    return sections;
  }, [deviceList]);

  const handleSerialChange = (id, val) => {
    const upperVal = val.trim().toUpperCase();
    const updated = { ...serialValues, [id]: upperVal };
    setSerialValues(updated);
    validateInFormDuplicates(updated);
  };

  const validateInFormDuplicates = (currentValues) => {
    const counts = {};
    const errors = { ...fieldErrors };

    Object.entries(currentValues).forEach(([id, val]) => {
      if (val) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });

    Object.entries(currentValues).forEach(([id, val]) => {
      if (val && counts[val] > 1) {
        errors[id] = `Duplicate inside form: "${val}"`;
      } else if (errors[id] && errors[id].startsWith('Duplicate inside form')) {
        delete errors[id];
      }
    });

    setFieldErrors(errors);
  };

  const handleBlurCheck = async (id, val) => {
    const clean = (val || '').trim().toUpperCase();
    if (!clean) return;

    setCheckingSerialId(id);
    try {
      const res = await checkSerialDuplicate(clean, school.udise);
      if (res.exists && res.match) {
        setFieldErrors((prev) => ({
          ...prev,
          [id]: `Used in: ${res.match.schoolName} (${res.match.udise})`
        }));
        setDuplicateModalData({
          enteredSerial: clean,
          currentFieldId: id,
          match: res.match
        });
      } else {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          if (updated[id] && updated[id].startsWith('Used in:')) {
            delete updated[id];
          }
          return updated;
        });
      }
    } catch (e) {
      console.warn('Duplicate check error:', e);
    } finally {
      setCheckingSerialId(null);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextDev = deviceList[index + 1];
      if (nextDev && inputRefs.current[nextDev.id]) {
        inputRefs.current[nextDev.id].focus();
      }
    }
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    if (!installedBy.trim()) errors.installedBy = 'Installed By is required';
    if (!techMobile.trim() || !/^\d{10}$/.test(techMobile.trim())) {
      errors.techMobile = 'Valid 10-digit mobile number is required';
    }
    if (!installDate) errors.installDate = 'Installation date is required';

    let missingSerials = 0;
    deviceList.forEach((dev) => {
      const val = (serialValues[dev.id] || '').trim();
      if (!val) {
        errors[dev.id] = 'Serial number is required';
        missingSerials++;
      }
    });

    const hasDuplicates = Object.keys(fieldErrors).some(k => fieldErrors[k]);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0 || hasDuplicates) {
      alert(`Please resolve before submitting:\n${missingSerials > 0 ? `• ${missingSerials} serial number fields are empty.\n` : ''}${hasDuplicates ? '• Duplicate serial numbers detected.\n' : ''}${errors.installedBy ? '• ' + errors.installedBy + '\n' : ''}${errors.techMobile ? '• ' + errors.techMobile : ''}`);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const formattedDate = formatDateDDMMMYYYY(installDate);

      const devicesPayload = deviceList.map((d) => ({
        device_id: d.id,
        item_name: d.itemName,
        make_model: `${d.make} ${d.model}`,
        serial_number: (serialValues[d.id] || '').trim().toUpperCase(),
        section: d.section
      }));

      const payload = {
        udise: school.udise,
        snil: school.snil,
        school_name: school.school_name,
        district: school.district,
        block: school.block,
        category: school.category,
        installed_by: installedBy.trim(),
        technician_name: installedBy.trim(),
        technician_mobile: techMobile.trim(),
        installation_date: formattedDate,
        devices: devicesPayload
      };

      const result = await submitICR(payload);

      if (result.success) {
        alert(`Success: Recorded ${result.totalDevices} device serial numbers for ${school.school_name} into Google Sheets.`);
        onSubmissionSuccess(school.udise);
      } else {
        alert(`Submission Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDatePreview = formatDateDDMMMYYYY(installDate);

  // Count how many serials are filled
  const filledSerialsCount = Object.values(serialValues).filter(v => v.trim()).length;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-4 sm:mt-6 pb-20 sm:pb-0">
      {/* Form Header: Clean Institutional Bar */}
      <div className="bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-200 shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight">
              ICR Digitization & Serial Number Entry
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Copy-paste or type serial numbers directly from physical ICR
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
          <span className="text-slate-300">Total Items:</span>
          <span className="font-bold text-white">{deviceList.length} Rows</span>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Section 1: Installation Information */}
        <div className="bg-slate-50/80 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 flex items-center">
            <User className="h-4 w-4 mr-1.5 text-slate-700" />
            Installation Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Installed By */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                INSTALLED BY <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={installedBy}
                onChange={(e) => setInstalledBy(e.target.value)}
                placeholder="e.g. Rakesh Sharma"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg sm:rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-hidden transition-all text-base sm:text-sm"
              />
              {fieldErrors.installedBy && (
                <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.installedBy}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                10-DIGIT MOBILE NUMBER <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                required
                maxLength={10}
                value={techMobile}
                onChange={(e) => setTechMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg sm:rounded-xl font-mono text-slate-900 font-medium placeholder-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-hidden transition-all text-base sm:text-sm"
              />
              {fieldErrors.techMobile && (
                <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.techMobile}</p>
              )}
            </div>

            {/* Installation Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                  INSTALLATION DATE <span className="text-red-500">*</span>
                </label>
                {formattedDatePreview && (
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                    {formattedDatePreview}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg sm:rounded-xl text-slate-900 font-medium focus:border-slate-800 focus:ring-1 focus:ring-slate-800 outline-hidden transition-all text-base sm:text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Format: <strong>dd-mmm-yyyy</strong> (e.g. 13-Sep-2026)
              </span>
              {fieldErrors.installDate && (
                <p className="text-xs text-red-600 mt-1 font-semibold">{fieldErrors.installDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Hardware Serial Numbers */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                Hardware Device Serial Numbers
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Hardware items only (tables, chairs, whiteboards, loose batteries, software are excluded).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {filledSerialsCount}/{deviceList.length} Filled
            </span>
          </div>

          {Object.entries(groupedSections).map(([sectionTitle, devices]) => (
            <div key={sectionTitle} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100/70 px-3.5 sm:px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600 mr-2"></span>
                  {sectionTitle} ({devices.length})
                </span>
              </div>

              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {devices.map((dev) => {
                  const globalIdx = deviceList.findIndex((d) => d.id === dev.id);
                  const hasError = Boolean(fieldErrors[dev.id]);
                  const isChecking = checkingSerialId === dev.id;

                  return (
                    <div
                      key={dev.id}
                      className={`p-3 rounded-xl border transition-all ${
                        hasError
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            #{globalIdx + 1}. {dev.itemName}
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">
                            Make: <strong>{dev.make}</strong> • Model: <strong>{dev.model}</strong>
                          </span>
                        </div>
                        {isChecking && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600 shrink-0" />
                        )}
                      </div>

                      <div className="relative mt-1">
                        <input
                          ref={(el) => (inputRefs.current[dev.id] = el)}
                          type="text"
                          inputMode="text"
                          autoCapitalize="characters"
                          autoCorrect="off"
                          spellCheck="false"
                          required
                          value={serialValues[dev.id] || ''}
                          onChange={(e) => handleSerialChange(dev.id, e.target.value)}
                          onBlur={(e) => handleBlurCheck(dev.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, globalIdx)}
                          placeholder={dev.placeholder}
                          className={`w-full px-3 py-2 bg-white rounded-lg font-mono text-sm font-semibold uppercase tracking-wider border transition-all outline-hidden text-base sm:text-sm ${
                            hasError
                              ? 'border-red-500 text-red-900 focus:ring-2 focus:ring-red-200'
                              : 'border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800'
                          }`}
                        />
                      </div>

                      {hasError && (
                        <div className="mt-1 flex items-center space-x-1 text-[11px] text-red-600 font-medium">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{fieldErrors[dev.id]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Submit Action Bar */}
        <div className="hidden sm:flex border-t border-slate-200 pt-4 items-center justify-between gap-4">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Submitting registers <strong>{deviceList.length} rows</strong> in the Master Asset Register.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Recording in Google Sheets...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Verify & Digitize ICR ({deviceList.length} Rows)</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile Fixed Bottom Action Bar */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-30 shadow-lg flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-800 block">
              {filledSerialsCount} of {deviceList.length} Filled
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {deviceList.length - filledSerialsCount === 0 ? 'Ready to submit' : `${deviceList.length - filledSerialsCount} remaining`}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-900 active:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit ({deviceList.length} Rows)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* DUPLICATE WARNING MODAL (Mobile Optimized) */}
      {duplicateModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-red-200">
            <div className="flex items-center space-x-2.5 text-red-600 mb-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Duplicate Serial Number!
                </h3>
                <p className="text-[11px] text-red-600 font-semibold">
                  Already registered in another school
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Serial Number:</span>
                <span className="font-mono font-bold text-red-700">
                  {duplicateModalData.enteredSerial}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Registered School:</span>
                <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
                  {duplicateModalData.match.schoolName}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">UDISE / District:</span>
                <span className="font-mono font-bold text-slate-800">
                  {duplicateModalData.match.udise} ({duplicateModalData.match.district})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500 font-medium">Installed By:</span>
                <span className="font-bold text-slate-800">
                  {duplicateModalData.match.installedBy || duplicateModalData.match.updatedBy} ({duplicateModalData.match.mobile})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatDateDDMMMYYYY(duplicateModalData.match.date)}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDuplicateModalData(null);
                  if (inputRefs.current[duplicateModalData.currentFieldId]) {
                    inputRefs.current[duplicateModalData.currentFieldId].focus();
                    inputRefs.current[duplicateModalData.currentFieldId].select();
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                I Will Correct Serial Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Confirm Submission
                </h3>
                <p className="text-[11px] text-slate-500">
                  Summary before writing to Google Sheet
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">School:</span>
                <span className="font-bold text-slate-900 truncate max-w-[180px]">{school.school_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">UDISE:</span>
                <span className="font-mono font-bold text-slate-900">{school.udise}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Installed By:</span>
                <span className="font-bold text-slate-900">{installedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Mobile:</span>
                <span className="font-mono font-bold text-slate-900">{techMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Installation Date:</span>
                <span className="font-bold font-mono text-slate-900">{formattedDatePreview}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
                <span>Total Devices:</span>
                <span>{deviceList.length} Rows</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Submit to Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
