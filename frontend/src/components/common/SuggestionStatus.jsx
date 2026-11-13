import React from 'react';

export const SUGGESTION_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'planned', label: 'Planned' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'not_planned', label: 'Not Planned' }
];

const STYLES = {
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  reviewed: 'bg-slate-100 text-slate-700 border-slate-300',
  planned: 'bg-amber-50 text-amber-700 border-amber-200',
  implemented: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  not_planned: 'bg-rose-50 text-rose-700 border-rose-200'
};

export function SuggestionStatusBadge({ status }) {
  const label = SUGGESTION_STATUS_OPTIONS.find(o => o.value === status)?.label || 'New';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STYLES[status] || STYLES.new}`}>{label}</span>;
}
