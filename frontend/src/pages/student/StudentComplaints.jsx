import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  Clock,
  CheckCircle,
  FileText,
  Paperclip,
  ShieldCheck,
  Eye,
  Info,
  Calendar,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export function StudentComplaints() {
  const { user } = useAuth();
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [category, setCategory] = useState('Course');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [attachment, setAttachment] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Details Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.getMyComplaints();
      if (res.success) {
        setComplaints(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await api.uploadFile(file);
      if (res.success) {
        setAttachment(res.url);
        toast.success(`Attachment "${file.name}" uploaded.`, 'File Uploaded');
      }
    } catch (err) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.warning('Please enter both subject and detailed description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitComplaint({
        category,
        subject,
        description,
        priority,
        attachment
      });

      if (res.success) {
        toast.success('Your grievance has been submitted privately to the Administration.', 'Complaint Submitted');
        setShowSubmitModal(false);
        setSubject('');
        setDescription('');
        setAttachment(null);
        fetchComplaints();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Complaint ID',
      key: 'id',
      sortable: true,
      render: (c) => <span className="font-mono font-bold text-xs text-indigo-600">#CMP-{c.id}</span>
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
        <div className="max-w-xs truncate font-semibold text-slate-900">
          {c.subject}
        </div>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      sortable: true,
      render: (c) => <StatusBadge status={c.priority} />
    },
    {
      header: 'Date',
      key: 'created_at',
      sortable: true,
      render: (c) => (
        <span className="text-xs text-slate-500">
          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (c) => <StatusBadge status={c.status} />
    },
    {
      header: 'Admin Response',
      key: 'admin_response',
      render: (c) => (
        c.admin_response ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 truncate max-w-[160px]">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Response Available
          </span>
        ) : (
          <span className="text-xs text-slate-400">Awaiting Response</span>
        )
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (c) => (
        <button
          onClick={() => setSelectedComplaint(c)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-indigo-600" />
            Student Grievance & Complaints
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit confidential complaints regarding courses, infrastructure, trainers, or attendance.
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Report a Complaint
        </button>
      </div>

      {/* Privacy Notice Box */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-600 text-white flex-shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-indigo-950 leading-relaxed">
          <h4 className="font-bold text-sm text-indigo-900 mb-0.5">Privacy & Confidentiality Guarantee</h4>
          <p className="text-indigo-800/90">
            Complaints submitted here are transmitted <strong>strictly to the Administrative Directorate</strong>. Trainers and other students do NOT have access to your submitted complaints.
          </p>
        </div>
      </div>

      {/* Complaints Table */}
      <DataTable
        columns={columns}
        data={complaints}
        searchPlaceholder="Search by subject or category..."
        searchFields={['subject', 'category', 'status', 'priority']}
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
        emptyMessage="You have not submitted any complaints."
      />

      {/* Submit Complaint Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Report a Grievance or Complaint"
        subtitle="Confidential submission to the Institute Administration"
      >
        <form onSubmit={handleSubmitComplaint} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                <option value="Course">Course & Curriculum</option>
                <option value="Trainer">Trainer Related</option>
                <option value="Attendance">Attendance Discrepancy</option>
                <option value="Infrastructure">Infrastructure / Facility</option>
                <option value="Technical Issue">Technical / Lab Issue</option>
                <option value="Other">Other Grievance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                <option value="Low">Low Priority (Routine feedback)</option>
                <option value="Medium">Medium Priority (Standard inquiry)</option>
                <option value="High">High Priority (Urgent lab or class blocker)</option>
                <option value="Urgent">Urgent (Critical issue)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Projector flickering in Lab 302 during React session"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description *
            </label>
            <textarea
              rows="4"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide full details, dates, room numbers, or any relevant context for the admin team..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Attachment (Screenshot, Document, Photo)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors">
                <Paperclip className="w-4 h-4" />
                {uploadingFile ? 'Uploading...' : 'Choose File'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </label>
              {attachment && (
                <span className="text-xs text-emerald-600 font-medium truncate max-w-xs">
                  ✓ File attached: {attachment}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Complaint #${selectedComplaint.id}`}
          subtitle={`Submitted on ${new Date(selectedComplaint.created_at).toLocaleString()}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Category:</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-800">
                  {selectedComplaint.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Priority:</span>
                <StatusBadge status={selectedComplaint.priority} />
                <StatusBadge status={selectedComplaint.status} />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Subject</span>
              <h3 className="font-bold text-sm text-slate-900 mt-0.5">{selectedComplaint.subject}</h3>

              <span className="text-slate-400 font-bold uppercase text-[10px] mt-4 block">Description</span>
              <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>

              {selectedComplaint.attachment && (
                <div className="mt-3 pt-3 border-t border-slate-200/60">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Attachment</span>
                  <a
                    href={selectedComplaint.attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    View Uploaded Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Admin Response Box */}
            <div className={`p-4 rounded-2xl border ${selectedComplaint.admin_response ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className={`w-4 h-4 ${selectedComplaint.admin_response ? 'text-emerald-700' : 'text-amber-600'}`} />
                <h4 className={`font-bold text-xs uppercase tracking-wider ${selectedComplaint.admin_response ? 'text-emerald-900' : 'text-amber-900'}`}>
                  Official Administrative Response
                </h4>
              </div>

              {selectedComplaint.admin_response ? (
                <p className="text-emerald-950 leading-relaxed text-xs">
                  {selectedComplaint.admin_response}
                </p>
              ) : (
                <p className="text-amber-800 text-xs italic">
                  The Administration is currently reviewing this complaint. You will receive a notification as soon as an official response is posted.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
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
