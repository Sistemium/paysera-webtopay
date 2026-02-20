import { describe, it, expect } from 'vitest';
import { CallbackValidator } from '../callback-validator';
import { SS1SignChecker } from '../sign/ss1-sign-checker';
import { PaymentStatus } from '../types/callback';
import { WebToPayCallbackError } from '../types/errors';
import { encodeSafeUrlBase64 } from '../util/encoding';
import { md5 } from '../util/crypto';

const PROJECT_ID = 12345;
const PASSWORD = 'test_secret';

function makeCallback(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const data = encodeSafeUrlBase64(qs);
  const ss1 = md5(data + PASSWORD);
  return { data, ss1 };
}

describe('CallbackValidator', () => {
  const signChecker = new SS1SignChecker(PASSWORD);
  const validator = new CallbackValidator(PROJECT_ID, signChecker, PASSWORD);

  describe('validateAndParseData', () => {
    it('parses a valid macro payment callback', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        amount: '1500',
        currency: 'EUR',
        status: '1',
        requestid: 'REQ-123',
        version: '1.6',
        lang: 'lit',
      });

      const result = validator.validateAndParseData(query);

      expect(result.projectid).toBe('12345');
      expect(result.orderid).toBe('ORD-001');
      expect(result.amount).toBe('1500');
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe(PaymentStatus.SUCCESSFUL);
      expect(result.type).toBe('macro');
    });

    it('detects micro payment type when "to" and "from" are present', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-002',
        status: '1',
        version: '1.6',
        lang: 'lit',
        to: '370600xxxxx',
        from: '370611xxxxx',
        requestid: 'REQ-456',
      });

      const result = validator.validateAndParseData(query);
      expect(result.type).toBe('micro');
    });

    it('converts status string to PaymentStatus enum', () => {
      for (const [statusStr, expected] of [
        ['0', PaymentStatus.NOT_EXECUTED],
        ['1', PaymentStatus.SUCCESSFUL],
        ['2', PaymentStatus.ACCEPTED],
        ['3', PaymentStatus.ADDITIONAL_INFO],
        ['4', PaymentStatus.EXECUTED_NO_CONFIRMATION],
        ['5', PaymentStatus.REFUNDED],
      ] as const) {
        const query = makeCallback({
          projectid: '12345',
          orderid: 'ORD-X',
          status: statusStr,
          version: '1.6',
          lang: 'lit',
          requestid: 'R-1',
        });
        const result = validator.validateAndParseData(query);
        expect(result.status).toBe(expected);
      }
    });

    it('throws on invalid SS1 signature', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
      });

      expect(() =>
        validator.validateAndParseData({ data: query.data, ss1: 'wrong_signature' }),
      ).toThrow(WebToPayCallbackError);
    });

    it('throws on project ID mismatch', () => {
      const query = makeCallback({
        projectid: '99999',
        orderid: 'ORD-001',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
      });

      expect(() => validator.validateAndParseData(query)).toThrow(WebToPayCallbackError);
      expect(() => validator.validateAndParseData(query)).toThrow('Project ID mismatch');
    });

    it('preserves additional callback fields', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
        name: 'Jonas',
        surename: 'Jonaitis',
        p_email: 'jonas@test.lt',
        payment: 'hanza',
        country: 'LT',
      });

      const result = validator.validateAndParseData(query);
      expect(result.name).toBe('Jonas');
      expect(result.surename).toBe('Jonaitis');
      expect(result.p_email).toBe('jonas@test.lt');
      expect(result.payment).toBe('hanza');
      expect(result.country).toBe('LT');
    });
  });

  describe('checkExpectedFields', () => {
    it('does not throw when fields match', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        amount: '1500',
        currency: 'EUR',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
      });

      const result = validator.validateAndParseData(query);
      expect(() =>
        validator.checkExpectedFields(result, {
          orderid: 'ORD-001',
          amount: '1500',
          currency: 'EUR',
        }),
      ).not.toThrow();
    });

    it('throws when orderid does not match', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        amount: '1500',
        currency: 'EUR',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
      });

      const result = validator.validateAndParseData(query);
      expect(() =>
        validator.checkExpectedFields(result, { orderid: 'ORD-999' }),
      ).toThrow(WebToPayCallbackError);
      expect(() =>
        validator.checkExpectedFields(result, { orderid: 'ORD-999' }),
      ).toThrow('Field orderid mismatch');
    });

    it('throws when amount does not match', () => {
      const query = makeCallback({
        projectid: '12345',
        orderid: 'ORD-001',
        amount: '1500',
        currency: 'EUR',
        status: '1',
        version: '1.6',
        lang: 'lit',
        requestid: 'R-1',
      });

      const result = validator.validateAndParseData(query);
      expect(() =>
        validator.checkExpectedFields(result, { amount: '2000' }),
      ).toThrow(WebToPayCallbackError);
    });
  });
});
