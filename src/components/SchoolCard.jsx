import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Hash,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { CATEGORY_BADGE_COLORS, CATEGORY_LABELS } from '../data/deviceSchemas';
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <Building2 className="h-6 w-6 text-brand-300" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-brand-300">
                School Master Profile
              </span>
              <h2 className="text-xl font-bold tracking-tight">{school.school_name}</h2>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center">
            {isCompleted ? (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-900/20">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                ALREADY UPDATED
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900 shadow-sm shadow-amber-900/20">
                <Clock className="h-4 w-4 mr-1.5" />
                PENDING DIGITIZATION
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* UDISE */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                UDISE Code
              </span>
              <span className="text-sm font-bold font-mono text-slate-800">
                {school.udise}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(school.udise, 'udise')}
              title="Copy UDISE"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              {copiedField === 'udise' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* SNIL */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                SNIL Code
              </span>
              <span className="text-sm font-bold font-mono text-slate-800">
                {school.snil}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(school.snil, 'snil')}
              title="Copy SNIL"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              {copiedField === 'snil' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* District & Block */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              District / Block
            </span>
            <span className="text-sm font-bold text-slate-800 flex items-center mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400 mr-1" />
              {school.district}, {school.block}
            </span>
          </div>

          {/* Category */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Lab Allocation
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-md text-xs font-bold border ${
                CATEGORY_BADGE_COLORS[school.category] || 'bg-slate-100 text-slate-800'
              }`}
            >
              <Layers className="h-3 w-3 mr-1" />
              {CATEGORY_LABELS[school.category] || school.category}
            </span>
          </div>
        </div>

        {/* Existing Completion Banner if Already Updated */}
        {isCompleted && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-emerald-900">
                Installation Report Verified & Recorded
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                <User className="h-4 w-4 text-emerald-700" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Installed By</span>
                  <span className="font-bold text-slate-900">{installedBy}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                <Phone className="h-4 w-4 text-emerald-700" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Mobile Number</span>
                  <span className="font-bold font-mono text-slate-900">{statusInfo.mobile || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                <Calendar className="h-4 w-4 text-emerald-700" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Installation Date</span>
                  <span className="font-bold font-mono text-slate-900">{displayDate}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                <Clock className="h-4 w-4 text-emerald-700" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Logged Timestamp</span>
                  <span className="font-bold text-slate-900">{statusInfo.timestamp || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
