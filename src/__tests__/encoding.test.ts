import { describe, it, expect } from 'vitest';
import { encodeSafeUrlBase64, decodeSafeUrlBase64 } from '../util/encoding';

describe('encodeSafeUrlBase64', () => {
  it('encodes a simple string', () => {
    const result = encodeSafeUrlBase64('hello');
    expect(result).toBe('aGVsbG8=');
  });

  it('replaces + with - and / with _', () => {
    // "n?~" in base64 is "bj9+" — the + should become -
    const result = encodeSafeUrlBase64('n?~');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('encodes a query string (typical use case)', () => {
    const qs = 'projectid=123&orderid=ORD-1&amount=1000&currency=EUR';
    const encoded = encodeSafeUrlBase64(qs);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
  });

  it('handles empty string', () => {
    expect(encodeSafeUrlBase64('')).toBe('');
  });

  it('handles unicode', () => {
    const encoded = encodeSafeUrlBase64('Ačiū');
    const decoded = decodeSafeUrlBase64(encoded);
    expect(decoded).toBe('Ačiū');
  });
});

describe('decodeSafeUrlBase64', () => {
  it('decodes a simple string', () => {
    expect(decodeSafeUrlBase64('aGVsbG8=')).toBe('hello');
  });

  it('is the inverse of encode', () => {
    const original = 'projectid=123&orderid=test&amount=5000&currency=EUR&accepturl=https://example.com/ok';
    const encoded = encodeSafeUrlBase64(original);
    const decoded = decodeSafeUrlBase64(encoded);
    expect(decoded).toBe(original);
  });

  it('handles URL-safe characters (- and _)', () => {
    // Manually create a URL-safe base64 string
    const standard = Buffer.from('test+data/here').toString('base64');
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_');
    const decoded = decodeSafeUrlBase64(urlSafe);
    expect(decoded).toBe('test+data/here');
  });

  it('handles empty string', () => {
    expect(decodeSafeUrlBase64('')).toBe('');
  });
});
