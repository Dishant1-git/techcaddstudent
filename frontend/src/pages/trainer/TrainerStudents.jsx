import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  Mail,
  Phone,
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { EnrollmentBadge, AbsenceTag } from '../../components/common/EnrollmentBadge';
import { TrainerLeaves } from '../../components/trainer/TrainerLeaves';
import { EnrollmentStatusControl } from '../../components/common/EnrollmentStatusControl';

export function TrainerStudents() {
  const { user } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getStudents();
      if (res.success) {
        setStudents(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assigned students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    try {
      const res = await api.getStudent(student.id);
      if (res.success) {
        setStudentDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load student attendance record.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      key: 'name',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <img
            src={s.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name)}`}
            alt={s.name}
            className="w-9 h-9 rounded-xl bg-slate-100 object-cover ring-2 ring-slate-100"
          />
          <div>
            <div className="font-bold text-slate-900">{s.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Student ID',
      key: 'student_id',
      sortable: true,
      render: (s) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          {s.student_id || 'N/A'}
        </span>
      )
    },
    {
      header: 'Class Time',
      key: 'class_timing',
      sortable: true,
      render: (s) => <span className="font-semibold text-xs text-slate-700">{s.class_timing || 'Not set'}</span>
    },
    {
      header: 'Program',
      key: 'program_label',
      sortable: true,
      render: (s) => (
        <div className="text-xs">
          <span className={`font-bold ${s.program_type ? 'text-indigo-700' : 'text-slate-400'}`}>{s.program_label}</span>
          {s.expected_end_date && <div className="text-[10px] text-slate-400">Ends ~{s.expected_end_date}</div>}
        </div>
      )
    },
    {
      header: 'Course Status',
      key: 'enrollment_status',
      sortable: true,
      render: (s) => (
        <div className="flex flex-col items-start gap-1">
          <EnrollmentStatusControl
            student={s}
            onUpdated={(updated) => setStudents(prev => prev.map(x => x.id === updated.id ? updated : x))}
          />
          <AbsenceTag student={s} />
        </div>
      )
    },
    {
      header: 'Contact Phone',
      key: 'phone',
      render: (s) => <span className="text-xs text-slate-600 font-mono">{s.phone || '—'}</span>
    },
    {
      header: 'Attendance %',
      key: 'stats',
      sortable: true,
      render: (s) => {
        const pct = s.stats?.attendancePercentage ?? 100;
        const isLow = pct < 75;
        return (
          <div className="w-36">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>{pct}%</span>
              <span className="text-[10px] text-slate-400 font-normal">{s.stats?.attended || 0}/{s.stats?.totalClasses || 0}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLow ? 'bg-rose-500' : pct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (s) => <StatusBadge status={s.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (s) => (
        <button
          onClick={() => handleViewStudent(s)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="View Student Attendance Log"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            My Assigned Students
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Students who selected you as their trainer.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={students}
        searchPlaceholder="Search student name, ID, program, or class time..."
        searchFields={['name', 'student_id', 'email', 'class_timing', 'phone', 'program_label']}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]
          }
        ]}
        emptyMessage="No assigned students found."
      />

      <TrainerLeaves />

      {/* Student Details & Attendance Log Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => {
            setSelectedStudent(null);
            setStudentDetails(null);
          }}
          title={`Student: ${selectedStudent.name}`}
          subtitle={`Student ID: ${selectedStudent.student_id} • Class: ${selectedStudent.class_timing || 'Not set'}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            {/* Program */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Program</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedStudent.program_label}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Started</span>
                <p className="font-bold text-slate-900 mt-0.5 font-mono">{selectedStudent.joined_on || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Expected End</span>
                <p className="font-bold text-slate-900 mt-0.5 font-mono">{selectedStudent.expected_end_date || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">{selectedStudent.program_duration === '120_hours' ? 'Hours Done' : 'Course Status'}</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedStudent.program_duration === '120_hours'
                    ? `${selectedStudent.hours_completed ?? 0} / 120 hrs`
                    : <EnrollmentBadge status={selectedStudent.enrollment_status} />}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                <span className="text-slate-500 font-medium">Total Held</span>
                <div className="text-xl font-bold text-indigo-950 mt-0.5">
                  {selectedStudent.stats?.totalClasses || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                <span className="text-emerald-700 font-medium">Attended</span>
                <div className="text-xl font-bold text-emerald-950 mt-0.5">
                  {selectedStudent.stats?.attended || 0}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-600 font-medium">Compliance Rate</span>
                <div className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedStudent.stats?.attendancePercentage || 100}%
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Recent Attendance History
              </h4>
              <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                {studentDetails?.attendance_history?.length > 0 ? (
                  studentDetails.attendance_history.map((rec) => (
                    <div key={rec.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900">{rec.session}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{rec.date} • {rec.check_in_time}</div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={rec.status} />
                        {rec.rejection_reason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 max-w-xs truncate">
                            {rec.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    No attendance records for this student.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
