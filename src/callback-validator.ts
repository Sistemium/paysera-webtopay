import type { CallbackQuery, ParsedCallback } from './types/callback';
import { PaymentStatus } from './types/callback';
import { WebToPayCallbackError, WebToPayErrorCode } from './types/errors';
import type { SignChecker } from './sign/sign-checker';
import { decodeSafeUrlBase64 } from './util/encoding';
import { decryptAesGcm } from './util/crypto';

export class CallbackValidator {
  constructor(
    private projectId: number,
    private signChecker: SignChecker,
    private password: string,
  ) {}

  validateAndParseData(query: CallbackQuery): ParsedCallback {
    let decodedData: string;

    if (query.ss1 || query.ss2 || query.ss3) {
      // Signature mode: verify signature, then decode data
      if (!this.signChecker.checkSign(query)) {
        throw new WebToPayCallbackError(
          'Invalid callback signature',
          WebToPayErrorCode.E_INVALID,
        );
      }
      decodedData = decodeSafeUrlBase64(query.data);
    } else {
      // Encrypted mode: decrypt data using AES-256-GCM
      const rawData = Buffer.from(
        query.data.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      );
      const decrypted = decryptAesGcm(rawData, this.password);
      if (decrypted === null) {
        throw new WebToPayCallbackError(
          'Failed to decrypt callback data',
          WebToPayErrorCode.E_INVALID,
        );
      }
      decodedData = decrypted;
    }

    const raw = this.parseQueryString(decodedData);

    // Validate project ID
    if (raw.projectid && Number(raw.projectid) !== this.projectId) {
      throw new WebToPayCallbackError(
        `Project ID mismatch: expected ${this.projectId}, got ${raw.projectid}`,
        WebToPayErrorCode.E_INVALID,
      );
    }

    const parsed: ParsedCallback = raw as unknown as ParsedCallback;

    // Determine type if not set
    if (!parsed.type) {
      parsed.type = this.detectType(raw);
    }

    // Convert status to enum
    if (raw.status !== undefined) {
      parsed.status = Number(raw.status) as PaymentStatus;
    }

    return parsed;
  }

  checkExpectedFields(
    data: ParsedCallback,
    expected: Partial<ParsedCallback>,
  ): void {
    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = data[key];
      if (String(actualValue) !== String(expectedValue)) {
        throw new WebToPayCallbackError(
          `Field ${key} mismatch: expected ${expectedValue}, got ${actualValue}`,
          WebToPayErrorCode.E_INVALID,
        );
      }
    }
  }

  private parseQueryString(query: string): Record<string, string> {
    const params = new URLSearchParams(query);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  private detectType(parsed: Record<string, string>): 'micro' | 'macro' {
    // Micro payments have "to" and "from" fields
    if (parsed.to && parsed.from) {
      return 'micro';
    }
    return 'macro';
  }
}
