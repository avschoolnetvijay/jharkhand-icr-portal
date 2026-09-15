import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CheckCircle2, Clock, Building2, MapPin, Hash, Sparkles } from 'lucide-react';
import { CATEGORY_BADGE_COLORS, CATEGORY_LABELS } from '../data/deviceSchemas';

export default function SchoolSearch({ schools, statusMap, onSelectSchool, selectedSchool }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter matching schools (limit to top 15 for fast rendering)
  const filteredSchools = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    return schools
      .filter((s) => {
        return (
          s.udise.toLowerCase().includes(q) ||
          s.snil.toLowerCase().includes(q) ||
          s.school_name.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.block.toLowerCase().includes(q)
        );
      })
      .slice(0, 15);
  }, [query, schools]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || filteredSchools.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSchools.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSchools.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSchools.length) {
        handleSelect(filteredSchools[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (school) => {
    onSelectSchool(school);
    setQuery(`${school.school_name} (${school.udise})`);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onSelectSchool(null);
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="h-5 w-5 text-brand-600" />
        </div>

        {/* Search Input Box */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by UDISE Code, SNIL Code, or School Name..."
          className="w-full pl-12 pr-12 py-3.5 bg-white rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-800 placeholder-slate-400 font-medium text-base shadow-sm hover:border-slate-300 transition-all outline-hidden"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            type="button"
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Auto-suggest Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[420px] overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {filteredSchools.length > 0 ? (
            filteredSchools.map((sch, index) => {
              const isUpdated = statusMap[sch.udise]?.status === 'Completed';
              const isSelected = selectedSchool?.udise === sch.udise;
              const isHighlighted = highlightedIndex === index;

              return (
                <div
                  key={sch.udise}
                  onClick={() => handleSelect(sch)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isHighlighted || isSelected
                      ? 'bg-brand-50/80 border-l-4 border-brand-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {sch.school_name}
                        </h4>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                        <span className="flex items-center font-mono font-medium text-slate-700">
                          <Hash className="h-3 w-3 mr-0.5 text-slate-400" />
                          UDISE: {sch.udise}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-600">
                          SNIL: {sch.snil}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center text-slate-600">
                          <MapPin className="h-3 w-3 mr-0.5 text-slate-400" />
                          {sch.block}, {sch.district}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            CATEGORY_BADGE_COLORS[sch.category] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {CATEGORY_LABELS[sch.category] || sch.category}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 pt-0.5">
                      {isUpdated ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          Already Updated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-500">
              <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium">No school found matching "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">
                Please double-check the UDISE code, SNIL code, or school spelling.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
