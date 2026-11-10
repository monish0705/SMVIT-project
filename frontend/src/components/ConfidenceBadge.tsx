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
      label: 'High Confidence',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-600/50',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
    },
    medium: {
      label: 'Medium Confidence',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      border: 'border-amber-600/50',
      icon: <Shield className="w-3.5 h-3.5 text-amber-400" />
    },
    low: {
      label: 'Low Confidence',
      bg: 'bg-slate-800/80',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
    }
  };

  const c = configs[confidence] || configs.low;

  return (
    <span className={`inline-flex items-center rounded border ${c.bg} ${c.text} ${c.border} text-xs px-2 py-0.5 gap-1.5`}>
      {c.icon}
      <span>{c.label}</span>
      {score !== undefined && <span className="text-slate-400">({score}%)</span>}
    </span>
  );
};

