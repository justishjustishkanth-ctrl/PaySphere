import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminDashboard,
  getAdminUsers,
  updateAdminUser,
  toggleAdminUserLock,
  deleteAdminUser,
  getAdminKYC,
  approveAdminKYC,
  rejectAdminKYC,
  getAdminTransactions,
  flagAdminTransaction,
  getAdminPayments,
  getAdminReceipts,
  getAdminFraudLogs,
  getAdminAuditLogs,
  getAdminSettings,
  updateAdminSettings
} from '../api';
import type { User, KYC, FraudLog, AuditLog, Payment, Receipt, Transaction } from '../types';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CreditCard,
  Receipt as ReceiptIcon,
  ShieldAlert,
  FileText,
  Settings,
  Search,
  Check,
  X,
  Eye,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Flag,
  Download,
  Globe,
  LogOut,
  AlertCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Admin() {
  const { logout, user: authUser } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'USERS' | 'KYC' | 'TRANSACTIONS' | 'PAYMENTS' | 'RECEIPTS' | 'FRAUD' | 'AUDIT' | 'SETTINGS'
  >('DASHBOARD');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data States
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [kycs, setKycs] = useState<KYC[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [fraudLogs, setFraudLogs] = useState<FraudLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any>({});

  // Filter States
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [txFilters, setTxFilters] = useState({
    status: '',
    amount: '',
    userEmail: ''
  });

  // Modal States
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingKYC, setViewingKYC] = useState<KYC | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const [flaggingTx, setFlaggingTx] = useState<Transaction | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Load Admin Data based on selected tab
  const loadTabParams = async (tabName: typeof activeTab) => {
    setLoading(true);
    try {
      if (tabName === 'DASHBOARD') {
        const stats = await getAdminDashboard();
        setDashboardStats(stats);
      } else if (tabName === 'USERS') {
        const uList = await getAdminUsers();
        setUsers(uList);
      } else if (tabName === 'KYC') {
        const kList = await getAdminKYC();
        setKycs(kList);
      } else if (tabName === 'TRANSACTIONS') {
        const tList = await getAdminTransactions({
          status: txFilters.status || undefined,
          amount: txFilters.amount ? parseFloat(txFilters.amount) : undefined,
          userEmail: txFilters.userEmail || undefined
        });
        setTransactions(tList);
      } else if (tabName === 'PAYMENTS') {
        const pList = await getAdminPayments();
        setPayments(pList);
      } else if (tabName === 'RECEIPTS') {
        const rList = await getAdminReceipts();
        setReceipts(rList);
      } else if (tabName === 'FRAUD') {
        const fList = await getAdminFraudLogs();
        setFraudLogs(fList);
      } else if (tabName === 'AUDIT') {
        const aList = await getAdminAuditLogs();
        setAuditLogs(aList);
      } else if (tabName === 'SETTINGS') {
        const sData = await getAdminSettings();
        setSettings(sData);
      }
    } catch (err: any) {
      console.error(`Error loading administrative data for ${tabName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabParams(activeTab);
  }, [activeTab]);

  // Handle transaction filters reload
  const handleApplyTxFilters = () => {
    loadTabParams('TRANSACTIONS');
  };

  const handleClearTxFilters = () => {
    setTxFilters({ status: '', amount: '', userEmail: '' });
    // Trigger reload manually since state update isn't instantaneous
    getAdminTransactions().then(res => setTransactions(res)).catch(console.error);
  };

  // Actions
  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      await updateAdminUser(editingUser.id, editingUser);
      setEditingUser(null);
      await loadTabParams('USERS');
    } catch (err: any) {
      alert(err.message || 'Error updating user properties');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (u: User) => {
    if (u.email === 'justishjustishkanth@gmail.com') {
      alert('The primary admin account cannot be locked or disabled.');
      return;
    }
    setActionLoading(true);
    try {
      await toggleAdminUserLock(u.id);
      await loadTabParams('USERS');
    } catch (err: any) {
      alert(err.message || 'Error toggling account lock');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!deletingUser) return;
    if (deletingUser.email === 'justishjustishkanth@gmail.com') {
      alert('The primary admin account cannot be deleted.');
      return;
    }
    setActionLoading(true);
    try {
      await deleteAdminUser(deletingUser.id);
      setDeletingUser(null);
      await loadTabParams('USERS');
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleKYCReview = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      if (status === 'APPROVED') {
        await approveAdminKYC(id);
      } else {
        await rejectAdminKYC(id);
      }
      setViewingKYC(null);
      await loadTabParams('KYC');
    } catch (err: any) {
      alert(err.message || 'Error reviewing KYC submission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flaggingTx) return;
    setActionLoading(true);
    try {
      await flagAdminTransaction(flaggingTx.id, flagReason);
      setFlaggingTx(null);
      setFlagReason('');
      await loadTabParams('TRANSACTIONS');
    } catch (err: any) {
      alert(err.message || 'Error flagging transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateAdminSettings(settings);
      alert('System configuration updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Error updating settings');
    } finally {
      setActionLoading(false);
    }
  };

  // Export Transactions to CSV
  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      alert('No transaction records available to export.');
      return;
    }
    const headers = ['ID', 'User Email', 'Amount', 'Currency', 'Status', 'Timestamp', 'Salesforce ID'];
    const rows = transactions.map(t => [
      t.id,
      t.user?.email || 'N/A',
      t.amount,
      t.currency,
      t.status,
      new Date(t.timestamp).toLocaleString(),
      t.salesforceId || 'N/A'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PaySphere_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter lists in memory
  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return (
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const filteredAuditLogs = auditLogs.filter(a => {
    const q = auditSearch.toLowerCase();
    return (
      (a.action || '').toLowerCase().includes(q) ||
      (a.username || '').toLowerCase().includes(q) ||
      (a.details || '').toLowerCase().includes(q)
    );
  });

  // Recharts Color Palette Constants
  const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#AA336A'];

  // Check auth user security role
  if (authUser?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#060c1a] flex flex-col items-center justify-center text-center p-4">
        <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 mb-4 animate-bounce">
          <ShieldX size={48} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Access Denied</h1>
        <p className="text-slate-400 mt-2 max-w-sm">403 Forbidden: Only accounts with administrative credentials can enter this section.</p>
        <button onClick={() => window.location.href = '/dashboard'} className="mt-8 bg-cyan-500 text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-400 hover:scale-105 transition-all shadow-lg shadow-cyan-500/20">
          Back to Customer Portal
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#060c1a] overflow-hidden text-slate-100 font-sans">
      {/* ── ADMIN SIDEBAR ── */}
      <aside className="w-72 flex-shrink-0 flex flex-col bg-white/[0.02] border-r border-white/[0.06] px-5 py-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Globe size={20} className="text-white animate-spin-slow" />
          </div>
          <div>
            <span className="text-white font-extrabold text-lg tracking-tight block">PaySphere</span>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Admin Module</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {[
            { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'USERS', label: 'User Management', icon: Users },
            { id: 'KYC', label: 'KYC Requests', icon: FileCheck },
            { id: 'TRANSACTIONS', label: 'Transactions', icon: CreditCard },
            { id: 'PAYMENTS', label: 'Payments', icon: CreditCard },
            { id: 'RECEIPTS', label: 'Receipts', icon: ReceiptIcon },
            { id: 'FRAUD', label: 'Fraud Monitoring', icon: ShieldAlert },
            { id: 'AUDIT', label: 'Audit Logs', icon: FileText },
            { id: 'SETTINGS', label: 'System Settings', icon: Settings },
          ].map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/25 shadow-md shadow-cyan-500/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={16} className={active ? 'text-cyan-400' : 'text-slate-500'} />
                  {item.label}
                </div>
                {active && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400" />}
              </button>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="border-t border-white/[0.06] pt-5 mt-4">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-white text-sm font-extrabold shadow-md">
              {authUser?.firstName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-none mb-1">
                {authUser?.fullName || 'Administrator'}
              </p>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider truncate">
                Role: {authUser?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className="flex-1 overflow-y-auto bg-[#040813] relative flex flex-col">
        {/* Header Ribbon */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">PaySphere Secure Admin Console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xs text-slate-400">
            System time: <span className="font-mono text-slate-300 font-medium">{new Date().toLocaleTimeString()}</span>
          </div>
        </header>

        {/* Tab Content Display Area */}
        <div className="p-8 flex-1 max-w-7xl w-full mx-auto space-y-8">
          {loading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
              <span className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
              <p className="text-slate-400 text-sm font-medium tracking-wide">Fetching global administrative ledger...</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: ADMIN DASHBOARD ── */}
              {activeTab === 'DASHBOARD' && dashboardStats && (
                <div className="space-y-8 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Fintech Analytics Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1.5">Overview metrics, compliance states, and cross-border payment ledger volumes.</p>
                  </div>

                  {/* 3x3 Metrics Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                      { label: 'Total Users', value: dashboardStats.totalUsers, desc: 'Registered user base', color: 'from-blue-500 to-indigo-500' },
                      { label: 'Total Transactions', value: dashboardStats.totalTransactions, desc: 'Processed payment request count', color: 'from-cyan-500 to-teal-500' },
                      { label: 'Total Transfer Volume', value: `INR ${dashboardStats.totalTransferVolume.toLocaleString()}`, desc: 'Volume of completed transactions', color: 'from-emerald-500 to-green-500' },
                      
                      { label: 'Pending KYC Requests', value: dashboardStats.pendingKycRequests, desc: 'KYC reviews awaiting approval', color: 'from-amber-500 to-yellow-500' },
                      { label: 'Approved KYC Requests', value: dashboardStats.approvedKycRequests, desc: 'KYC applications approved', color: 'from-emerald-500 to-teal-500' },
                      { label: 'Rejected KYC Requests', value: dashboardStats.rejectedKycRequests, desc: 'KYC applications rejected', color: 'from-red-500 to-rose-500' },
                      
                      { label: 'Pending Transfers', value: dashboardStats.pendingTransfers, desc: 'Transfers awaiting completion', color: 'from-indigo-500 to-violet-500' },
                      { label: 'Failed Transactions', value: dashboardStats.failedTransactions, desc: 'Total failed attempts', color: 'from-red-500 to-orange-500' },
                      { label: 'Fraud Alerts', value: dashboardStats.fraudAlerts, desc: 'Alerts recorded in fraud log', color: 'from-rose-500 to-red-500' },
                    ].map((card, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all hover:-translate-y-0.5 group">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-2xl font-black text-white mt-2 group-hover:text-cyan-400 transition-colors">{card.value}</h3>
                        <p className="text-slate-500 text-xs mt-1.5">{card.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recharts Analytics Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Volume History */}
                    <div className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Platform Transfer Volume History</h4>
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                          <TrendingUp size={12} />
                          Active Trend
                        </span>
                      </div>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dashboardStats.volumeHistory}>
                            <defs>
                              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="volume" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#volGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Distributions */}
                    <div className="flex flex-col gap-6">
                      {/* Transaction Status Distribution */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between flex-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">Transaction Status Distribution</h4>
                        <div className="h-44 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dashboardStats.statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {dashboardStats.statusDistribution.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                          {dashboardStats.statusDistribution.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="text-xs text-slate-400">{entry.name} ({entry.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* KYC Distribution */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between flex-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">KYC Compliance Status</h4>
                        <div className="h-44 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={dashboardStats.kycDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {dashboardStats.kycDistribution.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2">
                          {dashboardStats.kycDistribution.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                              <span className="text-xs text-slate-400">{entry.name} ({entry.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: USER MANAGEMENT ── */}
              {activeTab === 'USERS' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">User Directory</h1>
                      <p className="text-slate-400 text-sm mt-1">Manage system accounts, lock permissions, assign administrative roles.</p>
                    </div>
                  </div>

                  {/* Toolbar Search */}
                  <div className="relative w-full max-w-sm">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users by name, email..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Users Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">ID</th>
                            <th className="py-4.5 px-6">Name</th>
                            <th className="py-4.5 px-6">Email Address</th>
                            <th className="py-4.5 px-6">Role</th>
                            <th className="py-4.5 px-6">Created Date</th>
                            <th className="py-4.5 px-6">Status</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">No users found matching the query.</td>
                            </tr>
                          ) : (
                            filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-slate-500 font-mono">{u.id}</td>
                                <td className="py-4 px-6 text-white font-semibold">{u.firstName} {u.lastName}</td>
                                <td className="py-4 px-6 text-slate-300">{u.email}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                    u.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                  }`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-400">
                                  {u.id > 0 ? 'Jun 23, 2026' : 'N/A'}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    u.locked ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${u.locked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                                    {u.locked ? 'Locked' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex gap-2.5 justify-end">
                                    <button
                                      onClick={() => setViewingUser(u)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                      title="View Details"
                                    >
                                      <Eye size={15} />
                                    </button>
                                    <button
                                      onClick={() => setEditingUser(u)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                      title="Edit User"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleToggleLock(u)}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        u.locked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'
                                      }`}
                                      title={u.locked ? 'Unlock User' : 'Lock/Disable User'}
                                    >
                                      {u.locked ? <Unlock size={15} /> : <Lock size={15} />}
                                    </button>
                                    <button
                                      onClick={() => setDeletingUser(u)}
                                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                      title="Delete User"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: KYC COMPLIANCE REQUESTS ── */}
              {activeTab === 'KYC' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">KYC Compliance Review</h1>
                    <p className="text-slate-400 text-sm mt-1">Review government ID documents, PAN, Aadhaar cards, and approve or reject submissions.</p>
                  </div>

                  {/* KYC Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">User ID</th>
                            <th className="py-4.5 px-6">Applicant Name</th>
                            <th className="py-4.5 px-6">PAN Number</th>
                            <th className="py-4.5 px-6">Aadhaar UID</th>
                            <th className="py-4.5 px-6">Passport</th>
                            <th className="py-4.5 px-6">Current Status</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {kycs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">No KYC applications registered in system.</td>
                            </tr>
                          ) : (
                            kycs.map(k => (
                              <tr key={k.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-slate-500 font-mono">#{k.user?.id || 'N/A'}</td>
                                <td className="py-4 px-6">
                                  <p className="text-white font-semibold">{k.user?.firstName} {k.user?.lastName}</p>
                                  <p className="text-xs text-slate-500">{k.user?.email}</p>
                                </td>
                                <td className="py-4 px-6 text-slate-300 font-mono font-medium">{k.pan}</td>
                                <td className="py-4 px-6 text-slate-300 font-mono font-medium">{k.aadhaar}</td>
                                <td className="py-4 px-6 text-slate-400 font-mono">{k.passport || 'NOT PROVIDED'}</td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    k.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                    k.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      k.status === 'APPROVED' ? 'bg-emerald-400' :
                                      k.status === 'REJECTED' ? 'bg-red-400' : 'bg-amber-400'
                                    }`} />
                                    {k.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex gap-2.5 justify-end">
                                    <button
                                      onClick={() => setViewingKYC(k)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                      title="View Submission Details"
                                    >
                                      <Eye size={15} />
                                    </button>
                                    {k.status === 'PENDING' && (
                                      <>
                                        <button
                                          onClick={() => handleKYCReview(k.id, 'APPROVED')}
                                          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                          title="Approve KYC"
                                        >
                                          <Check size={15} />
                                        </button>
                                        <button
                                          onClick={() => handleKYCReview(k.id, 'REJECTED')}
                                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                          title="Reject KYC"
                                        >
                                          <X size={15} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: TRANSACTION MANAGEMENT ── */}
              {activeTab === 'TRANSACTIONS' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">Platform Transactions</h1>
                      <p className="text-slate-400 text-sm mt-1">Review transfer operations, apply filters, flag suspicious events, or export logs.</p>
                    </div>
                    <button
                      onClick={handleExportTransactions}
                      className="flex items-center gap-2 bg-cyan-500 text-black px-4.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-400 hover:scale-105 transition-all shadow-md"
                    >
                      <Download size={15} />
                      Export CSV
                    </button>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">User Email</label>
                      <input
                        type="text"
                        value={txFilters.userEmail}
                        onChange={e => setTxFilters({ ...txFilters, userEmail: e.target.value })}
                        placeholder="Search email..."
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
                      <select
                        value={txFilters.status}
                        onChange={e => setTxFilters({ ...txFilters, status: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="">All Statuses</option>
                        <option value="SUCCESS">Success</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="PENDING">Pending</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="FAILED">Failed</option>
                        <option value="FLAGGED">Flagged</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Exact Amount</label>
                      <input
                        type="number"
                        value={txFilters.amount}
                        onChange={e => setTxFilters({ ...txFilters, amount: e.target.value })}
                        placeholder="Enter amount..."
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={handleApplyTxFilters}
                        className="flex-1 bg-white/[0.04] text-white py-2 rounded-xl text-sm font-semibold hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                      >
                        Apply Filters
                      </button>
                      <button
                        onClick={handleClearTxFilters}
                        className="px-3.5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all"
                        title="Clear Filters"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">TX ID</th>
                            <th className="py-4.5 px-6">User Email</th>
                            <th className="py-4.5 px-6">Transfer Amount</th>
                            <th className="py-4.5 px-6">Currency</th>
                            <th className="py-4.5 px-6">Status</th>
                            <th className="py-4.5 px-6">Timestamp</th>
                            <th className="py-4.5 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {transactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-500">No transactions recorded.</td>
                            </tr>
                          ) : (
                            transactions.map(t => (
                              <tr key={t.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-slate-500 font-mono">#{t.id}</td>
                                <td className="py-4 px-6 text-white font-semibold">{t.user?.email}</td>
                                <td className="py-4 px-6 font-mono text-slate-300 font-bold">{t.amount.toLocaleString()}</td>
                                <td className="py-4 px-6 text-slate-400 font-bold">{t.currency}</td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    t.status === 'SUCCESS' || t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                                    t.status === 'FAILED' ? 'bg-red-500/10 text-red-400' :
                                    t.status === 'FLAGGED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-500 font-mono">
                                  {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex gap-2.5 justify-end">
                                    <button
                                      onClick={() => setViewingTx(t)}
                                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                      title="View Details"
                                    >
                                      <Eye size={15} />
                                    </button>
                                    {t.status !== 'FLAGGED' && (
                                      <button
                                        onClick={() => setFlaggingTx(t)}
                                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                        title="Flag as Suspicious"
                                      >
                                        <Flag size={15} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 5: PAYMENT MANAGEMENT ── */}
              {activeTab === 'PAYMENTS' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Razorpay Payments</h1>
                    <p className="text-slate-400 text-sm mt-1">Review the list of incoming Razorpay payment intents, orders, and signatures.</p>
                  </div>

                  {/* Payments Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">ID</th>
                            <th className="py-4.5 px-6">Order ID</th>
                            <th className="py-4.5 px-6">Payment ID</th>
                            <th className="py-4.5 px-6">Signature</th>
                            <th className="py-4.5 px-6">Amount</th>
                            <th className="py-4.5 px-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {payments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-500">No payment logs found.</td>
                            </tr>
                          ) : (
                            payments.map(p => (
                              <tr key={p.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-slate-500 font-mono">#{p.id}</td>
                                <td className="py-4 px-6 text-white font-mono text-xs">{p.orderId || 'N/A'}</td>
                                <td className="py-4 px-6 text-cyan-400 font-mono text-xs">{p.paymentId || 'N/A'}</td>
                                <td className="py-4 px-6 text-slate-500 font-mono text-xs max-w-xs truncate">{p.signature || 'N/A'}</td>
                                <td className="py-4 px-6 font-mono text-slate-300 font-bold">INR {p.amount.toLocaleString()}</td>
                                <td className="py-4 px-6">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    p.status === 'captured' || p.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                                    p.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                    'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 6: RECEIPTS ── */}
              {activeTab === 'RECEIPTS' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Receipt Records</h1>
                    <p className="text-slate-400 text-sm mt-1">Immutable receipt invoices generated for cross-border transaction audits.</p>
                  </div>

                  {/* Receipts Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">Receipt Number</th>
                            <th className="py-4.5 px-6">Customer</th>
                            <th className="py-4.5 px-6">Amount</th>
                            <th className="py-4.5 px-6">Generated Date</th>
                            <th className="py-4.5 px-6 text-right">PDF File</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {receipts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-500">No receipts created.</td>
                            </tr>
                          ) : (
                            receipts.map(r => (
                              <tr key={r.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-cyan-400 font-mono font-semibold">{r.receiptNumber}</td>
                                <td className="py-4 px-6">
                                  <p className="text-white font-semibold">{r.user?.firstName} {r.user?.lastName}</p>
                                  <p className="text-xs text-slate-500">{r.user?.email}</p>
                                </td>
                                <td className="py-4 px-6 font-mono text-slate-300 font-bold">
                                  {r.transaction?.currency || 'INR'} {r.transaction?.amount?.toLocaleString() || '0'}
                                </td>
                                <td className="py-4 px-6 text-slate-500 font-mono">
                                  {new Date(r.createdTimestamp).toLocaleString()}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  {r.receiptPdfUrl ? (
                                    <a
                                      href={r.receiptPdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                                    >
                                      Open Invoice
                                      <ExternalLink size={12} />
                                    </a>
                                  ) : (
                                    <span className="text-slate-500 text-xs italic">Awaiting PDF URL</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 7: FRAUD MONITORING ── */}
              {activeTab === 'FRAUD' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Fraud Prevention Engine</h1>
                    <p className="text-slate-400 text-sm mt-1">Review ledger anomalies, suspicious behaviors, risk metrics, and blocked events.</p>
                  </div>

                  {/* Fraud Logs Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">Timestamp</th>
                            <th className="py-4.5 px-6">Target Account</th>
                            <th className="py-4.5 px-6">Risk Reason / Indicator</th>
                            <th className="py-4.5 px-6">Activity Details</th>
                            <th className="py-4.5 px-6 text-right">Calculated Risk Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {fraudLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-500">System Healthy. No fraud records flagged.</td>
                            </tr>
                          ) : (
                            fraudLogs.map(f => {
                              // Dynamically calculate a mock risk score for fintech realism
                              let riskScore = 45;
                              if (f.flagReason?.toLowerCase().includes('multiple') || f.flagReason?.toLowerCase().includes('brute')) riskScore = 85;
                              if (f.flagReason?.toLowerCase().includes('flagged') || f.flagReason?.toLowerCase().includes('suspicious')) riskScore = 90;
                              if (f.flagReason?.toLowerCase().includes('test') || f.flagReason?.toLowerCase().includes('fail')) riskScore = 65;

                              return (
                                <tr key={f.id} className="hover:bg-white/[0.01] transition-all">
                                  <td className="py-4 px-6 text-slate-500 font-mono">
                                    {new Date(f.timestamp).toLocaleString()}
                                  </td>
                                  <td className="py-4 px-6">
                                    <p className="text-white font-semibold">{f.user?.firstName || 'External'} {f.user?.lastName || 'System'}</p>
                                    <p className="text-xs text-slate-500">{f.user?.email || 'system_trigger'}</p>
                                  </td>
                                  <td className="py-4 px-6 text-red-400 font-semibold">{f.flagReason}</td>
                                  <td className="py-4 px-6 text-slate-300 max-w-sm break-words">{f.details}</td>
                                  <td className="py-4 px-6 text-right font-bold">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      riskScore >= 80 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                      {riskScore} / 100
                                    </span>
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
              )}

              {/* ── TAB 8: AUDIT LOGS ── */}
              {activeTab === 'AUDIT' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">System Audit Registry</h1>
                    <p className="text-slate-400 text-sm mt-1">Read-only immutable sequence of actions logged within the cross-border ledger.</p>
                  </div>

                  {/* Search Toolbar */}
                  <div className="relative w-full max-w-sm">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={e => setAuditSearch(e.target.value)}
                      placeholder="Filter audit trail by action, operator..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Audit Table */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4.5 px-6">Timestamp</th>
                            <th className="py-4.5 px-6">Action / Event</th>
                            <th className="py-4.5 px-6">Operator</th>
                            <th className="py-4.5 px-6 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04] text-sm">
                          {filteredAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-slate-500">No logs found matching query.</td>
                            </tr>
                          ) : (
                            filteredAuditLogs.map(l => (
                              <tr key={l.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-4 px-6 text-slate-500 font-mono">
                                  {new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-4 px-6 text-white font-semibold">
                                  <span className="flex items-center gap-2">
                                    <FileText size={14} className="text-cyan-400" />
                                    {l.action}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-slate-300 font-bold font-mono">{l.username || 'SYSTEM'}</td>
                                <td className="py-4 px-6 text-slate-400 max-w-lg break-words text-right">{l.details}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 9: SYSTEM CONFIGURATION ── */}
              {activeTab === 'SETTINGS' && (
                <div className="space-y-6 animate-fade-in max-w-2xl">
                  <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">System Configuration</h1>
                    <p className="text-slate-400 text-sm mt-1">Configure global application variables, maintenance modes, and transaction limitations.</p>
                  </div>

                  <form onSubmit={handleUpdateSettingsSubmit} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Maintenance Mode</label>
                        <select
                          value={settings.maintenanceMode}
                          onChange={e => setSettings({ ...settings, maintenanceMode: e.target.value })}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="false">Off (Standard Operation)</option>
                          <option value="true">On (Restrict all user endpoints)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">OTP Expiry (Minutes)</label>
                          <input
                            type="number"
                            value={settings.otpExpiryMinutes}
                            onChange={e => setSettings({ ...settings, otpExpiryMinutes: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Rate Limiting Protection</label>
                          <select
                            value={settings.rateLimitEnabled}
                            onChange={e => setSettings({ ...settings, rateLimitEnabled: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          >
                            <option value="false">Disabled</option>
                            <option value="true">Enabled (Max 3 OTP / Hour / Mobile)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Min Transfer Limit (INR)</label>
                          <input
                            type="number"
                            value={settings.minTransferAmount}
                            onChange={e => setSettings({ ...settings, minTransferAmount: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Max Transfer Limit (INR)</label>
                          <input
                            type="number"
                            value={settings.maxTransferAmount}
                            onChange={e => setSettings({ ...settings, maxTransferAmount: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Twilio SMS Gateway Dispatcher</label>
                        <select
                          value={settings.twilioEnabled}
                          onChange={e => setSettings({ ...settings, twilioEnabled: e.target.value })}
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="true">Active (Real Twilio dispatch)</option>
                          <option value="false">Inactive (Console log fallback mode)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-cyan-500 text-black py-3 rounded-xl text-sm font-bold hover:bg-cyan-400 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving attributes...' : 'Commit System Configuration'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── MODALS SECTION ── */}
      
      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Account Specifications</h3>
              <button onClick={() => setViewingUser(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Database ID:</span>
                <span className="col-span-2 text-white font-mono">{viewingUser.id}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Full Name:</span>
                <span className="col-span-2 text-white font-semibold">{viewingUser.firstName} {viewingUser.lastName}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Email Address:</span>
                <span className="col-span-2 text-white">{viewingUser.email}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Mobile Number:</span>
                <span className="col-span-2 text-white font-mono">{viewingUser.mobile || 'None'}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">System Role:</span>
                <span className="col-span-2 text-white font-bold text-cyan-400">{viewingUser.role}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Lock Status:</span>
                <span className="col-span-2 font-bold text-white">{viewingUser.locked ? 'Locked (Suspended)' : 'Active'}</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-end">
              <button onClick={() => setViewingUser(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditUserSubmit} className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit User Account</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.firstName}
                  onChange={e => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.lastName}
                  onChange={e => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5">Mobile Number</label>
                <input
                  type="text"
                  value={editingUser.mobile || ''}
                  onChange={e => setEditingUser({ ...editingUser, mobile: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5">System Authorization Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="CUSTOMER">Customer (Tier 1)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-cyan-500 text-black rounded-xl text-sm font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Confirm User Deletion</h3>
              <button onClick={() => setDeletingUser(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <p className="text-slate-300">Are you sure you want to delete the user account for <span className="text-white font-bold">{deletingUser.email}</span>?</p>
              <p className="text-red-400 text-xs italic">Warning: This operation is permanent and deletes all linked transaction history, beneficiaries, and KYC documents.</p>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-end gap-3">
              <button onClick={() => setDeletingUser(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View KYC Modal */}
      {viewingKYC && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">KYC Verification Dossier</h3>
              <button onClick={() => setViewingKYC(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Applicant:</span>
                <span className="col-span-2 text-white font-semibold">{viewingKYC.user?.firstName} {viewingKYC.user?.lastName}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Email Address:</span>
                <span className="col-span-2 text-white">{viewingKYC.user?.email}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">PAN Number:</span>
                <span className="col-span-2 text-white font-mono font-medium text-cyan-400">{viewingKYC.pan}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Aadhaar Card UID:</span>
                <span className="col-span-2 text-white font-mono font-medium text-cyan-400">{viewingKYC.aadhaar}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Passport Number:</span>
                <span className="col-span-2 text-white font-mono">{viewingKYC.passport || 'Not submitted'}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Registered Address:</span>
                <span className="col-span-2 text-slate-300 whitespace-pre-line">{viewingKYC.address}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Submission Status:</span>
                <span className={`col-span-2 font-bold ${
                  viewingKYC.status === 'APPROVED' ? 'text-emerald-400' :
                  viewingKYC.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'
                }`}>{viewingKYC.status}</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-between gap-3">
              <div className="flex gap-2">
                {viewingKYC.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleKYCReview(viewingKYC.id, 'APPROVED')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Approve Dossier
                    </button>
                    <button
                      onClick={() => handleKYCReview(viewingKYC.id, 'REJECTED')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X size={14} />
                      Reject Dossier
                    </button>
                  </>
                )}
              </div>
              <button onClick={() => setViewingKYC(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Transaction Details Modal */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Transaction Metadata</h3>
              <button onClick={() => setViewingTx(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">TX ID Reference:</span>
                <span className="col-span-2 text-white font-mono">#{viewingTx.id}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">User Email:</span>
                <span className="col-span-2 text-white font-semibold">{viewingTx.user?.email}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Amount Sent:</span>
                <span className="col-span-2 text-white font-bold font-mono">{viewingTx.amount.toLocaleString()} {viewingTx.currency}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Status Value:</span>
                <span className={`col-span-2 font-bold ${
                  viewingTx.status === 'SUCCESS' || viewingTx.status === 'COMPLETED' ? 'text-emerald-400' :
                  viewingTx.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                }`}>{viewingTx.status}</span>
              </div>
              <div className="grid grid-cols-3 border-b border-white/[0.04] pb-2">
                <span className="text-slate-400">Timestamp:</span>
                <span className="col-span-2 text-slate-300 font-mono">{new Date(viewingTx.timestamp).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Salesforce ID:</span>
                <span className="col-span-2 text-slate-400 font-mono text-xs">{viewingTx.salesforceId || 'Not synced'}</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-end">
              <button onClick={() => setViewingTx(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Transaction Modal */}
      {flaggingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleFlagTransactionSubmit} className="bg-[#0b1329] border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-red-500" size={18} />
                Flag Transaction
              </h3>
              <button type="button" onClick={() => setFlaggingTx(null)} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-300">Enter security justification to flag Transaction <span className="text-white font-mono font-bold">#{flaggingTx.id}</span> (Amount: {flaggingTx.currency} {flaggingTx.amount}).</p>
              <div>
                <label className="block text-slate-400 mb-1.5">Indicator/Reason</label>
                <textarea
                  required
                  rows={3}
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value)}
                  placeholder="e.g. Velocity anomaly, mismatched beneficiary details, routing indicators..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-white/[0.01] border-t border-white/[0.06] flex justify-end gap-3">
              <button type="button" onClick={() => setFlaggingTx(null)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Flagging...' : 'Flag Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
