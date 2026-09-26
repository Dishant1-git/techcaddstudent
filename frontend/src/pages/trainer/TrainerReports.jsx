import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Calendar,
  Filter,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ExportReports } from '../../components/common/ExportReports';

export function TrainerReports() {
  const { user } = useAuth();
  const toast = useToast();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.status = statusFilter;

      const res = await api.getAttendanceReports(params);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo, statusFilter]);

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
          <div className="text-[11px] text-slate-400 font-mono">{r.student_code}</div>
        </div>
      )
    },
    {
      header: 'Batch',
      key: 'batch_name',
      sortable: true,
      render: (r) => <span className="text-xs font-semibold text-slate-700">{r.batch_name}</span>
    },
    {
      header: 'Date',
      key: 'date',
      sortable: true,
      render: (r) => <span className="text-xs text-slate-600">{r.date}</span>
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
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Verified By',
      key: 'trainer_name',
      render: (r) => <span className="text-xs text-slate-500">{r.trainer_name || r.verified_by_name || '—'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileBarChart2 className="w-7 h-7 text-indigo-600" />
            Assigned Attendance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregate attendance metrics, verification audits, and printable exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportReports
            title={`Assigned Attendance Report - ${user?.name}`}
            records={reportData?.records || []}
            filename="trainer_attendance_report"
            summary={summary}
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Pending Verification">Pending Verification Only</option>
            <option value="Rejected">Rejected Only</option>
          </select>

          {(dateFrom || dateTo || statusFilter) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setStatusFilter('');
              }}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Records</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.totalRecords}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Verified</span>
          <div className="text-2xl font-extrabold text-emerald-950 mt-1">{summary.verifiedCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-amber-200 bg-amber-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Pending</span>
          <div className="text-2xl font-extrabold text-amber-950 mt-1">{summary.pendingCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-rose-200 bg-rose-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-rose-600 uppercase">Rejected</span>
          <div className="text-2xl font-extrabold text-rose-950 mt-1">{summary.rejectedCount}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm text-center">
          <span className="text-[11px] font-bold text-indigo-200 uppercase">Approval Rate</span>
          <div className="text-2xl font-extrabold text-white mt-1">{summary.overallPercentage}%</div>
        </div>
      </div>

      {/* Batch Breakdown Section */}
      {reportData?.batchBreakdown?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Batch Attendance Performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportData.batchBreakdown.map((b) => (
              <div key={b.batch_name} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{b.batch_name}</span>
                  <span className="font-bold text-xs text-indigo-600">{b.attendancePercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${b.attendancePercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Verified: {b.verified}</span>
                  <span>Pending: {b.pending}</span>
                  <span>Rejected: {b.rejected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtered Attendance Records Table */}
      <DataTable
        columns={columns}
        data={reportData?.records || []}
        searchPlaceholder="Search student or session..."
        searchFields={['student_name', 'student_code', 'session', 'batch_name', 'date']}
        emptyMessage="No attendance records found."
      />
    </div>
  );
}
