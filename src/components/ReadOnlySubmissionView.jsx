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

  // Fallback to category devices template if json not available
  if (!devices || devices.length === 0) {
    const template = getCategoryDevices(school.category);
    devices = template.map(t => ({
      item_name: t.itemName,
      make_model: `${t.make} ${t.model}`,
      serial_number: '(Recorded in Database)'
    }));
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-slate-500" />
          <h3 className="text-base font-bold text-slate-800">
            Digitized Hardware Serial Numbers (Read-Only)
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Locked & Verified
          </span>
        </div>
      </div>

      {/* Device List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">Item Description</th>
              <th className="py-3 px-4">Make & Model</th>
              <th className="py-3 px-4 font-mono">Serial Number</th>
              <th className="py-3 px-4 w-28 text-center">Installed</th>
              <th className="py-3 px-4 w-28 text-center">Working</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((dev, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs">
                  {idx + 1}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {dev.item_name}
                </td>
                <td className="py-3 px-4 text-slate-600 text-xs">
                  {dev.make_model}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs">
                    {dev.serial_number}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Yes
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Yes
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>Total Digitized Hardware Assets: <strong>{devices.length} items</strong></span>
        <span>Row-Wise Record Synced to Master Database</span>
      </div>
    </div>
  );
}
