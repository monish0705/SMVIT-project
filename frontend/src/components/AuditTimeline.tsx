import React from 'react';
import { AuditEventDetail } from '../types';
import { History, Shield, ArrowRight, User } from 'lucide-react';

interface Props {
  events: AuditEventDetail[];
}

export const AuditTimeline: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500">
        No audit events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((e, idx) => (
        <div key={e.id || idx} className="relative group">
          {/* Timeline node bullet */}
          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-brand-500 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 hover:border-slate-700 transition">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {e.action.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-slate-500">
                {new Date(e.timestamp).toLocaleString()}
              </span>
            </div>

            {/* State change pills if present */}
            {e.previous_state && e.new_state && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px]">
                  {e.previous_state}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 font-mono text-[11px]">
                  {e.new_state}
                </span>
              </div>
            )}

            {/* Actor and role */}
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <User className="w-3 h-3 text-slate-500" />
              <span>{e.actor}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                {e.actor_role}
              </span>
            </div>

            {/* Reason / Notes */}
            {e.reason && (
              <p className="mt-1.5 text-xs text-slate-300 italic bg-slate-950/40 p-2 rounded border border-slate-850">
                "{e.reason}"
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

