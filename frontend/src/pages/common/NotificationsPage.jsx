import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Check
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-indigo-600" />
            Notifications Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time updates regarding attendance verifications, grievance resolutions, and announcements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (!notif.is_read) markAsRead(notif.id);
                if (notif.link) navigate(notif.link);
              }}
              className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer ${
                notif.is_read
                  ? 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/70'
                  : 'bg-indigo-50/40 border-indigo-100 text-slate-900 font-medium shadow-sm hover:bg-indigo-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                    notif.type?.includes('verified')
                      ? 'bg-emerald-100 text-emerald-700'
                      : notif.type?.includes('rejected')
                      ? 'bg-rose-100 text-rose-700'
                      : notif.type?.includes('pending')
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {notif.type?.includes('verified') ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : notif.type?.includes('rejected') ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{notif.title}</h4>
                    <p className="text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline mt-2">
                        View related section <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(notif.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {!notif.is_read && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[9px] uppercase">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-400">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-700">No Notifications</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              You're all caught up with your latest portal updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
