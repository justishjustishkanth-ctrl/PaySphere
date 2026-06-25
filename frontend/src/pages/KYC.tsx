import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitKYC, getAllKYC } from '../api';
import type { KYC } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { ShieldCheck, ShieldAlert, FileCheck2, Loader2 } from 'lucide-react';

export default function KYCPage() {
  const { user } = useAuth();
  const [kycRecord, setKycRecord] = useState<KYC | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ pan: '', aadhaar: '', passport: '', address: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchKYC = async () => {
    if (!user) return;
    try {
      // Find KYC for current user
      const list: any = await getAllKYC();
      const userKYC = list.find((k: KYC) => k.user.id === user.id);
      if (userKYC) {
        setKycRecord(userKYC);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYC();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        user: { id: user?.id },
        status: 'PENDING'
      };
      const result = await submitKYC(payload) as KYC;
      setKycRecord(result);
    } catch (err: any) {
      setError(err.message || 'KYC submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <Loader2 size={32} className="text-cyan-400 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Know Your Customer (KYC)</h1>
          <p className="text-slate-400 text-sm mt-1">Regulatory verification is required for all high-value outbound remittance channels.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {kycRecord ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                kycRecord.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                kycRecord.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                {kycRecord.status === 'APPROVED' ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Verification Status: {kycRecord.status}</h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {kycRecord.status === 'APPROVED' && 'Your KYC is verified. Unlimited global transactions are active.'}
                  {kycRecord.status === 'PENDING' && 'Document verification is currently under review by compliance team.'}
                  {kycRecord.status === 'UNDER_REVIEW' && 'Our team is verifying details. ETA within 24 hours.'}
                  {kycRecord.status === 'REJECTED' && 'The submitted files failed regulatory checks. Please resubmit.'}
                </p>
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                <span className="text-slate-400">PAN Number:</span>
                <span className="text-white font-medium">{kycRecord.pan}</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                <span className="text-slate-400">Aadhaar UID:</span>
                <span className="text-white font-medium">•••• •••• {kycRecord.aadhaar.slice(-4)}</span>
              </div>
              {kycRecord.passport && (
                <div className="flex justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                  <span className="text-slate-400">Passport No:</span>
                  <span className="text-white font-medium">{kycRecord.passport}</span>
                </div>
              )}
              <div className="flex justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] md:col-span-2">
                <span className="text-slate-400">Registered Address:</span>
                <span className="text-white font-medium">{kycRecord.address}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-6">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <FileCheck2 size={20} className="text-cyan-400" /> Compliance Document Submission
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Permanent Account Number (PAN)</label>
                <input
                  name="pan"
                  value={form.pan}
                  onChange={handleChange}
                  required
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Aadhaar (UIDAI 12-Digit Number)</label>
                <input
                  name="aadhaar"
                  value={form.aadhaar}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 123456789012"
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Passport Number (Optional)</label>
                <input
                  name="passport"
                  value={form.passport}
                  onChange={handleChange}
                  placeholder="e.g. Z1234567"
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Permanent Residential Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Enter house details, street, city, state, postal code."
                  className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-cyan-500 text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-cyan-400 transition-all disabled:opacity-50"
              >
                {submitting ? 'Uploading Documents...' : 'Submit KYC Check'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
