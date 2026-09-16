import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cpu,
  UserCheck,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  Save,
  Send,
  ShieldCheck,
  Phone,
  User
} from 'lucide-react';
import { CATEGORY_LABELS, getCategoryDevices } from '../data/deviceSchemas';
import { checkSerialDuplicate, submitICR, formatDateDDMMMYYYY } from '../services/api';
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
  // Stepper state: 1: School Info, 2: ICT Infrastructure, 3: Installation Details, 4: Review & Submit
  const [currentStep, setCurrentStep] = useState(1);

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

  // When selectedSchool changes, update device list
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
    }
  }, [selectedSchool]);

  const isCompleted = selectedSchool && statusMap[selectedSchool.udise]?.status === 'Completed';

  // Group devices by section (e.g. Server, Nodes, Smart Class)
  const groupedSections = React.useMemo(() => {
    const sections = {};
    deviceList.forEach((dev) => {
      const sec = dev.section || 'Hardware Devices';
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(dev);
    });
    return sections;
  }, [deviceList]);

  // Serial Change handler
  const handleSerialChange = (id, val) => {
    const upperVal = val.trim().toUpperCase();
    setSerialValues((prev) => ({ ...prev, [id]: upperVal }));

    // Clear error
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

    // 1. Intra-form duplicate check
    const duplicateId = Object.keys(serialValues).find(
      (key) => key !== id && serialValues[key] === currentVal
    );
    if (duplicateId) {
      setFieldErrors((prev) => ({
        ...prev,
        [id]: `Duplicate! Same serial entered for another item in this form.`
      }));
      return;
    }

    // 2. Cross-school duplicate check
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

  // Validation before advancing to Next Step
  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedSchool) {
        alert('Please select a school first.');
        return;
      }
      if (isCompleted) {
        alert('This school is already completed and digitized.');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Validate device serials
      const errors = {};
      deviceList.forEach((d) => {
        const val = (serialValues[d.id] || '').trim();
        if (!val) {
          errors[d.id] = `${d.item_name} serial is required.`;
        }
      });

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        alert(`Please enter all ${deviceList.length} device serial numbers before proceeding.`);
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!installedBy.trim()) {
        alert('Please enter Installed By name.');
        return;
      }
      if (!techMobile.trim() || techMobile.trim().length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!installDate) {
        alert('Please choose installation date.');
        return;
      }
      setCurrentStep(4);
      return;
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedDate = formatDateDDMMMYYYY(installDate);

      const submissionPayload = {
        udise: selectedSchool.udise,
        snil: selectedSchool.snil,
        school_name: selectedSchool.school_name,
        district: selectedSchool.district,
        block: selectedSchool.block,
        category: selectedSchool.category,
        installed_by: installedBy.trim(),
        technician_mobile: techMobile.trim(),
        installation_date: formattedDate,
        devices: deviceList.map((d) => ({
          item_name: d.item_name,
          make_model: d.make_model || 'Standard',
          serial_number: (serialValues[d.id] || '').trim().toUpperCase()
        }))
      };

      const result = await submitICR(submissionPayload);
      setSubmissionSuccessData(result);
      if (onSubmissionSuccess) {
        onSubmissionSuccess(selectedSchool.udise);
      }
    } catch (err) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Steps array
  const steps = [
    { num: 1, label: 'School Information', icon: Building2 },
    { num: 2, label: 'ICT Infrastructure', icon: Cpu },
    { num: 3, label: 'Installation Details', icon: UserCheck },
    { num: 4, label: 'Review & Submit', icon: CheckSquare }
  ];

  // Success view
  if (submissionSuccessData) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-sm animate-in fade-in duration-300">
        <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          Data Collection Successfully Submitted!
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          {selectedSchool.school_name} (UDISE: {selectedSchool.udise}) has been digitized.
          All <strong>{deviceList.length} device serials</strong> have been recorded row-wise into Google Sheets.
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left font-mono space-y-1 max-w-md mx-auto">
          <div><span className="text-slate-500">Submission ID:</span> <span className="font-bold text-slate-900">{submissionSuccessData.submissionId}</span></div>
          <div><span className="text-slate-500">Installed By:</span> <span className="font-bold text-slate-900">{installedBy}</span></div>
          <div><span className="text-slate-500">Installation Date:</span> <span className="font-bold text-slate-900">{formatDateDDMMMYYYY(installDate)}</span></div>
        </div>

        <div className="mt-8 flex justify-center space-x-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 bg-[#1d68e2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setSubmissionSuccessData(null);
              setCurrentStep(1);
              if (onSelectSchool) onSelectSchool(null);
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            + Digitise Another School
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto">
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className="hover:text-[#1d68e2] cursor-pointer"
          >
            Dashboard
          </button>
          <span>›</span>
          <span className="text-slate-600">Data Collection</span>
          <span>›</span>
          <span className="text-slate-900 font-bold">New Entry</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          New Data Collection
        </h2>
      </div>

      {/* Horizontal Stepper Progress Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.num}>
                <div
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (isDone) setCurrentStep(step.num);
                  }}
                  className={`flex items-center space-x-2 sm:space-x-3 cursor-pointer select-none ${
                    isActive
                      ? 'text-[#1d68e2]'
                      : isDone
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                      isActive
                        ? 'bg-[#1d68e2] text-white shadow-md shadow-blue-600/30 ring-4 ring-blue-100'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
                  </div>
                  <span className={`text-xs sm:text-sm font-bold hidden md:inline ${
                    isActive ? 'text-slate-900' : 'text-slate-600'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                      currentStep > step.num ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: School Information */}
      {currentStep === 1 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              1. School Selection & Basic Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Search and select the school to verify master allocation and hardware requirements.
            </p>
          </div>

          {/* School Search Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Search School (UDISE, SNIL, or Name) *
            </label>
            <SchoolSearch
              schools={schools}
              statusMap={statusMap}
              onSelectSchool={onSelectSchool}
              selectedSchool={selectedSchool}
            />
          </div>

          {/* Populated School Information Cards (Matching Mockup Fields) */}
          {selectedSchool && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verified School Details
                </span>
                {isCompleted ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Already Digitized
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Pending ICR Entry
                  </span>
                )}
              </div>

              {isCompleted ? (
                <ReadOnlySubmissionView
                  school={selectedSchool}
                  statusInfo={statusMap[selectedSchool.udise]}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* District */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedSchool.district}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                    />
                  </div>

                  {/* Block */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Block
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedSchool.block}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                    />
                  </div>

                  {/* School Code / UDISE */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      UDISE Code / SNIL
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${selectedSchool.udise} (${selectedSchool.snil})`}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden"
                    />
                  </div>

                  {/* School Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      School Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedSchool.school_name}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-hidden"
                    />
                  </div>

                  {/* Category / Lab Format */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Lab Format / Category
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={CATEGORY_LABELS[selectedSchool.category] || selectedSchool.category}
                      className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs font-bold text-[#1d68e2] outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          {!isCompleted && selectedSchool && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#1d68e2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center space-x-1.5"
              >
                <span>Next: ICT Infrastructure</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: ICT Infrastructure & Device Serials */}
      {currentStep === 2 && selectedSchool && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                2. ICT Infrastructure — Hardware Device Serials
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan or type serial numbers for all {deviceList.length} physical assets for {selectedSchool.school_name}.
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#1d68e2] border border-blue-200 shrink-0">
              {Object.values(serialValues).filter(Boolean).length} / {deviceList.length} Entered
            </span>
          </div>

          {/* Device List grouped by sections */}
          <div className="space-y-6">
            {Object.entries(groupedSections).map(([sectionName, devices]) => (
              <div key={sectionName} className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span className="h-2 w-2 rounded-full bg-[#1d68e2]"></span>
                  <span>{sectionName} ({devices.length} Items)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {devices.map((dev) => {
                    const val = serialValues[dev.id] || '';
                    const error = fieldErrors[dev.id];
                    const isChecking = checkingSerialId === dev.id;

                    return (
                      <div
                        key={dev.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          error
                            ? 'bg-red-50/50 border-red-300 ring-2 ring-red-100'
                            : val
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-800">
                            {dev.item_name} <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-400">
                            {dev.make_model || 'Hardware'}
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleSerialChange(dev.id, e.target.value)}
                            onBlur={(e) => handleSerialBlur(dev.id, e.target.value)}
                            placeholder="Enter serial number..."
                            autoCapitalize="characters"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono uppercase focus:border-[#1d68e2] focus:ring-2 focus:ring-blue-100 outline-hidden transition-all"
                          />
                          {isChecking && (
                            <Loader2 className="h-4 w-4 text-[#1d68e2] animate-spin absolute right-3 top-2.5" />
                          )}
                          {!isChecking && val && !error && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 absolute right-3 top-2.5" />
                          )}
                        </div>

                        {error && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>{error}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Nav Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back: School Info</span>
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-[#1d68e2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <span>Next: Installation Details</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Installation Information */}
      {currentStep === 3 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              3. Installation Information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter technician information and official installation date.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Installed By */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Installed By *
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={installedBy}
                  onChange={(e) => setInstalledBy(e.target.value)}
                  placeholder="e.g. Vijay Kumar Ray"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1d68e2] outline-hidden"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Technician Mobile *
              </label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  value={techMobile}
                  onChange={(e) => setTechMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold focus:bg-white focus:border-[#1d68e2] outline-hidden"
                />
              </div>
            </div>

            {/* Installation Date (Must be formatted dd-mmm-yyyy) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Installation Date *
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={installDate}
                  onChange={(e) => setInstallDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1d68e2] outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Saved as: <strong className="text-slate-900">{formatDateDDMMMYYYY(installDate)}</strong>
              </p>
            </div>
          </div>

          {/* Nav Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back: Devices</span>
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-[#1d68e2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center space-x-1.5"
            >
              <span>Next: Review & Submit</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Submit */}
      {currentStep === 4 && selectedSchool && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">
              4. Review ICR Summary & Final Submission
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirm all school details and device serial numbers before writing to Google Sheets.
            </p>
          </div>

          {/* School & Technician Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">School</span>
              <strong className="text-slate-900 text-sm">{selectedSchool.school_name}</strong>
              <div className="text-slate-500 font-mono mt-0.5">UDISE: {selectedSchool.udise} • SNIL: {selectedSchool.snil}</div>
              <div className="text-slate-600 mt-0.5">{selectedSchool.block}, {selectedSchool.district}</div>
            </div>

            <div>
              <span className="text-slate-500 block">Installation Info</span>
              <div className="text-slate-900 font-bold">Installed By: {installedBy}</div>
              <div className="text-slate-600 font-mono">Mobile: {techMobile}</div>
              <div className="text-[#1d68e2] font-mono font-bold mt-0.5">
                Date: {formatDateDDMMMYYYY(installDate)}
              </div>
            </div>
          </div>

          {/* Serials Review Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Hardware Asset Register ({deviceList.length} Devices)
            </h4>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Make / Model</th>
                    <th className="py-2.5 px-3">Serial Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {deviceList.map((d, idx) => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{d.item_name}</td>
                      <td className="py-2 px-3 text-slate-500">{d.make_model || 'Hardware'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700 bg-blue-50/30">
                        {serialValues[d.id] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back: Edit Info</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-[#1d68e2] hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md flex items-center space-x-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Syncing to Google Sheets...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Data to Google Sheets</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
