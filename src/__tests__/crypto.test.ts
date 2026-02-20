import { describe, it, expect } from 'vitest';
import { md5 } from '../util/crypto';

describe('md5', () => {
  it('hashes empty string', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('hashes "hello"', () => {
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('hashes data+password combination (typical signing use case)', () => {
    const data = 'cHJvamVjdGlkPTEyMyZvcmRlcmlkPU9SRC0x';
    const password = 'secret123';
    const hash = md5(data + password);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(md5('abc')).not.toBe(md5('abd'));
  });

  it('produces consistent hashes', () => {
    expect(md5('test')).toBe(md5('test'));
  });
});
