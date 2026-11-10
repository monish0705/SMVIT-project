import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  UserCheck, 
  ArrowRight,
  Filter,
  CheckSquare
} from 'lucide-react';
import { api } from '../services/api';
import { WorkOrderDetail } from '../types';

export const WorkOrders: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const loadWorkOrders = () => {
    setLoading(true);
    api.getWorkOrders(statusFilter || undefined)
      .then(res => setWorkOrders(res))
      .catch(err => console.error('Failed to load work orders:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkOrders();
  }, [statusFilter]);

  const handleToggleChecklist = async (wo: WorkOrderDetail, itemIndex: number) => {
    const updatedChecklist = [...wo.checklist];
    updatedChecklist[itemIndex].completed = !updatedChecklist[itemIndex].completed;

    try {
      await api.updateWorkOrder(wo.id, {
        checklist: updatedChecklist
      });
      loadWorkOrders();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Maintenance Work Orders</h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch schedules, field crew execution checklists, and repair verification logs across municipal divisions.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Work Orders</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="repair_claimed">Repair Claimed</option>
            <option value="verified_complete">Verified Complete</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center p-8 text-slate-400 text-xs">
            Loading work orders...
          </div>
        ) : workOrders.length === 0 ? (
          <div className="col-span-2 text-center p-8 text-slate-500 text-xs bg-slate-900 rounded-xl border border-slate-800">
            No work orders found in this status filter.
          </div>
        ) : (
          workOrders.map((wo) => {
            const completedItems = wo.checklist.filter(c => c.completed).length;
            const progressPct = wo.checklist.length > 0 ? Math.round((completedItems / wo.checklist.length) * 100) : 0;

            return (
              <div
                key={wo.id}
                className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-brand-300 font-mono">{wo.work_order_number}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      wo.status === 'verified_complete' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                      wo.status === 'repair_claimed' ? 'bg-cyan-950 text-cyan-300 border-cyan-800 animate-pulse' :
                      wo.status === 'in_progress' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}>
                      {wo.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{wo.title}</h3>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Assigned Division</span>
                      <span className="text-slate-200 font-medium">{wo.assigned_team}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">Lead Inspector</span>
                      <span className="text-slate-200 font-medium">{wo.assigned_inspector || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Checklist & Progress */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Field Protocol Checklist</span>
                      <span className="text-slate-300 font-mono text-[11px]">{completedItems}/{wo.checklist.length} ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {wo.checklist.map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-slate-850 cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(wo, idx)}
                            className="rounded accent-brand-500"
                          />
                          <span className={item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}>
                            {item.item}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {wo.repair_notes && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-850 text-xs text-slate-300">
                      <span className="text-[10px] uppercase text-cyan-400 font-bold block">Repair Report</span>
                      {wo.repair_notes}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: {wo.due_date ? new Date(wo.due_date).toLocaleDateString() : 'Immediate'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

