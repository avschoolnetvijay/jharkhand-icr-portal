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
  Layers,
  RefreshCw
} from 'lucide-react';
import { CATEGORY_LABELS, getCategoryDevices } from '../data/deviceSchemas';
import {
  checkSerialDuplicate,
  checkSerialLive,
  verifyAllSerialsBeforeSubmit,
  syncRegisteredSerials,
  submitICR,
  formatDateDDMMMYYYY
} from '../services/api';
import {
  exportSingleSchoolICRToExcel
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
  const [duplicateDetails, setDuplicateDetails] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatusText, setSubmissionStatusText] = useState('');
  const [checkingSerialId, setCheckingSerialId] = useState(null);
  const [submissionSuccessData, setSubmissionSuccessData] = useState(null);

  // Background refresh of registered serials registry on mount
  useEffect(() => {
    syncRegisteredSerials().catch(() => {});
  }, []);

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
      setDuplicateDetails({});
      setSubmissionSuccessData(null);
    } else {
      setDeviceList([]);
      setSerialValues({});
      setFieldErrors({});
      setDuplicateDetails({});
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

  // Reactive intra-form conflicts map: { [deviceId]: { serial, otherIds: [...] } }
  const intraFormConflicts = useMemo(() => {
    const serialToIds = {};
    Object.entries(serialValues).forEach(([id, val]) => {
      const sn = (val || '').trim().toUpperCase();
      if (sn) {
        if (!serialToIds[sn]) serialToIds[sn] = [];
        serialToIds[sn].push(id);
      }
    });

    const conflicts = {};
    Object.entries(serialToIds).forEach(([sn, ids]) => {
      if (ids.length > 1) {
        ids.forEach((id) => {
          conflicts[id] = {
            serial: sn,
            otherIds: ids.filter((otherId) => otherId !== id)
          };
        });
      }
    });
    return conflicts;
  }, [serialValues]);

  // Live Re-check with Google Sheets if user edited or removed serial in Google Sheets
  const handleRecheckSerial = async (id, val) => {
    const cleanSerial = (val || '').trim().toUpperCase();
    if (!cleanSerial) return;
    setCheckingSerialId(id);
    try {
      const res = await checkSerialLive(cleanSerial);
      if (res && res.exists) {
        setDuplicateDetails((prev) => ({ ...prev, [id]: res.match }));
        setFieldErrors((prev) => ({
          ...prev,
          [id]: `Duplicate! Serial is still registered in Google Sheets under ${res.match.schoolName}`
        }));
        alert(`Serial "${cleanSerial}" is still registered in Google Sheets under "${res.match.schoolName}". Please edit or remove it from the "Device_Serial_Inventory" sheet in Google Sheets, or enter a unique serial.`);
      } else {
        // Cleared from Google Sheets!
        setDuplicateDetails((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        alert(`VERIFIED! Serial "${cleanSerial}" is no longer found in Google Sheets. You can now submit!`);
      }
    } catch (err) {
      alert(`Could not verify with Google Sheets: ${err.message}`);
    } finally {
      setCheckingSerialId(null);
    }
  };

  // Serial Change handler (Force Uppercase & Instant Local Validation)
  const handleSerialChange = (id, val) => {
    const upperVal = val.trim().toUpperCase();
    setSerialValues((prev) => ({ ...prev, [id]: upperVal }));

    // Incomplete or empty: clear error & duplicate details
    if (!upperVal || upperVal.length < 3) {
      if (fieldErrors[id]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      if (duplicateDetails[id]) {
        setDuplicateDetails((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      return;
    }

    // Instant local database check (0ms synchronous lookup)
    const res = checkSerialDuplicate(upperVal, selectedSchool?.udise);
    if (res.exists) {
      setDuplicateDetails((prev) => ({
        ...prev,
        [id]: res.match
      }));
      setFieldErrors((prev) => ({
        ...prev,
        [id]: `Duplicate! Serial already registered in ${res.match.schoolName}`
      }));
      return;
    }

    // Clean field if no database duplicate
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    if (duplicateDetails[id]) {
      setDuplicateDetails((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // Instant serial duplicate check on blur (0ms, no network delay or spinning)
  const handleSerialBlur = (id, currentVal) => {
    if (!currentVal || currentVal.trim().length < 3 || !selectedSchool) return;
    const upperVal = currentVal.trim().toUpperCase();

    // Instant registry check
    const res = checkSerialDuplicate(upperVal, selectedSchool.udise);
    if (res.exists) {
      setDuplicateDetails((prev) => ({
        ...prev,
        [id]: res.match
      }));
      setFieldErrors((prev) => ({
        ...prev,
        [id]: `Duplicate! Serial already registered in ${res.match.schoolName}`
      }));
    }
  };

  // Form Submission with Strict Pre-Submission Zero-Duplicate Verification
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

    // 1. Mandatory Field Validations with 10-Digit Mobile Check
    const cleanMobile = techMobile.trim().replace(/\D/g, '');
    const errors = {};
    if (!installedBy.trim()) errors['installedBy'] = 'Installation team name is required.';
    
    if (!cleanMobile) {
      errors['techMobile'] = 'Mobile number is required.';
    } else if (cleanMobile.length !== 10) {
      errors['techMobile'] = `Mobile number must be exactly 10 digits (currently ${cleanMobile.length}).`;
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errors['techMobile'] = 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
    }

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
      alert(`Please fill all required fields correctly:\n• ${firstError}`);
      return;
    }

    // 2. Intra-form duplicate check (mutually exclusive within current form)
    if (Object.keys(intraFormConflicts).length > 0) {
      const firstId = Object.keys(intraFormConflicts)[0];
      const conflict = intraFormConflicts[firstId];
      const dev1 = deviceList.find((d) => d.id === firstId);
      const otherId = conflict.otherIds[0];
      const dev2 = deviceList.find((d) => d.id === otherId);

      alert(
        `CANNOT SUBMIT: DUPLICATE SERIAL IN SAME FORM!\n\n` +
        `Serial Number: "${conflict.serial}"\n` +
        `Assigned to: "${dev1?.itemName || dev1?.label || 'Device 1'}" AND "${dev2?.itemName || dev2?.label || 'Device 2'}"\n\n` +
        `Every hardware device must have a unique serial number. Conflicting devices are highlighted in BOLD RED below.`
      );

      const targetEl = document.getElementById(`device-card-${firstId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 3. Live Google Sheets verification for any displayed duplicate errors
    if (Object.keys(duplicateDetails).length > 0) {
      setIsSubmitting(true);
      setSubmissionStatusText('Verifying serial uniqueness live with Google Sheets...');
      let stillDuplicate = false;
      let confirmedDup = null;

      for (const [dupId, info] of Object.entries(duplicateDetails)) {
        const live = await checkSerialLive(info.serialNumber);
        if (live && live.exists) {
          stillDuplicate = true;
          confirmedDup = live.match || info;
          break;
        } else {
          // Cleared in Google Sheet!
          setDuplicateDetails((prev) => {
            const next = { ...prev };
            delete next[dupId];
            return next;
          });
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[dupId];
            return next;
          });
        }
      }
      setIsSubmitting(false);

      if (stillDuplicate && confirmedDup) {
        alert(
          `DUPLICATE SERIAL DETECTED IN GOOGLE SHEETS!\n\n` +
          `Serial: ${confirmedDup.serialNumber}\n` +
          `School: ${confirmedDup.schoolName} (UDISE: ${confirmedDup.udise})\n` +
          `Installed By: ${confirmedDup.installedBy} (Mobile: ${confirmedDup.mobile})\n\n` +
          `This serial is still present in Google Sheets ("Device_Serial_Inventory" sheet). Please change it in Google Sheet or enter a different serial.`
        );
        return;
      }
    }

    // 4. Pre-Submission Live-Verified Verification
    const verification = await verifyAllSerialsBeforeSubmit(deviceList, serialValues, selectedSchool);
    if (!verification.valid) {
      if (verification.type === 'intra_form') {
        const firstConflictId = verification.conflictIds?.[0] || deviceList[0]?.id;
        alert(`CANNOT SUBMIT: ${verification.message}`);
        const targetEl = document.getElementById(`device-card-${firstConflictId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (verification.type === 'already_registered' && verification.duplicates) {
        const newErrors = { ...fieldErrors };
        const newDuplicates = { ...duplicateDetails };

        verification.duplicates.forEach((dup) => {
          newDuplicates[dup.id] = dup.match;
          newErrors[dup.id] = `Duplicate! Serial already registered in ${dup.match.schoolName}`;
        });

        setDuplicateDetails(newDuplicates);
        setFieldErrors(newErrors);

        const firstDup = verification.duplicates[0];
        alert(
          `SUBMISSION BLOCKED: DUPLICATE SERIAL DETECTED!\n\n` +
          `Serial Number: ${firstDup.serialNumber}\n` +
          `Device: ${firstDup.deviceName}\n` +
          `Already Registered in: ${firstDup.match.schoolName} (UDISE: ${firstDup.match.udise})\n` +
          `Installed By: ${firstDup.match.installedBy} (Mobile: ${firstDup.match.mobile})\n` +
          `Installation Date: ${firstDup.match.date}\n\n` +
          `Note: If you already changed or deleted this serial in Google Sheet, click "Re-check Sheet" on the red card to verify.`
        );

        // Smooth scroll to the conflicting device card
        const targetEl = document.getElementById(`device-card-${firstDup.id}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    // 4. Fast Direct Submission to Google Sheets
    setIsSubmitting(true);
    setSubmissionStatusText('Live duplicate checking with Google Sheets...');

    try {
      const submissionPayload = {
        udise: selectedSchool.udise,
        snil: selectedSchool.snil,
        school_name: selectedSchool.school_name,
        district: selectedSchool.district,
        block: selectedSchool.block,
        category: selectedSchool.category,
        installed_by: installedBy.trim(),
        technician_mobile: cleanMobile,
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
        installedBy: installedBy.trim(),
        technicianMobile: cleanMobile,
        installDate
      });

      if (onSubmissionSuccess) {
        onSubmissionSuccess(selectedSchool.udise);
      }
    } catch (err) {
      if (err.duplicateDetails) {
        const d = err.duplicateDetails;
        const matchingDev = deviceList.find(
          item => (serialValues[item.id] || '').trim().toUpperCase() === String(d.serial).trim().toUpperCase()
        );
        if (matchingDev) {
          setDuplicateDetails(prev => ({
            ...prev,
            [matchingDev.id]: {
              serialNumber: d.serial,
              schoolName: d.schoolName,
              udise: d.udise,
              itemName: d.itemName,
              installedBy: d.installedBy,
              mobile: d.mobile,
              date: d.date
            }
          }));
          setFieldErrors(prev => ({
            ...prev,
            [matchingDev.id]: `Duplicate! Serial already registered in ${d.schoolName}`
          }));
          const targetEl = document.getElementById(`device-card-${matchingDev.id}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
      setSubmissionStatusText('');
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
        <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
          {submissionSuccessData.school.school_name} (UDISE: {submissionSuccessData.school.udise})
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

        {/* EXCEL EXPORT OPTION (Only Single School ICR Data) */}
        <div className="mt-6 p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 max-w-md mx-auto space-y-3">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center justify-center space-x-1.5">
            <FileSpreadsheet className="h-4 w-4 text-[#1d68e2]" />
            <span>Official School Excel Report</span>
          </div>

          <button
            onClick={handleExportSingleICR}
            className="w-full py-3 px-4 rounded-xl bg-[#1d68e2] hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download School Installation ICR (.xlsx)</span>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          Mobile No. *
                        </label>
                        <span className={`text-[10px] font-mono ${techMobile.length === 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                          {techMobile.length}/10 digits
                        </span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]*"
                        value={techMobile}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setTechMobile(digitsOnly);
                          if (fieldErrors['techMobile']) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next['techMobile'];
                              return next;
                            });
                          }
                        }}
                        placeholder="Enter 10-digit Mobile No."
                        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-[#1d68e2] outline-hidden transition-all ${
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
                          const intraConflict = intraFormConflicts[dev.id];
                          const duplicateInfo = duplicateDetails[dev.id];
                          const errorMsg = fieldErrors[dev.id];
                          const hasError = Boolean(intraConflict || duplicateInfo || errorMsg);
                          const val = serialValues[dev.id] || '';
                          const globalIdx = deviceList.findIndex((d) => d.id === dev.id);

                          return (
                            <div
                              key={dev.id}
                              id={`device-card-${dev.id}`}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                intraConflict
                                  ? 'border-2 border-red-500 bg-red-50/80 ring-2 ring-red-300 shadow-sm'
                                  : duplicateInfo
                                  ? 'border-2 border-rose-500 bg-rose-50/80 ring-2 ring-rose-300 shadow-sm'
                                  : errorMsg
                                  ? 'border-2 border-red-400 bg-red-50/50 ring-1 ring-red-200'
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
                                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold uppercase outline-hidden transition-all ${
                                    intraConflict || duplicateInfo || errorMsg
                                      ? 'border-2 border-red-500 bg-red-100/50 text-red-950 focus:border-red-600 focus:ring-1 focus:ring-red-400'
                                      : 'border-slate-300 text-slate-900 focus:border-[#1d68e2] focus:ring-1 focus:ring-blue-500'
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

                              {/* 1. Intra-Form Conflict Alert Banner (BOLD RED) */}
                              {intraConflict ? (
                                <div className="mt-2.5 p-3 rounded-xl bg-red-100/90 border border-red-300 text-xs text-red-950 space-y-1.5 animate-in fade-in duration-200">
                                  <div className="flex items-center space-x-1.5 font-bold text-red-700">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                                    <span>Duplicate Serial in Same Form!</span>
                                  </div>
                                  <p className="text-[11px] text-red-800 font-medium">
                                    Serial <strong className="font-mono text-red-950 bg-white px-1.5 py-0.5 rounded-md border border-red-200">{val}</strong> is entered multiple times in this form (also entered for{' '}
                                    <strong className="text-red-950">
                                      {intraConflict.otherIds
                                        .map((oid) => {
                                          const d = deviceList.find((item) => item.id === oid);
                                          return d?.itemName || d?.item_name || d?.label || oid;
                                        })
                                        .join(', ')}
                                    </strong>
                                    ). Each device must have a unique serial number.
                                  </p>
                                </div>
                              ) : duplicateInfo ? (
                                /* 2. Database Duplicate Info Card with Re-Check Button */
                                <div className="mt-2.5 p-3 rounded-xl bg-rose-50/95 border border-rose-200 text-xs text-rose-950 space-y-1.5 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-1.5 font-bold text-rose-700">
                                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                      <span>Duplicate Serial in Google Sheets!</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRecheckSerial(dev.id, val)}
                                      disabled={checkingSerialId === dev.id}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                                      title="Re-check live with Google Sheets"
                                    >
                                      <RefreshCw className={`h-3 w-3 ${checkingSerialId === dev.id ? 'animate-spin text-rose-600' : 'text-rose-500'}`} />
                                      <span>{checkingSerialId === dev.id ? 'Checking...' : 'Re-check Sheet'}</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1.5 border-t border-rose-200/70">
                                    <div>
                                      <span className="text-rose-600 font-semibold">District:</span>{' '}
                                      <strong className="text-slate-900">{duplicateInfo.district}</strong>
                                    </div>
                                    <div>
                                      <span className="text-rose-600 font-semibold">School:</span>{' '}
                                      <strong className="text-slate-900">{duplicateInfo.schoolName}</strong>
                                    </div>
                                    <div>
                                      <span className="text-rose-600 font-semibold">UDISE:</span>{' '}
                                      <strong className="text-slate-900 font-mono">{duplicateInfo.udise}</strong>
                                    </div>
                                    <div>
                                      <span className="text-rose-600 font-semibold">Installed By:</span>{' '}
                                      <strong className="text-slate-900">{duplicateInfo.installedBy && duplicateInfo.installedBy !== '-' ? duplicateInfo.installedBy : <span className="text-rose-400 italic">Not recorded</span>}</strong>
                                    </div>
                                    <div>
                                      <span className="text-rose-600 font-semibold">Mobile No.:</span>{' '}
                                      <strong className="text-slate-900 font-mono">{duplicateInfo.mobile || '-'}</strong>
                                    </div>
                                    <div>
                                      <span className="text-rose-600 font-semibold">Date:</span>{' '}
                                      <strong className="text-slate-900">{duplicateInfo.date ? formatDateDDMMMYYYY(duplicateInfo.date) : '-'}</strong>
                                    </div>
                                    {duplicateInfo.timestamp && (
                                      <div>
                                        <span className="text-rose-600 font-semibold">Time:</span>{' '}
                                        <strong className="text-slate-900 font-mono text-[10px]">{duplicateInfo.timestamp}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : errorMsg ? (
                                <p className="text-[11px] text-red-600 font-bold mt-1">
                                  {errorMsg}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Submit Action Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 ${
                      Object.keys(intraFormConflicts).length > 0
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                        : 'bg-[#1d68e2] hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{submissionStatusText || 'Duplicate Checking & Verifying...'}</span>
                      </>
                    ) : Object.keys(intraFormConflicts).length > 0 ? (
                      <>
                        <AlertTriangle className="h-4 w-4" />
                        <span>Duplicate Serials in Form ({Object.keys(intraFormConflicts).length}) — Fix to Submit</span>
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
