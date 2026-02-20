import { WebToPayErrorCode, WebToPayValidationError } from '../types/errors';
import type { PaymentRequestParams } from '../types/request';

interface RequestSpec {
  field: string;
  maxlen: number;
  required: boolean;
  regex?: RegExp;
}

const REQUEST_SPECS: RequestSpec[] = [
  { field: 'projectid', maxlen: 11, required: true },
  { field: 'orderid', maxlen: 40, required: true },
  { field: 'accepturl', maxlen: 255, required: true },
  { field: 'cancelurl', maxlen: 255, required: true },
  { field: 'callbackurl', maxlen: 255, required: true },
  { field: 'version', maxlen: 9, required: true, regex: /^\d+\.\d+$/ },
  { field: 'lang', maxlen: 3, required: false, regex: /^[a-z]{3}$/i },
  { field: 'amount', maxlen: 11, required: false, regex: /^\d+$/ },
  { field: 'currency', maxlen: 3, required: false, regex: /^[A-Z]{3}$/ },
  { field: 'payment', maxlen: 20, required: false },
  { field: 'country', maxlen: 2, required: false, regex: /^[A-Z]{2}$/ },
  { field: 'paytext', maxlen: 255, required: false },
  { field: 'p_firstname', maxlen: 255, required: false },
  { field: 'p_lastname', maxlen: 255, required: false },
  { field: 'p_email', maxlen: 255, required: false },
  { field: 'p_street', maxlen: 255, required: false },
  { field: 'p_city', maxlen: 255, required: false },
  { field: 'p_state', maxlen: 20, required: false },
  { field: 'p_zip', maxlen: 20, required: false },
  { field: 'p_countrycode', maxlen: 2, required: false, regex: /^[A-Z]{2}$/ },
  { field: 'test', maxlen: 1, required: false, regex: /^[01]$/ },
  { field: 'time_limit', maxlen: 19, required: false },
  { field: 'personcode', maxlen: 255, required: false },
  { field: 'developerid', maxlen: 11, required: false, regex: /^\d+$/ },
  { field: 'buyer_consent', maxlen: 1, required: false, regex: /^[01]$/ },
  { field: 'only_payments', maxlen: 0, required: false },
  { field: 'disallow_payments', maxlen: 0, required: false },
];

export function validateRequestParams(params: Record<string, string>): void {
  for (const spec of REQUEST_SPECS) {
    const value = params[spec.field];

    if (spec.required && (value === undefined || value === '')) {
      throw new WebToPayValidationError(
        `Missing required field: ${spec.field}`,
        WebToPayErrorCode.E_MISSING,
        spec.field,
      );
    }

    if (value === undefined || value === '') {
      continue;
    }

    if (spec.maxlen > 0 && value.length > spec.maxlen) {
      throw new WebToPayValidationError(
        `Field ${spec.field} exceeds maximum length of ${spec.maxlen}`,
        WebToPayErrorCode.E_MAXLEN,
        spec.field,
      );
    }

    if (spec.regex && !spec.regex.test(value)) {
      throw new WebToPayValidationError(
        `Field ${spec.field} does not match expected format`,
        WebToPayErrorCode.E_REGEXP,
        spec.field,
      );
    }
  }
}

export function toStringRecord(params: PaymentRequestParams & { projectid?: number; version?: string }): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}
