import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Clock,
  Layers,
  Users
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export function AdminCourses() {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    course_name: '',
    code: '',
    duration: '6 Months',
    description: '',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm
  const [deletingCourse, setDeletingCourse] = useState(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.getCourses();
      if (res.success) {
        setCourses(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData({
      course_name: '',
      code: `CRS-${100 + courses.length + 1}`,
      duration: '6 Months',
      description: '',
      status: 'active'
    });
    setShowFormModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      course_name: course.course_name,
      code: course.code,
      duration: course.duration,
      description: course.description || '',
      status: course.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCourse) {
        const res = await api.updateCourse(editingCourse.id, formData);
        if (res.success) {
          toast.success('Course updated successfully.', 'Updated');
          setShowFormModal(false);
          fetchCourses();
        }
      } else {
        const res = await api.createCourse(formData);
        if (res.success) {
          toast.success('Course added successfully.', 'Created');
          setShowFormModal(false);
          fetchCourses();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    try {
      const res = await api.deleteCourse(deletingCourse.id);
      if (res.success) {
        toast.info('Course deleted.', 'Deleted');
        setDeletingCourse(null);
        fetchCourses();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete course.');
    }
  };

  const columns = [
    {
      header: 'Course Program',
      key: 'course_name',
      sortable: true,
      render: (c) => (
        <div>
          <div className="font-bold text-slate-900">{c.course_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{c.code}</div>
        </div>
      )
    },
    {
      header: 'Duration',
      key: 'duration',
      sortable: true,
      render: (c) => <span className="font-medium text-xs text-slate-700">{c.duration}</span>
    },
    {
      header: 'Active Batches',
      key: 'batch_count',
      sortable: true,
      render: (c) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          {c.batch_count || 0} Batches
        </span>
      )
    },
    {
      header: 'Enrolled Students',
      key: 'student_count',
      sortable: true,
      render: (c) => <span className="font-bold text-xs text-slate-800">{c.student_count || 0} Students</span>
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditModal(c)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit Course"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingCourse(c)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Course"
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
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Course & Curriculum Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create educational tracks, manage program durations, and monitor cohort enrollment.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Course
        </button>
      </div>

      <DataTable
        columns={columns}
        data={courses}
        searchPlaceholder="Search course name or code..."
        searchFields={['course_name', 'code', 'duration', 'description']}
        emptyMessage="No courses found."
      />

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingCourse ? `Edit Course: ${editingCourse.course_name}` : 'Add New Course'}
        subtitle="Specify program code, standard duration, and syllabus summary"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Course Name *
              </label>
              <input
                type="text"
                required
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder="e.g. Data Science & AI"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Course Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="DSAI-201"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Duration *
              </label>
              <input
                type="text"
                required
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 6 Months / 24 Weeks"
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
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Description & Syllabus Highlights
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Overview of technologies, key milestones, target roles..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
            />
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
              {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {deletingCourse && (
        <ConfirmModal
          isOpen={!!deletingCourse}
          onClose={() => setDeletingCourse(null)}
          onConfirm={handleDelete}
          title="Delete Course Program"
          message={`Are you sure you want to delete course "${deletingCourse.course_name}"? This action cannot be undone.`}
          confirmText="Delete Course"
          type="danger"
        />
      )}
    </div>
  );
}
