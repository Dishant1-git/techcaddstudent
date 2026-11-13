import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  BookOpen,
  KeyRound,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  AlertOctagon,
  Clock
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ENROLLMENT_OPTIONS, AbsenceTag } from '../../components/common/EnrollmentBadge';
import { ProgramFields, validateProgram } from '../../components/common/ProgramFields';
import { todayIST, formatDateTime } from '../../utils/time';

export function AdminStudents() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Tab Filter
  const urlStatus = searchParams.get('status') || searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    urlStatus === 'pending_approval' || urlStatus === 'pending' ? 'pending_approval'
      : urlStatus === 'password' ? 'password' : 'all'
  );

  // Admin password reset
  const [resettingStudent, setResettingStudent] = useState(null);
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [resetDone, setResetDone] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Approve / Reject State
  const [rejectingStudent, setRejectingStudent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add / Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    student_id: '',
    course_id: '',
    trainer_id: '',
    class_start_time: '',
    class_end_time: '',
    program_type: '',
    program_duration: '',
    phone: '',
    address: '',
    emergency_contact: '',
    avatar: '',
    status: 'active'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Details Modal
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Deactivate Modal
  const [deactivatingStudent, setDeactivatingStudent] = useState(null);

  const handleApprove = async (student) => {
    try {
      setActionLoading(true);
      const res = await api.approveStudent(student.id);
      if (res.success) {
        toast.success(res.message || `Student ${student.name} approved successfully!`);
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: 'active' } : s));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to approve student.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingStudent) return;
    try {
      setActionLoading(true);
      const res = await api.rejectStudent(rejectingStudent.id, rejectReason);
      if (res.success) {
        toast.success(res.message || `Registration rejected for ${rejectingStudent.name}.`);
        setStudents(prev => prev.map(s => s.id === rejectingStudent.id ? { ...s, status: 'rejected' } : s));
        setRejectingStudent(null);
        setRejectReason('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject student registration.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stuRes, crsRes, trnRes, pwRes] = await Promise.all([
        api.getStudents(),
        api.getCourses(),
        api.getTrainers(),
        api.getPasswordRequests()
      ]);

      if (stuRes.success) setStudents(stuRes.data || []);
      if (crsRes.success) setCourses(crsRes.data || []);
      if (pwRes.success) setPasswordRequests(pwRes.data || []);
      if (trnRes.success) setTrainers(trnRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      password: 'student123',
      student_id: `STU-${todayIST().slice(0, 4)}-${String(students.length + 1).padStart(3, '0')}`,
      domain: '',
      course_id: courses[0]?.id || '',
      trainer_id: '',
      class_start_time: '',
      class_end_time: '',
      program_type: '',
      program_duration: '',
      phone: '',
      address: '',
      emergency_contact: '',
      avatar: '',
      status: 'active'
    });
    setShowFormModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      password: '',
      student_id: student.student_id || '',
      domain: student.domain || '',
      course_id: student.course_id || '',
      trainer_id: student.trainer_id || '',
      class_start_time: student.class_start_time || '',
      class_end_time: student.class_end_time || '',
      program_type: student.program_type || '',
      program_duration: student.program_duration || '',
      phone: student.phone || '',
      address: student.address || '',
      emergency_contact: student.emergency_contact || '',
      avatar: student.avatar || '',
      status: student.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const programError = validateProgram(formData);
    if (programError) {
      toast.warning(programError);
      return;
    }
    setSubmitting(true);
    try {
      if (editingStudent) {
        const res = await api.updateStudent(editingStudent.id, formData);
        if (res.success) {
          toast.success('Student account updated successfully.', 'Updated');
          setShowFormModal(false);
          fetchData();
        }
      } else {
        const res = await api.createStudent(formData);
        if (res.success) {
          toast.success('Student registered successfully.', 'Registered');
          setShowFormModal(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const openResetModal = (student) => {
    setResettingStudent(student);
    setNewStudentPassword(generatePassword());
    setResetDone(null);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingStudent) return;
    if (newStudentPassword.trim().length < 6) {
      toast.warning('Password must be at least 6 characters.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await api.resetStudentPassword(resettingStudent.id, newStudentPassword.trim());
      if (res.success) {
        toast.success(res.message, 'Password Updated');
        setResetDone(newStudentPassword.trim());
        setPasswordRequests(prev => prev.filter(r => String(r.student_id) !== String(resettingStudent.id)));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // Course status: running / hold / completed / dropped
  const [statusChange, setStatusChange] = useState(null);
  const [statusNote, setStatusNote] = useState('');

  const handleEnrollmentChange = async (e) => {
    e.preventDefault();
    if (!statusChange) return;
    try {
      setActionLoading(true);
      const res = await api.setEnrollmentStatus(statusChange.student.id, statusChange.value, statusNote.trim());
      if (res.success) {
        toast.success(res.message, 'Course Status Updated');
        setStudents(prev => prev.map(s => s.id === res.data.id ? res.data : s));
        setStatusChange(null);
        setStatusNote('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change course status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingStudent) return;
    try {
      const res = await api.deleteStudent(deactivatingStudent.id);
      if (res.success) {
        toast.info('Student account deactivated.', 'Deactivated');
        setDeactivatingStudent(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate student.');
    }
  };

  const handleViewDetails = async (student) => {
    setViewingStudent(student);
    setLoadingDetails(true);
    try {
      const res = await api.getStudent(student.id);
      if (res.success) {
        setStudentDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load student details.');
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
          {s.student_id}
        </span>
      )
    },
    {
      header: 'Program & Class Time',
      key: 'program_label',
      sortable: true,
      render: (s) => (
        <div>
          <span className={`font-bold text-xs ${s.program_type ? 'text-indigo-700' : 'text-slate-400'}`}>{s.program_label}</span>
          <div className="text-[10px] text-slate-500">{s.class_timing || 'Timing not set'}</div>
          <div className="text-[10px] text-slate-400">{s.course_name}</div>
          {s.domain && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Domain: {s.domain}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Trainer',
      key: 'trainer_name',
      sortable: true,
      render: (s) => <span className="font-medium text-xs text-indigo-700">{s.trainer_name || 'Not Selected'}</span>
    },
    {
      header: 'Course Status',
      key: 'enrollment_status',
      sortable: true,
      render: (s) => (
        <div className="space-y-1">
          <select
            value={s.enrollment_status || 'running'}
            onChange={(e) => { setStatusChange({ student: s, value: e.target.value }); setStatusNote(''); }}
            className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
              { running: 'bg-emerald-50 text-emerald-700 border-emerald-200', hold: 'bg-amber-50 text-amber-700 border-amber-200', completed: 'bg-indigo-50 text-indigo-700 border-indigo-200', dropped: 'bg-slate-100 text-slate-600 border-slate-300' }[s.enrollment_status || 'running']
            }`}
            title="Change course status"
          >
            {ENROLLMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div><AbsenceTag student={s} /></div>
        </div>
      )
    },
    {
      header: 'Attendance %',
      key: 'stats',
      sortable: true,
      render: (s) => {
        const pct = s.stats?.attendancePercentage ?? 100;
        const isLow = pct < 75;
        return (
          <div className="w-28">
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>{pct}%</span>
              <span className="text-[10px] text-slate-400 font-normal">{s.stats?.attended || 0}/{s.stats?.totalClasses || 0}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${isLow ? 'bg-rose-500' : pct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
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
        <div className="flex items-center gap-1.5">
          {s.status === 'pending_approval' && (
            <>
              <button
                onClick={() => handleApprove(s)}
                disabled={actionLoading}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Verify and approve student registration"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => setRejectingStudent(s)}
                disabled={actionLoading}
                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Reject student registration"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => handleViewDetails(s)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View Full Profile & Records"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openResetModal(s)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Change Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(s)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit Student"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeactivatingStudent(s)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Deactivate Student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const pendingCount = students.filter(s => s.status === 'pending_approval').length;
  const activeCount = students.filter(s => s.status === 'active').length;
  const inactiveCount = students.filter(s => s.status === 'inactive' || s.status === 'rejected').length;

  const filteredStudents = activeTab === 'all'
    ? students
    : activeTab === 'pending_approval'
      ? students.filter(s => s.status === 'pending_approval')
      : activeTab === 'active'
        ? students.filter(s => s.status === 'active')
        : students.filter(s => s.status === 'inactive' || s.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Student Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register students, verify new registration requests, and review complete student history.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Student
        </button>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Students
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {students.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending_approval')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'pending_approval'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Verification
          {pendingCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'pending_approval' ? 'bg-white text-amber-800' : 'bg-amber-200 text-amber-900 animate-pulse'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'password'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-indigo-800 hover:bg-indigo-50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Password Requests
          {passwordRequests.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'password' ? 'bg-white text-indigo-800' : 'bg-indigo-200 text-indigo-900 animate-pulse'
            }`}>
              {passwordRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'active'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'inactive'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Inactive / Rejected
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {inactiveCount}
          </span>
        </button>
      </div>

      {activeTab === 'password' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
          {passwordRequests.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No password requests right now.</p>
          ) : passwordRequests.map(r => (
            <div key={r.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-900">{r.student_name} <span className="font-mono text-xs text-indigo-700">({r.student_code})</span></div>
                <div className="text-xs text-slate-500 font-mono">{r.student_email}</div>
                {r.note && <div className="mt-1 text-xs text-slate-700">"{r.note}"</div>}
                <div className="mt-1 text-[11px] text-slate-400">Requested {formatDateTime(r.created_at)}</div>
              </div>
              <button
                onClick={() => openResetModal({ id: r.student_id, name: r.student_name, email: r.student_email })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Set New Password
              </button>
            </div>
          ))}
        </div>
      ) : (
      /* Students Data Table */
      <DataTable
        columns={columns}
        data={filteredStudents}
        searchPlaceholder="Search student name, ID, email, or trainer..."
        searchFields={['name', 'student_id', 'email', 'domain', 'trainer_name', 'course_name', 'phone', 'program_label']}
        filters={[
          {
            key: 'enrollment_status',
            label: 'Course Status',
            options: ENROLLMENT_OPTIONS
          },
          {
            key: 'program_type',
            label: 'Program',
            options: [{ value: 'course', label: 'Course' }, { value: 'training', label: 'Training' }]
          },
          {
            key: 'status',
            label: 'Account',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'inactive', label: 'Inactive' }
            ]
          }
        ]}
        emptyMessage="No students found."
      />
      )}

      {/* Course Status Change Modal */}
      <Modal
        isOpen={!!statusChange}
        onClose={() => setStatusChange(null)}
        title={`Change Course Status: ${statusChange?.student?.name || ''}`}
        subtitle={statusChange ? `New status: ${ENROLLMENT_OPTIONS.find(o => o.value === statusChange.value)?.label}` : ''}
      >
        <form onSubmit={handleEnrollmentChange} className="space-y-4">
          <p className="text-xs text-slate-600">
            {statusChange?.value === 'running'
              ? 'The student can mark attendance again and absence alerts resume.'
              : 'The student will not be able to mark attendance and absence alerts stop. The student and trainer are notified.'}
          </p>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Note (optional)
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Fees pending, course finished, moved city"
              className="mt-1.5 w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm normal-case tracking-normal font-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </label>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setStatusChange(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={actionLoading} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
              Save Status
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Change Password Modal */}
      <Modal
        isOpen={!!resettingStudent}
        onClose={() => setResettingStudent(null)}
        title={`Change Password: ${resettingStudent?.name || ''}`}
        subtitle={resettingStudent?.email}
      >
        {resetDone ? (
          <div className="space-y-4 text-sm">
            <p className="text-slate-700">The password has been changed. Share this new password with the student:</p>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 font-mono text-lg font-bold text-emerald-900 text-center select-all">
              {resetDone}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setResettingStudent(null)} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm cursor-pointer">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              New password
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  required
                  minLength="6"
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono normal-case tracking-normal focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setNewStudentPassword(generatePassword())}
                  className="px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                  title="Generate a new password"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </label>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setResettingStudent(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={resetLoading} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">
                {resetLoading ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.name}` : 'Register New Student'}
        subtitle={editingStudent ? `ID: ${editingStudent.student_id}` : 'Creates the student login and class details'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Alexander Pierce"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@portal.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Student ID Code *
              </label>
              <input
                type="text"
                required
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                placeholder="STU-2026-001"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {!editingStudent && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="student123"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <ProgramFields
              value={{ program_type: formData.program_type, program_duration: formData.program_duration }}
              onChange={(v) => setFormData({ ...formData, ...v })}
            />
          </div>

          {/* Academic Assignments */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Domain / Field of Interest
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="e.g. Full-Stack Web Development, CAD / Mechanical, Data Science"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Course Program
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                >
                <option value="">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trainer
              </label>
              <select
                value={formData.trainer_id}
                onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                <option value="">-- Not selected --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.trainer_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class Starts
              </label>
              <input
                type="time"
                value={formData.class_start_time}
                onChange={(e) => setFormData({ ...formData, class_start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Class Ends
              </label>
              <input
                type="time"
                value={formData.class_end_time}
                onChange={(e) => setFormData({ ...formData, class_end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Emergency Contact
              </label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="Parent/Guardian Name + Phone"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Custom Avatar / Profile Picture */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Profile Photo</span>
              {uploadingImage && <span className="text-xs text-indigo-600 font-semibold animate-pulse">Uploading photo...</span>}
            </label>
            <div className="flex items-center gap-3">
              <img
                src={formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name || 'Student')}`}
                alt="Preview"
                className="w-12 h-12 rounded-2xl bg-slate-100 object-cover ring-2 ring-slate-200 shadow-sm"
              />
              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingImage(true);
                    try {
                      const res = await api.uploadFile(file);
                      if (res.success && res.url) {
                        setFormData({ ...formData, avatar: res.url });
                        toast.success('Student photo uploaded successfully.');
                      }
                    } catch (err) {
                      toast.error(err.message || 'Failed to upload photo.');
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="Or enter image URL (https://... or /uploads/...)"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                />
              </div>
            </div>
          </div>

          {editingStudent && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium text-slate-800"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : editingStudent ? 'Update Student' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Comprehensive Student Profile Modal (Admin Full Oversight) */}
      {viewingStudent && (
        <Modal
          isOpen={!!viewingStudent}
          onClose={() => {
            setViewingStudent(null);
            setStudentDetails(null);
          }}
          title={`Student: ${viewingStudent.name}`}
          subtitle={`Student ID: ${viewingStudent.student_id} • Enrolled in ${viewingStudent.course_name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={viewingStudent.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(viewingStudent.name)}`}
                  alt={viewingStudent.name}
                  className="w-12 h-12 rounded-2xl bg-white shadow-sm object-cover ring-2 ring-indigo-500/20"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">{viewingStudent.name}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{viewingStudent.email} • {viewingStudent.phone || 'No phone'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingStudent.domain && (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {viewingStudent.domain}
                  </span>
                )}
                <StatusBadge status={viewingStudent.status} />
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {viewingStudent.student_id}
                </span>
              </div>
            </div>

            {/* Academic & Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-indigo-800 font-bold uppercase text-[10px]">Total Classes</span>
                <div className="text-2xl font-extrabold text-indigo-950 mt-0.5">{viewingStudent.stats?.totalClasses || 0}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-emerald-800 font-bold uppercase text-[10px]">Attended</span>
                <div className="text-2xl font-extrabold text-emerald-950 mt-0.5">{viewingStudent.stats?.attended || 0}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-rose-800 font-bold uppercase text-[10px]">Missed</span>
                <div className="text-2xl font-extrabold text-rose-950 mt-0.5">{viewingStudent.stats?.missed || 0}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-slate-600 font-bold uppercase text-[10px]">Attendance %</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{viewingStudent.stats?.attendancePercentage || 100}%</div>
              </div>
            </div>

            {/* Attendance History Section */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                Attendance Logs
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                {studentDetails?.attendance_history?.length > 0 ? (
                  studentDetails.attendance_history.map((rec) => (
                    <div key={rec.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{rec.session}</span>
                        <div className="text-[10px] text-slate-400">{rec.date} • {rec.check_in_time}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <StatusBadge status={rec.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">No attendance recorded.</div>
                )}
              </div>
            </div>

            {/* Complaints History Section (Admin Only!) */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                Student Grievance History (Admin Exclusive)
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                {studentDetails?.complaints_history?.length > 0 ? (
                  studentDetails.complaints_history.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">#CMP-{c.id}: {c.subject}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={c.priority} />
                          <StatusBadge status={c.status} />
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px]">{c.description}</p>
                      {c.admin_response && (
                        <div className="text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                          <strong>Admin Response:</strong> {c.admin_response}
                        </div>
                      )}
                      {c.admin_notes && (
                        <div className="text-[10px] text-purple-800 bg-purple-50 p-1.5 rounded-lg border border-purple-200">
                          <strong>Internal Staff Note:</strong> {c.admin_notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">No complaints filed by this student.</div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setViewingStudent(null);
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

      {/* Deactivate Confirm Modal */}
      {deactivatingStudent && (
        <ConfirmModal
          isOpen={!!deactivatingStudent}
          onClose={() => setDeactivatingStudent(null)}
          onConfirm={handleDeactivate}
          title="Deactivate Student"
          message={`Are you sure you want to deactivate student account "${deactivatingStudent.name}" (${deactivatingStudent.student_id})? The student will no longer be able to log in.`}
          confirmText="Deactivate"
          type="danger"
        />
      )}

      {/* Reject Registration Modal */}
      {rejectingStudent && (
        <Modal
          isOpen={Boolean(rejectingStudent)}
          onClose={() => {
            setRejectingStudent(null);
            setRejectReason('');
          }}
          title="Reject Student Registration"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to reject the registration request for{' '}
              <strong className="text-slate-900">{rejectingStudent?.name}</strong> (<span className="font-mono text-slate-700">{rejectingStudent?.email}</span>)?
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows="3"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Ineligible enrollment cohort, invalid credentials, or duplicate application..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectingStudent(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <XCircle className="w-4 h-4" />
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
