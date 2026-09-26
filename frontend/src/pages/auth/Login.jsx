import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  ShieldCheck,
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  // Change credentials modal state
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [currEmail, setCurrEmail] = useState('');
  const [currPassword, setCurrPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrPassword, setShowCurrPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState(null);
  const [changeSuccess, setChangeSuccess] = useState(null);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPendingMessage(null);

    if (!email.trim() || !password.trim()) {
      toast.warning('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res && res.pendingApproval) {
        setPendingMessage(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChangeModal = () => {
    setCurrEmail(email.trim() || 'singhharinder.techcadd@gmail.com');
    setCurrPassword('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setChangeError(null);
    setChangeSuccess(null);
    setShowChangeModal(true);
  };

  const handleChangeCredentials = async (e) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    if (!currEmail.trim()) {
      setChangeError('Please enter your current email address.');
      return;
    }

    if (!currPassword.trim()) {
      setChangeError('Please enter your current password or master key.');
      return;
    }

    if (!newEmail.trim() && !newPassword.trim()) {
      setChangeError('Please enter a new email, a new password, or both.');
      return;
    }

    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        setChangeError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setChangeError('New password and confirmation password do not match.');
        return;
      }
    }

    setChangeLoading(true);
    try {
      const res = await api.changeCredentials({
        currentEmail: currEmail.trim(),
        currentPassword: currPassword,
        newEmail: newEmail.trim() || undefined,
        newPassword: newPassword || undefined
      });

      if (res.success) {
        const updatedEmail = res.email || newEmail.trim() || currEmail.trim();
        toast.success(res.message, 'Credentials Updated');
        setChangeSuccess(res.message);

        // Pre-fill the login form
        setEmail(updatedEmail);
        if (newPassword) {
          setPassword(newPassword);
        }

        // Auto close after brief success display
        setTimeout(() => {
          setShowChangeModal(false);
        }, 1200);
      }
    } catch (err) {
      setChangeError(err.message || 'Failed to update credentials. Please check your current password.');
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/10">
        {/* Left Col: Portal Intro */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#221e5b] via-[#2e246e] to-[#130f3a] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 border border-white/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              Role-Based Education Management
            </div>

            {/* Techcadd Favicon & Logo Branding */}
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-white p-2 rounded-2xl shadow-xl shadow-indigo-950/20 border border-white/40 flex-shrink-0">
                <img
                  src="/favicon.png"
                  alt="Techcadd Icon"
                  className="h-10 w-10 rounded-xl object-contain"
                />
              </div>
              <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xl shadow-indigo-950/20 border border-white/40">
                <img
                  src="/logo.png"
                  alt="Techcadd - Your Skill & Technology Partner"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </div>
            </div>

            <p className="text-indigo-100 text-sm leading-relaxed">
              Integrated Student Attendance Verification, Private Grievance Redressal, and Academic Administration.
            </p>
          </div>

          <div className="space-y-3 my-8">
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <div className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Multi-tier Attendance Verification by Trainers</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <div className="p-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Strict Privacy-Isolated Student Grievances</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-indigo-100">
              <div className="p-1 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span>Comprehensive Reports with CSV & PDF Export</span>
            </div>
          </div>

          <div className="text-[11px] text-indigo-200/80 pt-4 border-t border-white/10">
            Secure SHA-256 JWT Authentication & Role-Based Access Control
          </div>
        </div>

        {/* Right Col: Sign In Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Header with Favicon */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-1.5 shadow-sm shrink-0">
                <img
                  src="/favicon.png"
                  alt="Techcadd"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Sign In to Your Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Please enter your credentials below to access your dashboard
                </p>
              </div>
            </div>

            {/* Pending Verification Notice Banner */}
            {pendingMessage && (
              <div className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 animate-in fade-in duration-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Account Pending Verification</h4>
                    <p className="mt-1 leading-relaxed text-amber-800">{pendingMessage}</p>
                    <p className="mt-2 text-[11px] font-semibold text-amber-700">
                      ℹ️ Please wait until an administrator approves your registration.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenChangeModal}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <KeyRound className="w-3 h-3" />
                    Change Email / Pass
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick credentials change trigger banner */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span className="text-xs text-slate-700 font-medium">Need to update admin login details?</span>
              </div>
              <button
                type="button"
                onClick={handleOpenChangeModal}
                className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                Change Now
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">New student?</p>
                <p className="text-xs text-slate-500 mt-0.5">Create your account and sign in right away.</p>
              </div>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-white border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Register as student
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Secure SHA-256 Encryption</span>
            <span className="font-mono text-[10px]">Active RBAC</span>
          </div>
        </div>
      </div>

      {/* Change Email & Password Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Change Login Credentials</h3>
                  <p className="text-xs text-indigo-200">Update your account email and password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeModal(false)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleChangeCredentials} className="p-6 space-y-4">
              {changeError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{changeError}</span>
                </div>
              )}

              {changeSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {/* Current Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={currEmail}
                    onChange={(e) => setCurrEmail(e.target.value)}
                    placeholder="Enter current email address"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password (or Admin Master Key)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrPassword ? 'text' : 'password'}
                    required
                    value={currPassword}
                    onChange={(e) => setCurrPassword(e.target.value)}
                    placeholder="Enter current password or master key"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPassword(!showCurrPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showCurrPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: If you forgot your password, you can use the admin master key to reset.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  New Credentials (Fill what you want to change)
                </span>
              </div>

              {/* New Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Email Address <span className="text-slate-400 font-normal">(Leave blank to keep same)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password <span className="text-slate-400 font-normal">(Min 6 characters, or leave blank)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              {newPassword.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {changeLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
