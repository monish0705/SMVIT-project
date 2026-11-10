import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { WorkOrderDetail } from '../types';

export const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadWorkOrders = () => {
    setLoading(true);
    api.getWorkOrders(statusFilter || undefined)
      .then(res => setWorkOrders(res))
      .catch(err => setErrorMsg(err.message || 'Failed to load work orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkOrders();
  }, [statusFilter]);

  const handleToggleChecklist = async (wo: WorkOrderDetail, itemIndex: number) => {
    const updatedChecklist = wo.checklist.map((item, idx) =>
      idx === itemIndex ? { ...item, completed: !item.completed } : item
    );

    try {
      setErrorMsg(null);
      await api.updateWorkOrder(wo.id, { checklist: updatedChecklist });
      loadWorkOrders();
    } catch (err: any) {
      setErrorMsg(`Failed to update checklist: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Work Orders &amp; Inspection Checklists</h1>
          <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
            Maintenance crew dispatch schedules, on-site safety steps, and repair progress logs.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-[#DDE4EC] text-xs text-[#263746] rounded-lg px-3 py-2 focus:outline-none focus:border-[#167C80] self-start sm:self-auto"
        >
          <option value="">All Work Orders</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="repair_claimed">Repair Claimed</option>
          <option value="verified_complete">Verified Complete</option>
        </select>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC4C4C] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center p-8 text-[#5A6B7C] text-xs">Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <div className="col-span-2 text-center p-8 text-[#5A6B7C] text-xs bg-white rounded-xl border border-[#DDE4EC]">
            No work orders found in this status filter.
          </div>
        ) : (
          workOrders.map((wo) => {
            const completedItems = wo.checklist.filter(c => c.completed).length;
            const progressPct = wo.checklist.length > 0 ? Math.round((completedItems / wo.checklist.length) * 100) : 0;

            return (
              <div
                key={wo.id}
                className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#167C80] font-mono">{wo.work_order_number}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      wo.status === 'verified_complete' ? 'bg-emerald-50 text-[#39866A] border-emerald-200' :
                      wo.status === 'repair_claimed' ? 'bg-teal-50 text-[#167C80] border-teal-200' :
                      wo.status === 'in_progress' ? 'bg-blue-50 text-[#3979B7] border-blue-200' :
                      'bg-slate-100 text-[#263746] border-slate-200'
                    }`}>
                      {wo.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#263746]">{wo.title}</h3>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#DDE4EC]">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#5A6B7C] block">Division</span>
                      <span className="text-[#263746] font-medium">{wo.assigned_team}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#5A6B7C] block">Inspector</span>
                      <span className="text-[#263746] font-medium">{wo.assigned_inspector || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#DDE4EC]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5A6B7C] font-medium">Execution Checklist</span>
                      <span className="text-[#263746] font-mono text-[11px]">{completedItems}/{wo.checklist.length} ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#167C80] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {wo.checklist.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2.5 text-xs p-2 rounded-lg hover:bg-[#F6F8FA] cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(wo, idx)}
                            className="w-4 h-4 rounded accent-[#167C80]"
                          />
                          <span className={item.completed ? 'text-[#5A6B7C] line-through' : 'text-[#263746]'}>
                            {item.item}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {wo.repair_notes && (
                    <div className="p-2.5 rounded-lg bg-[#F6F8FA] border border-[#DDE4EC] text-xs text-[#263746]">
                      <span className="text-[10px] uppercase text-[#167C80] font-bold block mb-0.5">Repair Report</span>
                      {wo.repair_notes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#DDE4EC] flex items-center justify-between text-xs text-[#5A6B7C]">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: {wo.due_date ? new Date(wo.due_date).toLocaleDateString() : 'Immediate'}</span>
                  </div>
                  {(wo as any).incident_id && (
                    <button
                      onClick={() => navigate(`/incidents/${(wo as any).incident_id}`)}
                      className="text-xs font-semibold text-[#167C80] hover:underline flex items-center gap-1"
                    >
                      <span>Open Incident</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
