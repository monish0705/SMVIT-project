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
      label: 'Photo EXIF (Unverified)',
      icon: <Camera className="w-3.5 h-3.5" />,
      color: 'text-[#167C80] bg-teal-50 border-teal-200'
    },
    device_gps_at_capture: {
      label: 'Device GPS at Capture',
      icon: <Smartphone className="w-3.5 h-3.5" />,
      color: 'text-[#3979B7] bg-blue-50 border-blue-200'
    },
    device_gps_at_submission: {
      label: 'Uploader Location at Submission',
      icon: <Smartphone className="w-3.5 h-3.5" />,
      color: 'text-[#9A6700] bg-amber-50 border-amber-200'
    },
    manual_map_pin: {
      label: 'Manual Map Pin',
      icon: <MapPin className="w-3.5 h-3.5" />,
      color: 'text-[#172B3A] bg-slate-100 border-slate-300'
    },
    inspector_confirmed: {
      label: 'Inspector Confirmed',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      color: 'text-[#39866A] bg-emerald-50 border-emerald-200'
    },
    unknown: {
      label: 'Location Pending',
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      color: 'text-[#5A6B7C] bg-slate-100 border-slate-200'
    }
  };

  const c = configs[source] || configs.unknown;

  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border gap-1.5 whitespace-nowrap ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
      {accuracy_m ? <span className="opacity-80 tabular-nums">&plusmn;{Math.round(accuracy_m)}m</span> : null}
    </span>
  );
};
