import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  AlertOctagon,
  User,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  FileBarChart2,
  FileCheck2,
  Bell,
  History,
  Settings,
  ShieldCheck,
  CheckCircle,
  PlusCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export function Sidebar({ isOpen, onClose }) {
  const { role, user } = useAuth();
  const { unreadCount } = useNotifications();

  const studentLinks = [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/student/attendance', label: 'My Attendance', icon: CalendarCheck },
    { to: '/student/complaints', label: 'Report Complaint', icon: AlertOctagon },
    { to: '/student/profile', label: 'My Profile', icon: User },
    { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: unreadCount }
  ];

  const trainerLinks = [
    { to: '/trainer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/trainer/verifications', label: 'Attendance Verification', icon: FileCheck2 },
    { to: '/trainer/students', label: 'My Students', icon: Users },
    { to: '/trainer/reports', label: 'Attendance Reports', icon: FileBarChart2 },
    { to: '/trainer/profile', label: 'Trainer Profile', icon: User },
    { to: '/trainer/notifications', label: 'Notifications', icon: Bell, badge: unreadCount }
  ];

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/trainers', label: 'Trainers', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/batches', label: 'Batches', icon: Layers },
    { to: '/admin/attendance', label: 'Attendance Oversight', icon: CalendarCheck },
    { to: '/admin/reports', label: 'Attendance Reports', icon: FileBarChart2 },
    { to: '/admin/complaints', label: 'Complaints Hub', icon: AlertOctagon },
    { to: '/admin/audit-logs', label: 'Audit Trail', icon: History },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { to: '/admin/settings', label: 'Portal Settings', icon: Settings }
  ];

  const links = role === 'admin' ? adminLinks : role === 'trainer' ? trainerLinks : studentLinks;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding (Mobile only close header) */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 lg:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="Techcadd Icon"
              className="h-7 w-7 rounded-lg object-contain shadow-sm border border-slate-200/60"
            />
            <img
              src="/logo.png"
              alt="Techcadd - Your Skill & Technology Partner"
              className="h-6 w-auto object-contain"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Summary in Sidebar */}
        <div className="p-4 mx-3 mt-3 mb-1 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
              alt={user?.name}
              className="w-10 h-10 rounded-xl bg-white shadow-sm object-cover ring-2 ring-indigo-500/20"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">
                {role} Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>

                {item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100 text-center">
          <div className="text-[10px] font-semibold text-slate-400">
            Techcadd v1.0.0
          </div>
          <div className="text-[10px] text-slate-400">
            Skill & Technology Partner
          </div>
        </div>
      </aside>
    </>
  );
}
