import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
  Layers,
  ShieldAlert,
  Info
} from 'lucide-react';
import { getCategoryDevices } from '../data/deviceSchemas';
import { checkSerialDuplicate, submitICR, formatDateDDMMMYYYY } from '../services/api';

export default function DigitizationForm({ school, onSubmissionSuccess }) {
  // Installed by & Installation info
  const [installedBy, setInstalledBy] = useState('');
  const [techMobile, setTechMobile] = useState('');
  const [installDate, setInstallDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Devices & serial numbers state
  const [deviceList, setDeviceList] = useState([]);
  const [serialValues, setSerialValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateModalData, setDuplicateModalData] = useState(null);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSerialId, setCheckingSerialId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const inputRefs = useRef({});

  // Initialize device fields whenever selected school changes
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

  // Group devices by section for visual structure
  const groupedSections = React.useMemo(() => {
    const sections = {};
    deviceList.forEach((dev) => {
      const sec = dev.section || 'Lab Devices';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(dev);
    });
    return sections;
  }, [deviceList]);

  // Handle serial input change with uppercase and in-form dupe detection
  const handleSerialChange = (id, val) => {
    const upperVal = val.trim().toUpperCase();
    const updated = { ...serialValues, [id]: upperVal };
    setSerialValues(updated);

    // In-form duplicate check
    validateInFormDuplicates(updated);
  };

  const validateInFormDuplicates = (currentValues) => {
    const counts = {};
    const errors = { ...fieldErrors };

    // Count non-empty values
    Object.entries(currentValues).forEach(([id, val]) => {
      if (val) {
        counts[val] = (counts[val] || 0) + 1;
      }
    });

    // Mark errors
    Object.entries(currentValues).forEach(([id, val]) => {
      if (val && counts[val] > 1) {
        errors[id] = `Duplicate serial number inside form: "${val}"`;
      } else if (errors[id] && errors[id].startsWith('Duplicate serial number inside form')) {
        delete errors[id];
      }
    });

    setFieldErrors(errors);
  };

  // OnBlur: Check duplicate against central database (Google Sheets / Storage)
  const handleBlurCheck = async (id, val) => {
    const clean = (val || '').trim().toUpperCase();
    if (!clean) return;

    setCheckingSerialId(id);
    try {
      const res = await checkSerialDuplicate(clean, school.udise);
      if (res.exists && res.match) {
        setFieldErrors((prev) => ({
          ...prev,
          [id]: `Already used in: ${res.match.schoolName} (${res.match.udise})`
        }));
        setDuplicateModalData({
          enteredSerial: clean,
          currentFieldId: id,
          match: res.match
        });
      } else {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          if (updated[id] && updated[id].startsWith('Already used in:')) {
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

  // Keyboard navigation: Enter key moves to next input field
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextDev = deviceList[index + 1];
      if (nextDev && inputRefs.current[nextDev.id]) {
        inputRefs.current[nextDev.id].focus();
      }
    }
  };

  // Validate entire form before opening confirmation
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
      alert(`Please fix the errors before submitting:\n${missingSerials > 0 ? `• ${missingSerials} serial numbers are empty.\n` : ''}${hasDuplicates ? '• Duplicate serial numbers must be resolved.\n' : ''}${errors.installedBy ? '• ' + errors.installedBy + '\n' : ''}${errors.techMobile ? '• ' + errors.techMobile : ''}`);
      return;
    }

    setShowConfirmModal(true);
  };

  // Final submission execution
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
        technician_name: installedBy.trim(), // for backwards compatibility
        technician_mobile: techMobile.trim(),
        installation_date: formattedDate, // Format: dd-mmm-yyyy (e.g. 13-Sep-2026)
        devices: devicesPayload
      };

      const result = await submitICR(payload);

      if (result.success) {
        alert(`Success! Recorded ${result.totalDevices} device serial numbers for ${school.school_name}.`);
        onSubmissionSuccess(school.udise);
      } else {
        alert(`Submission Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error submitting ICR: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDatePreview = formatDateDDMMMYYYY(installDate);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden mt-6">
      {/* Form Header */}
      <div className="bg-slate-900 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-brand-500 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">
              ICR Digitization & Serial Number Entry Form
            </h3>
            <p className="text-xs text-slate-300">
              Enter serial numbers from physical Installation Completion Report (ICR)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Layers className="h-4 w-4 text-brand-400" />
          <span>Total Required Hardware: <strong>{deviceList.length} Devices (Rows)</strong></span>
        </div>
      </div>

      <form onSubmit={handlePreSubmit} className="p-6 space-y-8">
        {/* Section 1: Installation Information (Updated labels) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
            <User className="h-4 w-4 mr-1.5 text-brand-600" />
            Installation Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Installed By */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                INSTALLED BY <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={installedBy}
                  onChange={(e) => setInstalledBy(e.target.value)}
                  placeholder="e.g. Rakesh Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 outline-hidden"
                />
              </div>
              {fieldErrors.installedBy && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.installedBy}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                10-DIGIT MOBILE NUMBER <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={techMobile}
                  onChange={(e) => setTechMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 outline-hidden"
                />
              </div>
              {fieldErrors.techMobile && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.techMobile}</p>
              )}
            </div>

            {/* Installation Date (in dd-mmm-yyyy format) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  INSTALLATION DATE <span className="text-red-500">*</span>
                </label>
                {formattedDatePreview && (
                  <span className="text-[11px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                    {formattedDatePreview}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Saved format: <strong>dd-mmm-yyyy</strong> (e.g. 13-Sep-2026)
              </span>
              {fieldErrors.installDate && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.installDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Dynamic Hardware Serial Numbers grouped by Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Hardware Device Serial Numbers
              </h4>
              <p className="text-xs text-slate-500">
                Non-serial items (tables, chairs, whiteboards, loose batteries, software) are excluded.
              </p>
            </div>
            <span className="text-xs bg-brand-50 text-brand-700 font-semibold px-2.5 py-1 rounded-md border border-brand-200">
              Keyboard Entry: Press [Enter] to jump to next field
            </span>
          </div>

          {Object.entries(groupedSections).map(([sectionTitle, devices]) => (
            <div key={sectionTitle} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-brand-500 mr-2"></span>
                  {sectionTitle} ({devices.length} Items)
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((dev) => {
                  const globalIdx = deviceList.findIndex((d) => d.id === dev.id);
                  const hasError = Boolean(fieldErrors[dev.id]);
                  const isChecking = checkingSerialId === dev.id;

                  return (
                    <div
                      key={dev.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        hasError
                          ? 'border-red-300 bg-red-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {globalIdx + 1}. {dev.itemName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Make: <strong>{dev.make}</strong> | Model: <strong>{dev.model}</strong>
                          </span>
                        </div>
                        {isChecking && (
                          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                        )}
                      </div>

                      <div className="relative mt-1">
                        <input
                          ref={(el) => (inputRefs.current[dev.id] = el)}
                          type="text"
                          required
                          value={serialValues[dev.id] || ''}
                          onChange={(e) => handleSerialChange(dev.id, e.target.value)}
                          onBlur={(e) => handleBlurCheck(dev.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, globalIdx)}
                          placeholder={dev.placeholder}
                          className={`w-full px-3 py-2 bg-white rounded-lg font-mono text-sm font-semibold uppercase tracking-wider border transition-all outline-hidden ${
                            hasError
                              ? 'border-red-500 text-red-900 focus:ring-3 focus:ring-red-200'
                              : 'border-slate-300 text-slate-900 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10'
                          }`}
                        />
                      </div>

                      {hasError && (
                        <div className="mt-1.5 flex items-center space-x-1 text-xs text-red-600 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
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

        {/* Submit Action Bar */}
        <div className="border-t border-slate-200 pt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-slate-400" />
            <span>
              Submitting will register <strong>{deviceList.length} rows</strong> in the Master Asset Register.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Recording in Database...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Verify & Digitize ICR ({deviceList.length} Rows)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* DUPLICATE WARNING MODAL */}
      {duplicateModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Duplicate Serial Number Detected!
                </h3>
                <p className="text-xs text-red-600 font-semibold">
                  This hardware device has already been registered in another school.
                </p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-xs space-y-2 mb-5">
              <div className="flex justify-between border-b border-red-200/60 pb-1.5">
                <span className="text-slate-600 font-medium">Serial Number:</span>
                <span className="font-mono font-bold text-red-700 text-sm">
                  {duplicateModalData.enteredSerial}
                </span>
              </div>
              <div className="flex justify-between border-b border-red-200/60 pb-1.5">
                <span className="text-slate-600 font-medium">Already Registered School:</span>
                <span className="font-bold text-slate-900 text-right">
                  {duplicateModalData.match.schoolName}
                </span>
              </div>
              <div className="flex justify-between border-b border-red-200/60 pb-1.5">
                <span className="text-slate-600 font-medium">UDISE / District:</span>
                <span className="font-mono font-bold text-slate-800">
                  {duplicateModalData.match.udise} ({duplicateModalData.match.district})
                </span>
              </div>
              <div className="flex justify-between border-b border-red-200/60 pb-1.5">
                <span className="text-slate-600 font-medium">Device Name:</span>
                <span className="font-bold text-slate-800">
                  {duplicateModalData.match.itemName}
                </span>
              </div>
              <div className="flex justify-between border-b border-red-200/60 pb-1.5">
                <span className="text-slate-600 font-medium">Installed By:</span>
                <span className="font-bold text-slate-800">
                  {duplicateModalData.match.installedBy || duplicateModalData.match.updatedBy} ({duplicateModalData.match.mobile})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-medium">Installation Date:</span>
                <span className="font-bold font-mono text-slate-800">
                  {formatDateDDMMMYYYY(duplicateModalData.match.date)}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Please check the serial number sticker on the hardware device and correct the typo. Each serial number must be unique across Jharkhand.
            </p>

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
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                I Will Correct the Serial Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-brand-100 rounded-xl text-brand-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Confirm ICR Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Please review summary before final digitization
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">School:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">{school.school_name}</span>
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
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-brand-700">
                <span>Row-Wise Device Count:</span>
                <span>{deviceList.length} Device Rows</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                Yes, Submit Digitization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
