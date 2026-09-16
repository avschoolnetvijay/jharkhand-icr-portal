import React from 'react';
import { Menu, Settings } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function Header({
  onToggleSidebar,
  onOpenSettings,
  completedCount,
  totalSchools = 679,
  isSyncing = false
}) {
  const isApiConnected = Boolean(getApiUrl());

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger + Portal Title */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Toggle Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2 truncate">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Data Collection Portal
              </h1>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-xs sm:text-sm font-medium text-slate-500 hidden sm:inline truncate">
                ICT 108 & SC 664 Project
              </span>
            </div>
          </div>

          {/* Right: Sync Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Sheets Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                !isApiConnected
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : isSyncing
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={isApiConnected ? (isSyncing ? 'Synchronizing with Google Sheets...' : 'Connected to Google Sheets') : 'Click to configure Google Sheets'}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                !isApiConnected
                  ? 'bg-amber-500'
                  : isSyncing
                  ? 'bg-blue-600 animate-ping'
                  : 'bg-emerald-600'
              }`}></span>
              <span className="text-[11px] sm:text-xs font-semibold">
                {!isApiConnected ? 'Offline' : isSyncing ? 'Syncing...' : 'Live Sync'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
