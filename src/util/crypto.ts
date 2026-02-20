import * as crypto from 'crypto';

export function md5(data: string): string {
  return crypto.createHash('md5').update(data, 'utf-8').digest('hex');
}

export function verifyRsaSignature(
  data: string,
  signature: Buffer,
  publicKey: string,
  algorithm: 'sha1' | 'sha256',
): boolean {
  const verifier = crypto.createVerify(algorithm === 'sha1' ? 'RSA-SHA1' : 'RSA-SHA256');
  verifier.update(data, 'utf-8');
  return verifier.verify(publicKey, signature);
}

export function decryptAesGcm(encryptedData: Buffer, password: string): string | null {
  try {
    const key = Buffer.from(password, 'utf-8');
    // AES-256-GCM requires a 32-byte key; pad or hash if needed
    const keyHash = crypto.createHash('sha256').update(key).digest();

    const ivLength = 12; // standard GCM IV length
    const tagLength = 16; // standard GCM auth tag length

    if (encryptedData.length < ivLength + tagLength) {
      return null;
    }

    const iv = encryptedData.subarray(0, ivLength);
    const tag = encryptedData.subarray(encryptedData.length - tagLength);
    const ciphertext = encryptedData.subarray(ivLength, encryptedData.length - tagLength);

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch {
    return null;
  }
}
