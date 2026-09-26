import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  Activity
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';

export function AdminAuditLogs() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      header: 'Timestamp',
      key: 'created_at',
      sortable: true,
      render: (l) => (
        <span className="font-mono text-xs text-slate-500">
          {new Date(l.created_at).toLocaleString()}
        </span>
      )
    },
    {
      header: 'User & Role',
      key: 'user_name',
      sortable: true,
      render: (l) => (
        <div>
          <div className="font-bold text-slate-900">{l.user_name}</div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
            {l.user_role}
          </span>
        </div>
      )
    },
    {
      header: 'Action Event',
      key: 'action',
      sortable: true,
      render: (l) => (
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          {l.action}
        </span>
      )
    },
    {
      header: 'Event Details',
      key: 'details',
      render: (l) => (
        <div className="max-w-md text-xs text-slate-700 truncate" title={l.details}>
          {l.details}
        </div>
      )
    },
    {
      header: 'IP Address',
      key: 'ip_address',
      render: (l) => <span className="font-mono text-[11px] text-slate-400">{l.ip_address || '127.0.0.1'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-600" />
            Security & System Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable tracking of logins, attendance verification workflows, complaints lifecycle, and administrative changes.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Search action, user, or details..."
        searchFields={['action', 'user_name', 'details', 'user_role', 'ip_address']}
        filters={[
          {
            key: 'user_role',
            label: 'Role',
            options: [
              { value: 'admin', label: 'Admin' },
              { value: 'trainer', label: 'Trainer' },
              { value: 'student', label: 'Student' }
            ]
          }
        ]}
        emptyMessage="No audit logs recorded."
      />
    </div>
  );
}
