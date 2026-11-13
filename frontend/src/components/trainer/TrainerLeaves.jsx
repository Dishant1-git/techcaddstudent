import React, { useEffect, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { api } from '../../services/api';
import { todayIST } from '../../utils/time';

const STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};
const LABELS = { pending: 'Waiting for admin', approved: 'Approved', rejected: 'Not approved' };

// Leaves of the trainer's own students, so they know who will be away
export function TrainerLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [show, setShow] = useState('upcoming');

  useEffect(() => {
    api.getTrainerLeaves().then(res => setLeaves(res.data || [])).catch(() => {});
  }, []);

  const today = todayIST();
  const visible = show === 'upcoming' ? leaves.filter(l => l.to_date >= today) : leaves;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-indigo-600" />
          Student Leaves
        </h2>
        <div className="flex gap-1 text-xs">
          {['upcoming', 'all'].map(k => (
            <button
              key={k}
              onClick={() => setShow(k)}
              className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer ${show === k ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">{show === 'upcoming' ? 'No current or upcoming leaves.' : 'No leaves yet.'}</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {visible.map(l => (
            <div key={l.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
              <div>
                <span className="font-bold text-slate-900">{l.student_name}</span>
                <span className="text-slate-600"> • {l.from_date === l.to_date ? l.from_date : `${l.from_date} to ${l.to_date}`}</span>
                {l.reason && <div className="text-[11px] text-slate-500">{l.reason}</div>}
              </div>
              <span className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${STYLES[l.status]}`}>{LABELS[l.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
