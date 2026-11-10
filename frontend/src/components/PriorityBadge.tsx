import React from 'react';
import { AlertTriangle, Flame, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface Props {
  score: number;
  emergency?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ score, emergency = false, size = 'md', showLabel = true }) => {
  let label = 'Low';
  let bg = 'bg-slate-800/80';
  let text = 'text-slate-300';
  let border = 'border-slate-700';
  let icon = <ArrowUpRight className="w-3.5 h-3.5" />;

  if (emergency || score >= 85) {
    label = emergency ? 'EMERGENCY' : 'CRITICAL';
    bg = 'bg-rose-950/70';
    text = 'text-rose-300';
    border = 'border-rose-600';
    icon = <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />;
  } else if (score >= 70) {
    label = 'HIGH';
    bg = 'bg-amber-950/50';
    text = 'text-amber-300';
    border = 'border-amber-600/70';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  } else if (score >= 40) {
    label = 'MEDIUM';
    bg = 'bg-blue-950/40';
    text = 'text-blue-300';
    border = 'border-blue-700/60';
    icon = <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  };

  return (
    <span className={`inline-flex items-center rounded border ${bg} ${text} ${border} ${sizeClasses[size]}`}>
      {icon}
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-80 font-normal">({label})</span>}
    </span>
  );
};

