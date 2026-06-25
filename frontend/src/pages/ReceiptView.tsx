import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReceiptById } from '../api';
import DashboardLayout from '../components/DashboardLayout';
import { Globe, Download, Printer, ArrowLeft, CheckCircle2, FileText } from 'lucide-react';

interface ReceiptDetails {
  id: number;
  receiptNumber: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  transactionId: number;
  paymentId: string;
  orderId: string;
  transferRequestId: number;
  beneficiaryName: string;
  amountSent: number;
  exchangeRate: number;
  currencySent: string;
  currencyReceived: string;
  transactionFee: number;
  totalAmountPaid: number;
  paymentMethod: string;
  createdTimestamp: string;
  status: string;
  qrCodeBase64: string;
  receiptPdfUrl: string;
}

export default function ReceiptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getReceiptById(parseInt(id))
        .then((data: any) => {
          setReceipt(data);
          setError(null);
        })
        .catch((err: any) => {
          console.error(err);
          setError(err.message || 'Failed to load receipt details.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDownload = async () => {
    if (!receipt) return;
    try {
      const storedUser = localStorage.getItem('paysphere_user');
      let token = '';
      if (storedUser) {
        token = JSON.parse(storedUser).token || '';
      }
      const response = await fetch(`http://localhost:8081/api/receipts/${receipt.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to retrieve PDF file bytes');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.receiptNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('Error downloading PDF: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[500px]">
          <p className="text-slate-400 text-sm">Fetching receipt registry information...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !receipt) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-xl mx-auto space-y-6">
          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={16} /> Back to Transactions
          </button>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-4">
            <p className="text-red-400 font-medium">{error || 'Receipt not found'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formattedTxId = `TXN_PS_${receipt.transactionId.toString().padStart(6, '0')}`;
  const formattedDate = new Date(receipt.createdTimestamp).toLocaleString();

  return (
    <DashboardLayout>
      {/* Dynamic Printing Style Tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border-slate {
            border-color: #cbd5e1 !important;
          }
          .print-bg-slate {
            background-color: #f8fafc !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-slate {
            color: #475569 !important;
          }
          .print-text-cyan {
            color: #0891b2 !important;
          }
          .print-text-emerald {
            color: #059669 !important;
          }
        }
      `}</style>

      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {/* Navigation & Actions toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center no-print">
          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={16} /> Back to Transaction History
          </button>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-sm transition-all hover:bg-white/[0.02]"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              id="download-pdf-btn"
              onClick={handleDownload}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-all"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        {/* Printable Receipt Card */}
        <div
          id="print-area"
          className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-8 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Decorative Background Blob (Hidden during printing) */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none no-print" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/[0.06] pb-6 print-border-slate">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20">
                <Globe size={20} />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-tight print-text-dark">PaySphere</span>
                <p className="text-xs text-slate-500 font-medium">Cross-Border Remittances</p>
              </div>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest print-text-cyan">Payment Receipt</h2>
              <p className="text-lg font-mono font-bold text-white print-text-dark">{receipt.receiptNumber}</p>
            </div>
          </div>

          {/* Details sections side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            {/* Customer Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider print-text-slate">Customer Details</h3>
              <div className="space-y-1 print-text-dark">
                <p className="text-white font-semibold text-base print-text-dark">{receipt.firstName} {receipt.lastName}</p>
                <p className="text-slate-400 print-text-slate">{receipt.email}</p>
                <p className="text-slate-400 print-text-slate">{receipt.mobile}</p>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="space-y-3 md:text-right">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider print-text-slate">Receipt Details</h3>
              <div className="space-y-1 print-text-dark">
                <p className="text-slate-400 print-text-slate"><span className="font-medium">Created:</span> {formattedDate}</p>
                <p className="text-slate-400 print-text-slate"><span className="font-medium">Payment Method:</span> {receipt.paymentMethod}</p>
                <div className="md:flex md:justify-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 uppercase tracking-wide print-text-emerald print-border-slate">
                    <CheckCircle2 size={12} /> {receipt.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized transaction table */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider print-text-slate">Transaction Summary</h3>
            <div className="border border-white/[0.06] rounded-2xl overflow-hidden print-border-slate">
              <table className="w-full text-left border-collapse text-sm">
                <tbody className="divide-y divide-white/[0.04] print-text-dark print-bg-slate">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Transaction ID</td>
                    <td className="py-3 px-4 font-mono text-white text-right print-text-dark">{formattedTxId}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Razorpay Order ID</td>
                    <td className="py-3 px-4 font-mono text-white text-right print-text-dark">{receipt.orderId}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Razorpay Payment ID</td>
                    <td className="py-3 px-4 font-mono text-white text-right print-text-dark">{receipt.paymentId}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Transfer Request ID</td>
                    <td className="py-3 px-4 text-white text-right print-text-dark">{receipt.transferRequestId}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Beneficiary Payee</td>
                    <td className="py-3 px-4 text-white text-right print-text-dark">{receipt.beneficiaryName}</td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Amount Remitted</td>
                    <td className="py-3 px-4 text-white text-right print-text-dark font-semibold">
                      {receipt.amountSent.toLocaleString()} {receipt.currencySent}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Conversion Exchange Rate</td>
                    <td className="py-3 px-4 text-white text-right print-text-dark">
                      1 {receipt.currencySent} = {receipt.exchangeRate} {receipt.currencyReceived}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Settlement Received</td>
                    <td className="py-3 px-4 text-cyan-400 text-right font-bold print-text-cyan">
                      {((receipt.amountSent) * receipt.exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {receipt.currencyReceived}
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-medium print-text-slate">Transaction Handling Fee</td>
                    <td className="py-3 px-4 text-white text-right print-text-dark">
                      {receipt.transactionFee} {receipt.currencySent}
                    </td>
                  </tr>
                  <tr className="bg-white/[0.01] print-bg-slate">
                    <td className="py-4 px-4 text-slate-300 font-bold print-text-dark">Total Amount Paid</td>
                    <td className="py-4 px-4 text-cyan-400 text-right text-base font-extrabold print-text-cyan">
                      {receipt.totalAmountPaid.toLocaleString()} {receipt.currencySent}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Code and Info footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/[0.06] pt-6 print-border-slate">
            <div className="text-center sm:text-left space-y-1 max-w-sm">
              <span className="text-white font-semibold text-sm flex items-center gap-1.5 justify-center sm:justify-start print-text-dark">
                <FileText size={15} className="text-cyan-400 print-text-cyan" /> Secure Digital Signature
              </span>
              <p className="text-xs text-slate-500 leading-relaxed print-text-slate">
                This is a computer-generated official payment invoice and does not require a physical signature. Details are hashed and registered on the PaySphere KYC Ledger.
              </p>
            </div>
            {receipt.qrCodeBase64 && (
              <div className="text-center space-y-1.5">
                <div className="bg-white p-2 rounded-xl border border-white/[0.08] inline-block shadow-lg print-border-slate">
                  <img
                    src={`data:image/png;base64,${receipt.qrCodeBase64}`}
                    alt="Receipt QR Code Verification"
                    className="w-24 h-24 sm:w-28 sm:h-28"
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-500 print-text-slate">SCAN TO VERIFY DETAILS</p>
              </div>
            )}
          </div>

          {/* Footer terms */}
          <div className="border-t border-white/[0.06] pt-4 text-center space-y-1 text-[10px] text-slate-600 print-text-slate print-border-slate">
            <p>Support contact: support@paysphere.com | Terms and Conditions apply.</p>
            <p>Subject to global AML compliance checks. Settlements route through authorized corresponding banking networks.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
