import React, { useState, useEffect, useRef } from 'react';
import { verifyOtp, resendOtp } from '../api/otpApi';
import type { OtpPurpose } from '../api/otpApi';
import { KeyRound, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OtpVerificationProps {
  userId: number;
  mobile: string;
  purpose: OtpPurpose;
  onVerifySuccess: (data?: any) => void;
  onCancel?: () => void;
  onVerify?: (otp: string) => Promise<any>;
}

export default function OtpVerification({
  userId,
  mobile,
  purpose,
  onVerifySuccess,
  onCancel,
  onVerify,
}: OtpVerificationProps) {
  const [code, setCode] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes standard expiry countdown
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer for resending
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Start resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, '');
    if (!value) {
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      return;
    }

    const newCode = [...code];
    // Take only the last character if multiple are entered/pasted
    const char = value.substring(value.length - 1);
    newCode[index] = char;
    setCode(newCode);

    // Auto-focus next input
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newCode = [...code];
      if (code[index]) {
        // If current box has content, just clear it
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        // If current box is empty, go to previous box, clear it
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pastedData.length >= 6) {
      const newCode = pastedData.substring(0, 6).split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpString = code.join('');
    if (otpString.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    try {
      if (onVerify) {
        const responseData = await onVerify(otpString);
        setSuccess(true);
        setTimeout(() => {
          onVerifySuccess(responseData);
        }, 1500);
      } else {
        const res = await verifyOtp(userId, mobile, otpString, purpose);
        if (res.success) {
          setSuccess(true);
          setTimeout(() => {
            onVerifySuccess(res);
          }, 1500);
        } else {
          setError(res.message || 'OTP Verification failed');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResending(true);
    try {
      const res = await resendOtp(userId, mobile, purpose);
      if (res.success) {
        setCode(new Array(6).fill(''));
        setCountdown(300);
        setResendCooldown(60); // 60s cooldown before next resend allowed
        inputRefs.current[0]?.focus();
      } else {
        setError(res.message || 'Failed to resend OTP');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  // Mask mobile for display only (e.g. "+918754758789" → "********8789")
  const maskedMobile = mobile && mobile.length >= 4
    ? '*'.repeat(mobile.length - 4) + mobile.slice(-4)
    : mobile;

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-md w-full max-w-md mx-auto space-y-6">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30">
          {success ? (
            <CheckCircle2 className="text-emerald-400 animate-bounce" size={24} />
          ) : (
            <KeyRound className="text-cyan-400" size={24} />
          )}
        </div>
        <h2 className="text-white text-xl font-bold tracking-tight">
          {success ? 'Verified Successfully' : 'Enter Verification Code'}
        </h2>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          {success
            ? 'Access granted, proceeding...'
            : `We sent a 6-digit OTP code to your registered mobile number: ${maskedMobile}`}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="flex justify-center py-6">
          <div className="w-10 h-10 border-3 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-between gap-2">
            {code.map((num, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}

                type="text"
                inputMode="numeric"
                maxLength={1}
                value={num}
                onChange={e => handleChange(e.target, idx)}
                onKeyDown={e => handleKeyDown(e, idx)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-12 h-14 bg-white/[0.05] border border-white/[0.08] focus:border-cyan-500/60 rounded-xl text-center text-xl font-semibold text-white focus:outline-none focus:bg-white/[0.08] transition-all"
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400">
            <div>
              {countdown > 0 ? (
                <span>Code expires in <span className="text-cyan-400 font-mono font-medium">{formatTime(countdown)}</span></span>
              ) : (
                <span className="text-red-400">Code has expired</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : resendCooldown > 0 ? (
                <span>Resend in {resendCooldown}s</span>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Resend Code
                </>
              )}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || code.some(c => !c)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/20"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Proceed'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
