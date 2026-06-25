import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBeneficiaries, getExchangeRate, createTransferRequest, createPayment, createRazorpayOrder, validateOtp } from '../api';
import type { Beneficiary } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import OtpVerification from '../components/OtpVerification';

export default function Send() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneId, setSelectedBeneId] = useState('');
  const [form, setForm] = useState({ sourceCurrency: 'USD', destinationCurrency: 'INR', amount: '1000', purpose: 'Family Support' });
  const [rate, setRate] = useState<number | null>(null);
  const fee = 10; // Standard flat fee
  const [receiverAmount, setReceiverAmount] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [transferId, setTransferId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [createdReceiptId, setCreatedReceiptId] = useState<number | null>(null);


  useEffect(() => {
    if (user) {
      getBeneficiaries(user.id)
        .then((data: any) => setBeneficiaries(data))
        .catch(console.error);
    }
  }, [user]);

  // Dynamically update exchange rate and conversion preview when values change
  useEffect(() => {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setLoadingRate(true);
    getExchangeRate(form.sourceCurrency, form.destinationCurrency)
      .then((res: any) => {
        setRate(res.rate);
        setReceiverAmount(parseFloat(form.amount) * res.rate);
      })
      .catch(() => {
        // Fallback mock rate
        const r = form.sourceCurrency === 'USD' && form.destinationCurrency === 'INR' ? 83.5 : 1.25;
        setRate(r);
        setReceiverAmount(parseFloat(form.amount) * r);
      })
      .finally(() => setLoadingRate(false));
  }, [form.sourceCurrency, form.destinationCurrency, form.amount]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedBeneId) {
      setError('Please select a beneficiary payee.');
      return;
    }
    setLoadingSubmit(true);

    try {
      const payload = {
        user: { id: user?.id },
        beneficiary: { id: parseInt(selectedBeneId) },
        sourceCurrency: form.sourceCurrency,
        destinationCurrency: form.destinationCurrency,
        amount: parseFloat(form.amount),
        purpose: form.purpose,
        exchangeRate: rate || 1.0,
        transferFee: fee,
        receiverAmount,
        status: 'PENDING_OTP'
      };

      const result: any = await createTransferRequest(payload);
      setTransferId(result.id);
      setStep(2); // Move to Payment / OTP step
    } catch (err: any) {
      setError(err.message || 'Failed to create transfer request');
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handlePaymentSettle = async () => {
    setError('');
    setLoadingSubmit(true);

    try {
      if (!transferId) {
        throw new Error('No active transfer request found');
      }

      const totalAmount = parseFloat(form.amount) + fee;

      // Step 1: Create a real Razorpay order via our backend
      const requestUrl = 'http://localhost:8081/api/razorpay/orders';
      const requestPayload = {
        amount: totalAmount,
        currency: form.sourceCurrency,
        transferRequestId: transferId,
      };

      console.log('[Razorpay] Outbound Order Request URL:', requestUrl);
      console.log('[Razorpay] Outbound Order Request Payload:', JSON.stringify(requestPayload, null, 2));

      let orderRes: any;
      try {
        orderRes = await createRazorpayOrder(requestPayload);
        console.log('[Razorpay] API Order Success Response:', JSON.stringify(orderRes, null, 2));
      } catch (apiErr: any) {
        console.error('[Razorpay] API Order Failure. Full Error Message:', apiErr.message || apiErr);
        throw apiErr;
      }

      const razorpayOrderId = orderRes.orderId;
      const razorpayKeyId = orderRes.keyId;
      const amountInSmallest = orderRes.amount;

      if (!razorpayOrderId) {
        throw new Error('Failed to create Razorpay order. No order ID returned.');
      }

      console.log('[Razorpay] Order created: orderId=', razorpayOrderId, 'amount=', amountInSmallest);

      // Step 2: Open Razorpay Checkout popup
      setLoadingSubmit(false); // Re-enable UI while Checkout is open

      await new Promise<void>((resolve, reject) => {
        const options: RazorpayOptions = {
          key: razorpayKeyId,
          amount: amountInSmallest,
          currency: orderRes.currency || form.sourceCurrency,
          name: 'PaySphere',
          description: 'Cross-Border Settlement Payout',
          order_id: razorpayOrderId,
          handler: async (response) => {
            // Step 3: Razorpay payment succeeded — forward to our backend
            console.log('[Razorpay] Payment success callback received:');
            console.log('  razorpay_order_id:', response.razorpay_order_id);
            console.log('  razorpay_payment_id:', response.razorpay_payment_id);
            console.log('  razorpay_signature:', response.razorpay_signature);

            setLoadingSubmit(true);
            try {
              const paymentPayload = {
                transferRequest: { id: transferId },
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                amount: totalAmount,
                status: 'SUCCESS',
              };
              console.log('[Razorpay] Sending payment payload to backend for verification:', paymentPayload);
              const payResult: any = await createPayment(paymentPayload);
              console.log('[Razorpay] Verification success. Transaction status updated. Result:', payResult);
              setError(null);
              setCreatedReceiptId(payResult.receiptId || null);
              setStep(3); // Completed step
              resolve();
            } catch (err: any) {
              console.error('[Razorpay] Backend payment capture/verification failed:', err);
              setError(err.message || 'Payment verification failed on server.');
              reject(err);
            } finally {
              setLoadingSubmit(false);
            }
          },
          prefill: {
            name: user ? `${user.firstName} ${user.lastName}` : '',
            email: user?.email || '',
            contact: user?.mobile || '',
          },
          theme: {
            color: '#06b6d4',
          },
          modal: {
            ondismiss: () => {
              console.log('[Razorpay] Checkout dismissed by user');
              setError('Payment cancelled. You can try again.');
              reject(new Error('Checkout dismissed'));
            },
          },
        };

        try {
          const rzp = new Razorpay(options);
          console.log('[Razorpay] Opening checkout with configuration options:', {
            key: options.key,
            amount: options.amount,
            currency: options.currency,
            name: options.name,
            description: options.description,
            order_id: options.order_id,
            prefill: options.prefill
          });
          rzp.on('payment.failed', (failResponse: any) => {
            console.error('[Razorpay] Payment failed full response:', JSON.stringify(failResponse, null, 2));
            if (failResponse.error) {
              console.error('[Razorpay] Failed Error Code:', failResponse.error.code);
              console.error('[Razorpay] Failed Error Description:', failResponse.error.description);
              console.error('[Razorpay] Failed Error Source:', failResponse.error.source);
              console.error('[Razorpay] Failed Error Step:', failResponse.error.step);
              console.error('[Razorpay] Failed Error Reason:', failResponse.error.reason);
              console.error('[Razorpay] Failed Metadata:', JSON.stringify(failResponse.error.metadata, null, 2));
            }
            setError(`Payment failed: ${failResponse.error?.description || 'Unknown error'}`);
            reject(new Error(failResponse.error?.description || 'Unknown error'));
          });
          rzp.open();
        } catch (err) {
          console.error('[Razorpay] Failed to open checkout:', err);
          setError('Failed to open Razorpay payment gateway. Please try again.');
          reject(err);
        }
      });

    } catch (err: any) {
      if (err.message !== 'Checkout dismissed') {
        setError(err.message || 'Payment failed.');
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Send Money</h1>
          <p className="text-slate-400 text-sm mt-1">Send secure global transfers with transparent exchange rates.</p>
        </div>

        {/* Steps header */}
        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-xs font-semibold uppercase tracking-wider">
          <span className={step === 1 ? 'text-cyan-400' : 'text-slate-500'}>1. Setup Transfer</span>
          <ArrowRight size={14} className="text-slate-600" />
          <span className={step === 2 ? 'text-cyan-400' : 'text-slate-500'}>2. Confirm Payment</span>
          <ArrowRight size={14} className="text-slate-600" />
          <span className={step === 3 ? 'text-cyan-400' : 'text-slate-500'}>3. Done</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleCreateTransfer} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
            <h2 className="text-white font-semibold text-lg">Transfer Parameters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Select Payee Beneficiary</label>
                <select
                  value={selectedBeneId}
                  onChange={e => setSelectedBeneId(e.target.value)}
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  required
                >
                  <option value="" className="bg-[#0b0f1e]">-- Choose Payee --</option>
                  {beneficiaries.map(b => (
                    <option key={b.id} value={b.id} className="bg-[#0b0f1e]">{b.name} ({b.bankName} - {b.country})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Purpose of Remittance</label>
                <input
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  placeholder="e.g. Family maintenance, Education"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Source Currency</label>
                <select
                  value={form.sourceCurrency}
                  onChange={e => setForm(f => ({ ...f, sourceCurrency: e.target.value }))}
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="USD" className="bg-[#0b0f1e]">USD</option>
                  <option value="EUR" className="bg-[#0b0f1e]">EUR</option>
                  <option value="GBP" className="bg-[#0b0f1e]">GBP</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Destination Currency</label>
                <select
                  value={form.destinationCurrency}
                  onChange={e => setForm(f => ({ ...f, destinationCurrency: e.target.value }))}
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="INR" className="bg-[#0b0f1e]">INR</option>
                  <option value="PHP" className="bg-[#0b0f1e]">PHP</option>
                  <option value="MXN" className="bg-[#0b0f1e]">MXN</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Amount to Send</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Live conversion rate:</span>
                <span className="text-white font-medium">1 {form.sourceCurrency} = {loadingRate ? '...' : rate} {form.destinationCurrency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Transfer flat fee:</span>
                <span className="text-white font-medium">${fee}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/[0.06] pt-3">
                <span className="text-slate-300 font-semibold">Total payout value:</span>
                <span className="text-cyan-400 font-bold">{loadingRate ? '...' : receiverAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {form.destinationCurrency}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loadingSubmit}
                className="bg-cyan-500 text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-cyan-400 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loadingSubmit ? 'Saving...' : <>Continue Transfer <ArrowRight size={16} /></>}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold text-lg">Transfer Settle Preview</h2>
              <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transfer Request ID:</span>
                  <span className="text-slate-200 font-medium">{transferId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount due:</span>
                  <span className="text-slate-200 font-medium">${parseFloat(form.amount) + fee} {form.sourceCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payee destination:</span>
                  <span className="text-slate-200 font-medium">{form.destinationCurrency}</span>
                </div>
              </div>
            </div>

            <OtpVerification
              userId={user?.id || 0}
              mobile={user?.mobile || ''}
              purpose="TRANSFER"
              onVerify={async (otpVal) => {
                await validateOtp(transferId!, otpVal);
              }}
              onVerifySuccess={handlePaymentSettle}
              onCancel={() => setStep(1)}
            />
          </div>
        )}


        {step === 3 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle2 size={64} className="text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Transfer Initiated Successfully!</h2>
              {createdReceiptId ? (
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Your payment was verified. An official transaction receipt with a QR code has been generated.
                </p>
              ) : (
                <p className="text-amber-400 text-sm max-w-md mx-auto">
                  Your payment was verified successfully. However, receipt generation encountered an error. You can regenerate the receipt manually from your Transaction registry.
                </p>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {createdReceiptId && (
                <button
                  id="view-receipt-success-btn"
                  onClick={() => navigate(`/receipts/${createdReceiptId}`)}
                  className="bg-cyan-500 text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-cyan-400 transition-all"
                >
                  View Receipt / Invoice
                </button>
              )}
              <button
                onClick={() => { setStep(1); setSelectedBeneId(''); setCreatedReceiptId(null); }}
                className="px-6 py-2.5 border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-sm transition-all hover:bg-white/[0.02]"
              >
                Send Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 border border-white/[0.08] text-slate-300 hover:text-white rounded-xl text-sm transition-all hover:bg-white/[0.02]"
              >
                View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
