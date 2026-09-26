import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

export function StatusBadge({ status, type = 'status', className = '' }) {
  if (!status) return null;

  const s = String(status).toLowerCase();

  // Attendance Statuses
  if (s === 'verified' || s === 'present') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Verified
      </span>
    );
  }

  if (s === 'pending verification' || s === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending Verification
      </span>
    );
  }

  if (s === 'rejected' || s === 'absent') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Rejected
      </span>
    );
  }

  // Complaint Statuses
  if (s === 'open') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 ${className}`}>
        <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
        Open
      </span>
    );
  }

  if (s === 'under review') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
        <Clock className="w-3.5 h-3.5 text-purple-600" />
        Under Review
      </span>
    );
  }

  if (s === 'resolved') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Resolved
      </span>
    );
  }

  if (s === 'closed') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 ${className}`}>
        Closed
      </span>
    );
  }

  // Priorities
  if (s === 'urgent') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 uppercase tracking-wider ${className}`}>
        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
        Urgent
      </span>
    );
  }

  if (s === 'high') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 ${className}`}>
        High
      </span>
    );
  }

  if (s === 'medium') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
        Medium
      </span>
    );
  }

  if (s === 'low') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 ${className}`}>
        Low
      </span>
    );
  }

  // User Account Statuses
  if (s === 'active') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Active
      </span>
    );
  }

  if (s === 'pending_approval' || s === 'pending verification' || s === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse ${className}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending Approval
      </span>
    );
  }

  if (s === 'rejected') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Rejected
      </span>
    );
  }

  if (s === 'inactive') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        Inactive
      </span>
    );
  }

  // Default fallback
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
      {status}
    </span>
  );
}
