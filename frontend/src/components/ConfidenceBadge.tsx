import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface Props {
  confidence: 'high' | 'medium' | 'low';
  score?: number;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<Props> = ({ confidence, score, size = 'md' }) => {
  const configs = {
    high: {
      label: 'High Evidence',
      bg: 'bg-emerald-50',
      text: 'text-[#39866A]',
      border: 'border-emerald-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#39866A]" />
    },
    medium: {
      label: 'Medium Evidence',
      bg: 'bg-amber-50',
      text: 'text-[#9A6700]',
      border: 'border-amber-200',
      icon: <Shield className="w-3.5 h-3.5 text-[#D99A32]" />
    },
    low: {
      label: 'Low Evidence',
      bg: 'bg-slate-100',
      text: 'text-[#5A6B7C]',
      border: 'border-slate-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-[#5A6B7C]" />
    }
  };

  const c = configs[confidence] || configs.low;
  const pad = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-md border font-medium whitespace-nowrap ${c.bg} ${c.text} ${c.border} ${pad}`}>
      {c.icon}
      <span>{c.label}</span>
      {score !== undefined && <span className="opacity-75 tabular-nums">({score}%)</span>}
    </span>
  );
};
