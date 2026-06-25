export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password?: string;
  failedAttempts: number;
  locked: boolean;
  role: 'CUSTOMER' | 'ADMIN';
  fullName?: string;
  profilePicture?: string;
  provider?: string;
}


export interface KYC {
  id: number;
  user: User;
  pan: string;
  aadhaar: string;
  passport?: string;
  address: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  documentUrl?: string;
}

export interface Beneficiary {
  id: number;
  user: User;
  name: string;
  country: string;
  bankName: string;
  accountNumber: string;
  swiftBic: string;
  mobile: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ExchangeRate {
  id: number;
  sourceCurrency: string;
  destinationCurrency: string;
  rate: number;
  timestamp: string;
}

export interface TransferRequest {
  id: number;
  user: User;
  beneficiary: Beneficiary;
  sourceCurrency: string;
  destinationCurrency: string;
  amount: number;
  purpose: string;
  exchangeRate: number;
  transferFee: number;
  receiverAmount: number;
  status: 'DRAFT' | 'PENDING_PAYMENT' | 'PROCESSING' | 'APPROVED' | 'COMPLETED' | 'FAILED';
  otp?: string;
  otpGeneratedAt?: string;
}

export interface Payment {
  id: number;
  transferRequest: TransferRequest;
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  status: string;
}

export interface Transaction {
  id: number;
  user: User;
  transferRequest?: TransferRequest;
  payment?: Payment;
  amount: number;
  currency: string;
  status: string;
  timestamp: string;
}

export interface Notification {
  id: number;
  user: User;
  message: string;
  type: string;
  read: boolean;
  timestamp: string;
}

export interface FraudLog {
  id: number;
  user?: User;
  details: string;
  flagReason: string;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  username: string;
  timestamp: string;
}
