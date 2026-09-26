import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Calendar,
  Filter,
  Users,
  BookOpen,
  Layers,
  UserCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ExportReports } from '../../components/common/ExportReports';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#4f46e5', '#8b5cf6'];

export function AdminReports() {
  const toast = useToast();
  const [reportData, setReportData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [studentId, setStudentId] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchFilters = async () => {
    try {
      const [crsRes, batRes, trnRes, stuRes] = await Promise.all([
        api.getCourses(),
        api.getBatches(),
        api.getTrainers(),
        api.getStudents()
      ]);
      if (crsRes.success) setCourses(crsRes.data || []);
      if (batRes.success) setBatches(batRes.data || []);
      if (trnRes.success) setTrainers(trnRes.data || []);
      if (stuRes.success) setStudents(stuRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (studentId) params.student_id = studentId;
      if (trainerId) params.trainer_id = trainerId;
      if (courseId) params.course_id = courseId;
      if (batchId) params.batch_id = batchId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.status = statusFilter;

      const res = await api.getAttendanceReports(params);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate attendance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [studentId, trainerId, courseId, batchId, dateFrom, dateTo, statusFilter]);

  const resetFilters = () => {
    setStudentId('');
    setTrainerId('');
    setCourseId('');
    setBatchId('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('');
  };

  const summary = reportData?.summary || {
    totalRecords: 0,
    verifiedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    overallPercentage: 100
  };

  const columns = [
    {
      header: 'Student',
      key: 'student_name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900">{r.student_name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{r.student_code}</div>
        </div>
      )
    },
    {
      header: 'Program & Batch',
      key: 'batch_name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-semibold text-xs text-slate-800">{r.batch_name}</div>
          <div className="text-[10px] text-slate-400">{r.course_name}</div>
        </div>
      )
    },
    {
      header: 'Assigned Trainer',
      key: 'trainer_name',
      sortable: true,
      render: (r) => <span className="text-xs font-medium text-slate-700">{r.trainer_name || 'Unassigned'}</span>
    },
    {
      header: 'Date',
      key: 'date',
      sortable: true,
      render: (r) => <span className="text-xs font-mono text-slate-600">{r.date}</span>
    },
    {
      header: 'Session',
      key: 'session',
      render: (r) => <span className="text-xs text-slate-800">{r.session}</span>
    },
    {
      header: 'Check-In',
      key: 'check_in_time',
      render: (r) => <span className="font-mono text-xs text-slate-600">{r.check_in_time}</span>
    },
    {
      header: 'Attendance Status',
      key: 'status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Verified By',
      key: 'verified_by_name',
      render: (r) => <span className="text-xs text-slate-500">{r.verified_by_name || '—'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileBarChart2 className="w-7 h-7 text-indigo-600" />
            Institutional Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build custom filters across courses, batches, faculty, and export certified records in CSV, Excel, or PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportReports
            title="Institutional Attendance Report"
            records={reportData?.records || []}
            filename="institutional_attendance_report"
            summary={summary}
          />
        </div>
      </div>

      {/* Advanced Multi-Filter Control Console */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Multi-Criteria Report Filters
            </h3>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Course Program</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.course_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Batch Cohort</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.batch_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Assigned Trainer</label>
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            >
              <option value="">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Specific Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            >
              <option value="">All Students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.student_id})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Attendance Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Verified">Verified (Present)</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Rejected">Rejected (Missed/Late)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Classes</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{summary.totalRecords}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Verified / Present</span>
          <div className="text-3xl font-extrabold text-emerald-950 mt-1">{summary.verifiedCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Pending Review</span>
          <div className="text-3xl font-extrabold text-amber-950 mt-1">{summary.pendingCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-rose-600 uppercase">Rejected / Absent</span>
          <div className="text-3xl font-extrabold text-rose-950 mt-1">{summary.rejectedCount}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm text-center">
          <span className="text-[11px] font-bold text-indigo-200 uppercase">Attendance Rate</span>
          <div className="text-3xl font-extrabold text-white mt-1">{summary.overallPercentage}%</div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Batch Attendance Comparison Bar Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            Batch-Wise Attendance Compliance
          </h3>

          <div className="h-60">
            {reportData?.batchBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.batchBreakdown}>
                  <XAxis dataKey="batch_name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="verified" name="Verified (Attended)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected (Missed)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No batch distribution data.
              </div>
            )}
          </div>
        </div>

        {/* Daily Attendance Trend (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Attendance Timeline Progression
          </h3>

          <div className="h-60">
            {reportData?.trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.trends}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="verified" name="Verified" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No timeline progression data.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtered Attendance Records Table */}
      <DataTable
        columns={columns}
        data={reportData?.records || []}
        searchPlaceholder="Search student, trainer, or session..."
        searchFields={['student_name', 'student_code', 'trainer_name', 'batch_name', 'course_name', 'date', 'session']}
        emptyMessage="No attendance records matched the filter criteria."
      />
    </div>
  );
}
