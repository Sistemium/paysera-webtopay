import type { HttpClient } from './util/http';
import type { PaymentMethodList, PaymentMethodOptions } from './types/payment-method';
import { parsePaymentMethodsXml } from './util/xml-parser';

export class PaymentMethodListProvider {
  private cache: Map<string, PaymentMethodList> = new Map();

  constructor(
    private projectId: number,
    private baseUrl: string,
    private httpClient: HttpClient,
  ) {}

  async getPaymentMethodList(options?: PaymentMethodOptions): Promise<PaymentMethodList> {
    const currency = options?.currency || 'EUR';
    const amount = options?.amount;

    const cacheKey = `${currency}:${amount ?? 'all'}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let url = `${this.baseUrl}${this.projectId}/currency:${currency}`;
    if (amount !== undefined) {
      url += `/amount:${amount}`;
    }

    const xml = await this.httpClient.get(url);
    const result = parsePaymentMethodsXml(xml, this.projectId, currency);

    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
