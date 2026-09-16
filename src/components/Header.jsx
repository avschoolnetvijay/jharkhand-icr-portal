import React, { useState } from 'react';
import { Menu, Bell, ChevronDown, CheckCircle2, Cloud, LogOut, User, ShieldCheck } from 'lucide-react';
import { getApiUrl } from '../services/api';

export default function Header({
  onToggleSidebar,
  onOpenSettings,
  completedCount,
  totalSchools = 679,
  isSyncing = false
}) {
  const isApiConnected = Boolean(getApiUrl());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

          {/* Right: Sync Status + Notifications + User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Live Sheets Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
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

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  1
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] text-blue-600 font-semibold cursor-pointer">Mark all as read</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-blue-50/70 rounded-xl border border-blue-100">
                      <div className="font-semibold text-blue-900">Real-Time Sync Active</div>
                      <div className="text-[11px] text-blue-700 mt-0.5">
                        Connected to Google Sheets backend for 679 Jharkhand schools.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2.5 p-1 sm:px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {/* Avatar Badge with Initials "VR" */}
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#1d68e2] text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-xs">
                  VR
                </div>
                {/* User Details (Desktop) */}
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    Vijay Kumar Ray
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Project Manager
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-bold text-slate-900">Vijay Kumar Ray</div>
                    <div className="text-[11px] text-slate-500">Project Manager • Jharkhand</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Cloud className="h-3.5 w-3.5 text-slate-500" />
                    <span>Google Sheets Config</span>
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <div className="px-3 py-1.5 text-[10px] text-slate-400 font-mono">
                    Project: ICT 108 & SC 664
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
