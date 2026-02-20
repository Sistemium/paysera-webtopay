import { describe, it, expect } from 'vitest';
import { RequestBuilder } from '../request-builder';
import { decodeSafeUrlBase64 } from '../util/encoding';
import { md5 } from '../util/crypto';
import { WebToPayValidationError } from '../types/errors';

const PROJECT_ID = 12345;
const PASSWORD = 'test_secret';

const validParams = {
  orderid: 'ORD-001',
  accepturl: 'https://shop.example.com/accept',
  cancelurl: 'https://shop.example.com/cancel',
  callbackurl: 'https://shop.example.com/callback',
  amount: 1500,
  currency: 'EUR',
};

describe('RequestBuilder', () => {
  const builder = new RequestBuilder(PROJECT_ID, PASSWORD);

  describe('buildRequest', () => {
    it('returns data and sign', () => {
      const result = builder.buildRequest(validParams);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('sign');
      expect(typeof result.data).toBe('string');
      expect(typeof result.sign).toBe('string');
    });

    it('sign is md5(data + password)', () => {
      const { data, sign } = builder.buildRequest(validParams);
      expect(sign).toBe(md5(data + PASSWORD));
    });

    it('data decodes to a query string with projectid and version', () => {
      const { data } = builder.buildRequest(validParams);
      const decoded = decodeSafeUrlBase64(data);
      const params = new URLSearchParams(decoded);

      expect(params.get('projectid')).toBe(String(PROJECT_ID));
      expect(params.get('version')).toBe('1.6');
      expect(params.get('orderid')).toBe('ORD-001');
      expect(params.get('amount')).toBe('1500');
      expect(params.get('currency')).toBe('EUR');
    });

    it('includes optional params when provided', () => {
      const { data } = builder.buildRequest({
        ...validParams,
        country: 'LT',
        lang: 'lit',
        p_email: 'user@test.com',
        test: 1,
      });
      const decoded = decodeSafeUrlBase64(data);
      const params = new URLSearchParams(decoded);

      expect(params.get('country')).toBe('LT');
      expect(params.get('lang')).toBe('lit');
      expect(params.get('p_email')).toBe('user@test.com');
      expect(params.get('test')).toBe('1');
    });

    it('throws on invalid params', () => {
      expect(() =>
        builder.buildRequest({
          orderid: '',
          accepturl: 'https://example.com/ok',
          cancelurl: 'https://example.com/cancel',
          callbackurl: 'https://example.com/cb',
        }),
      ).toThrow(WebToPayValidationError);
    });

    it('produces deterministic output', () => {
      const a = builder.buildRequest(validParams);
      const b = builder.buildRequest(validParams);
      expect(a.data).toBe(b.data);
      expect(a.sign).toBe(b.sign);
    });
  });

  describe('buildRequestUrl', () => {
    it('builds a valid URL with data and sign query params', () => {
      const url = builder.buildRequestUrl(validParams, 'https://bank.paysera.com/pay/');
      expect(url).toMatch(/^https:\/\/bank\.paysera\.com\/pay\/\?data=.+&sign=.+$/);
    });

    it('URL-encodes data and sign', () => {
      const url = builder.buildRequestUrl(validParams, 'https://bank.paysera.com/pay/');
      const parsed = new URL(url);
      const data = parsed.searchParams.get('data');
      const sign = parsed.searchParams.get('sign');
      expect(data).toBeTruthy();
      expect(sign).toBeTruthy();
      expect(sign).toBe(md5(data! + PASSWORD));
    });
  });

  describe('buildRepeatRequest', () => {
    it('returns data and sign for repeat payment', () => {
      const result = builder.buildRepeatRequest('ORD-001', 1500, 'EUR');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('sign');
    });

    it('includes repeat_request flag in data', () => {
      const { data } = builder.buildRepeatRequest('ORD-001', 1500, 'EUR');
      const decoded = decodeSafeUrlBase64(data);
      const params = new URLSearchParams(decoded);

      expect(params.get('repeat_request')).toBe('1');
      expect(params.get('orderid')).toBe('ORD-001');
      expect(params.get('amount')).toBe('1500');
      expect(params.get('currency')).toBe('EUR');
      expect(params.get('projectid')).toBe(String(PROJECT_ID));
    });
  });
});
