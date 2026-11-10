import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
      .catch(err => setErrorMsg(err.message || 'Failed to load personnel roster'))
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
        email,
        password,
        role,
        organization
      });
      setSuccessMsg(`Provisioned account for ${fullName} (${email}).`);
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

  const handleDeleteUser = async (userId: string) => {
    setErrorMsg('');
    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(`Delete failed: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase()) ||
    (u.organization && u.organization.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#263746] tracking-tight">Team &amp; Personnel Provisioning</h1>
        <p className="text-xs sm:text-sm text-[#5A6B7C] mt-1">
          Create and manage accounts for operators, field inspectors, and administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="bg-white rounded-xl border border-[#DDE4EC] p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#167C80]">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-sm font-bold text-[#263746]">Provision New Member</h2>
          </div>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-[#39866A] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#DC4C4C] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[#263746] font-semibold block">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Anand Prakash"
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746] rounded-lg p-2.5 focus:outline-none focus:border-[#167C80]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#263746] font-semibold block">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. anand.prakash@bbmp.gov.in"
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746] rounded-lg p-2.5 focus:outline-none focus:border-[#167C80]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#263746] font-semibold block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746] rounded-lg p-2.5 focus:outline-none focus:border-[#167C80]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#263746] font-semibold block">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746] rounded-lg p-2.5 focus:outline-none focus:border-[#167C80]"
              >
                <option value="operator">Operator (Triage &amp; Reviews)</option>
                <option value="field_inspector">Field Inspector (On-site Verification)</option>
                <option value="admin">Administrator</option>
                <option value="citizen">Citizen Contributor</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[#263746] font-semibold block">Division / Department</label>
              <input
                type="text"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                className="w-full bg-[#F6F8FA] border border-[#DDE4EC] text-[#263746] rounded-lg p-2.5 focus:outline-none focus:border-[#167C80]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#167C80] hover:bg-[#116265] text-white font-semibold text-xs transition"
            >
              {submitting ? 'Registering...' : 'Provision Account'}
            </button>
          </form>
        </div>

        {/* Personnel Roster */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#DDE4EC] flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#DDE4EC] bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#167C80]" />
              <h2 className="text-sm font-bold text-[#263746]">Active Roster</h2>
              <span className="text-xs bg-white border border-[#DDE4EC] text-[#167C80] px-2.5 py-0.5 rounded-full font-mono font-semibold">
                {users.length} accounts
              </span>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#5A6B7C] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-[#DDE4EC] text-xs text-[#263746] rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#167C80]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FA] border-b border-[#DDE4EC] text-[10px] text-[#5A6B7C] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE4EC]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#5A6B7C]">Loading personnel roster...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#5A6B7C]">No members match search.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-[#F6F8FA] transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#263746] flex items-center gap-2">
                            <span>{u.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-teal-50 text-[#167C80] border border-teal-200">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5A6B7C] font-mono mt-0.5">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded border bg-[#F6F8FA] text-[#263746] border-[#DDE4EC]">
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5A6B7C]">{u.organization || 'BBMP Operations'}</td>
                        <td className="px-4 py-3 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-[#DC4C4C] border border-red-200 transition"
                              title="Remove account"
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
