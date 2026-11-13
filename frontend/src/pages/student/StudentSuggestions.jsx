import React, { useEffect, useState } from 'react';
import { Lightbulb, Send, EyeOff, MessageSquareReply } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { SuggestionStatusBadge } from '../../components/common/SuggestionStatus';
import { formatDate } from '../../utils/time';

const DEFAULT_CATEGORIES = ['Classes & Teaching', 'Course Content', 'Timings', 'Facilities', 'Portal / App', 'Other'];
const inputClass = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
const emptyForm = { category: '', title: '', message: '', anonymous: false };

export function StudentSuggestions() {
  const toast = useToast();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);

  const load = () => api.getMySuggestions()
    .then(res => {
      setList(res.data || []);
      if (res.categories?.length) setCategories(res.categories);
    })
    .catch(() => {});

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.message.trim().length < 5) {
      toast.warning('Please write your suggestion first.');
      return;
    }
    setSending(true);
    try {
      const res = await api.submitSuggestion({ ...form, category: form.category || 'Other' });
      toast.success(res.message, 'Suggestion Sent');
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to send your suggestion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Lightbulb className="w-7 h-7 text-amber-500" />
          Suggestion Box
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Have an idea to make classes, timings, or the institute better? Tell the admin.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">About</span>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                aria-pressed={form.category === c}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                  form.category === c
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Title (optional)
          <input
            type="text"
            maxLength="120"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Add an evening batch"
            className={`mt-1.5 normal-case tracking-normal font-normal ${inputClass}`}
          />
        </label>

        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Your suggestion
          <textarea
            rows="4"
            required
            maxLength="2000"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Share your idea in a few lines..."
            className={`mt-1.5 normal-case tracking-normal font-normal ${inputClass}`}
          />
          <span className="block text-right text-[10px] font-normal text-slate-400 mt-1">{form.message.length}/2000</span>
        </label>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            Hide my name from the admin
          </label>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Suggestion'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-3">My Suggestions</h2>
        {list.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">You haven't sent any suggestions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map(s => (
              <div key={s.id} className="py-3 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{s.title}</span>
                  <SuggestionStatusBadge status={s.status} />
                  {s.anonymous && <span className="text-[10px] text-slate-400 inline-flex items-center gap-1"><EyeOff className="w-3 h-3" /> sent anonymously</span>}
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-line">{s.message}</p>
                <div className="text-[11px] text-slate-400">{s.category} • {formatDate(s.created_at)}</div>
                {s.admin_reply && (
                  <div className="mt-1 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex gap-2">
                    <MessageSquareReply className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span><strong>Admin:</strong> {s.admin_reply}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
