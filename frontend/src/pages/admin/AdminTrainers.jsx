import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  BookOpen,
  Layers,
  Award,
  FileCheck,
  CheckCircle2,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export function AdminTrainers() {
  const toast = useToast();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    trainer_id: '',
    specialization: '',
    phone: '',
    bio: '',
    avatar: '',
    status: 'active'
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Details Modal
  const [viewingTrainer, setViewingTrainer] = useState(null);
  const [trainerDetails, setTrainerDetails] = useState(null);

  // Delete/Deactivate Confirmation
  const [actionTrainer, setActionTrainer] = useState(null);
  const [actionType, setActionType] = useState('deactivate'); // 'deactivate' | 'delete' | 'activate'
  const [processingAction, setProcessingAction] = useState(false);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const res = await api.getTrainers();
      if (res.success) {
        setTrainers(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trainers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const openAddModal = () => {
    setEditingTrainer(null);
    setFormData({
      name: '',
      email: '',
      password: 'trainer123',
      trainer_id: `TRN-${100 + trainers.length + 1}`,
      specialization: 'Full-Stack Development',
      phone: '',
      bio: '',
      avatar: '',
      status: 'active'
    });
    setShowFormModal(true);
  };

  const openEditModal = (trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      email: trainer.email,
      password: '',
      trainer_id: trainer.trainer_id || '',
      specialization: trainer.specialization || '',
      phone: trainer.phone || '',
      bio: trainer.bio || '',
      avatar: trainer.avatar || '',
      status: trainer.status || 'active'
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTrainer) {
        const res = await api.updateTrainer(editingTrainer.id, formData);
        if (res.success) {
          toast.success('Trainer updated successfully.', 'Updated');
          setShowFormModal(false);
          fetchTrainers();
        }
      } else {
        const res = await api.createTrainer(formData);
        if (res.success) {
          toast.success('Trainer added successfully.', 'Created');
          setShowFormModal(false);
          fetchTrainers();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionConfirm = async () => {
    if (!actionTrainer) return;
    setProcessingAction(true);
    try {
      if (actionType === 'delete') {
        const res = await fetch(`/api/trainers/${actionTrainer.id}?permanent=true`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Trainer permanently deleted from system.', 'Deleted');
          setActionTrainer(null);
          fetchTrainers();
        } else {
          toast.error(data.message || 'Failed to delete trainer.');
        }
      } else if (actionType === 'deactivate') {
        const res = await api.deleteTrainer(actionTrainer.id);
        if (res.success) {
          toast.info('Trainer deactivated.', 'Deactivated');
          setActionTrainer(null);
          fetchTrainers();
        }
      } else if (actionType === 'activate') {
        const res = await api.updateTrainer(actionTrainer.id, { status: 'active' });
        if (res.success) {
          toast.success('Trainer reactivated.', 'Activated');
          setActionTrainer(null);
          fetchTrainers();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleViewDetails = async (trainer) => {
    setViewingTrainer(trainer);
    try {
      const res = await api.getTrainer(trainer.id);
      if (res.success) {
        setTrainerDetails(res.data);
      }
    } catch (err) {
      toast.error('Failed to load trainer details.');
    }
  };

  const columns = [
    {
      header: 'Trainer',
      key: 'name',
      sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <img
            src={t.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(t.name)}`}
            alt={t.name}
            className="w-9 h-9 rounded-xl bg-slate-100 object-cover ring-2 ring-slate-100"
          />
          <div>
            <div className="font-bold text-slate-900">{t.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{t.email}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Trainer ID',
      key: 'trainer_id',
      sortable: true,
      render: (t) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          {t.trainer_id}
        </span>
      )
    },
    {
      header: 'Specialization',
      key: 'specialization',
      sortable: true,
      render: (t) => <span className="font-medium text-xs text-slate-800">{t.specialization}</span>
    },
    {
      header: 'Assigned Batches',
      key: 'assigned_batches',
      render: (t) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          {t.assigned_batches?.length || 0} Batches
        </span>
      )
    },
    {
      header: 'Students Assigned',
      key: 'assigned_students_count',
      sortable: true,
      render: (t) => (
        <span className="font-bold text-xs text-slate-700">
          {t.assigned_students_count || 0} Students
        </span>
      )
    },
    {
      header: 'Pending Verifications',
      key: 'pending_verifications_count',
      sortable: true,
      render: (t) => (
        t.pending_verifications_count > 0 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            {t.pending_verifications_count} Pending
          </span>
        ) : (
          <span className="text-xs text-slate-400 font-medium">0</span>
        )
      )
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (t) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewDetails(t)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View Trainer Profile & Cohorts"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(t)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Edit Trainer"
          >
            <Edit className="w-4 h-4" />
          </button>
          {t.status === 'active' ? (
            <button
              onClick={() => {
                setActionTrainer(t);
                setActionType('deactivate');
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Deactivate Trainer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setActionTrainer(t);
                setActionType('activate');
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Reactivate Trainer"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            Trainer & Faculty Management (CRUD)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register new trainers, edit credentials and domain specializations, review cohort assignments, or deactivate faculty.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Trainer
        </button>
      </div>

      <DataTable
        columns={columns}
        data={trainers}
        searchPlaceholder="Search trainer name, ID, or specialization..."
        searchFields={['name', 'trainer_id', 'email', 'specialization', 'phone']}
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
        emptyMessage="No trainers found."
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingTrainer ? `Edit Trainer: ${editingTrainer.name}` : 'Add New Trainer'}
        subtitle="Configures instructional credentials, password, and faculty specialization"
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
                placeholder="e.g. Sarah Jenkins"
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
                placeholder="trainer@portal.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trainer ID Code *
              </label>
              <input
                type="text"
                required
                value={formData.trainer_id}
                onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                placeholder="TRN-101"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specialization / Domain *
              </label>
              <input
                type="text"
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Machine Learning & Python"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {editingTrainer ? 'Reset Password (Leave blank to keep unchanged)' : 'Initial Password *'}
            </label>
            <input
              type="text"
              required={!editingTrainer}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingTrainer ? 'Enter new password to reset' : 'trainer123'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            {editingTrainer && (
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
          </div>

          {/* Custom Avatar / Profile Picture */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Profile Photo</span>
              {uploadingImage && <span className="text-xs text-indigo-600 font-semibold animate-pulse">Uploading photo...</span>}
            </label>
            <div className="flex items-center gap-3">
              <img
                src={formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.name || 'Trainer')}`}
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
                        toast.success('Trainer photo uploaded successfully.');
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Faculty Biography / Profile Bio
            </label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Background, certifications, prior industry experience..."
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
              {submitting ? 'Saving...' : editingTrainer ? 'Update Trainer' : 'Add Trainer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Trainer Details Modal */}
      {viewingTrainer && (
        <Modal
          isOpen={!!viewingTrainer}
          onClose={() => {
            setViewingTrainer(null);
            setTrainerDetails(null);
          }}
          title={`Trainer: ${viewingTrainer.name}`}
          subtitle={`ID: ${viewingTrainer.trainer_id} • ${viewingTrainer.specialization}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">{viewingTrainer.name}</div>
                <div className="text-slate-400 font-mono text-[11px]">{viewingTrainer.email} • {viewingTrainer.phone || 'No phone'}</div>
              </div>
              <StatusBadge status={viewingTrainer.status} />
            </div>

            {viewingTrainer.bio && (
              <div className="p-3.5 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Biography</span>
                <p className="text-slate-700 mt-1 leading-relaxed">{viewingTrainer.bio}</p>
              </div>
            )}

            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                Assigned Students ({trainerDetails?.assigned_students?.length || 0})
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                {trainerDetails?.assigned_students?.length > 0 ? (
                  trainerDetails.assigned_students.map((s) => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{s.name}</span>
                        <div className="text-[10px] text-slate-400">{s.student_id} • {s.batch_name}</div>
                      </div>
                      <span className="font-bold text-indigo-600 text-xs">{s.stats?.attendancePercentage || 100}% attendance</span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">No students assigned to this trainer yet.</div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setViewingTrainer(null);
                  setTrainerDetails(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Action Confirmation Modal (Deactivate / Delete / Reactivate) */}
      {actionTrainer && (
        <Modal
          isOpen={!!actionTrainer}
          onClose={() => setActionTrainer(null)}
          title={
            actionType === 'delete'
              ? 'Permanently Delete Trainer'
              : actionType === 'activate'
              ? 'Reactivate Trainer'
              : 'Deactivate Trainer'
          }
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed text-sm">
              {actionType === 'delete'
                ? `Are you sure you want to permanently delete trainer "${actionTrainer.name}" (${actionTrainer.trainer_id})? This will permanently remove their records.`
                : actionType === 'activate'
                ? `Reactivate login access for trainer "${actionTrainer.name}" (${actionTrainer.trainer_id})?`
                : `Are you sure you want to deactivate trainer "${actionTrainer.name}" (${actionTrainer.trainer_id})? They will be blocked from signing in.`}
            </p>

            {actionType === 'deactivate' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex items-center justify-between">
                <span>Want to remove permanently instead?</span>
                <button
                  type="button"
                  onClick={() => setActionType('delete')}
                  className="font-bold text-rose-700 underline"
                >
                  Switch to Delete
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionTrainer(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                disabled={processingAction}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm ${
                  actionType === 'delete' || actionType === 'deactivate'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {processingAction
                  ? 'Processing...'
                  : actionType === 'delete'
                  ? 'Delete Permanently'
                  : actionType === 'activate'
                  ? 'Reactivate Account'
                  : 'Deactivate Trainer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
