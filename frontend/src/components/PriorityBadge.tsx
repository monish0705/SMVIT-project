import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowUpRight, AlertOctagon } from 'lucide-react';

interface Props {
  score: number;
  emergency?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ score, emergency = false, size = 'md', showLabel = true }) => {
  let label = 'Low';
  let bg = 'bg-slate-100';
  let text = 'text-[#39866A]';
  let border = 'border-slate-200';
  let icon = <ArrowUpRight className="w-3.5 h-3.5 text-[#39866A]" />;

  if (emergency || score >= 85) {
    label = emergency ? 'EMERGENCY' : 'CRITICAL';
    bg = 'bg-red-50';
    text = 'text-[#DC4C4C]';
    border = 'border-red-200';
    icon = <AlertOctagon className="w-3.5 h-3.5 text-[#DC4C4C]" />;
  } else if (score >= 70) {
    label = 'HIGH';
    bg = 'bg-amber-50';
    text = 'text-[#B45309]';
    border = 'border-amber-200';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-[#D99A32]" />;
  } else if (score >= 40) {
    label = 'MEDIUM';
    bg = 'bg-blue-50';
    text = 'text-[#3979B7]';
    border = 'border-blue-200';
    icon = <ShieldAlert className="w-3.5 h-3.5 text-[#3979B7]" />;
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  };

  return (
    <span className={`inline-flex items-center rounded-md border tabular-nums whitespace-nowrap ${bg} ${text} ${border} ${sizeClasses[size]}`}>
      {icon}
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-85 font-medium">({label})</span>}
    </span>
  );
};
