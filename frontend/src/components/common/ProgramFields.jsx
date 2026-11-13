import React from 'react';
import { BookOpen, Wrench } from 'lucide-react';

export const PROGRAM_TYPE_OPTIONS = [
  { value: 'course', label: 'Course', icon: BookOpen },
  { value: 'training', label: 'Training', icon: Wrench }
];

export const PROGRAM_DURATION_OPTIONS = [
  { value: '45_days', label: '45 Days' },
  { value: '6_months', label: '6 Months' },
  { value: '120_hours', label: '120 Hours' }
];

export function validateProgram({ program_type, program_duration }) {
  if (!program_type) return 'Please choose Course or Training.';
  if (!program_duration) return 'Please choose the duration (45 Days, 6 Months, or 120 Hours).';
  return '';
}

// Course / Training toggle plus duration chips. value: { program_type, program_duration }
export function ProgramFields({ value, onChange, disabled = false }) {
  const chip = (active) =>
    `flex-1 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer disabled:opacity-50 ${
      active ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
    }`;

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Joining for</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Course or training">
          {PROGRAM_TYPE_OPTIONS.map(({ value: v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value.program_type === v}
              disabled={disabled}
              onClick={() => onChange({ ...value, program_type: v })}
              className={`${chip(value.program_type === v)} inline-flex items-center justify-center gap-2`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Duration</span>
        <div className="flex gap-2" role="radiogroup" aria-label="Duration">
          {PROGRAM_DURATION_OPTIONS.map(({ value: v, label }) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value.program_duration === v}
              disabled={disabled}
              onClick={() => onChange({ ...value, program_duration: v })}
              className={chip(value.program_duration === v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
