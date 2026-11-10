import React from 'react';
import { AuditEventDetail } from '../types';
import { ArrowRight, User } from 'lucide-react';

interface Props {
  events: AuditEventDetail[];
}

export const AuditTimeline: React.FC<Props> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-[#5A6B7C] bg-[#F6F8FA] rounded-lg border border-[#DDE4EC]">
        No audit events recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE4EC]">
      {events.map((e, idx) => (
        <div key={e.id || idx} className="relative">
          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#167C80] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#167C80]"></div>
          </div>

          <div className="bg-[#F6F8FA] p-3.5 rounded-lg border border-[#DDE4EC]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#263746]">
                {e.action.replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-[#5A6B7C] tabular-nums">
                {new Date(e.timestamp).toLocaleString()}
              </span>
            </div>

            {e.previous_state && e.new_state && (
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-white text-[#5A6B7C] border border-[#DDE4EC] font-mono text-[11px]">
                  {e.previous_state}
                </span>
                <ArrowRight className="w-3 h-3 text-[#5A6B7C]" />
                <span className="px-2 py-0.5 rounded bg-teal-50 text-[#167C80] border border-teal-200 font-mono text-[11px] font-semibold">
                  {e.new_state}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#5A6B7C]">
              <User className="w-3.5 h-3.5 text-[#5A6B7C]" />
              <span className="font-medium text-[#263746]">{e.actor}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 bg-white border border-[#DDE4EC] text-[#5A6B7C] rounded font-medium">
                {e.actor_role}
              </span>
            </div>

            {e.reason && (
              <p className="mt-2 text-xs text-[#263746] bg-white p-2.5 rounded border border-[#DDE4EC]">
                {e.reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
