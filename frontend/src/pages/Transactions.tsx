import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTransactions, getReceipts, generateReceipt } from '../api';
import type { Transaction } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { ArrowUpRight, ArrowDownLeft, Search, FileText, Download, Printer, Eye, Loader2 } from 'lucide-react';

interface ReceiptDetails {
  id: number;
  receiptNumber: string;
  receiptPdfUrl: string;
  createdTimestamp: string;
  transaction: {
    id: number;
    amount: number;
    currency: string;
  };
}

export default function Transactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Transaction[]>([]);
  const [receipts, setReceipts] = useState<ReceiptDetails[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'RECEIPTS'>('TRANSACTIONS');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchRegistry = () => {
    if (user) {
      setLoading(true);
      Promise.all([
        getTransactions(user.id),
        getReceipts(user.id)
      ])
        .then(([txs, rcpts]: [any, any]) => {
          setList(txs);
          setReceipts(rcpts);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [user]);

  const handleGenerateReceipt = async (transactionId: number) => {
    setActionLoadingId(transactionId);
    try {
      const receipt: any = await generateReceipt(transactionId);
      // Refresh registry
      const rcpts = await getReceipts(user?.id) as ReceiptDetails[];
      setReceipts(rcpts);
      // Navigate to receipt
      navigate(`/receipts/${receipt.id}`);
    } catch (err: any) {
      alert('Failed to generate receipt: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadPdf = async (receiptId: number, receiptNum: string) => {
    try {
      const storedUser = localStorage.getItem('paysphere_user');
      let token = '';
      if (storedUser) {
        token = JSON.parse(storedUser).token || '';
      }
      const response = await fetch(`http://localhost:8081/api/receipts/${receiptId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download PDF file');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading PDF: ' + err.message);
    }
  };

  const filteredTransactions = list.filter(t => {
    const statusMatch = filterStatus === 'ALL' || t.status.toUpperCase() === filterStatus.toUpperCase();
    const searchMatch = t.amount.toString().includes(search) || t.currency.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  const filteredReceipts = receipts.filter(r => {
    const searchMatch =
      r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.transaction?.amount.toString().includes(search) ||
      r.transaction?.currency.toLowerCase().includes(search.toLowerCase());
    return searchMatch;
  });

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Transaction & Receipts Registry</h1>
            <p className="text-slate-400 text-sm mt-1">Audit log of all your processed payments, receipts, and invoices.</p>
          </div>
        </div>

        {/* Tab Sub-navigation */}
        <div className="flex gap-6 border-b border-white/[0.06] pb-0">
          <button
            onClick={() => { setActiveTab('TRANSACTIONS'); setSearch(''); }}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
              activeTab === 'TRANSACTIONS' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            All Transactions
          </button>
          <button
            id="receipts-tab-btn"
            onClick={() => { setActiveTab('RECEIPTS'); setSearch(''); }}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
              activeTab === 'RECEIPTS' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Receipt History
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'TRANSACTIONS' ? "Search by amount, currency..." : "Search receipt number, currency..."}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {activeTab === 'TRANSACTIONS' && (
            <div className="flex gap-2">
              {['ALL', 'COMPLETED', 'SUCCESS', 'PENDING', 'FAILED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                    filterStatus === status
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      : 'text-slate-400 border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'TRANSACTIONS' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Direction / Details</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Gross Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6 text-right">Receipt Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                        Loading transaction registry...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                        No matching records found.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(t => {
                      const matchedReceipt = receipts.find(r => r.transaction?.id === t.id);
                      const isSuccess = t.status === 'COMPLETED' || t.status === 'SUCCESS';
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {isSuccess ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <p className="text-white font-medium">Cross-Border Remittance</p>
                                <p className="text-xs text-slate-500">Completed payment channel</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-300">
                            {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-4 px-6 font-semibold text-white">
                            {t.amount} {t.currency}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                            TXN_PS_{t.id.toString().padStart(6, '0')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isSuccess ? (
                              matchedReceipt ? (
                                <button
                                  onClick={() => navigate(`/receipts/${matchedReceipt.id}`)}
                                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all flex items-center gap-1.5 justify-end ml-auto"
                                >
                                  <FileText size={14} /> View Receipt
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleGenerateReceipt(t.id)}
                                  disabled={actionLoadingId === t.id}
                                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-all flex items-center gap-1.5 justify-end ml-auto disabled:opacity-50"
                                >
                                  {actionLoadingId === t.id ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" /> Generating...
                                    </>
                                  ) : (
                                    <>
                                      <FileText size={14} /> Generate Receipt
                                    </>
                                  )}
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              /* Receipts tab list */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Receipt Number</th>
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6">Amount Paid</th>
                    <th className="py-4 px-6">Created Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                        Loading receipt history...
                      </td>
                    </tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                        No receipts found.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                        <td className="py-4 px-6 font-semibold text-white font-mono">
                          {r.receiptNumber}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                          TXN_PS_{r.transaction?.id.toString().padStart(6, '0')}
                        </td>
                        <td className="py-4 px-6 font-semibold text-cyan-400">
                          {r.transaction?.amount} {r.transaction?.currency}
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          {new Date(r.createdTimestamp).toLocaleDateString()} {new Date(r.createdTimestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => navigate(`/receipts/${r.id}`)}
                              title="View Receipt"
                              className="p-1 text-slate-400 hover:text-white transition-all"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(r.id, r.receiptNumber)}
                              title="Download PDF"
                              className="p-1 text-slate-400 hover:text-white transition-all"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/receipts/${r.id}`)}
                              title="Print Receipt"
                              className="p-1 text-slate-400 hover:text-white transition-all"
                            >
                              <Printer size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

