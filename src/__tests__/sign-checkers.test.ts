import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { SS1SignChecker } from '../sign/ss1-sign-checker';
import { SSOpenSslSignChecker } from '../sign/ss-openssl-sign-checker';
import { md5 } from '../util/crypto';

const PASSWORD = 'test_password';

describe('SS1SignChecker', () => {
  const checker = new SS1SignChecker(PASSWORD);

  it('returns true for valid SS1 signature', () => {
    const data = 'dGVzdC1kYXRh';
    const ss1 = md5(data + PASSWORD);
    expect(checker.checkSign({ data, ss1 })).toBe(true);
  });

  it('returns false for invalid SS1 signature', () => {
    const data = 'dGVzdC1kYXRh';
    expect(checker.checkSign({ data, ss1: 'wrong_hash' })).toBe(false);
  });

  it('returns false when ss1 is missing', () => {
    expect(checker.checkSign({ data: 'dGVzdC1kYXRh' })).toBe(false);
  });

  it('returns false for empty ss1', () => {
    expect(checker.checkSign({ data: 'dGVzdC1kYXRh', ss1: '' })).toBe(false);
  });

  it('validates with different data/password combos', () => {
    const checker2 = new SS1SignChecker('another_password');
    const data = 'c29tZS1vdGhlci1kYXRh';
    const ss1 = md5(data + 'another_password');
    expect(checker2.checkSign({ data, ss1 })).toBe(true);
    // Same data but wrong password checker
    expect(checker.checkSign({ data, ss1 })).toBe(false);
  });
});

describe('SSOpenSslSignChecker', () => {
  // Generate a test RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const checker = new SSOpenSslSignChecker(publicKey);

  function signData(data: string, algorithm: 'sha1' | 'sha256'): string {
    const signer = crypto.createSign(algorithm === 'sha1' ? 'RSA-SHA1' : 'RSA-SHA256');
    signer.update(data, 'utf-8');
    return signer.sign(privateKey, 'base64');
  }

  describe('SS3 (SHA-256)', () => {
    it('returns true for valid SS3 signature', () => {
      const data = 'test-callback-data';
      const ss3 = signData(data, 'sha256');
      expect(checker.checkSign({ data, ss3 })).toBe(true);
    });

    it('returns false for invalid SS3 signature', () => {
      expect(checker.checkSign({ data: 'test-data', ss3: 'invalid-base64-sig' })).toBe(false);
    });

    it('returns false when data is tampered', () => {
      const data = 'original-data';
      const ss3 = signData(data, 'sha256');
      expect(checker.checkSign({ data: 'tampered-data', ss3 })).toBe(false);
    });
  });

  describe('SS2 (SHA-1)', () => {
    it('returns true for valid SS2 signature', () => {
      const data = 'test-callback-data';
      const ss2 = signData(data, 'sha1');
      expect(checker.checkSign({ data, ss2 })).toBe(true);
    });

    it('returns false for invalid SS2 signature', () => {
      expect(checker.checkSign({ data: 'test-data', ss2: 'bad-signature' })).toBe(false);
    });
  });

  describe('priority', () => {
    it('prefers SS3 over SS2 when both are present', () => {
      const data = 'test-data';
      const ss3 = signData(data, 'sha256');
      // Provide a valid SS3 but invalid SS2 — should still pass
      expect(checker.checkSign({ data, ss2: 'invalid', ss3 })).toBe(true);
    });
  });

  it('returns false when neither ss2 nor ss3 is present', () => {
    expect(checker.checkSign({ data: 'test' })).toBe(false);
  });
});
