import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, getUserById } from '../api';
import type { User } from '../types';
import { Globe, ArrowRight, Eye, EyeOff } from 'lucide-react';
import OtpVerification from '../components/OtpVerification';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [mobile, setMobile] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginUser({ email, password }) as any;
      if (res.otpRequired) {
        setUserId(res.userId);
        setMobile(res.mobile);
        setOtpRequired(true);
      } else {
        login(res as User);
        navigate(res.role === 'ADMIN' ? '/admin' : '/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifySuccess = async (res?: any) => {
    if (!userId) return;
    try {
      if (res && res.user) {
        login(res.user);
        navigate(res.user.role === 'ADMIN' ? '/admin' : '/dashboard');
      } else {
        const user = await getUserById(userId) as User;
        login(user);
        navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve user profile after verification');
      setOtpRequired(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060c1a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {otpRequired && userId ? (
          <OtpVerification
            userId={userId}
            mobile={mobile}
            purpose="LOGIN"
            onVerifySuccess={handleOtpVerifySuccess}
            onCancel={() => setOtpRequired(false)}
          />
        ) : (
          <>
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                <Globe size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-2xl tracking-tight">PaySphere</span>
            </div>

            {/* Card */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-md">
              <h1 className="text-white text-2xl font-semibold mb-1">Welcome back</h1>
              <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.07] transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Sign In <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <div className="relative flex py-4 items-center justify-center">
                <div className="flex-grow border-t border-white/[0.08]"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider font-semibold">Or continue with</span>
                <div className="flex-grow border-t border-white/[0.08]"></div>
              </div>

              <button
                type="button"
                id="google-login-btn"
                onClick={handleGoogleSignIn}
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/[0.08] font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition-all duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.973 11.973 0 0 0 12 0C7.305 0 3.236 2.59 1.136 6.423l4.13 3.342z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M1.136 6.423a12.012 12.012 0 0 0 0 11.154l4.13-3.342a7.042 7.042 0 0 1 0-4.47l-4.13-3.342z"
                  />
                  <path
                    fill="#4285F4"
                    d="M12 24c3.245 0 5.973-1.077 7.964-2.923l-3.873-3c-1.127.755-2.564 1.209-4.091 1.209-3.155 0-5.827-2.127-6.782-5.027l-4.13 3.341c2.1 3.832 6.17 6.4 10.912 6.4z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 12c0-.855-.077-1.682-.218-2.482H12v4.691h6.727A5.764 5.764 0 0 1 12 18.091c-3.155 0-5.827-2.127-6.782-5.027L1.136 17.577C3.236 21.41 7.305 24 12 24c4.695 0 8.764-2.59 10.864-6.423L24 12z"
                  />
                </svg>
                Continue with Google
              </button>

              <p className="text-slate-400 text-sm text-center mt-5">
                Don't have an account?{' '}
                <button onClick={() => navigate('/register')} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Create one
                </button>
              </p>
            </div>

            <p className="text-center text-slate-600 text-xs mt-6">
              Admin login: use role ADMIN account
            </p>
          </>
        )}
      </div>

    </div>
  );
}
