import React from 'react';
import { Monitor, BarChart3, Database, ShieldCheck, CheckCircle2, Cloud } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function Header({ currentView, setCurrentView, onOpenSettings, completedCount, totalSchools = 679 }) {
  const isApiConnected = Boolean(getApiUrl());
  const percent = Math.round((completedCount / totalSchools) * 100) || 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo & Titles */}
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Jharkhand ICR Digitization Portal
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                  ICT 108 & SC 664
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Hardware Serial Number Verification & Row-Wise Asset Inventory System
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Completion Pill */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div className="text-xs">
                <span className="font-bold text-slate-800">{completedCount}</span>
                <span className="text-slate-400"> / {totalSchools}</span>
                <span className="ml-1 text-emerald-600 font-semibold">({percent}%)</span>
              </div>
            </div>

            {/* Google Sheets Status Indicator */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isApiConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
              title={isApiConnected ? 'Google Sheet API Connected' : 'Click to connect Google Sheets Web App URL'}
            >
              <Cloud className={`h-3.5 w-3.5 ${isApiConnected ? 'text-emerald-600 animate-pulse' : 'text-amber-500'}`} />
              <span className="hidden lg:inline">{isApiConnected ? 'Sheets Sync: Live' : 'Sheets: Offline/Local'}</span>
            </button>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setCurrentView('technician')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'technician'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="h-4 w-4" />
                <span>Digitize ICR</span>
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'admin'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
