import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, AlertCircle, Loader2, ExternalLink, Trash2, UploadCloud } from 'lucide-react';
import { getApiUrl, setApiUrl, seedMasterSchoolsToGoogleSheet } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [url, setUrl] = useState(() => getApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setApiUrl('');
      setTestResult({
        success: true,
        message: 'Google Sheets sync disabled. Running in Local Storage mode.'
      });
      setTesting(false);
      onConfigSaved();
      return;
    }

    try {
      const res = await fetch(`${cleanUrl}?action=getAllStatus`);
      const json = await res.json();
      if (json.success) {
        setApiUrl(cleanUrl);
        setTestResult({
          success: true,
          message: 'Connection Successful! Google Sheets Web App is live and ready.'
        });
        onConfigSaved();
      } else {
        throw new Error(json.error || 'Server responded with error');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Connection Failed: ${err.message}. Ensure "Who has access" is set to "Anyone" in Google Apps Script deployment.`
      });
    } finally {
      setTesting(false);
    }
  };

  // One-click seed master schools
  const handleSeedSchools = async () => {
    if (!url.trim()) {
      alert('Please save a valid Google Apps Script Web App URL first.');
      return;
    }
    if (!confirm('This will populate / update the "Master_Schools" tab in your Google Sheet with all 679 schools. Proceed?')) {
      return;
    }

    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedMasterSchoolsToGoogleSheet();
      setSeedResult({
        success: true,
        message: res.message || 'All 679 schools pushed to Google Sheet!'
      });
      onConfigSaved();
    } catch (err) {
      setSeedResult({
        success: false,
        message: `Seeding error: ${err.message}`
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear local test submissions? This will reset local entries.')) {
      localStorage.removeItem('icr_local_inventory');
      localStorage.removeItem('icr_local_status');
      localStorage.removeItem('icr_cached_master_schools');
      alert('Local storage cache cleared.');
      onConfigSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Google Sheets Backend Sync
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

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Google Apps Script Web App URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:border-brand-500 outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Refer to <code>GOOGLE_SHEETS_SETUP.md</code> to generate this URL in 2 minutes.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Master Schools Seeding Section */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Google Sheet Master_Schools Sync
                </h4>
                <p className="text-[11px] text-slate-500">
                  Push 679 schools to sheet so you can edit or add schools in Google Sheet anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSeedSchools}
                disabled={seeding || !url.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg border border-brand-200 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {seeding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5" />
                )}
                <span>{seeding ? 'Pushing...' : 'Push 679 Schools to Sheet'}</span>
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
              <span>Reset Cache</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={testing}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{testing ? 'Testing...' : 'Save & Test Sync'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
