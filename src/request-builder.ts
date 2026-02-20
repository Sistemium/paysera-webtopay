import { API_VERSION } from './config';
import type { PaymentRequestParams, SignedRequest } from './types/request';
import { encodeSafeUrlBase64 } from './util/encoding';
import { md5 } from './util/crypto';
import { validateRequestParams, toStringRecord } from './util/validation';

export class RequestBuilder {
  constructor(
    private projectId: number,
    private password: string,
  ) {}

  buildRequest(params: PaymentRequestParams): SignedRequest {
    const fullParams = {
      ...params,
      projectid: this.projectId,
      version: API_VERSION,
    };

    const stringParams = toStringRecord(fullParams);
    validateRequestParams(stringParams);

    return this.createRequest(stringParams);
  }

  buildRequestUrl(params: PaymentRequestParams, basePaymentUrl: string): string {
    const { data, sign } = this.buildRequest(params);
    return `${basePaymentUrl}?data=${encodeURIComponent(data)}&sign=${encodeURIComponent(sign)}`;
  }

  buildRepeatRequest(orderId: string, amount: number, currency: string): SignedRequest {
    const params = toStringRecord({
      projectid: this.projectId,
      orderid: orderId,
      version: API_VERSION,
      amount,
      currency,
      repeat_request: 1,
    } as PaymentRequestParams & { projectid: number; version: string });

    return this.createRequest(params);
  }

  private createRequest(params: Record<string, string>): SignedRequest {
    const queryString = new URLSearchParams(params).toString();
    const data = encodeSafeUrlBase64(queryString);
    const sign = md5(data + this.password);
    return { data, sign };
  }
}
