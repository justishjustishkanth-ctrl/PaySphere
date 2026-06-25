import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBeneficiaries, addBeneficiary, deleteBeneficiary } from '../api';
import type { Beneficiary } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import { Plus, Trash2, ShieldCheck, Clock, UserPlus } from 'lucide-react';
import { sendOtp } from '../api/otpApi';
import OtpVerification from '../components/OtpVerification';

export default function Beneficiaries() {
  const { user } = useAuth();
  const [list, setList] = useState<Beneficiary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [form, setForm] = useState({ name: '', country: 'India', bankName: '', accountNumber: '', swiftBic: '', mobile: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchList = () => {
    if (user) {
      getBeneficiaries(user.id)
        .then((data: any) => setList(data))
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchList();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user?.mobile) {
        throw new Error('A registered mobile number is required to authorize beneficiary additions.');
      }
      await sendOtp(user.id, user.mobile, 'BENEFICIARY');
      setShowOtp(true);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger beneficiary verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifySuccess = async () => {
    setLoading(true);
    setError('');
    try {
      await addBeneficiary({
        ...form,
        user: { id: user?.id },
        status: 'APPROVED'
      });
      setSuccess('Beneficiary added successfully!');
      setForm({ name: '', country: 'India', bankName: '', accountNumber: '', swiftBic: '', mobile: '' });
      setShowForm(false);
      setShowOtp(false);
      fetchList();
    } catch (err: any) {
      setError(err.message || 'Failed to add beneficiary payee.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to remove this beneficiary?')) {
      try {
        await deleteBeneficiary(id);
        setList(list.filter(b => b.id !== id));
      } catch (err: any) {
        alert(err.message || 'Failed to delete beneficiary');
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Beneficiaries</h1>
            <p className="text-slate-400 text-sm mt-1">Manage external payees for cross-border transactions.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Plus size={16} />
            Add Payee
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {showForm && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-md">
            {showOtp ? (
              <OtpVerification
                userId={user?.id || 0}
                mobile={user?.mobile || ''}
                purpose="BENEFICIARY"
                onVerifySuccess={handleOtpVerifySuccess}
                onCancel={() => setShowOtp(false)}
              />
            ) : (
              <>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-cyan-400" /> New Payee details
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="Receiver Account Name"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Destination Country</label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="India">India</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Mexico">Mexico</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Bank Name</label>
                    <input
                      name="bankName"
                      value={form.bankName}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="e.g. HDFC Bank, BDO Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Account Number</label>
                    <input
                      name="accountNumber"
                      value={form.accountNumber}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="10-20 Digits Account Number"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">SWIFT / BIC Code</label>
                    <input
                      name="swiftBic"
                      value={form.swiftBic}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="8 or 11 Character Code"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">Mobile Number</label>
                    <input
                      name="mobile"
                      value={form.mobile}
                      onChange={handleChange}
                      required
                      className="w-full bg-[#060c1a]/50 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                      placeholder="+91 / +63 Mobile Number"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-white/[0.08] text-slate-400 hover:text-white rounded-xl text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-cyan-500 text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-cyan-400 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Confirm Payee'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}


        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.length === 0 ? (
            <div className="md:col-span-3 py-16 text-center bg-white/[0.01] border border-white/[0.04] rounded-2xl">
              <p className="text-slate-500 text-sm">No payees registered yet.</p>
            </div>
          ) : (
            list.map(b => (
              <div key={b.id} className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 relative overflow-hidden transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-white font-semibold text-lg">{b.name}</h4>
                      <span className="text-xs text-slate-500">{b.country}</span>
                    </div>
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      b.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {b.status === 'APPROVED' ? <ShieldCheck size={10} /> : <Clock size={10} />}
                      {b.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-400 mb-6">
                    <div className="flex justify-between">
                      <span>Bank:</span>
                      <span className="text-slate-200">{b.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>A/C No:</span>
                      <span className="text-slate-200">{b.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SWIFT:</span>
                      <span className="text-slate-200">{b.swiftBic}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-white/[0.06] pt-4">
                  <span className="text-xs text-slate-500">{b.mobile}</span>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
