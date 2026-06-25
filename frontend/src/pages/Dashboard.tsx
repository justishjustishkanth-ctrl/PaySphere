import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardOverview,
  getDashboardAnalytics,
  getDashboardExchangeRates,
  getDashboardSecurity,
  getDashboardProfileStrength,
  getDashboardRecentActivity,
  getDashboardNotifications,
  getDashboardBeneficiaries,
  getRecentReceipts,
  getDashboardInsights,
  markNotificationRead
} from '../api';
import DashboardLayout from '../components/DashboardLayout';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  DollarSign,
  Users,
  CheckCircle,
  Percent,
  AlertCircle,
  RefreshCw,
  Search,
  Shield,
  Award,
  Download,
  Printer,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bell
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

// Custom lightweight counter animation component
function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const duration = 1000; // ms
    const stepTime = 20; // 50fps
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(prev => prev + increment);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dashboard Data States
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [security, setSecurity] = useState<any>(null);
  const [profileStrength, setProfileStrength] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [beneficiaryInfo, setBeneficiaryInfo] = useState<any>(null);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);

  // Interaction / Pagination / Filter States
  const [growthRange, setGrowthRange] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [rateQuery, setRateQuery] = useState({ source: 'USD', destination: 'INR', amount: '1000' });
  const [calcResult, setCalcResult] = useState<number | null>(null);
  const [calcRate, setCalcRate] = useState<number | null>(null);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityPage, setActivityPage] = useState(0);
  const [activityData, setActivityData] = useState<any>({ content: [], totalPages: 0, totalElements: 0 });
  const [rateRefreshTimer, setRateRefreshTimer] = useState(300); // 5 mins in seconds

  // Transfer tracker state
  const [selectedTransferId, setSelectedTransferId] = useState<string>('TX-89241');
  const [trackerStep, setTrackerStep] = useState<number>(3); // settled = 4, processing = 3, completed payment = 2, OTP = 1

  // Achievements/Badges
  const badges = [
    { name: 'Verified User', desc: 'Email and registration verified', unlocked: true, color: 'from-teal-500 to-emerald-400' },
    { name: 'KYC Verified', desc: 'Government identification approved', unlocked: security?.kycApproved ?? false, color: 'from-cyan-500 to-blue-500' },
    { name: 'Trusted Sender', desc: 'Sent over $10,000 successfully', unlocked: (overview?.totalSentVolume?.value ?? 0) >= 10000, color: 'from-purple-500 to-indigo-500' },
    { name: 'Global Sender', desc: 'Transferred to 3+ countries', unlocked: (beneficiaryInfo?.totalBeneficiaries ?? 0) >= 3, color: 'from-amber-500 to-orange-500' },
    { name: 'Top Customer', desc: 'Consistently high success rate', unlocked: (overview?.successRate?.value ?? 0) >= 95, color: 'from-pink-500 to-rose-500' }
  ];

  // Load Dashboard Metadata on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      const [
        overviewRes,
        analyticsRes,
        ratesRes,
        securityRes,
        profileRes,
        notifRes,
        benRes,
        receiptsRes,
        insightsRes
      ] = await Promise.all([
        getDashboardOverview(user.id),
        getDashboardAnalytics(user.id),
        getDashboardExchangeRates(),
        getDashboardSecurity(user.id),
        getDashboardProfileStrength(user.id),
        getDashboardNotifications(user.id),
        getDashboardBeneficiaries(user.id),
        getRecentReceipts(user.id),
        getDashboardInsights(user.id)
      ]) as [any, any, any, any, any, any, any, any, any];

      setOverview(overviewRes);
      setAnalytics(analyticsRes);
      setRates(ratesRes);
      setSecurity(securityRes);
      setProfileStrength(profileRes);
      setNotifications(notifRes);
      setBeneficiaryInfo(benRes);
      setRecentReceipts(receiptsRes);
      setInsights(insightsRes);
      
      // Auto-set calculator rate based on rates loaded
      const defaultPair = ratesRes.find((r: any) => r.source === 'USD' && r.destination === 'INR');
      if (defaultPair) {
        setCalcRate(defaultPair.midMarketRate);
        setCalcResult(parseFloat(rateQuery.amount) * defaultPair.midMarketRate);
      }
    } catch (err) {
      console.error('Error fetching dashboard info: ', err);
    } finally {
      setLoading(false);
    }
  }, [user, rateQuery.amount]);

  // Load Main Stats
  useEffect(() => {
    console.log("DASHBOARD LOADED");
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load Paginated Activity separately with filters
  const fetchActivity = useCallback(async () => {
    if (!user) return;
    try {
      const act = await getDashboardRecentActivity(user.id, activitySearch, activityFilter, activityPage) as any;
      setActivityData(act);
    } catch (e) {
      console.error('Activity load error:', e);
    }
  }, [user, activitySearch, activityFilter, activityPage]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Auto-refresh Exchange Rates every 5 mins
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ratesRes = await getDashboardExchangeRates() as any;
        setRates(ratesRes);
        setRateRefreshTimer(300);
      } catch (e) {
        console.error('Rates background update failed: ', e);
      }
    }, 300000);

    const countdown = setInterval(() => {
      setRateRefreshTimer(t => (t > 0 ? t - 1 : 300));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []);

  // Format currency rates refresh counter
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Live currency pair conversion
  const handleCalculatorConvert = (e: React.FormEvent) => {
    e.preventDefault();
    const pair = rates.find(r => r.source === rateQuery.source && r.destination === rateQuery.destination);
    if (pair) {
      setCalcRate(pair.midMarketRate);
      setCalcResult(parseFloat(rateQuery.amount) * pair.midMarketRate);
    } else {
      // fallback
      setCalcRate(83.5);
      setCalcResult(parseFloat(rateQuery.amount) * 83.5);
    }
  };

  // Notification read handler
  const handleMarkNotifRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      // Local filter fallback
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  // Export Reporting System logic
  const handleExport = (type: 'csv' | 'excel' | 'pdf', reportName: string) => {
    const csvHeaders = 'Transaction ID,Beneficiary,Amount,Country,Timestamp,Status\n';
    const rows = activityData.content.map((c: any) =>
      `${c.transactionId},"${c.beneficiary}",${c.amount},${c.country},${c.timestamp},${c.status}`
    ).join('\n');

    if (type === 'csv' || type === 'excel') {
      const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvHeaders + rows);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${reportName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${type === 'csv' ? 'csv' : 'xls'}`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (type === 'pdf') {
      // Mock triggering a print of reports summary
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${reportName}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #1e293b; }
              h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
              th { background-color: #f1f5f9; }
            </style>
          </head>
          <body>
            <h1>${reportName}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>User account: ${user?.email}</p>
            <table>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Beneficiary</th>
                  <th>Amount</th>
                  <th>Country</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${activityData.content.map((c: any) => `
                  <tr>
                    <td>${c.transactionId}</td>
                    <td>${c.beneficiary}</td>
                    <td>$${c.amount}</td>
                    <td>${c.country}</td>
                    <td>${c.timestamp}</td>
                    <td>${c.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>window.print();</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // Print Receipt handler
  const handlePrintReceipt = (receiptId: number) => {
    const printWindow = window.open(`http://localhost:8081/api/receipts/${receiptId}`, '_blank');
    if (printWindow) {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  };

  // Generate Receipt and trigger PDF download
  const handleDownloadReceiptPdf = async (txId: number) => {
    try {
      window.open(`http://localhost:8081/api/receipts/${txId}/pdf`, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  // Filter Search Action with Debounce fallback
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivitySearch(e.target.value);
    setActivityPage(0);
  };

  const handleFilterChange = (filter: string) => {
    setActivityFilter(filter);
    setActivityPage(0);
  };

  // Recharts custom colors
  const COLORS = ['#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
        
        {/* Welcome Banner + Profile Strength Widget */}
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6 bg-gradient-to-r from-cyan-950/30 via-slate-900/40 to-blue-950/30 border border-white/[0.06] rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
          <div className="flex-1 space-y-2 z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="text-cyan-400 w-5 h-5 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">FINTECH PLATINUM PARTNER</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.fullName || `${user?.firstName} ${user?.lastName}`}
            </h1>
            <p className="text-slate-400 text-sm max-w-md">
              Securely routing cross-border funds. Your account is linked, validated, and optimized for global transfers.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                System Status: Active
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                KYC Level 2 Authorized
              </span>
            </div>
          </div>

          {/* Profile Strength Circle Meter */}
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl z-10">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/[0.05]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400 transition-all duration-1000"
                  strokeDasharray={`${profileStrength?.profileCompletion ?? 85}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-sm font-bold text-white">
                {profileStrength?.profileCompletion ?? 85}%
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Profile Strength</p>
              <h4 className="text-sm font-bold text-white">Verification Level</h4>
              <p className="text-[10px] text-slate-500">
                {profileStrength?.profileCompletion >= 100 ? 'Fully completed profile!' : 'Complete checklist to unlock limits'}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Overlay Platform Stats (Visible for Admins only) */}
        {user?.role === 'ADMIN' && overview?.adminMetrics && (
          <div className="bg-gradient-to-r from-purple-950/20 via-pink-950/20 to-indigo-950/20 border border-purple-500/20 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="text-purple-400 w-5 h-5" />
                <h3 className="text-lg font-bold text-purple-200">Admin Control Center (Platform Insights)</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">ADMIN PRIVATE VIEW</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-purple-950/10 border border-purple-500/10 rounded-2xl p-4">
                <span className="text-purple-300 text-xs font-medium uppercase tracking-wider block">Platform Volume</span>
                <p className="text-2xl font-black text-white mt-1">
                  <AnimatedCounter value={overview.adminMetrics.totalPlatformVolume} prefix="$" decimals={2} />
                </p>
              </div>
              <div className="bg-purple-950/10 border border-purple-500/10 rounded-2xl p-4">
                <span className="text-purple-300 text-xs font-medium uppercase tracking-wider block">Total Platform TXs</span>
                <p className="text-2xl font-black text-white mt-1">
                  <AnimatedCounter value={overview.adminMetrics.totalPlatformTransactions} />
                </p>
              </div>
              <div className="bg-purple-950/10 border border-purple-500/10 rounded-2xl p-4">
                <span className="text-purple-300 text-xs font-medium uppercase tracking-wider block">Top Country Target</span>
                <p className="text-lg font-black text-white mt-1">
                  {overview.adminMetrics.topCountries?.[0]?.country ?? 'N/A'} ({overview.adminMetrics.topCountries?.[0]?.percentage ?? 0}%)
                </p>
              </div>
              <div className="bg-purple-950/10 border border-purple-500/10 rounded-2xl p-4">
                <span className="text-purple-300 text-xs font-medium uppercase tracking-wider block">Most Sent Currency</span>
                <p className="text-lg font-black text-white mt-1">{overview.adminMetrics.mostUsedCurrency}</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Executive Overview Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Transfers', key: 'totalTransfers', prefix: '', suffix: '', decimals: 0, icon: Activity, color: 'text-cyan-400 bg-cyan-500/10' },
            { label: 'Total Sent Volume', key: 'totalSentVolume', prefix: '$', suffix: '', decimals: 2, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Total Received Volume', key: 'totalReceivedVolume', prefix: '$', suffix: '', decimals: 2, icon: ArrowDownLeft, color: 'text-blue-400 bg-blue-500/10' },
            { label: 'Active Beneficiaries', key: 'activeBeneficiaries', prefix: '', suffix: '', decimals: 0, icon: Users, color: 'text-indigo-400 bg-indigo-500/10' },
            { label: 'Success Rate %', key: 'successRate', prefix: '', suffix: '%', decimals: 1, icon: Percent, color: 'text-teal-400 bg-teal-500/10' },
            { label: 'Failed Transactions', key: 'failedTransactions', prefix: '', suffix: '', decimals: 0, icon: AlertCircle, color: 'text-rose-400 bg-rose-500/10' },
            { label: 'Pending Transactions', key: 'pendingTransactions', prefix: '', suffix: '', decimals: 0, icon: RefreshCw, color: 'text-amber-400 bg-amber-500/10' },
            { label: 'Total Fees Paid', key: 'totalFeesPaid', prefix: '$', suffix: '', decimals: 2, icon: Percent, color: 'text-purple-400 bg-purple-500/10' }
          ].map((card, idx) => {
            const cardData = overview?.[card.key] ?? { value: 0, growth: 0, trend: 'up' };
            const isNegative = card.key === 'failedTransactions';
            const showGrowth = cardData.growth !== 0;

            return (
              <div
                key={idx}
                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:scale-[1.02] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300 relative overflow-hidden group"
              >
                {/* Accent blur elements */}
                <div className="absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-all duration-300" />
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-400 text-xs md:text-sm font-medium tracking-wide truncate">{card.label}</span>
                  <div className={`p-2 rounded-xl ${card.color}`}>
                    <card.icon size={16} />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-black text-white leading-none">
                    {loading ? (
                      <span className="inline-block w-20 h-6 bg-white/[0.08] rounded animate-pulse" />
                    ) : (
                      <AnimatedCounter
                        value={cardData.value}
                        prefix={card.prefix}
                        suffix={card.suffix}
                        decimals={card.decimals}
                      />
                    )}
                  </h3>

                  <div className="flex items-center gap-1">
                    {showGrowth ? (
                      <>
                        <span className={`text-[10px] font-bold inline-flex items-center ${
                          (cardData.growth > 0 && !isNegative) || (cardData.growth < 0 && isNegative)
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}>
                          {cardData.growth > 0 ? '+' : ''}{cardData.growth}%
                        </span>
                        <span className="text-[10px] text-slate-500">vs last month</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600">Stable activity</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2 Column Main Dashboard Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT 2/3 COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section 2: Advanced Analytics Section */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Transfers Analytics Hub</h3>
                  <p className="text-xs text-slate-400">Interactive telemetry charts and volume breakdowns</p>
                </div>
                {/* Growth trend range toggle */}
                <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.04] self-start sm:self-auto">
                  {(['weekly', 'monthly', 'yearly'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setGrowthRange(range)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 capitalize ${
                        growthRange === range
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Monthly Volume Line Chart (Col span 2) */}
                <div className="md:col-span-2 space-y-2">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Historical Sent Volume (USD)</span>
                  <div className="h-64 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-2">
                    {mounted && analytics?.monthlyVolume ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.monthlyVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Line type="monotone" dataKey="volume" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading telemetry data...</div>
                    )}
                  </div>
                </div>

                {/* Status Distribution Pie Chart */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Status Distributions</span>
                  <div className="h-64 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-2 flex flex-col items-center justify-center">
                    {mounted && analytics?.statusDistribution ? (
                      <>
                        <div className="w-full h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.statusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {analytics.statusDistribution.map((_entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {analytics.statusDistribution.map((entry: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              {entry.name} ({entry.value}%)
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading distributions...</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Advanced Analytics Grid Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/[0.06]">
                {/* Heatmap Grid Calendar (custom render) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Daily Activity Heatmap</span>
                    <span className="text-[10px] text-cyan-400 font-semibold uppercase">30 Days</span>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 flex flex-col justify-center h-48">
                    <div className="grid grid-cols-6 gap-2">
                      {analytics?.heatmap?.map((item: any, index: number) => {
                        let fillClass = 'bg-white/[0.04]';
                        if (item.count === 1) fillClass = 'bg-cyan-500/20';
                        if (item.count === 2) fillClass = 'bg-cyan-500/45';
                        if (item.count === 3) fillClass = 'bg-cyan-500/70';
                        if (item.count >= 4) fillClass = 'bg-cyan-500/95';

                        return (
                          <div
                            key={index}
                            className={`aspect-square rounded-md ${fillClass} cursor-pointer hover:ring-2 hover:ring-white/50 transition-all relative group`}
                            title={`${item.date}: ${item.count} transfers`}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-950 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-30">
                              {item.date}: {item.count} TXs
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center mt-3 text-[9px] text-slate-500">
                      <span>Less</span>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-sm bg-white/[0.04]" />
                        <span className="w-2 h-2 rounded-sm bg-cyan-500/20" />
                        <span className="w-2 h-2 rounded-sm bg-cyan-500/45" />
                        <span className="w-2 h-2 rounded-sm bg-cyan-500/70" />
                        <span className="w-2 h-2 rounded-sm bg-cyan-500/95" />
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                </div>

                {/* Country Destination Bar Chart */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Destination Volume</span>
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-2 h-48">
                    {mounted && analytics?.countryDistribution ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.countryDistribution.slice(0, 3)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="country" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                          <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading countries...</div>
                    )}
                  </div>
                </div>

                {/* Currency Distribution Pie */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Currency breakdown</span>
                  <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-2 h-48 flex flex-col items-center justify-center">
                    {mounted && analytics?.currencyDistribution ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.currencyDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={40}
                            dataKey="value"
                          >
                            {analytics.currencyDistribution.map((_entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading currencies...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: Transaction Intelligence Feed */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Transaction Intelligence</h3>
                  <p className="text-xs text-slate-400">Search, filter, and inspect verified transactions on ledger</p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Today', value: 'today' },
                    { label: 'Week', value: 'week' },
                    { label: 'Month', value: 'month' }
                  ].map(btn => (
                    <button
                      key={btn.value}
                      onClick={() => handleFilterChange(btn.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activityFilter === btn.value
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={handleSearchChange}
                  placeholder="Search by Transaction ID or Beneficiary Name..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {activityData.content.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No transactions matching search filter criteria.
                  </div>
                ) : (
                  activityData.content.map((tx: any) => (
                    <div
                      key={tx.transactionId}
                      onClick={() => {
                        setSelectedTransferId('TX-' + tx.transactionId);
                        setTrackerStep(tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 4 : tx.status === 'FAILED' ? 1 : 3);
                      }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          tx.status === 'SUCCESS' || tx.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : tx.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? (
                            <ArrowDownLeft size={16} />
                          ) : tx.status === 'FAILED' ? (
                            <AlertCircle size={16} />
                          ) : (
                            <RefreshCw size={16} className="animate-spin" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white">{tx.beneficiary}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide">({tx.country})</span>
                          </div>
                          <span className="text-xs text-slate-500">ID: {tx.transactionId} • {new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0">
                        <span className="text-sm font-black text-white">$ {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            tx.status === 'SUCCESS' || tx.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : tx.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {tx.status}
                          </span>
                          
                          {(tx.status === 'SUCCESS' || tx.status === 'COMPLETED') && (
                            <button
                              onClick={() => handleDownloadReceiptPdf(tx.transactionId)}
                              title="Download PDF Receipt"
                              className="text-slate-400 hover:text-cyan-400 p-1 rounded hover:bg-white/[0.05] transition-all"
                            >
                              <Download size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {activityData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Showing page {activityPage + 1} of {activityData.totalPages} ({activityData.totalElements} records)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={activityPage === 0}
                      onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                      className="p-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={activityPage + 1 >= activityData.totalPages}
                      onClick={() => setActivityPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 12: Transfer tracker */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Transfer Progress Tracker</h3>
                <p className="text-xs text-slate-400">Live monitoring of processing transaction ledger stages</p>
              </div>

              <div className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/[0.04] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Tracking Reference:</span>
                    <span className="text-xs font-bold text-white bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">{selectedTransferId}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Demo steps:</span>
                    <div className="flex bg-white/[0.05] p-0.5 rounded-lg">
                      {[1, 2, 3, 4].map(s => (
                        <button
                          key={s}
                          onClick={() => setTrackerStep(s)}
                          className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                            trackerStep === s ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress Stepper Line */}
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Background progress bars */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/[0.06] hidden md:block z-0" />
                  <div
                    className="absolute top-4 left-4 h-0.5 bg-cyan-400 hidden md:block z-0 transition-all duration-500"
                    style={{ width: `${((trackerStep - 1) / 3) * 100}%` }}
                  />

                  {[
                    { title: 'OTP Verified', desc: 'Secure approval validation', step: 1 },
                    { title: 'Payment Completed', desc: 'Gateway settlement logged', step: 2 },
                    { title: 'Processing', desc: 'FxFirm currency clearance', step: 3 },
                    { title: 'Settled', desc: 'Disbursed to destination bank', step: 4 }
                  ].map((stepObj) => {
                    const isDone = trackerStep >= stepObj.step;
                    const isCurrent = trackerStep === stepObj.step;

                    return (
                      <div key={stepObj.step} className="flex md:flex-col items-center md:items-center gap-3 z-10 md:text-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                          isDone
                            ? 'bg-cyan-500 border-cyan-400 text-white ring-4 ring-cyan-500/20'
                            : 'bg-[#0f172a] border-white/[0.12] text-slate-500'
                        }`}>
                          {isDone ? <CheckCircle size={14} /> : stepObj.step}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isCurrent ? 'text-cyan-400' : isDone ? 'text-white' : 'text-slate-500'}`}>
                            {stepObj.title}
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-[120px] hidden md:block">
                            {stepObj.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT 1/3 COLUMN */}
          <div className="space-y-6">
            
            {/* Section 8: Quick Actions Hub */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions Hub</h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="/send"
                  className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-center transition-all duration-200 group block"
                >
                  <ArrowUpRight className="text-cyan-400 mx-auto w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Send Money</span>
                </a>
                <a
                  href="/beneficiaries"
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] text-center transition-all duration-200 group block"
                >
                  <Users className="text-indigo-400 mx-auto w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">Add Beneficiary</span>
                </a>
                <a
                  href="/transactions"
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] text-center transition-all duration-200 group block"
                >
                  <Eye className="text-emerald-400 mx-auto w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">View Ledger</span>
                </a>
                <button
                  onClick={() => {
                    const el = document.getElementById('calc-target');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] text-center transition-all duration-200 group"
                >
                  <Activity className="text-amber-400 mx-auto w-5 h-5 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white block">FX Calculator</span>
                </button>
              </div>
            </div>

            {/* Section 4: Live Exchange rate Hub */}
            <div id="calc-target" className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Live Exchange Hub</h3>
                  <p className="text-xs text-slate-400">Updates live every 5 minutes</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold uppercase">NEXT UPDATE IN</span>
                  <span className="text-xs font-bold text-cyan-400">{formatTimer(rateRefreshTimer)}</span>
                </div>
              </div>

              {/* Rates Table Grid */}
              <div className="space-y-2 bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl max-h-48 overflow-y-auto">
                {rates.map((rate, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 last:border-b-0 last:pb-0">
                    <span className="font-semibold text-slate-400">{rate.source} → {rate.destination}</span>
                    <div className="text-right">
                      <span className="text-white font-bold block">{rate.midMarketRate.toFixed(4)}</span>
                      <span className="text-[9px] text-slate-500">Buy: {rate.buyRate.toFixed(2)} | Sell: {rate.sellRate.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini calculator */}
              <form onSubmit={handleCalculatorConvert} className="space-y-4 pt-2">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Mini Converter</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Source</label>
                    <select
                      value={rateQuery.source}
                      onChange={e => setRateQuery(q => ({ ...q, source: e.target.value }))}
                      className="w-full bg-[#0b0f1e] border border-white/[0.08] rounded-xl px-2.5 py-2 text-white text-xs"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Destination</label>
                    <select
                      value={rateQuery.destination}
                      onChange={e => setRateQuery(q => ({ ...q, destination: e.target.value }))}
                      className="w-full bg-[#0b0f1e] border border-white/[0.08] rounded-xl px-2.5 py-2 text-white text-xs"
                    >
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Amount to send</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={rateQuery.amount}
                      onChange={e => setRateQuery(q => ({ ...q, amount: e.target.value }))}
                      placeholder="1000"
                      className="w-full bg-[#0b0f1e] border border-white/[0.08] rounded-xl pl-3 pr-10 py-2 text-white text-xs focus:outline-none focus:border-cyan-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">{rateQuery.source}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Convert
                </button>
              </form>

              {calcResult !== null && (
                <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-2xl text-xs space-y-1 text-center">
                  <span className="text-slate-400">Equivalent receiver gets:</span>
                  <p className="text-lg font-black text-cyan-400">{calcResult.toLocaleString(undefined, { minimumFractionDigits: 2 })} {rateQuery.destination}</p>
                  <span className="text-[9px] text-slate-500">Rate: 1 {rateQuery.source} = {calcRate?.toFixed(4)} {rateQuery.destination}</span>
                </div>
              )}
            </div>

            {/* Section 9: Security Center Widget */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">Security Center</h3>
                  <p className="text-xs text-slate-400">Score and protection logs</p>
                </div>
                <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  {security?.securityScore ?? 92}/100
                </span>
              </div>

              {/* Status List */}
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Google Account Linked', status: security?.googleAccountLinked },
                  { label: 'Mobile Verified', status: security?.mobileVerified },
                  { label: 'Email Verified', status: security?.emailVerified },
                  { label: 'KYC Approved', status: security?.kycApproved },
                  { label: 'OTP Multi-Factor Enabled', status: security?.otpEnabled },
                  { label: 'Profile Completed', status: security?.profileCompleted }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/[0.01] px-3 py-2 rounded-xl border border-white/[0.02]">
                    <span className="text-slate-300">{item.label}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {item.status ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {security?.recommendations && security.recommendations.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-2">Security Recommendations</span>
                  <div className="space-y-1.5">
                    {security.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="text-[10px] text-slate-400 flex items-start gap-1.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                        <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 5: Beneficiary Management Center */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Beneficiary Center</h3>
                <p className="text-xs text-slate-400">Total active beneficiaries: {beneficiaryInfo?.totalBeneficiaries ?? 0}</p>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recently Added</span>
                {!beneficiaryInfo?.recentlyAddedBeneficiaries || beneficiaryInfo.recentlyAddedBeneficiaries.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">No beneficiaries added yet.</div>
                ) : (
                  beneficiaryInfo.recentlyAddedBeneficiaries.slice(0, 3).map((ben: any) => (
                    <div key={ben.id} className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl">
                      <div>
                        <p className="text-xs font-semibold text-white">{ben.name}</p>
                        <p className="text-[9px] text-slate-500">{ben.bankName} • {ben.country}</p>
                      </div>
                      <a
                        href="/send"
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/20 transition-all"
                      >
                        Send
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 11: Notification Center Widget */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Notifications Tray</h3>
                <Bell size={16} className="text-slate-400" />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">All notifications caught up!</div>
                ) : (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] flex justify-between gap-2 items-start">
                      <div>
                        <p className="text-xs text-slate-300">{notif.message}</p>
                        <span className="text-[9px] text-slate-500">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <button
                        onClick={() => handleMarkNotifRead(notif.id)}
                        className="text-[9px] text-cyan-400 hover:underline flex-shrink-0"
                      >
                        Mark Read
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 13: Achievements & Badges Center */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Gamification Badges</h3>
                <p className="text-xs text-slate-400">Unlock awards for platform trust milestones</p>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer relative group ${
                      badge.unlocked
                        ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-cyan-500/30'
                        : 'bg-white/[0.01] border-white/[0.04] opacity-30'
                    }`}
                  >
                    <Award className={`w-6 h-6 ${badge.unlocked ? 'text-cyan-400' : 'text-slate-600'}`} />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 text-white text-[10px] p-2.5 rounded-xl border border-white/[0.08] shadow-2xl whitespace-nowrap z-50">
                      <p className="font-bold text-cyan-400">{badge.name}</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">{badge.desc}</p>
                      <p className="text-[8px] mt-1 text-slate-500">{badge.unlocked ? '✓ Completed' : '✗ Locked'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Receipt Center */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Receipt Center</h3>
                <p className="text-xs text-slate-400">Inspect or download recent payment files</p>
              </div>

              <div className="space-y-2 bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl max-h-56 overflow-y-auto">
                {recentReceipts.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">No receipts available for download.</div>
                ) : (
                  recentReceipts.map((rcpt: any) => (
                    <div key={rcpt.id} className="flex justify-between items-center text-xs border-b border-white/[0.04] pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-bold text-white">{rcpt.receiptNumber}</p>
                        <p className="text-[9px] text-slate-500">${(rcpt.transaction?.amount ?? rcpt.payment?.amount ?? 0).toFixed(2)} • {rcpt.createdTimestamp ? new Date(rcpt.createdTimestamp).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handlePrintReceipt(rcpt.id)}
                          title="Print Receipt"
                          className="p-1 rounded bg-white/[0.04] hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 transition-all"
                        >
                          <Printer size={12} />
                        </button>
                        <button
                          onClick={() => handleDownloadReceiptPdf(rcpt.id)}
                          title="Download PDF"
                          className="p-1 rounded bg-white/[0.04] hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 transition-all"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 14: Reporting Export Center */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Reporting Center</h3>
                <p className="text-xs text-slate-400">Generate and export transaction activity digests</p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  'Transaction Report',
                  'Beneficiary Report',
                  'Monthly Summary'
                ].map((report, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl">
                    <span className="font-semibold text-white">{report}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExport('csv', report)}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-[10px] font-bold text-cyan-400 transition-all"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel', report)}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-[10px] font-bold text-cyan-400 transition-all"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => handleExport('pdf', report)}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.06] hover:border-cyan-500/30 text-[10px] font-bold text-cyan-400 transition-all"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Financial Insights & Widget */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">Financial Intelligence</h3>
                <p className="text-xs text-slate-400">Dynamic system telemetry and value indicators</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Average Transfer Amount:</span>
                  <span className="text-white font-bold">$ {insights?.averageTransferAmount?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Largest Transfer Value:</span>
                  <span className="text-white font-bold">$ {insights?.largestTransfer?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Smallest Transfer Value:</span>
                  <span className="text-white font-bold">$ {insights?.smallestTransfer?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Processing Fees Saved:</span>
                  <span className="text-emerald-400 font-bold">$ {insights?.totalProcessingFees?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Foreign Exchange Gain:</span>
                  <span className="text-emerald-400 font-bold">$ {insights?.totalForeignExchangeGain?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between bg-white/[0.01] p-2.5 rounded-xl border border-white/[0.02]">
                  <span className="text-slate-400">Estimated Annual Volume:</span>
                  <span className="text-white font-bold">$ {insights?.estimatedAnnualTransferVolume?.toFixed(2) ?? '0.00'}</span>
                </div>
              </div>

              {/* Dynamic generated insights */}
              {insights?.insights && (
                <div className="pt-2 border-t border-white/[0.04] space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Active Insights</span>
                  <div className="space-y-1.5">
                    {insights.insights.map((ins: string, idx: number) => (
                      <p key={idx} className="text-[10px] text-slate-400 bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5" />
                        {ins}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
