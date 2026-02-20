export enum PaymentStatus {
  NOT_EXECUTED = 0,
  SUCCESSFUL = 1,
  ACCEPTED = 2,
  ADDITIONAL_INFO = 3,
  EXECUTED_NO_CONFIRMATION = 4,
  REFUNDED = 5,
}

export interface CallbackQuery {
  data: string;
  ss1?: string;
  ss2?: string;
  ss3?: string;
}

export interface ParsedCallback {
  projectid: string;
  orderid: string;
  lang: string;
  amount: string;
  currency: string;
  type: 'micro' | 'macro';
  status: PaymentStatus;
  requestid: string;
  version: string;

  // Payer info (from payment system)
  name?: string;
  surename?: string;
  account?: string;
  p_email?: string;

  // Payment details
  payment?: string;
  country?: string;
  paytext?: string;
  pay_amount?: string;
  pay_currency?: string;
  payment_country?: string;
  payer_ip_country?: string;
  payer_country?: string;

  // Test flag
  test?: string;

  // Original request values
  request_amount?: string;
  request_currency?: string;

  // Verification
  personcodestatus?: string;
  identification_successful?: string;

  // Refund
  refund_amount?: string;
  refund_currency?: string;
  refund_commission_amount?: string;
  refund_commission_currency?: string;

  // Allow additional unknown fields
  [key: string]: string | number | undefined;
}
