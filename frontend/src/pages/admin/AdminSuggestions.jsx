import React, { useEffect, useState } from 'react';
import { Lightbulb, EyeOff, MessageSquareReply } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common/Modal';
import { SuggestionStatusBadge, SUGGESTION_STATUS_OPTIONS } from '../../components/common/SuggestionStatus';
import { formatDateTime } from '../../utils/time';

export function AdminSuggestions() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [replying, setReplying] = useState(null);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState('reviewed');
  const [saving, setSaving] = useState(false);

  const load = () => api.getSuggestions()
    .then(res => setList(res.data || []))
    .catch(err => toast.error(err.message || 'Failed to load suggestions.'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const replace = (updated) => setList(prev => prev.map(s => (s.id === updated.id ? updated : s)));

  const changeStatus = async (s, status) => {
    try {
      const res = await api.updateSuggestion(s.id, { status });
      replace(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to update.');
    }
  };

  const openReply = (s) => {
    setReplying(s);
    setReply(s.admin_reply || '');
    setReplyStatus(s.status === 'new' ? 'reviewed' : s.status);
  };

  const saveReply = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSuggestion(replying.id, { admin_reply: reply.trim(), status: replyStatus });
      replace(res.data);
      toast.success('Reply sent to the student.');
      setReplying(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save reply.');
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(list.map(s => s.category))];
  const visible = list.filter(s => (!statusFilter || s.status === statusFilter) && (!categoryFilter || s.category === categoryFilter));
  const newCount = list.filter(s => s.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Lightbulb className="w-7 h-7 text-amber-500" />
            Suggestion Box
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ideas sent by students. {newCount > 0 ? `${newCount} new.` : 'All caught up.'} Anonymous senders are never shown.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700" aria-label="Filter by status">
            <option value="">All statuses</option>
            {SUGGESTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700" aria-label="Filter by topic">
            <option value="">All topics</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center text-sm text-slate-500">
          No suggestions {statusFilter || categoryFilter ? 'match these filters' : 'yet'}.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map(s => (
            <div key={s.id} className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col gap-3 ${s.status === 'new' ? 'border-sky-200' : 'border-slate-200/80'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900">{s.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                    {s.anonymous ? (
                      <span className="inline-flex items-center gap-1 font-semibold"><EyeOff className="w-3 h-3" /> Anonymous</span>
                    ) : (
                      <span className="font-semibold text-slate-700">{s.student_name}{s.student_code ? ` (${s.student_code})` : ''}</span>
                    )}
                    <span>• {s.category}</span>
                    <span>• {formatDateTime(s.created_at)}</span>
                  </div>
                </div>
                <SuggestionStatusBadge status={s.status} />
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-line">{s.message}</p>

              {s.admin_reply && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                  <strong>Your reply:</strong> {s.admin_reply}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-auto">
                <select
                  value={s.status}
                  onChange={(e) => changeStatus(s, e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                  aria-label={`Status for ${s.title}`}
                >
                  {SUGGESTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button
                  onClick={() => openReply(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <MessageSquareReply className="w-3.5 h-3.5" />
                  {s.admin_reply ? 'Edit Reply' : 'Reply'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!replying}
        onClose={() => setReplying(null)}
        title="Reply to Suggestion"
        subtitle={replying ? `"${replying.title}" — ${replying.anonymous ? 'Anonymous' : replying.student_name}` : ''}
      >
        <form onSubmit={saveReply} className="space-y-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Reply
            <textarea
              rows="3"
              maxLength="1000"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="e.g. Great idea! We'll start the evening batch next month."
              className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm normal-case tracking-normal font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Status
            <select value={replyStatus} onChange={(e) => setReplyStatus(e.target.value)} className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm normal-case tracking-normal font-normal">
              {SUGGESTION_STATUS_OPTIONS.filter(o => o.value !== 'new').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <p className="text-[11px] text-slate-500">The student is notified{replying?.anonymous ? ' — their identity stays hidden from you' : ''}.</p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setReplying(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
              {saving ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
