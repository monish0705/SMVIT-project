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
      bg: 'bg-amber-50',
      text: 'text-[#9A6700]',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    needs_location: {
      label: 'Needs Location',
      bg: 'bg-red-50',
      text: 'text-[#DC4C4C]',
      border: 'border-red-200',
      icon: <MapPin className="w-3.5 h-3.5" />
    },
    needs_review: {
      label: 'Needs Review',
      bg: 'bg-amber-50',
      text: 'text-[#B45309]',
      border: 'border-amber-300',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    corroborated: {
      label: 'Corroborated',
      bg: 'bg-blue-50',
      text: 'text-[#3979B7]',
      border: 'border-blue-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    field_verified: {
      label: 'Field Verified',
      bg: 'bg-emerald-50',
      text: 'text-[#39866A]',
      border: 'border-emerald-200',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    assigned: {
      label: 'Assigned',
      bg: 'bg-slate-100',
      text: 'text-[#172B3A]',
      border: 'border-slate-300',
      icon: <UserCheck className="w-3.5 h-3.5" />
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-sky-50',
      text: 'text-[#0369A1]',
      border: 'border-sky-200',
      icon: <Wrench className="w-3.5 h-3.5" />
    },
    repair_claimed: {
      label: 'Repair Claimed',
      bg: 'bg-teal-50',
      text: 'text-[#167C80]',
      border: 'border-teal-200',
      icon: <FileCheck2 className="w-3.5 h-3.5" />
    },
    resolution_pending_review: {
      label: 'Resolution Pending',
      bg: 'bg-teal-50',
      text: 'text-[#116265]',
      border: 'border-teal-300',
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    resolution_verified: {
      label: 'Resolution Verified',
      bg: 'bg-emerald-50',
      text: 'text-[#39866A]',
      border: 'border-emerald-300',
      icon: <ShieldCheck className="w-3.5 h-3.5" />
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-100',
      text: 'text-[#5A6B7C]',
      border: 'border-slate-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-red-50',
      text: 'text-[#DC4C4C]',
      border: 'border-red-200',
      icon: <XCircle className="w-3.5 h-3.5" />
    }
  };

  const c = configs[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-[#263746]',
    border: 'border-slate-200',
    icon: <Clock className="w-3.5 h-3.5" />
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span className={`inline-flex items-center rounded-md border font-medium whitespace-nowrap ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};
