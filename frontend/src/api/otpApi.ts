const BASE = 'http://localhost:8081/api/otp';

async function otpRequest<T>(path: string, body: object): Promise<T> {
  const storedUser = localStorage.getItem('paysphere_user');
  let token = '';
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      token = u.token || '';
    } catch {
      // ignore parsing error
    }
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }
  return data as T;
}

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'TRANSFER' | 'BENEFICIARY' | 'PASSWORD_RESET';

export interface OtpResponse {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

/** Send an OTP to the given mobile number for the given purpose. */
export const sendOtp = (userId: number, mobile: string, purpose: OtpPurpose): Promise<OtpResponse> =>
  otpRequest('/send', { userId, mobile, purpose });

/** Verify the OTP entered by the user. */
export const verifyOtp = (
  userId: number,
  mobile: string,
  otp: string,
  purpose: OtpPurpose
): Promise<OtpVerifyResponse> =>
  otpRequest('/verify', { userId, mobile, otp, purpose });

/** Resend (invalidate old + send new) OTP to the mobile number. */
export const resendOtp = (userId: number, mobile: string, purpose: OtpPurpose): Promise<OtpResponse> =>
  otpRequest('/resend', { userId, mobile, purpose });
