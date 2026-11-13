import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarOff, CheckCircle2, XCircle, RefreshCw, Phone, Mail, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';

const today = () => new Date().toISOString().split('T')[0];

const LEAVE_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const RESOLVED_LABELS = {
  attended: 'Student attended again',
  leave_approved: 'Leave approved',
  status_changed: 'Course status changed',
  dismissed: 'Dismissed by admin'
};

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

export function AdminAbsences() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'leaves' ? 'leaves' : 'alerts');
  const [alerts, setAlerts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [threshold, setThreshold] = useState(3);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Grant leave from an alert
  const [granting, setGranting] = useState(null);
  const [grantForm, setGrantForm] = useState({ from_date: '', to_date: '', reason: '' });

  // Reject a leave request with a note
  const [rejecting, setRejecting] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = async () => {
    try {
      const [openRes, allRes, leaveRes] = await Promise.all([
        api.getAbsenceAlerts('open'),
        api.getAbsenceAlerts('resolved'),
        api.getLeaves()
      ]);
      setAlerts(openRes.data || []);
      setThreshold(openRes.threshold || 3);
      setResolvedAlerts((allRes.data || []).slice(0, 30));
      setLeaves(leaveRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load absence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await api.runAbsenceCheck();
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(err.message || 'Check failed.');
    } finally {
      setChecking(false);
    }
  };

  const openGrant = (alert) => {
    setGranting(alert);
    setGrantForm({ from_date: alert.first_absent_date, to_date: today(), reason: '' });
  };

  const submitGrant = async (e) => {
    e.preventDefault();
    setBusyId(`grant-${granting.id}`);
    try {
      const res = await api.grantLeave({ student_id: granting.student_id, ...grantForm });
      toast.success(res.message, 'Leave Approved');
      setGranting(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to approve leave.');
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (alert) => {
    setBusyId(`dismiss-${alert.id}`);
    try {
      await api.dismissAbsenceAlert(alert.id);
      toast.info(`Alerts stopped for ${alert.student_name}.`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to dismiss.');
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (leave) => {
    setBusyId(`leave-${leave.id}`);
    try {
      await api.approveLeave(leave.id);
      toast.success(`Leave approved for ${leave.student_name}.`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to approve.');
    } finally {
      setBusyId(null);
    }
  };

  const submitReject = async (e) => {
    e.preventDefault();
    setBusyId(`leave-${rejecting.id}`);
    try {
      await api.rejectLeave(rejecting.id, rejectNote);
      toast.info(`Leave rejected for ${rejecting.student_name}.`);
      setRejecting(null);
      setRejectNote('');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to reject.');
    } finally {
      setBusyId(null);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  const tabButton = (key, label, count, tone) => (
    <button
      onClick={() => setTab(key)}
      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
        tab === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tab === key ? 'bg-white/20 text-white' : tone}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarOff className="w-7 h-7 text-indigo-600" />
            Absence & Leaves
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Students absent {threshold} or more working days in a row appear here. Approve a leave to stop the alerts.
            Their trainer is notified too.
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Check Now
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {tabButton('alerts', 'Absence Alerts', alerts.length, 'bg-rose-100 text-rose-800')}
        {tabButton('leaves', 'Leave Requests', pendingLeaves.length, 'bg-amber-100 text-amber-800')}
        {tabButton('history', 'History', 0, '')}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'alerts' ? (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="mt-3 font-bold text-slate-800">No absence alerts</p>
              <p className="text-xs text-slate-500 mt-1">Every running student has attended within the last {threshold} working days.</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-extrabold leading-none">{a.absent_days}</span>
                <span className="text-[9px] font-bold uppercase">days</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-bold text-slate-900">
                  {a.student_name} <span className="font-mono text-xs text-indigo-700">({a.student_code})</span>
                </div>
                <div className="text-xs text-slate-600">
                  Absent from <strong>{a.first_absent_date}</strong> to <strong>{a.last_absent_date}</strong>
                  {' '}• Trainer: <strong>{a.trainer_name}</strong>
                  {a.class_timing && <> • <Clock className="inline w-3 h-3" /> {a.class_timing}</>}
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  {a.student_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {a.student_phone}</span>}
                  {a.student_email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {a.student_email}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  onClick={() => openGrant(a)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve Leave
                </button>
                <button
                  onClick={() => dismiss(a)}
                  disabled={busyId === `dismiss-${a.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer disabled:opacity-50"
                  title="Stop alerts for this absence without recording a leave"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'leaves' ? (
        <LeaveList
          leaves={leaves}
          busyId={busyId}
          onApprove={approve}
          onReject={(l) => { setRejecting(l); setRejectNote(''); }}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
          {resolvedAlerts.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No past alerts yet.</p>
          ) : resolvedAlerts.map(a => (
            <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-900">{a.student_name}</span>
                <span className="text-slate-500"> • absent {a.absent_days} days ({a.first_absent_date} to {a.last_absent_date})</span>
              </div>
              <span className="text-slate-600">
                {RESOLVED_LABELS[a.resolved_reason] || 'Resolved'}
                {a.resolved_at && <span className="text-slate-400"> • {new Date(a.resolved_at).toLocaleDateString()}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!granting}
        onClose={() => setGranting(null)}
        title={`Approve Leave: ${granting?.student_name || ''}`}
        subtitle="Absence alerts stop for these dates. The student and trainer are notified."
      >
        <form onSubmit={submitGrant} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              From
              <input type="date" required value={grantForm.from_date} onChange={(e) => setGrantForm({ ...grantForm, from_date: e.target.value })} className={`mt-1.5 ${inputClass}`} />
            </label>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              To
              <input type="date" required min={grantForm.from_date} value={grantForm.to_date} onChange={(e) => setGrantForm({ ...grantForm, to_date: e.target.value })} className={`mt-1.5 ${inputClass}`} />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Reason (optional)
            <input type="text" value={grantForm.reason} onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })} placeholder="e.g. Medical leave, informed by phone" className={`mt-1.5 normal-case tracking-normal font-normal ${inputClass}`} />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setGranting(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={busyId?.startsWith('grant')} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
              Approve Leave
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject Leave: ${rejecting?.student_name || ''}`}
        subtitle={rejecting ? `${rejecting.from_date} to ${rejecting.to_date}` : ''}
      >
        <form onSubmit={submitReject} className="space-y-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Note for the student (optional)
            <textarea rows="2" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} className={`mt-1.5 normal-case tracking-normal font-normal ${inputClass}`} />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setRejecting(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer">Reject Leave</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function LeaveList({ leaves, busyId, onApprove, onReject }) {
  if (leaves.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center text-sm text-slate-500">
        No leave requests yet.
      </div>
    );
  }
  const sorted = [...leaves].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
      {sorted.map(l => (
        <div key={l.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">{l.student_name}</span>
              <span className="font-mono text-xs text-indigo-700">({l.student_code})</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${LEAVE_STYLES[l.status]}`}>{l.status}</span>
              {l.requested_by === 'admin' && <span className="text-[10px] text-slate-400">added by admin</span>}
            </div>
            <div className="text-xs text-slate-600">
              <strong>{l.from_date}</strong> to <strong>{l.to_date}</strong> ({l.days} working day{l.days === 1 ? '' : 's'}) • Trainer: {l.trainer_name}
            </div>
            {l.reason && <div className="text-xs text-slate-700">"{l.reason}"</div>}
            {l.admin_note && <div className="text-[11px] text-slate-500">Admin note: {l.admin_note}</div>}
          </div>
          {l.status === 'pending' && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onApprove(l)}
                disabled={busyId === `leave-${l.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => onReject(l)}
                disabled={busyId === `leave-${l.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
