import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  Mail, 
  Key, 
  Lock,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [organization, setOrganization] = useState('BBMP Road Infrastructure Cell');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsers = () => {
    setLoading(true);
    api.getDemoUsers()
      .then(res => setUsers(res))
      .catch(err => console.error('Failed to load users:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.createUser({
        full_name: fullName,
        email: email,
        password: password,
        role: role,
        organization: organization
      });

      setSuccessMsg(`Account created successfully for ${fullName} (${email}). They can now log in!`);
      setFullName('');
      setEmail('');
      setPassword('');
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove user ${userEmail}?`)) return;

    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    (u.organization && u.organization.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Team & Personnel Deployment</h1>
        <p className="text-sm text-slate-400 mt-1">
          Provision real accounts for field engineers, control room operators, and municipal inspectors. Supports 10+ active multi-user deployment.
        </p>
      </div>

      {/* Grid: Create User Form + User Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provision New Member Form (1 col) */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4 shadow-md">
          <div className="flex items-center gap-2 text-brand-400">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">Provision New Member</h3>
          </div>
          <p className="text-xs text-slate-400">
            Add team personnel. Accounts immediately become active with role-based access permissions.
          </p>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Anand Prakash"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Email Address (Login ID)</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. anand.prakash@bbmp.gov.in"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Role & Permissions</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              >
                <option value="operator">Operator (Triage, Reviews, Work Orders)</option>
                <option value="field_inspector">Field Inspector (On-site checks & verification)</option>
                <option value="admin">Administrator (Full System & User Control)</option>
                <option value="citizen">Citizen Contributor (Public reporting only)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Department / Division</label>
              <input
                type="text"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                placeholder="e.g. BBMP Mahadevapura Ward"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md transition"
            >
              {submitting ? 'Registering Account...' : 'Provision Member Account'}
            </button>
          </form>
        </div>

        {/* Active Personnel Roster (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col min-h-0 shadow-md overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-400" />
              <h3 className="text-sm font-bold text-white">Active Personnel Roster</h3>
              <span className="text-xs bg-slate-800 text-brand-300 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                {users.length} registered
              </span>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Member Details</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Loading personnel roster...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">No members match search.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const roleBadge = 
                      u.role === 'admin' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                      u.role === 'operator' ? 'bg-brand-950 text-brand-300 border-brand-800' :
                      u.role === 'field_inspector' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <tr key={u.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{u.full_name}</span>
                            {isSelf && <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300">(You)</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded border ${roleBadge}`}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-slate-300">
                          {u.organization || 'BBMP Operations'}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition"
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

