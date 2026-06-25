import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs } from '../api';
import type { AuditLog } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { FileText, Search } from 'lucide-react';

export default function Audit() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    getAuditLogs(searchUsername || undefined)
      .then((data: any) => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchLogs();
    }
  }, [user, searchUsername]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#060c1a] flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-slate-400 mt-2">Only administrators can access the system audit log registry.</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">System Audit Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Read-only immutable sequence of actions logged within the cross-border ledger.</p>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <div className="relative w-full max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              placeholder="Filter by operator/username..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Audit Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Action / Event</th>
                  <th className="py-4 px-6">Operator</th>
                  <th className="py-4 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">Loading audit trail...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">No audit logs logged.</td>
                  </tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="hover:bg-white/[0.01]">
                      <td className="py-4 px-6 text-slate-500">
                        {new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-4 px-6 text-white font-medium">
                        <span className="flex items-center gap-2">
                          <FileText size={14} className="text-cyan-400" />
                          {l.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-semibold">{l.username}</td>
                      <td className="py-4 px-6 text-slate-400 max-w-md break-words">{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
