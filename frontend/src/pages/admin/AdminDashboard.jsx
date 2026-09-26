import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  CalendarCheck,
  Clock,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileBarChart2,
  FileCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const cards = data?.cards || {
    totalStudents: 0,
    totalTrainers: 0,
    activeCourses: 0,
    activeBatches: 0,
    todayAttendance: 0,
    pendingAttendance: 0,
    totalComplaints: 0,
    openComplaints: 0,
    overallAttendancePercentage: 100,
    complaintResolutionRate: 100,
    pendingStudentRegistrations: 0
  };

  return (
    <div className="space-y-6">
      {/* Pending Student Registrations Alert Banner */}
      {cards.pendingStudentRegistrations > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-300 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900">
                <span>{cards.pendingStudentRegistrations} Student Registration{cards.pendingStudentRegistrations > 1 ? 's' : ''} Pending Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                New students have self-registered and require administrator approval before they can sign in and mark attendance.
              </p>
            </div>
          </div>

          <Link
            to="/admin/students?status=pending_approval"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
          >
            Review & Verify Students <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              Administrative Command Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Institute Oversight Dashboard
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Welcome, {user?.name}. Monitor institutional KPIs, verify attendance compliance, and resolve student grievances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all"
            >
              <FileBarChart2 className="w-4 h-4 text-indigo-300" />
              Reports Engine
            </Link>
            <Link
              to="/admin/complaints"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              <AlertOctagon className="w-4 h-4" />
              Manage Grievances ({cards.openComplaints})
            </Link>
          </div>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={cards.totalStudents}
          icon={GraduationCap}
          accent="indigo"
          description="Active enrolled students"
        />
        <StatCard
          title="Total Trainers"
          value={cards.totalTrainers}
          icon={Users}
          accent="sky"
          description="Instructors & faculty"
        />
        <StatCard
          title="Active Batches"
          value={cards.activeBatches}
          icon={Layers}
          accent="purple"
          description={`Across ${cards.activeCourses} active courses`}
        />
        <StatCard
          title="Today's Attendance"
          value={cards.todayAttendance}
          icon={CalendarCheck}
          accent="emerald"
          description="Check-ins recorded today"
        />
        <StatCard
          title="Pending Verification"
          value={cards.pendingAttendance}
          icon={Clock}
          accent={cards.pendingAttendance > 0 ? "amber" : "emerald"}
          description={cards.pendingAttendance > 0 ? "Awaiting trainer review" : "All records verified"}
        />
        <StatCard
          title="Attendance Rate"
          value={`${cards.overallAttendancePercentage}%`}
          icon={CheckCircle2}
          accent="emerald"
          description="Overall institution average"
        />
        <StatCard
          title="Open Complaints"
          value={cards.openComplaints}
          icon={AlertOctagon}
          accent={cards.openComplaints > 0 ? "rose" : "emerald"}
          description={`Out of ${cards.totalComplaints} total complaints`}
        />
        <StatCard
          title="Resolution Rate"
          value={`${cards.complaintResolutionRate}%`}
          icon={CheckCircle2}
          accent="indigo"
          description="Grievance resolution efficiency"
        />
      </div>

      {/* Charts Section: Attendance Trends & Complaint Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Trends Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Daily Attendance Trends
              </h3>
              <p className="text-xs text-slate-400">Verified vs Rejected vs Pending check-ins</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-bold text-indigo-600 hover:underline">
              Detailed breakdown →
            </Link>
          </div>

          <div className="h-64 mt-4 w-full">
            {data?.attendanceTrends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendanceTrends}>
                  <defs>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="verified" name="Verified" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVerified)" />
                  <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" />
                  <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRejected)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No trend data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Complaint Categories Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Grievance Categories
              </h3>
              <span className="text-xs font-bold text-slate-500">{cards.totalComplaints} Total</span>
            </div>

            <div className="h-44 mt-2">
              {data?.categoryDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryDistribution}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {data.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No complaints logged.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-3 border-t border-slate-100">
            {data?.categoryDistribution?.map((cat, idx) => (
              <div key={cat.category} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-slate-600 truncate">{cat.category}:</span>
                <strong className="text-slate-900">{cat.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Attendance Alerts & Trainer Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Low Attendance Warning Table (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Low Attendance Alerts (&lt; 75%)
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {data?.lowAttendanceStudents?.length || 0} At Risk
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            {data?.lowAttendanceStudents?.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Attendance %</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lowAttendanceStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.student_id}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {s.batch_name}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600">
                        {s.stats?.attendancePercentage}%
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/admin/students`}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] transition-colors"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                All active students are meeting minimum 75% attendance threshold!
              </div>
            )}
          </div>
        </div>

        {/* Trainer Verification Activity (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Trainer Verification Activity
            </h3>
            <Link to="/admin/trainers" className="text-xs font-bold text-indigo-600 hover:underline">
              Manage faculty →
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data?.trainerActivity?.length > 0 ? (
              data.trainerActivity.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{t.name}</div>
                    <div className="text-slate-400 text-[11px]">{t.trainer_id} • {t.specialization}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                      {t.verified_count} Verified
                    </span>
                    {t.pending_count > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                        {t.pending_count} Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No trainer activity logged.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
