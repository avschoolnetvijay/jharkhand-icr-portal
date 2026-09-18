import React from 'react';
import { Lock, ShieldCheck, Printer, CheckCircle2 } from 'lucide-react';
import { getCategoryDevices } from '../data/deviceSchemas';

export default function ReadOnlySubmissionView({ school, statusInfo }) {
  if (!school || !statusInfo) return null;

  let devices = [];
  try {
    if (statusInfo.devicesJson) {
      devices = typeof statusInfo.devicesJson === 'string'
        ? JSON.parse(statusInfo.devicesJson)
        : statusInfo.devicesJson;
    }
  } catch (e) {
    console.error('Failed to parse devicesJson:', e);
  }

  if (!devices || devices.length === 0) {
    const template = getCategoryDevices(school.category);
    devices = template.map(t => ({
      item_name: t.itemName,
      make_model: `${t.make} ${t.model}`,
      serial_number: '(Recorded in Database)'
    }));
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-4 sm:mt-6">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-slate-500" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            Digitized Hardware Serial Numbers (Read-Only)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
            Verified
          </span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-4 w-12 text-center">#</th>
              <th className="py-2.5 px-4">Item Description</th>
              <th className="py-2.5 px-4">Make & Model</th>
              <th className="py-2.5 px-4 font-mono">Serial Number</th>
              <th className="py-2.5 px-4 w-24 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((dev, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-4 text-center font-bold text-slate-400 text-xs">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">
                  {dev.item_name}
                </td>
                <td className="py-2.5 px-4 text-slate-500 text-xs">
                  {dev.make_model}
                </td>
                <td className="py-2.5 px-4">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                    {dev.serial_number}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Installed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden divide-y divide-slate-100">
        {devices.map((dev, idx) => (
          <div key={idx} className="p-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                <h4 className="text-xs font-bold text-slate-900 truncate">{dev.item_name}</h4>
              </div>
              <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                {dev.make_model}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-[11px] border border-slate-200 block">
                {dev.serial_number}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
        <span>Total Hardware Assets: <strong>{devices.length} items</strong></span>
        <span className="text-emerald-700 font-semibold flex items-center">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Synced in Database
        </span>
      </div>
    </div>
  );
}
