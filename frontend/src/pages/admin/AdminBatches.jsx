import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Clock,
  BookOpen,
  UserCheck,
  Calendar,
  Users
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export function AdminBatches() {
  const toast = useToast();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    batch_name: '',
    course_id: '',
    trainer_id: '',
    schedule_time: '09:00 AM - 12:00 PM (Mon-Fri)',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    max_students: 30,
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deletingBatch, setDeletingBatch] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batRes, crsRes, trnRes] = await Promise.all([
        api.getBatches(),
        api.getCourses(),
        api.getTrainers()
      ]);

      if (batRes.success) setBatches(batRes.data || []);
      if (crsRes.success) setCourses(crsRes.data || []);
      if (trnRes.success) setTrainers(trnRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingBatch(null);
    setFormData({
      batch_name: `Batch ${new Date().getFullYear()}-${String.fromCharCode(65 + batches.length)}`,
      course_id: courses[0]?.id || '',
      trainer_id: trainers[0]?.id || '',
      schedule_time: '09:00 AM - 12:00 PM (Mon-Fri)',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      max_students: 30,
      status: 'active'
    });
    setShowFormModal(true);
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      batch_name: batch.batch_name,
      course_id: batch.course_id || '',
      trainer_id: batch.trainer_id || '',
      schedule_time: batch.schedule_time || '',
      start_date: batch.start_date || '',
      end_date: batch.end_date || '',
      max_students: batch.max_students || 30,
      status: batch.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingBatch) {
        const res = await api.updateBatch(editingBatch.id, formData);
        if (res.success) {
          toast.success('Batch updated successfully.', 'Updated');
          setShowFormModal(false);
          fetchData();
        }
      } else {
        const res = await api.createBatch(formData);
        if (res.success) {
          toast.success('Batch created successfully.', 'Created');
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

  const handleDelete = async () => {
    if (!deletingBatch) return;
    try {
      const res = await api.deleteBatch(deletingBatch.id);
      if (res.success) {
        toast.info('Batch deleted.', 'Deleted');
        setDeletingBatch(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete batch.');
    }
  };

  const columns = [
    {
      header: 'Batch Name',
      key: 'batch_name',
      sortable: true,
      render: (b) => (
        <div>
          <div className="font-bold text-slate-900">{b.batch_name}</div>
          <div className="text-[11px] text-slate-400 font-medium">{b.schedule_time}</div>
        </div>
      )
    },
    {
      header: 'Course Program',
      key: 'course_name',
      sortable: true,
      render: (b) => <span className="font-semibold text-xs text-slate-800">{b.course_name}</span>
    },
    {
      header: 'Assigned Trainer',
      key: 'trainer_name',
      sortable: true,
      render: (b) => <span className="font-bold text-xs text-indigo-700">{b.trainer_name || 'Unassigned'}</span>
    },
    {
      header: 'Enrolled',
      key: 'student_count',
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {b.student_count || 0} / {b.max_students || 30}
        </span>
      )
    },
    {
      header: 'Duration',
      key: 'start_date',
      render: (b) => (
        <span className="text-xs text-slate-500 font-mono">
          {b.start_date} {b.end_date ? `→ ${b.end_date}` : ''}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (b) => <StatusBadge status={b.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(b)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit Batch"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingBatch(b)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Batch"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-indigo-600" />
            Batch & Cohort Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Organize student cohorts, link courses with faculty, and manage session timings.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Batch
        </button>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        searchPlaceholder="Search batch name, course, or trainer..."
        searchFields={['batch_name', 'course_name', 'trainer_name', 'schedule_time']}
        emptyMessage="No batches found."
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingBatch ? `Edit Batch: ${editingBatch.batch_name}` : 'Create New Batch'}
        subtitle="Links student cohorts with instructional faculty"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Batch Name *
              </label>
              <input
                type="text"
                required
                value={formData.batch_name}
                onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
                placeholder="e.g. Batch FSWD-2026-B"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Course Program *
              </label>
              <select
                required
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Lead Trainer *
              </label>
              <select
                required
                value={formData.trainer_id}
                onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
              >
                <option value="">-- Select Faculty --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.trainer_id} - {t.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Student Capacity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Class Schedule / Timings *
            </label>
            <input
              type="text"
              required
              value={formData.schedule_time}
              onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
              placeholder="e.g. 09:00 AM - 12:00 PM (Mon-Fri)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-medium text-slate-800"
              >
                <option value="active">Active</option>
                <option value="inactive">Completed / Inactive</option>
              </select>
            </div>
          </div>

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
              {submitting ? 'Saving...' : editingBatch ? 'Update Batch' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {deletingBatch && (
        <ConfirmModal
          isOpen={!!deletingBatch}
          onClose={() => setDeletingBatch(null)}
          onConfirm={handleDelete}
          title="Delete Batch"
          message={`Are you sure you want to delete batch "${deletingBatch.batch_name}"?`}
          confirmText="Delete Batch"
          type="danger"
        />
      )}
    </div>
  );
}
