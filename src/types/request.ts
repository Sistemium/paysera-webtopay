export interface PaymentRequestParams {
  // Required
  orderid: string;
  accepturl: string;
  cancelurl: string;
  callbackurl: string;

  // Payment details
  amount?: number;
  currency?: string;
  payment?: string;
  country?: string;
  paytext?: string;
  lang?: string;
  test?: 0 | 1;
  time_limit?: string;
  only_payments?: string;
  disallow_payments?: string;
  buyer_consent?: 0 | 1;
  personcode?: string;
  developerid?: number;

  // Payer information
  p_firstname?: string;
  p_lastname?: string;
  p_email?: string;
  p_street?: string;
  p_city?: string;
  p_state?: string;
  p_zip?: string;
  p_countrycode?: string;

  // Repeat request
  repeat_request?: 0 | 1;
}

export interface SignedRequest {
  data: string;
  sign: string;
}
