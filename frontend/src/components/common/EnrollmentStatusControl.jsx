import React, { useState } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from './Modal';
import { ENROLLMENT_OPTIONS } from './EnrollmentBadge';

const SELECT_STYLES = {
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hold: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  dropped: 'bg-slate-100 text-slate-600 border-slate-300'
};

// Course status dropdown with a confirm step and optional note. Calls onUpdated(student) after saving.
export function EnrollmentStatusControl({ student, onUpdated, notifyText = 'The student and the admin are notified.' }) {
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const current = student.enrollment_status || 'running';

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.setEnrollmentStatus(student.id, pending, note.trim());
      toast.success(res.message, 'Course Status Updated');
      onUpdated?.(res.data);
      setPending(null);
    } catch (err) {
      toast.error(err.message || 'Failed to change course status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <select
        value={current}
        onChange={(e) => { if (e.target.value !== current) { setPending(e.target.value); setNote(''); } }}
        className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${SELECT_STYLES[current]}`}
        aria-label={`Course status for ${student.name}`}
      >
        {ENROLLMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <Modal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        title={`Change Course Status: ${student.name}`}
        subtitle={pending ? `New status: ${ENROLLMENT_OPTIONS.find(o => o.value === pending)?.label}` : ''}
      >
        <form onSubmit={save} className="space-y-4">
          <p className="text-xs text-slate-600">
            {pending === 'running'
              ? 'The student can mark attendance again and absence alerts resume.'
              : 'The student will not be able to mark attendance and absence alerts stop.'}{' '}
            {notifyText}
          </p>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Medical break, course finished"
              className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm normal-case tracking-normal font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setPending(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
              {saving ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
