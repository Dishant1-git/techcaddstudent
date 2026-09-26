import React from 'react';
import { AlertTriangle, CheckCircle, Flame } from 'lucide-react';

export function AttendanceGauge({ percentage = 100, size = 'md', showLabel = true, subtext = 'Overall Attendance' }) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));

  // Color logic
  let strokeColor = '#10b981'; // Emerald >= 85%
  let bgColor = 'bg-emerald-50';
  let textColor = 'text-emerald-700';
  let statusText = 'Excellent';

  if (pct < 75) {
    strokeColor = '#ef4444'; // Red < 75%
    bgColor = 'bg-rose-50';
    textColor = 'text-rose-700';
    statusText = 'Low Attendance Warning';
  } else if (pct < 85) {
    strokeColor = '#f59e0b'; // Amber 75-84%
    bgColor = 'bg-amber-50';
    textColor = 'text-amber-700';
    statusText = 'Satisfactory';
  }

  // Dimensions
  const radius = size === 'lg' ? 68 : size === 'sm' ? 36 : 52;
  const strokeWidth = size === 'lg' ? 12 : size === 'sm' ? 7 : 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-extrabold tracking-tight ${size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'} text-slate-800`}>
            {pct}%
          </span>
          {size !== 'sm' && (
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Rate
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-3 text-center">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">
            {pct < 75 ? (
              <span className="inline-flex items-center gap-1 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                {statusText}
              </span>
            ) : pct >= 85 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                {statusText}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Flame className="w-4 h-4" />
                {statusText}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
        </div>
      )}
    </div>
  );
}
