import React from 'react';
import { LocationSource } from '../types';
import { Camera, Smartphone, MapPin, UserCheck, HelpCircle } from 'lucide-react';

interface Props {
  source: LocationSource;
  accuracy_m?: number | null;
}

export const ProvenanceTag: React.FC<Props> = ({ source, accuracy_m }) => {
  const configs: Record<LocationSource, { label: string; icon: React.ReactNode; color: string }> = {
    photo_exif: {
      label: 'Photo Metadata (Unverified)',
      icon: <Camera className="w-3.5 h-3.5" />,
      color: 'text-teal-400 bg-teal-950/40 border-teal-800/60'
    },
    device_gps_at_capture: {
      label: 'Device GPS at Capture',
      icon: <Smartphone className="w-3.5 h-3.5" />,
      color: 'text-sky-400 bg-sky-950/40 border-sky-800/60'
    },
    device_gps_at_submission: {
      label: 'Uploader Location at Submission',
      icon: <Smartphone className="w-3.5 h-3.5" />,
      color: 'text-amber-400 bg-amber-950/40 border-amber-800/60'
    },
    manual_map_pin: {
      label: 'User-Selected Map Pin',
      icon: <MapPin className="w-3.5 h-3.5" />,
      color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/60'
    },
    inspector_confirmed: {
      label: 'Field Location Checked',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
    },
    unknown: {
      label: 'Location Pending',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      color: 'text-slate-400 bg-slate-800 border-slate-700'
    }
  };

  const c = configs[source] || configs.unknown;

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded border gap-1.5 ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
      {accuracy_m && <span className="opacity-75">±{Math.round(accuracy_m)}m</span>}
    </span>
  );
};

