/**
 * TypeScript declaration for the Razorpay Checkout JS SDK
 * loaded via <script src="https://checkout.razorpay.com/v1/checkout.js">
 */

interface RazorpayOptions {
  key: string;
  amount: string | number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (response: any) => void): void;
  close(): void;
}

declare class Razorpay {
  constructor(options: RazorpayOptions);
  open(): void;
  on(event: string, handler: (response: any) => void): void;
  close(): void;
}

interface Window {
  Razorpay: typeof Razorpay;
}
