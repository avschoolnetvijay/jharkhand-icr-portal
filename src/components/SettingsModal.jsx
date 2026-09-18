import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, AlertCircle, Loader2, Trash2, UploadCloud, Database } from 'lucide-react';
import { getApiUrl, seedMasterSchoolsToDatabase } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [url] = useState(() => getApiUrl());
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  if (!isOpen) return null;

  // One-click seed master schools
  const handleSeedSchools = async () => {
    if (!confirm('This will ensure all 679 master schools are synchronized into the database. Proceed?')) {
      return;
    }

    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedMasterSchoolsToDatabase();
      setSeedResult({
        success: true,
        message: res.message || `All ${res.count || 679} schools synchronized in Database!`
      });
      onConfigSaved();
    } catch (err) {
      setSeedResult({
        success: false,
        message: `Database sync error: ${err.message}`
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear local browser cache? This will fetch fresh data from the database.')) {
      localStorage.removeItem('icr_local_inventory');
      localStorage.removeItem('icr_local_status');
      localStorage.removeItem('icr_cached_master_schools');
      localStorage.removeItem('icr_cached_status_map');
      localStorage.removeItem('icr_registered_serials_registry');
      alert('Local browser cache cleared.');
      onConfigSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Central Database Backend
              </h3>
              <p className="text-xs text-slate-500">
                Live Master Schools & Hardware Inventory Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Connected Database Endpoint
            </label>
            <input
              type="text"
              readOnly
              value={url}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 select-all outline-hidden cursor-default"
            />
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Database Status: Connected & Synchronized (Sub-Second Speed)</span>
            </div>
          </div>

          {/* Master Schools Seeding Section */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Master Schools Sync
                </h4>
                <p className="text-[11px] text-slate-500">
                  Synchronize 679 Jharkhand schools in the central database.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedSchools}
                disabled={seeding}
                className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {seeding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 text-slate-600" />
                )}
                <span>{seeding ? 'Syncing...' : 'Sync 679 Schools'}</span>
              </button>
            </div>

            {seedResult && (
              <p
                className={`text-xs font-medium pt-1 ${
                  seedResult.success ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {seedResult.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Local Cache</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
