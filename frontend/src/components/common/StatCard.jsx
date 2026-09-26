import React from 'react';

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  description,
  accent = 'indigo',
  onClick,
  badge
}) {
  const accentStyles = {
    indigo: {
      bg: 'bg-indigo-50/70 text-indigo-600',
      border: 'hover:border-indigo-300',
      gradient: 'from-indigo-500/10 to-transparent'
    },
    emerald: {
      bg: 'bg-emerald-50/70 text-emerald-600',
      border: 'hover:border-emerald-300',
      gradient: 'from-emerald-500/10 to-transparent'
    },
    amber: {
      bg: 'bg-amber-50/70 text-amber-600',
      border: 'hover:border-amber-300',
      gradient: 'from-amber-500/10 to-transparent'
    },
    rose: {
      bg: 'bg-rose-50/70 text-rose-600',
      border: 'hover:border-rose-300',
      gradient: 'from-rose-500/10 to-transparent'
    },
    sky: {
      bg: 'bg-sky-50/70 text-sky-600',
      border: 'hover:border-sky-300',
      gradient: 'from-sky-500/10 to-transparent'
    },
    purple: {
      bg: 'bg-purple-50/70 text-purple-600',
      border: 'hover:border-purple-300',
      gradient: 'from-purple-500/10 to-transparent'
    }
  };

  const currentAccent = accentStyles[accent] || accentStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 ' + currentAccent.border : ''
      }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${currentAccent.gradient} rounded-bl-full pointer-events-none`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {value}
          </h3>
        </div>

        {Icon && (
          <div className={`p-3 rounded-xl ${currentAccent.bg} flex-shrink-0 shadow-sm`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {(trend !== undefined || description || badge) && (
        <div className="mt-4 flex items-center justify-between gap-2 text-xs relative z-10">
          {trend !== undefined && (
            <div className="flex items-center gap-1 font-medium">
              <span className={trend >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {trend >= 0 ? `+${trend}%` : `${trend}%`}
              </span>
              {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
            </div>
          )}

          {description && <p className="text-slate-500 truncate">{description}</p>}
          {badge && <div>{badge}</div>}
        </div>
      )}
    </div>
  );
}
