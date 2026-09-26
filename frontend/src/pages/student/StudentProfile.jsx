import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Layers,
  UserCheck,
  Lock,
  CheckCircle2,
  Save,
  MapPin,
  HeartPulse,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';

export function StudentProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [phone, setPhone] = useState(user?.phone || profile?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Image size must be under 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const res = await api.uploadFile(file);
      if (res.success && res.url) {
        setAvatar(res.url);
        // Automatically save avatar to profile
        const updateRes = await api.updateProfile({ avatar: res.url });
        if (updateRes.success) {
          toast.success('Custom profile picture updated successfully!', 'Photo Uploaded');
          refreshProfile();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({ phone, avatar });
      if (res.success) {
        toast.success('Profile details updated successfully.', 'Saved');
        refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.updatePassword({ currentPassword, newPassword });
      if (res.success) {
        toast.success('Password changed successfully.', 'Security Updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const currentAvatarUrl = avatar || user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Student Profile & Credentials
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review enrolled academic program, upload custom profile photo, and manage credentials.
        </p>
      </div>

      {/* Profile Header Card with Custom Image Uploader */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <img
            src={currentAvatarUrl}
            alt={user?.name}
            className="w-24 h-24 rounded-3xl bg-slate-100 object-cover ring-4 ring-indigo-50 shadow-md transition-all group-hover:brightness-90"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-110 cursor-pointer"
            title="Upload custom image from device"
          >
            {uploadingImage ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
          />
        </div>

        <div className="text-center sm:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <StatusBadge status={profile?.status || 'active'} />
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">{user?.email}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
              ID: {profile?.student_id || 'STU-PENDING'}
            </span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {profile?.batch_name || 'Assigned Batch'}
            </span>
          </div>
        </div>
      </div>

      {/* Academic & Trainer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Enrolled Program Details
          </h3>

          <div className="space-y-3 text-xs">
            {profile?.domain && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Specialization Domain:</span>
                <span className="font-bold text-indigo-700">{profile.domain}</span>
              </div>
            )}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Course Program:</span>
              <span className="font-bold text-slate-900">{profile?.course_name || 'Full-Stack Web Development'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Current Cohort:</span>
              <span className="font-bold text-indigo-700">{profile?.batch_name || 'Batch FSWD-2026-A'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="font-semibold text-slate-600">Student ID Code:</span>
              <span className="font-mono font-bold text-slate-800">{profile?.student_id || 'STU-2026-001'}</span>
            </div>
          </div>
        </div>

        {/* Assigned Trainer Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            Assigned Lead Trainer
          </h3>

          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.trainer_name || 'Trainer')}`}
                alt="Trainer"
                className="w-12 h-12 rounded-2xl bg-white shadow-sm object-cover ring-2 ring-indigo-200/50"
              />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{profile?.trainer_name || 'Alex Rivera'}</h4>
                <span className="text-[11px] text-indigo-600 font-semibold block">Instructional Faculty & Lead</span>
              </div>
            </div>

            <div className="pt-2 border-t border-indigo-100/70 space-y-1.5 font-mono text-[11px] text-slate-600">
              <div className="flex items-center justify-between">
                <span>Trainer Email:</span>
                <span className="text-slate-900 font-medium">{profile?.trainer_email || 'trainer.alex@portal.edu'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Verification Authority:</span>
                <span className="text-emerald-700 font-bold">Authorized for Attendance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Contact Info & Photo URL & Password Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Image URL form */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-600" />
            Contact & Photo Settings
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5">
                Direct Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span>Custom Profile Image URL</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Upload className="w-3 h-3" /> Upload Local Image
                </button>
              </label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://... or /uploads/... or upload above"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            Security & Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all mt-2 cursor-pointer"
            >
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
