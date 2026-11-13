import React from 'react';

export const ENROLLMENT_OPTIONS = [
  { value: 'running', label: 'Running' },
  { value: 'hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' }
];

const STYLES = {
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hold: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  dropped: 'bg-slate-100 text-slate-600 border-slate-300'
};

export function enrollmentLabel(value) {
  return ENROLLMENT_OPTIONS.find(o => o.value === value)?.label || 'Running';
}

export function EnrollmentBadge({ status = 'running', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${STYLES[status] || STYLES.running} ${className}`}>
      {enrollmentLabel(status)}
    </span>
  );
}

// Small red/blue tag for students who are absent several days or on leave today
export function AbsenceTag({ student }) {
  if (student?.on_leave_today) {
    return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">On leave</span>;
  }
  if ((student?.absent_streak || 0) >= 3) {
    return <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Absent {student.absent_streak} days</span>;
  }
  return null;
}
