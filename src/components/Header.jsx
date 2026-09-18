import React from 'react';
import { Menu, Settings } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function Header({
  onToggleSidebar,
  onOpenSettings,
  onRefresh,
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
                ICT 108 & SC 664 Project Digitization
              </h1>
            </div>
          </div>

          {/* Right: Sync Status & Refresh */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Sheets Status Pill / Click to Refresh */}
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                !isApiConnected
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : isSyncing
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
              }`}
              title={isSyncing ? 'Synchronizing live with Database...' : 'Click to refresh real-time data'}
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
