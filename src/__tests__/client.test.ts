import { describe, it, expect, vi } from 'vitest';
import { WebToPayClient } from '../client';
import { WebToPayConfigError, WebToPayCallbackError } from '../types/errors';
import { PaymentStatus } from '../types/callback';
import { encodeSafeUrlBase64 } from '../util/encoding';
import { md5 } from '../util/crypto';
import type { HttpClient } from '../util/http';

const PROJECT_ID = 12345;
const PASSWORD = 'secret_password';

function makeCallbackQuery(params: Record<string, string>, password: string) {
  const qs = new URLSearchParams(params).toString();
  const data = encodeSafeUrlBase64(qs);
  const ss1 = md5(data + password);
  return { data, ss1 };
}

const PAYMENT_METHODS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<payment_types>
  <country code="LT">
    <title language="en">Lithuania</title>
    <payment_group key="e-banking">
      <title language="en">E-banking</title>
      <payment_type key="hanza" min="10" max="1000000" currency="EUR">
        <title language="en">SEB bank</title>
      </payment_type>
    </payment_group>
  </country>
</payment_types>`;

describe('WebToPayClient', () => {
  describe('constructor', () => {
    it('creates a client with valid config', () => {
      const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });
      expect(client).toBeInstanceOf(WebToPayClient);
    });

    it('throws on missing projectId', () => {
      expect(() => new WebToPayClient({ projectId: 0, password: PASSWORD })).toThrow(
        WebToPayConfigError,
      );
    });

    it('throws on missing password', () => {
      expect(() => new WebToPayClient({ projectId: PROJECT_ID, password: '' })).toThrow(
        WebToPayConfigError,
      );
    });
  });

  describe('buildRequest', () => {
    const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });

    it('returns signed request with data and sign', () => {
      const result = client.buildRequest({
        orderid: 'ORD-1',
        accepturl: 'https://example.com/ok',
        cancelurl: 'https://example.com/cancel',
        callbackurl: 'https://example.com/cb',
        amount: 1000,
        currency: 'EUR',
      });

      expect(result.data).toBeTruthy();
      expect(result.sign).toBeTruthy();
      expect(result.sign).toBe(md5(result.data + PASSWORD));
    });
  });

  describe('buildPaymentUrl', () => {
    it('builds production URL by default', () => {
      const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });
      const url = client.buildPaymentUrl({
        orderid: 'ORD-1',
        accepturl: 'https://example.com/ok',
        cancelurl: 'https://example.com/cancel',
        callbackurl: 'https://example.com/cb',
      });

      expect(url).toContain('https://bank.paysera.com/pay/');
    });

    it('builds sandbox URL when sandbox=true', () => {
      const client = new WebToPayClient({
        projectId: PROJECT_ID,
        password: PASSWORD,
        sandbox: true,
      });
      const url = client.buildPaymentUrl({
        orderid: 'ORD-1',
        accepturl: 'https://example.com/ok',
        cancelurl: 'https://example.com/cancel',
        callbackurl: 'https://example.com/cb',
      });

      expect(url).toContain('https://sandbox.paysera.com/pay/');
    });

    it('uses custom paymentUrl when provided', () => {
      const client = new WebToPayClient({
        projectId: PROJECT_ID,
        password: PASSWORD,
        paymentUrl: 'https://custom.gateway.com/pay/',
      });
      const url = client.buildPaymentUrl({
        orderid: 'ORD-1',
        accepturl: 'https://example.com/ok',
        cancelurl: 'https://example.com/cancel',
        callbackurl: 'https://example.com/cb',
      });

      expect(url).toContain('https://custom.gateway.com/pay/');
    });
  });

  describe('buildRepeatRequest', () => {
    const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });

    it('returns signed repeat request', () => {
      const result = client.buildRepeatRequest('ORD-1', 2000, 'EUR');
      expect(result.data).toBeTruthy();
      expect(result.sign).toBe(md5(result.data + PASSWORD));
    });
  });

  describe('validateCallback', () => {
    const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });

    it('validates and parses a correct SS1 callback', async () => {
      const query = makeCallbackQuery(
        {
          projectid: String(PROJECT_ID),
          orderid: 'ORD-001',
          amount: '1500',
          currency: 'EUR',
          status: '1',
          requestid: 'REQ-1',
          version: '1.6',
          lang: 'lit',
        },
        PASSWORD,
      );

      const result = await client.validateCallback(query);
      expect(result.orderid).toBe('ORD-001');
      expect(result.amount).toBe('1500');
      expect(result.status).toBe(PaymentStatus.SUCCESSFUL);
    });

    it('rejects callback with invalid signature', async () => {
      const query = makeCallbackQuery(
        { projectid: String(PROJECT_ID), orderid: 'ORD-1', status: '1', version: '1.6', lang: 'lit', requestid: 'R-1' },
        PASSWORD,
      );

      await expect(
        client.validateCallback({ data: query.data, ss1: 'invalid' }),
      ).rejects.toThrow(WebToPayCallbackError);
    });

    it('rejects callback with wrong project ID', async () => {
      const query = makeCallbackQuery(
        { projectid: '99999', orderid: 'ORD-1', status: '1', version: '1.6', lang: 'lit', requestid: 'R-1' },
        PASSWORD,
      );

      await expect(client.validateCallback(query)).rejects.toThrow('Project ID mismatch');
    });
  });

  describe('validateCallbackWithExpected', () => {
    const client = new WebToPayClient({ projectId: PROJECT_ID, password: PASSWORD });

    it('validates callback and checks expected fields', async () => {
      const query = makeCallbackQuery(
        {
          projectid: String(PROJECT_ID),
          orderid: 'ORD-100',
          amount: '5000',
          currency: 'EUR',
          status: '1',
          requestid: 'R-1',
          version: '1.6',
          lang: 'lit',
        },
        PASSWORD,
      );

      const result = await client.validateCallbackWithExpected(query, {
        orderid: 'ORD-100',
        amount: '5000',
        currency: 'EUR',
      });

      expect(result.orderid).toBe('ORD-100');
    });

    it('rejects when expected field does not match', async () => {
      const query = makeCallbackQuery(
        {
          projectid: String(PROJECT_ID),
          orderid: 'ORD-100',
          amount: '5000',
          currency: 'EUR',
          status: '1',
          requestid: 'R-1',
          version: '1.6',
          lang: 'lit',
        },
        PASSWORD,
      );

      await expect(
        client.validateCallbackWithExpected(query, { amount: '9999' }),
      ).rejects.toThrow(WebToPayCallbackError);
    });
  });

  describe('getPaymentMethods', () => {
    it('fetches and parses payment methods', async () => {
      const mockHttp: HttpClient = {
        get: vi.fn().mockResolvedValue(PAYMENT_METHODS_XML),
      };

      const client = new WebToPayClient({
        projectId: PROJECT_ID,
        password: PASSWORD,
        httpClient: mockHttp,
      });

      const methods = await client.getPaymentMethods({ currency: 'EUR' });

      expect(methods.projectId).toBe(PROJECT_ID);
      expect(methods.currency).toBe('EUR');
      expect(methods.countries).toHaveLength(1);
      expect(methods.countries[0].code).toBe('LT');
      expect(methods.countries[0].groups[0].methods[0].key).toBe('hanza');
    });

    it('caches results for same currency/amount', async () => {
      const mockHttp: HttpClient = {
        get: vi.fn().mockResolvedValue(PAYMENT_METHODS_XML),
      };

      const client = new WebToPayClient({
        projectId: PROJECT_ID,
        password: PASSWORD,
        httpClient: mockHttp,
      });

      await client.getPaymentMethods({ currency: 'EUR', amount: 1000 });
      await client.getPaymentMethods({ currency: 'EUR', amount: 1000 });

      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('builds correct URL with project ID and currency', async () => {
      const mockHttp: HttpClient = {
        get: vi.fn().mockResolvedValue(PAYMENT_METHODS_XML),
      };

      const client = new WebToPayClient({
        projectId: PROJECT_ID,
        password: PASSWORD,
        httpClient: mockHttp,
      });

      await client.getPaymentMethods({ currency: 'EUR', amount: 2500 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        `https://www.paysera.com/payment-methods/${PROJECT_ID}/currency:EUR/amount:2500`,
      );
    });
  });
});
