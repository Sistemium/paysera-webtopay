import type { CallbackQuery } from '../types/callback';
import type { SignChecker } from './sign-checker';
import { verifyRsaSignature } from '../util/crypto';

export class SSOpenSslSignChecker implements SignChecker {
  constructor(private publicKey: string) {}

  checkSign(request: CallbackQuery): boolean {
    // Prefer SS3 (SHA-256) over SS2 (SHA-1)
    if (request.ss3) {
      const signature = Buffer.from(request.ss3, 'base64');
      return verifyRsaSignature(request.data, signature, this.publicKey, 'sha256');
    }

    if (request.ss2) {
      const signature = Buffer.from(request.ss2, 'base64');
      return verifyRsaSignature(request.data, signature, this.publicKey, 'sha1');
    }

    return false;
  }
}
