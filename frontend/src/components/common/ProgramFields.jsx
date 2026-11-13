import React from 'react';
import { BookOpen, Wrench, Check } from 'lucide-react';

export const PROGRAM_TYPE_OPTIONS = [
  { value: 'course', label: 'Course', hint: 'Full learning program', icon: BookOpen },
  { value: 'training', label: 'Training', hint: 'Fixed duration', icon: Wrench }
];

export const PROGRAM_DURATION_OPTIONS = [
  { value: '45_days', label: '45 Days' },
  { value: '6_weeks', label: '6 Weeks' },
  { value: '6_months', label: '6 Months' },
  { value: '120_hours', label: '120 Hours' }
];

export function validateProgram({ program_type, program_duration }) {
  if (!program_type) return 'Please choose Course or Training.';
  if (program_type === 'training' && !program_duration) return 'Please choose the training duration.';
  return '';
}

// Course / Training choice. The duration row only appears for Training.
// value: { program_type, program_duration }
export function ProgramFields({ value, onChange, disabled = false }) {
  const isTraining = value.program_type === 'training';

  const pickType = (type) => {
    if (disabled || type === value.program_type) return;
    // A course has no fixed duration, so clear it when switching away from training
    onChange({ ...value, program_type: type, program_duration: type === 'training' ? value.program_duration : '' });
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Joining for">
        {PROGRAM_TYPE_OPTIONS.map(({ value: v, label, hint, icon: Icon }) => {
          const active = value.program_type === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => pickType(v)}
              className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                active
                  ? 'border-indigo-500 bg-indigo-50/70 shadow-sm shadow-indigo-500/10'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/60'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-bold ${active ? 'text-indigo-900' : 'text-slate-800'}`}>{label}</span>
                <span className="block truncate text-[11px] text-slate-500">{hint}</span>
              </span>
              {active && (
                <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Duration slides open only for Training */}
      <div
        className={`grid transition-all duration-300 ease-out ${isTraining ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
        aria-hidden={!isTraining}
      >
        <div className="overflow-hidden">
          <div className="flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Training duration">
            {PROGRAM_DURATION_OPTIONS.map(({ value: v, label }) => {
              const active = value.program_duration === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={isTraining ? 0 : -1}
                  disabled={disabled || !isTraining}
                  onClick={() => onChange({ ...value, program_duration: v })}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                    active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
