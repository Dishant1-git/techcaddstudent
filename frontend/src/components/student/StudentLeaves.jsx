import React, { useEffect, useState } from 'react';
import { CalendarOff, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { todayIST } from '../../utils/time';

const STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};
const LABELS = { pending: 'Waiting for admin', approved: 'Approved', rejected: 'Not approved' };
const today = () => todayIST();
const inputClass = 'mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm normal-case tracking-normal font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

// Student's leave requests: ask for leave and see what the admin decided
export function StudentLeaves() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from_date: today(), to_date: today(), reason: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.getMyLeaves().then(res => setLeaves(res.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      toast.warning('Please write the reason for your leave.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.requestLeave({ ...form, reason: form.reason.trim() });
      toast.success(res.message, 'Leave Requested');
      setOpen(false);
      setForm({ from_date: today(), to_date: today(), reason: '' });
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to request leave.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-indigo-600" />
          My Leaves
        </h2>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Going to miss class? Request leave so you are not marked absent. If you miss 3 working days without leave, the admin and your trainer are informed.
      </p>
      {leaves.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">You have not requested any leave.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {leaves.slice(0, 6).map(l => (
            <div key={l.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
              <div>
                <span className="font-bold text-slate-800">{l.from_date === l.to_date ? l.from_date : `${l.from_date} to ${l.to_date}`}</span>
                <span className="text-slate-500"> • {l.reason}</span>
                {l.admin_note && <div className="text-[11px] text-slate-500">Admin: {l.admin_note}</div>}
              </div>
              <span className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${STYLES[l.status]}`}>{LABELS[l.status]}</span>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Request Leave" subtitle="The admin will approve or reject your request.">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              From
              <input type="date" required value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value, to_date: form.to_date < e.target.value ? e.target.value : form.to_date })} className={inputClass} />
            </label>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              To
              <input type="date" required min={form.from_date} value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} className={inputClass} />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Reason
            <textarea rows="2" required maxLength="500" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Not feeling well, family function" className={inputClass} />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
              {saving ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
