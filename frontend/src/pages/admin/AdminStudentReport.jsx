import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Users, UserPlus, PlayCircle, PauseCircle, Award, CalendarCheck, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DataTable } from '../../components/common/DataTable';
import { EnrollmentBadge, enrollmentLabel, ENROLLMENT_OPTIONS } from '../../components/common/EnrollmentBadge';
import { todayIST, formatDateTime } from '../../utils/time';

const isoDay = (offset = 0) => todayIST(offset);

const PRESETS = [
  { label: 'Last 7 days', from: () => isoDay(-6) },
  { label: 'Last 30 days', from: () => isoDay(-29) },
  { label: 'This month', from: () => isoDay().slice(0, 8) + '01' },
  { label: 'This year', from: () => isoDay().slice(0, 5) + '01-01' }
];

const pct = (v) => (v === null || v === undefined ? '—' : `${v}%`);

export function AdminStudentReport() {
  const toast = useToast();
  const [from, setFrom] = useState(isoDay(-29));
  const [to, setTo] = useState(isoDay());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getStudentReport({ from, to })
      .then(res => { if (active) setReport(res.data); })
      .catch(err => toast.error(err.message || 'Failed to load the report.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);

  const summary = report?.summary || {};
  const students = report?.students || [];
  const newJoined = useMemo(() => students.filter(s => s.joined_on >= from && s.joined_on <= to), [students, from, to]);
  const periodText = `${from} to ${to}`;

  const studentSheetRows = (list) => list.map(s => ({
    'Student ID': s.student_id,
    'Name': s.name,
    'Email': s.email,
    'Phone': s.phone || '',
    'Course': s.course_name,
    'Domain': s.domain || '',
    'Program': s.program_label,
    'Expected End': s.expected_end_date || '',
    'Hours Done (120h)': s.program_duration === '120_hours' ? (s.hours_completed ?? 0) : '',
    'Trainer': s.trainer_name,
    'Class Time': s.class_timing || '',
    'Joined On': s.joined_on || '',
    'Course Status': enrollmentLabel(s.enrollment_status),
    'Completed On': s.completed_on || '',
    'Classes (period)': s.period_classes,
    'Verified (period)': s.period_verified,
    'Pending (period)': s.period_pending,
    'Rejected (period)': s.period_rejected,
    'Attendance % (period)': s.period_percentage ?? '',
    'Attendance % (overall)': s.overall_percentage,
    'Last Attended': s.last_attendance_date || '',
    'Current Absent Days': s.absent_streak,
    'Approved Leaves (period)': s.approved_leaves
  }));

  const groupRows = (list, label) => list.map(g => ({
    [label]: g.name,
    'Total Students': g.total,
    'New Joined (period)': g.new_joined,
    'Running': g.running,
    'On Hold': g.hold,
    'Completed': g.completed,
    'Dropped': g.dropped,
    'Attendance % (period)': g.attendance_percentage ?? ''
  }));

  const downloadExcel = () => {
    if (!report) return;
    try {
      const wb = XLSX.utils.book_new();
      const summaryRows = [
        ['Student Report', ''],
        ['Period', periodText],
        ['Generated', formatDateTime(report.generated_at)],
        [],
        ['Total students', summary.totalStudents],
        ['New joined in period', summary.newJoined],
        ['Running', summary.running],
        ['On hold', summary.hold],
        ['Completed (all time)', summary.completed],
        ['Completed in period', summary.completedInPeriod],
        ['Dropped', summary.dropped],
        ['Average attendance in period', pct(summary.periodAttendance)],
        ['Students below 75% attendance', summary.lowAttendance],
        ['Absent 3+ days right now', summary.absentNow],
        ['Approved leaves in period', summary.approvedLeaves],
        ['Pending leave requests', summary.pendingLeaves]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 32 }, { wch: 26 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      const add = (rows, name) => {
        const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'No data for this period' }]);
        if (rows.length) sheet['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(12, k.length + 2) }));
        XLSX.utils.book_append_sheet(wb, sheet, name);
      };
      add(studentSheetRows(students), 'All Students');
      add(studentSheetRows(newJoined), 'New Joinings');
      add(studentSheetRows(students.filter(s => s.enrollment_status === 'completed')), 'Completed');
      add(studentSheetRows(students.filter(s => s.absent_streak >= 3 || (s.period_percentage !== null && s.period_percentage < 75))), 'Needs Attention');
      add(groupRows(report.byProgram || [], 'Program'), 'By Program');
      add(groupRows(report.byCourse, 'Course'), 'By Course');
      add(groupRows(report.byTrainer, 'Trainer'), 'By Trainer');
      add(report.monthly.map(m => ({ Month: m.month, 'New Joined': m.joined, Completed: m.completed })), 'Monthly');

      XLSX.writeFile(wb, `student_report_${from}_to_${to}.xlsx`);
      toast.success('Excel sheet downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create the Excel sheet.');
    }
  };

  const downloadPDF = () => {
    if (!report) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Student Report', 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Period: ${periodText}  |  Generated: ${formatDateTime(report.generated_at)}`, 14, 25);

      doc.autoTable({
        startY: 31,
        head: [['Total', 'New Joined', 'Running', 'On Hold', 'Completed', 'Completed (period)', 'Dropped', 'Avg Attendance', 'Below 75%', 'Absent 3+ days']],
        body: [[summary.totalStudents, summary.newJoined, summary.running, summary.hold, summary.completed, summary.completedInPeriod, summary.dropped, pct(summary.periodAttendance), summary.lowAttendance, summary.absentNow]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, halign: 'center' }
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Program', 'Students', 'New', 'Running', 'Hold', 'Completed', 'Dropped', 'Attendance']],
        body: (report.byProgram || []).map(g => [g.name, g.total, g.new_joined, g.running, g.hold, g.completed, g.dropped, pct(g.attendance_percentage)]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8 }
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Course', 'Students', 'New', 'Running', 'Hold', 'Completed', 'Dropped', 'Attendance']],
        body: report.byCourse.map(g => [g.name, g.total, g.new_joined, g.running, g.hold, g.completed, g.dropped, pct(g.attendance_percentage)]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        styles: { fontSize: 8 }
      });

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['ID', 'Name', 'Program', 'Course', 'Trainer', 'Class Time', 'Joined', 'Status', 'Classes', 'Attendance', 'Overall', 'Absent Days']],
        body: students.map(s => [s.student_id, s.name, s.program_label, s.course_name, s.trainer_name, s.class_timing || '', s.joined_on || '', enrollmentLabel(s.enrollment_status), s.period_classes, pct(s.period_percentage), `${s.overall_percentage}%`, s.absent_streak]),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 7 }
      });

      doc.save(`student_report_${from}_to_${to}.pdf`);
      toast.success('PDF downloaded.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create the PDF.');
    }
  };

  const columns = [
    {
      header: 'Student',
      key: 'name',
      sortable: true,
      render: (s) => (
        <div>
          <div className="font-bold text-slate-900">{s.name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{s.student_id}</div>
        </div>
      )
    },
    {
      header: 'Program & Trainer',
      key: 'program_label',
      sortable: true,
      render: (s) => (
        <div className="text-xs">
          <div className="font-bold text-indigo-700">{s.program_label}</div>
          <div className="font-semibold text-slate-800">{s.course_name}</div>
          <div className="text-slate-500">{s.trainer_name}{s.class_timing ? ` • ${s.class_timing}` : ''}</div>
        </div>
      )
    },
    { header: 'Joined', key: 'joined_on', sortable: true, render: (s) => <span className="text-xs font-mono text-slate-700">{s.joined_on}</span> },
    { header: 'Status', key: 'enrollment_status', sortable: true, render: (s) => <EnrollmentBadge status={s.enrollment_status} /> },
    {
      header: 'Attendance (period)',
      key: 'period_percentage',
      sortable: true,
      render: (s) => (
        <div className="text-xs">
          <span className={`font-bold ${s.period_percentage !== null && s.period_percentage < 75 ? 'text-rose-600' : 'text-slate-800'}`}>{pct(s.period_percentage)}</span>
          <span className="text-slate-400"> ({s.period_verified}/{s.period_classes})</span>
        </div>
      )
    },
    { header: 'Overall', key: 'overall_percentage', sortable: true, render: (s) => <span className="text-xs font-semibold">{s.overall_percentage}%</span> },
    {
      header: 'Last Attended',
      key: 'last_attendance_date',
      sortable: true,
      render: (s) => (
        <div className="text-xs">
          <span className="font-mono text-slate-700">{s.last_attendance_date || '—'}</span>
          {s.absent_streak >= 3 && <div className="text-[10px] font-bold text-rose-600">Absent {s.absent_streak} days</div>}
        </div>
      )
    }
  ];

  const cards = [
    { label: 'Total Students', value: summary.totalStudents, icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
    { label: 'New Joined', value: summary.newJoined, icon: UserPlus, tone: 'text-sky-600 bg-sky-50' },
    { label: 'Running', value: summary.running, icon: PlayCircle, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'On Hold', value: summary.hold, icon: PauseCircle, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Completed', value: summary.completed, sub: `${summary.completedInPeriod ?? 0} in period`, icon: Award, tone: 'text-purple-600 bg-purple-50' },
    { label: 'Avg Attendance', value: pct(summary.periodAttendance), sub: `${summary.lowAttendance ?? 0} below 75%`, icon: CalendarCheck, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Absent 3+ Days', value: summary.absentNow, sub: `${summary.pendingLeaves ?? 0} leave requests`, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
            Student Report
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            New joinings, attendance, course status and completions for the chosen period. Download it as an Excel sheet or PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadExcel} disabled={!report} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" /> Download Excel
          </button>
          <button onClick={downloadPDF} disabled={!report} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50">
            <FileText className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-end gap-4">
        <div className="grid grid-cols-2 gap-3 md:w-80">
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            From
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </label>
          <label className="block text-[11px] font-bold text-slate-500 uppercase">
            To
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.from()); setTo(isoDay()); }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !report ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {cards.map(c => (
              <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.tone}`}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{c.value ?? 0}</div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">{c.label}</div>
                {c.sub && <div className="text-[10px] text-slate-400 mt-0.5">{c.sub}</div>}
              </div>
            ))}
          </div>

          <GroupTable title="By Program (Course / Training)" label="Program" rows={report?.byProgram || []} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GroupTable title="By Course" label="Course" rows={report?.byCourse || []} />
            <GroupTable title="By Trainer" label="Trainer" rows={report?.byTrainer || []} />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4">New Joinings & Completions by Month</h3>
            {report?.monthly?.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="joined" name="New joined" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-slate-400">No data yet.</p>
            )}
          </div>

          <DataTable
            columns={columns}
            data={students}
            searchPlaceholder="Search student, course, or trainer..."
            searchFields={['name', 'student_id', 'email', 'course_name', 'trainer_name', 'program_label']}
            filters={[{ key: 'enrollment_status', label: 'Course Status', options: ENROLLMENT_OPTIONS }]}
            emptyMessage="No students found."
          />
        </>
      )}
    </div>
  );
}

function GroupTable({ title, label, rows }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              <th className="py-2 pr-3">{label}</th>
              <th className="py-2 px-2 text-center">Total</th>
              <th className="py-2 px-2 text-center">New</th>
              <th className="py-2 px-2 text-center">Running</th>
              <th className="py-2 px-2 text-center">Hold</th>
              <th className="py-2 px-2 text-center">Done</th>
              <th className="py-2 pl-2 text-right">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="7" className="py-6 text-center text-slate-400">No data.</td></tr>
            ) : rows.map(r => (
              <tr key={r.name} className="border-b border-slate-50 last:border-0">
                <td className="py-2 pr-3 font-semibold text-slate-800">{r.name}</td>
                <td className="py-2 px-2 text-center">{r.total}</td>
                <td className="py-2 px-2 text-center">{r.new_joined}</td>
                <td className="py-2 px-2 text-center">{r.running}</td>
                <td className="py-2 px-2 text-center">{r.hold}</td>
                <td className="py-2 px-2 text-center">{r.completed}</td>
                <td className="py-2 pl-2 text-right font-bold">{pct(r.attendance_percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
