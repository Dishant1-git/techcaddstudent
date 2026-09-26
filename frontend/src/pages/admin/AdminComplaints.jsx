import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Eye,
  Edit3,
  CheckCircle,
  Clock,
  ShieldAlert,
  Paperclip,
  Send,
  MessageSquare,
  Lock,
  Filter,
  Check,
  X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export function AdminComplaints() {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manage / Review Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('Open');
  const [adminResponse, setAdminResponse] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAllComplaints();
      if (res.success) {
        setComplaints(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load grievances registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openReviewModal = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status || 'Open');
    setAdminResponse(complaint.admin_response || '');
    setAdminNotes(complaint.admin_notes || '');
    setPriority(complaint.priority || 'Medium');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setSubmitting(true);
    try {
      const res = await api.updateComplaintStatus(selectedComplaint.id, {
        status: newStatus,
        admin_response: adminResponse,
        admin_notes: adminNotes,
        priority
      });

      if (res.success) {
        toast.success(`Complaint #${selectedComplaint.id} updated to ${newStatus}.`, 'Updated');
        setSelectedComplaint(null);
        fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Complaint ID',
      key: 'id',
      sortable: true,
      render: (c) => <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">#CMP-{c.id}</span>
    },
    {
      header: 'Student',
      key: 'student_name',
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-bold text-slate-900">{c.student_name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{c.student_code} • {c.batch_name}</div>
        </div>
      )
    },
    {
      header: 'Category',
      key: 'category',
      sortable: true,
      render: (c) => (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
          {c.category}
        </span>
      )
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (c) => (
        <div className="max-w-xs truncate font-semibold text-slate-800" title={c.subject}>
          {c.subject}
        </div>
      )
    },
    {
      header: 'Date',
      key: 'created_at',
      sortable: true,
      render: (c) => (
        <span className="text-xs text-slate-500 font-mono">
          {new Date(c.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      sortable: true,
      render: (c) => <StatusBadge status={c.priority} />
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (c) => <StatusBadge status={c.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (c) => (
        <button
          onClick={() => openReviewModal(c)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" /> Manage
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-indigo-600" />
            Administrative Complaints Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review confidential student grievances, dispatch official responses, and manage resolution statuses.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-sky-200 bg-sky-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-sky-700 uppercase">Open Grievances</span>
          <div className="text-2xl font-extrabold text-sky-950 mt-0.5">
            {complaints.filter(c => c.status === 'Open').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-purple-200 bg-purple-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-purple-700 uppercase">Under Review</span>
          <div className="text-2xl font-extrabold text-purple-950 mt-0.5">
            {complaints.filter(c => c.status === 'Under Review').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 bg-emerald-50/20 shadow-sm text-center">
          <span className="text-[11px] font-bold text-emerald-700 uppercase">Resolved</span>
          <div className="text-2xl font-extrabold text-emerald-950 mt-0.5">
            {complaints.filter(c => c.status === 'Resolved').length}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Closed / Archived</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
            {complaints.filter(c => c.status === 'Closed').length}
          </div>
        </div>
      </div>

      {/* Complaints Data Table */}
      <DataTable
        columns={columns}
        data={complaints}
        searchPlaceholder="Search student name, ID, subject, or category..."
        searchFields={['student_name', 'student_code', 'subject', 'category', 'description']}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'Open', label: 'Open' },
              { value: 'Under Review', label: 'Under Review' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' }
            ]
          },
          {
            key: 'priority',
            label: 'Priority',
            options: [
              { value: 'Low', label: 'Low' },
              { value: 'Medium', label: 'Medium' },
              { value: 'High', label: 'High' },
              { value: 'Urgent', label: 'Urgent' }
            ]
          },
          {
            key: 'category',
            label: 'Category',
            options: [
              { value: 'Trainer', label: 'Trainer' },
              { value: 'Attendance', label: 'Attendance' },
              { value: 'Course', label: 'Course' },
              { value: 'Infrastructure', label: 'Infrastructure' },
              { value: 'Technical Issue', label: 'Technical Issue' },
              { value: 'Other', label: 'Other' }
            ]
          }
        ]}
        emptyMessage="No student grievances registered."
      />

      {/* Review & Manage Complaint Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Manage Complaint #CMP-${selectedComplaint.id}`}
          subtitle={`Submitted by: ${selectedComplaint.student_name} (${selectedComplaint.student_code}) • Batch: ${selectedComplaint.batch_name}`}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
            {/* Student Submission Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-sm">{selectedComplaint.subject}</span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700 text-[11px]">
                    {selectedComplaint.category}
                  </span>
                  <StatusBadge status={selectedComplaint.priority} />
                </div>
              </div>

              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedComplaint.description}
              </p>

              {selectedComplaint.attachment && (
                <div className="pt-2 border-t border-slate-200/60">
                  <a
                    href={selectedComplaint.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    View Student Uploaded Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Status & Priority Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Resolution Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-bold text-slate-900"
                >
                  <option value="Open">Open (Pending Review)</option>
                  <option value="Under Review">Under Review (Investigating)</option>
                  <option value="Resolved">Resolved (Resolution Provided)</option>
                  <option value="Closed">Closed (Archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Urgency Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-bold text-slate-900"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Official Student-Facing Response */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Official Administrative Response (Visible to Student)</span>
                <span className="text-[10px] text-emerald-600 font-normal">Student will receive notification</span>
              </label>
              <textarea
                rows="3"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Write the official response or resolution action for the student..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Private Internal Staff Notes */}
            <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100">
              <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-700" />
                Private Internal Notes (Admin Staff Only - Hidden from Student)
              </label>
              <textarea
                rows="2"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Staff notes, investigation findings, tickets..."
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {submitting ? 'Saving...' : 'Save & Update Grievance'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
