import React, { useState } from 'react';
import { UserCheck, ShieldCheck, GraduationCap, ArrowRightLeft, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function QuickRoleSwitcher() {
  const { user, login } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingRole, setLoadingRole] = useState(null);

  const demoAccounts = [
    {
      role: 'admin',
      label: 'Admin (Harinder Singh)',
      email: 'singhharinder.techcadd@gmail.com',
      password: 'Harinder@9203',
      icon: ShieldCheck,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeColor: 'bg-rose-600',
      desc: 'Master access, reports, user & complaint management'
    },
    {
      role: 'trainer',
      label: 'Trainer (Alex Rivera)',
      email: 'trainer.alex@portal.edu',
      password: 'trainer123',
      icon: UserCheck,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeColor: 'bg-indigo-600',
      desc: 'FSWD Lead, attendance verifications for Batch A'
    },
    {
      role: 'trainer',
      label: 'Trainer (Sarah Jenkins)',
      email: 'trainer.sarah@portal.edu',
      password: 'trainer123',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      badgeColor: 'bg-purple-600',
      desc: 'Data Science Specialist, verifications for Batch B'
    },
    {
      role: 'student',
      label: 'Student (John Doe)',
      email: 'student.john@portal.edu',
      password: 'student123',
      icon: GraduationCap,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeColor: 'bg-emerald-600',
      desc: 'FSWD Student, mark attendance & private complaints'
    },
    {
      role: 'student',
      label: 'Student (Emily Watson)',
      email: 'student.emily@portal.edu',
      password: 'student123',
      icon: GraduationCap,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      badgeColor: 'bg-sky-600',
      desc: 'FSWD Student (Batch A), attendance & complaint status'
    }
  ];

  const handleSwitch = async (acc) => {
    setLoadingRole(acc.email);
    try {
      await login(acc.email, acc.password);
      setIsOpen(false);
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:to-pink-500/20 border border-indigo-200/80 text-indigo-700 shadow-sm transition-all"
        title="Quick Role Switcher for instant demo evaluation"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span className="hidden sm:inline">Role Switcher</span>
        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-100 mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fast Demo Role Switcher
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Switch instantly between roles to test workflows
              </p>
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                const isCurrent = user?.email?.toLowerCase() === acc.email.toLowerCase();

                return (
                  <button
                    key={acc.email}
                    onClick={() => handleSwitch(acc)}
                    disabled={loadingRole === acc.email}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-slate-50 border-indigo-300 ring-1 ring-indigo-500/20'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${acc.color} flex-shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {acc.label}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        {acc.email}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {acc.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
