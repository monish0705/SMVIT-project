import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { IncidentSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

export const InspectorHistory: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getIncidents({
      status: 'field_verified,repair_claimed,resolution_pending_review,resolution_verified,closed',
      limit: 50
    })
      .then((res) => setRecords(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746]">Inspection &amp; Repair History</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Field-verified defects, submitted repair claims, and formally closed municipal cases.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#DDE4EC] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#DDE4EC] flex items-center justify-between bg-[#F6F8FA]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#167C80]" />
            <h2 className="text-sm font-semibold text-[#263746]">Completed &amp; Verified Records ({records.length})</h2>
          </div>
          <ShieldCheck className="w-4 h-4 text-[#39866A]" />
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#5A6B7C]">Loading field history...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5A6B7C]">No verified inspection history yet.</div>
        ) : (
          <div className="divide-y divide-[#DDE4EC]">
            {records.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="p-4 hover:bg-[#F6F8FA] transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {inc.annotated_image_url || inc.original_image_url ? (
                    <img
                      src={inc.annotated_image_url || inc.original_image_url}
                      alt={inc.incident_number}
                      className="w-14 h-12 rounded-lg object-cover border border-[#DDE4EC] flex-shrink-0"
                    />
                  ) : null}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#263746]">{inc.incident_number}</span>
                      <StatusBadge status={inc.current_status} size="sm" />
                      <PriorityBadge score={inc.risk_score} size="sm" showLabel={false} />
                    </div>
                    <p className="text-xs font-medium text-[#263746] truncate">{inc.title}</p>
                    <p className="text-[11px] text-[#5A6B7C] flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#167C80]" />
                      <span className="truncate">{inc.readable_address || 'Bengaluru'}</span>
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#5A6B7C] flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

