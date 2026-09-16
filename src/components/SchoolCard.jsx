import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { CATEGORY_LABELS } from '../data/deviceSchemas';
import { formatDateDDMMMYYYY } from '../services/api';

export default function SchoolCard({ school, statusInfo }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!school) return null;

  const isCompleted = statusInfo?.status === 'Completed';

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const installedBy = statusInfo?.installedBy || statusInfo?.updatedBy || 'N/A';
  const displayDate = statusInfo?.date ? formatDateDDMMMYYYY(statusInfo.date) : 'N/A';

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Bar: Sober Dark Slate Theme */}
      <div className="bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-slate-400 block">
                Selected School
              </span>
              <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">
                {school.school_name}
              </h2>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isCompleted ? (
              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                ALREADY UPDATED
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold bg-amber-500 text-white shadow-2xs">
                <Clock className="h-3.5 w-3.5 mr-1" />
                PENDING DIGITIZATION
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* UDISE */}
          <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                UDISE Code
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 truncate block">
                {school.udise}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(school.udise, 'udise')}
              title="Copy UDISE"
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
            >
              {copiedField === 'udise' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* SNIL */}
          <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SNIL Code
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 truncate block">
                {school.snil}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(school.snil, 'snil')}
              title="Copy SNIL"
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
            >
              {copiedField === 'snil' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* District & Block */}
          <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              District / Block
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center mt-0.5 truncate">
              <MapPin className="h-3 w-3 text-slate-400 mr-1 shrink-0" />
              <span className="truncate">{school.district}, {school.block}</span>
            </span>
          </div>

          {/* Category */}
          <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Lab Allocation
            </span>
            <span className="text-xs font-semibold text-slate-800 flex items-center mt-0.5 truncate">
              <Layers className="h-3 w-3 text-slate-400 mr-1 shrink-0" />
              <span className="truncate">{CATEGORY_LABELS[school.category] || school.category}</span>
            </span>
          </div>
        </div>

        {/* Existing Completion Banner if Already Updated */}
        {isCompleted && (
          <div className="mt-3.5 sm:mt-4 p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center space-x-1.5 mb-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                Installation Report Verified & Recorded
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[9px] sm:text-[10px] uppercase font-semibold">Installed By</span>
                <span className="font-bold text-slate-900 truncate block">{installedBy}</span>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[9px] sm:text-[10px] uppercase font-semibold">Mobile</span>
                <span className="font-bold font-mono text-slate-900">{statusInfo.mobile || 'N/A'}</span>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[9px] sm:text-[10px] uppercase font-semibold">Date</span>
                <span className="font-bold font-mono text-slate-900">{displayDate}</span>
              </div>

              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-slate-500 block text-[9px] sm:text-[10px] uppercase font-semibold">Timestamp</span>
                <span className="font-bold text-slate-900 text-[11px] truncate block">{statusInfo.timestamp || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
