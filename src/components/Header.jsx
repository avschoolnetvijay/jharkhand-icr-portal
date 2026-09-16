import React from 'react';
import { Layers, BarChart2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function Header({ currentView, setCurrentView, onOpenSettings, completedCount, totalSchools = 679 }) {
  const isApiConnected = Boolean(getApiUrl());
  const percent = Math.round((completedCount / totalSchools) * 100) || 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Official Brand Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
              <ShieldCheck className="h-5 w-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 leading-tight">
                  Jharkhand ICR Portal
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  ICT 108 & SC 664
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Hardware Installation Digitization & Asset Register
              </p>
            </div>
          </div>

          {/* Controls & Segmented Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Sheets Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isApiConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title={isApiConnected ? 'Connected to Google Sheets' : 'Click to configure Google Sheets'}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${isApiConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-[11px] sm:text-xs font-semibold">
                {isApiConnected ? 'Live Sync' : 'Offline'}
              </span>
            </button>

            {/* Segmented Control Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setCurrentView('technician')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'technician'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Digitize</span>
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Dashboard</span>
                <span className="xs:hidden">Admin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
