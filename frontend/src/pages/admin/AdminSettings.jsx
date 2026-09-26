import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Send,
  Building,
  ShieldAlert,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export function AdminSettings() {
  const toast = useToast();

  // Broadcast state
  const [targetRole, setTargetRole] = useState('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Institution settings
  const [instituteName, setInstituteName] = useState('Apex Institute of Technology & Engineering');
  const [instituteCode, setInstituteCode] = useState('AITE-GLOBAL');
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.warning('Please provide both an announcement title and message.');
      return;
    }

    setSendingBroadcast(true);
    try {
      const res = await api.broadcastNotification({
        target_role: targetRole,
        title: broadcastTitle,
        message: broadcastMessage
      });
      if (res.success) {
        toast.success(res.message, 'Broadcast Dispatched');
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    toast.success('Institute parameters and attendance compliance threshold updated.', 'Settings Saved');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-indigo-600" />
          Institute Portal Settings & Announcements
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure institutional metadata, broadcast campus announcements, and set compliance policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Broadcast Notifications Center */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            Broadcast Notification Center
          </h2>

          <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Target Audience *
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium text-slate-800"
              >
                <option value="all">Broadcast to All Users (Students + Trainers)</option>
                <option value="student">Students Only</option>
                <option value="trainer">Trainers & Faculty Only</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Schedule Update: Campus Closed on Monday"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Notification Message *
              </label>
              <textarea
                rows="3"
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Full announcement text..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {sendingBroadcast ? 'Sending Broadcast...' : 'Send Broadcast Notification'}
            </button>
          </form>
        </div>

        {/* Institute Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-600" />
            Institutional Parameters
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Institute Full Name
              </label>
              <input
                type="text"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Institutional ID Code
              </label>
              <input
                type="text"
                value={instituteCode}
                onChange={(e) => setInstituteCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Minimum Attendance Threshold Percentage (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Students scoring below this compliance rate trigger Low Attendance alerts on Admin and Student dashboards.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
