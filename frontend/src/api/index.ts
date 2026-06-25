const BASE = 'http://localhost:8081/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
  if (options?.headers) {
    const customHeaders = new Headers(options.headers);
    customHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
    } catch {
      // text was not JSON — use as-is
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// Users
export const registerUser = (data: object, options?: RequestInit) => request('/users', { method: 'POST', body: JSON.stringify(data), ...options });
export const confirmRegistration = (data: object) => request('/users/register-confirm', { method: 'POST', body: JSON.stringify(data) });
export const loginUser = (data: object) => request('/users/login', { method: 'POST', body: JSON.stringify(data) });
export const getAllUsers = () => request('/users');
export const getUserById = (id: number) => request(`/users/${id}`);


// KYC
export const submitKYC = (data: object) => request('/kyc', { method: 'POST', body: JSON.stringify(data) });
export const getAllKYC = (status?: string) => request(`/kyc${status ? `?status=${status}` : ''}`);
export const updateKYCStatus = (id: number, status: string) => request(`/kyc/${id}/status?status=${status}`, { method: 'PUT' });

// Beneficiaries
export const addBeneficiary = (data: object) => request('/beneficiaries', { method: 'POST', body: JSON.stringify(data) });
export const getBeneficiaries = (userId?: number) => request(`/beneficiaries${userId ? `?userId=${userId}` : ''}`);
export const updateBeneficiary = (id: number, data: object) => request(`/beneficiaries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBeneficiary = (id: number) => request(`/beneficiaries/${id}`, { method: 'DELETE' });

// Exchange Rates
export const getExchangeRate = (source: string, destination: string) =>
  request(`/exchange-rates?source=${source}&destination=${destination}`);

// Transfer Requests
export const createTransferRequest = (data: object) => request('/transfer-requests', { method: 'POST', body: JSON.stringify(data) });
export const getTransferRequests = (userId?: number) => request(`/transfer-requests${userId ? `?userId=${userId}` : ''}`);

// Payments
export const createPayment = (data: object) => request('/payments', { method: 'POST', body: JSON.stringify(data) });
export const getAllPayments = () => request('/payments');

// Razorpay Orders
export const createRazorpayOrder = (data: object) => request('/razorpay/orders', { method: 'POST', body: JSON.stringify(data) });

// OTP Validation
export const validateOtp = (transferRequestId: number, otp: string) =>
  request(`/transfer-requests/${transferRequestId}/otp/validate`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });

// Salesforce Sync
export const triggerSalesforceSync = () => request('/sync/salesforce', { method: 'POST' });
export const getSalesforceSyncStatus = () => request('/sync/salesforce/status');

// Transactions
export const getTransactions = (userId?: number) => request(`/transactions${userId ? `?userId=${userId}` : ''}`);

// Notifications
export const getNotifications = (userId: number, unreadOnly?: boolean) =>
  request(`/notifications?userId=${userId}${unreadOnly ? '&unreadOnly=true' : ''}`);
export const markNotificationRead = (id: number) => request(`/notifications/${id}/read`, { method: 'PUT' });

// Fraud Logs
export const getFraudLogs = (userId?: number) => request(`/fraud-logs${userId ? `?userId=${userId}` : ''}`);

// Audit Logs
export const getAuditLogs = (username?: string) => request(`/audit-logs${username ? `?username=${username}` : ''}`);
export const createAuditLog = (data: object) => request('/audit-logs', { method: 'POST', body: JSON.stringify(data) });

// Receipts
export const getReceipts = (userId?: number) => request(`/receipts${userId ? `?userId=${userId}` : ''}`);
export const getReceiptById = (id: number) => request(`/receipts/${id}`);
export const generateReceipt = (transactionId: number) =>
  request('/receipts/generate', {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });

export const googleLoginSync = (idToken: string) =>
  request('/users/google-login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

// Dashboard APIs
export const getDashboardOverview = (userId: number) => request(`/dashboard/overview?userId=${userId}`);
export const getDashboardAnalytics = (userId: number) => request(`/dashboard/analytics?userId=${userId}`);
export const getDashboardExchangeRates = () => request('/dashboard/exchange-rates');
export const getDashboardSecurity = (userId: number) => request(`/dashboard/security?userId=${userId}`);
export const getDashboardProfileStrength = (userId: number) => request(`/dashboard/profile-strength?userId=${userId}`);
export const getDashboardRecentActivity = (userId: number, query = '', filter = 'all', page = 0) =>
  request(`/dashboard/recent-activity?userId=${userId}&query=${encodeURIComponent(query)}&filter=${filter}&page=${page}&size=5`);
export const getDashboardNotifications = (userId: number) => request(`/dashboard/notifications?userId=${userId}`);
export const getDashboardBeneficiaries = (userId: number) => request(`/dashboard/beneficiaries?userId=${userId}`);
export const getDashboardReceipts = (userId: number) => request(`/dashboard/receipts?userId=${userId}`);
export const getDashboardInsights = (userId: number) => request(`/dashboard/insights?userId=${userId}`);

// Receipt specific recent endpoint
export const getRecentReceipts = (userId: number) => request(`/receipts/recent?userId=${userId}`);


// ── Admin Portal APIs ──────────────────────────────────────────────────────────
export const getAdminDashboard = () => request('/admin/dashboard');
export const getAdminUsers = () => request('/admin/users');
export const updateAdminUser = (id: number, data: object) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleAdminUserLock = (id: number) => request(`/admin/users/${id}/toggle-lock`, { method: 'POST' });
export const deleteAdminUser = (id: number) => request(`/admin/users/${id}`, { method: 'DELETE' });
export const getAdminKYC = () => request('/admin/kyc');
export const approveAdminKYC = (id: number) => request(`/admin/kyc/${id}/approve`, { method: 'PUT' });
export const rejectAdminKYC = (id: number) => request(`/admin/kyc/${id}/reject`, { method: 'PUT' });
export const getAdminTransactions = (filters?: { status?: string; amount?: number; userEmail?: string }) => {
  let query = '';
  if (filters) {
    const parts = [];
    if (filters.status) parts.push(`status=${encodeURIComponent(filters.status)}`);
    if (filters.amount) parts.push(`amount=${filters.amount}`);
    if (filters.userEmail) parts.push(`userEmail=${encodeURIComponent(filters.userEmail)}`);
    if (parts.length > 0) query = '?' + parts.join('&');
  }
  return request(`/admin/transactions${query}`);
};
export const flagAdminTransaction = (id: number, reason: string) => request(`/admin/transactions/${id}/flag`, { method: 'POST', body: JSON.stringify({ reason }) });
export const getAdminPayments = () => request('/admin/payments');
export const getAdminReceipts = () => request('/admin/receipts');
export const getAdminFraudLogs = () => request('/admin/fraud-logs');
export const getAdminAuditLogs = () => request('/admin/audit-logs');
export const getAdminSettings = () => request('/admin/settings');
export const updateAdminSettings = (data: object) => request('/admin/settings', { method: 'POST', body: JSON.stringify(data) });



