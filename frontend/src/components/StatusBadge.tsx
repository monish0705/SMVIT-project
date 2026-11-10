import React from 'react';
import { IncidentStatus } from '../types';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  UserCheck, 
  Wrench, 
  ShieldCheck, 
  XCircle,
  FileCheck2
} from 'lucide-react';

interface Props {
  status: IncidentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const configs: Record<IncidentStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    candidate: {
      label: 'Candidate',
      bg: 'bg-amber-950/40',
      text: 'text-amber-300',
      border: 'border-amber-700/50',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    needs_location: {
      label: 'Needs Location',
      bg: 'bg-rose-950/40',
      text: 'text-rose-300',
      border: 'border-rose-700/50',
      icon: <MapPin className="w-3.5 h-3.5" />
    },
    needs_review: {
      label: 'Needs Review',
      bg: 'bg-orange-950/40',
      text: 'text-orange-300',
      border: 'border-orange-700/50',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    corroborated: {
      label: 'Corroborated',
      bg: 'bg-blue-950/40',
      text: 'text-blue-300',
      border: 'border-blue-700/50',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    field_verified: {
      label: 'Field Verified',
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-300',
      border: 'border-emerald-700/50',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    assigned: {
      label: 'Assigned',
      bg: 'bg-indigo-950/40',
      text: 'text-indigo-300',
      border: 'border-indigo-700/50',
      icon: <UserCheck className="w-3.5 h-3.5" />
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-purple-950/40',
      text: 'text-purple-300',
      border: 'border-purple-700/50',
      icon: <Wrench className="w-3.5 h-3.5" />
    },
    repair_claimed: {
      label: 'Repair Claimed',
      bg: 'bg-cyan-950/40',
      text: 'text-cyan-300',
      border: 'border-cyan-700/50',
      icon: <FileCheck2 className="w-3.5 h-3.5" />
    },
    resolution_pending_review: {
      label: 'Resolution Pending',
      bg: 'bg-teal-950/50',
      text: 'text-teal-300',
      border: 'border-teal-500/50',
      icon: <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
    },
    resolution_verified: {
      label: 'Resolution Verified',
      bg: 'bg-emerald-900/50',
      text: 'text-emerald-200',
      border: 'border-emerald-500',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-800/60',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      border: 'border-red-900/50',
      icon: <XCircle className="w-3.5 h-3.5" />
    }
  };

  const c = configs[status] || {
    label: status,
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    icon: <Clock className="w-3.5 h-3.5" />
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  return (
    <span className={`inline-flex items-center rounded-md border ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

