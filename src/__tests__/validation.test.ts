import { describe, it, expect } from 'vitest';
import { validateRequestParams, toStringRecord } from '../util/validation';
import { WebToPayValidationError, WebToPayErrorCode } from '../types/errors';

const validParams: Record<string, string> = {
  projectid: '12345',
  orderid: 'ORD-001',
  accepturl: 'https://example.com/accept',
  cancelurl: 'https://example.com/cancel',
  callbackurl: 'https://example.com/callback',
  version: '1.6',
};

describe('validateRequestParams', () => {
  it('accepts valid minimal params', () => {
    expect(() => validateRequestParams(validParams)).not.toThrow();
  });

  it('accepts valid params with optional fields', () => {
    expect(() =>
      validateRequestParams({
        ...validParams,
        amount: '1000',
        currency: 'EUR',
        country: 'LT',
        lang: 'lit',
        test: '1',
        p_email: 'test@example.com',
      }),
    ).not.toThrow();
  });

  it('throws on missing required field: projectid', () => {
    const { projectid: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
    try {
      validateRequestParams(params);
    } catch (e) {
      expect((e as WebToPayValidationError).code).toBe(WebToPayErrorCode.E_MISSING);
      expect((e as WebToPayValidationError).field).toBe('projectid');
    }
  });

  it('throws on missing required field: orderid', () => {
    const { orderid: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
  });

  it('throws on missing required field: accepturl', () => {
    const { accepturl: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
  });

  it('throws on missing required field: cancelurl', () => {
    const { cancelurl: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
  });

  it('throws on missing required field: callbackurl', () => {
    const { callbackurl: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
  });

  it('throws on missing required field: version', () => {
    const { version: _, ...params } = validParams;
    expect(() => validateRequestParams(params)).toThrow(WebToPayValidationError);
  });

  it('throws on orderid exceeding maxlen (40)', () => {
    expect(() =>
      validateRequestParams({ ...validParams, orderid: 'x'.repeat(41) }),
    ).toThrow(WebToPayValidationError);
    try {
      validateRequestParams({ ...validParams, orderid: 'x'.repeat(41) });
    } catch (e) {
      expect((e as WebToPayValidationError).code).toBe(WebToPayErrorCode.E_MAXLEN);
    }
  });

  it('throws on invalid currency format', () => {
    expect(() =>
      validateRequestParams({ ...validParams, currency: 'eur' }),
    ).toThrow(WebToPayValidationError);
    try {
      validateRequestParams({ ...validParams, currency: 'eur' });
    } catch (e) {
      expect((e as WebToPayValidationError).code).toBe(WebToPayErrorCode.E_REGEXP);
    }
  });

  it('throws on invalid country format', () => {
    expect(() =>
      validateRequestParams({ ...validParams, country: 'Lithuania' }),
    ).toThrow(WebToPayValidationError);
  });

  it('throws on invalid amount format', () => {
    expect(() =>
      validateRequestParams({ ...validParams, amount: '10.50' }),
    ).toThrow(WebToPayValidationError);
  });

  it('throws on invalid version format', () => {
    expect(() =>
      validateRequestParams({ ...validParams, version: 'abc' }),
    ).toThrow(WebToPayValidationError);
  });

  it('throws on invalid test value', () => {
    expect(() =>
      validateRequestParams({ ...validParams, test: '2' }),
    ).toThrow(WebToPayValidationError);
  });

  it('accepts test=0 and test=1', () => {
    expect(() => validateRequestParams({ ...validParams, test: '0' })).not.toThrow();
    expect(() => validateRequestParams({ ...validParams, test: '1' })).not.toThrow();
  });
});

describe('toStringRecord', () => {
  it('converts numeric values to strings', () => {
    const result = toStringRecord({
      orderid: 'ORD-1',
      accepturl: 'https://example.com/ok',
      cancelurl: 'https://example.com/cancel',
      callbackurl: 'https://example.com/cb',
      amount: 1000,
      test: 1,
    });
    expect(result.amount).toBe('1000');
    expect(result.test).toBe('1');
  });

  it('omits undefined values', () => {
    const result = toStringRecord({
      orderid: 'ORD-1',
      accepturl: 'https://example.com/ok',
      cancelurl: 'https://example.com/cancel',
      callbackurl: 'https://example.com/cb',
      currency: undefined,
    });
    expect(result).not.toHaveProperty('currency');
  });

  it('preserves string values as-is', () => {
    const result = toStringRecord({
      orderid: 'ORD-1',
      accepturl: 'https://example.com/ok',
      cancelurl: 'https://example.com/cancel',
      callbackurl: 'https://example.com/cb',
      currency: 'EUR',
    });
    expect(result.currency).toBe('EUR');
  });
});
