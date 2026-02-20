import type { CallbackQuery } from '../types/callback';
import type { SignChecker } from './sign-checker';
import { md5 } from '../util/crypto';

export class SS1SignChecker implements SignChecker {
  constructor(private password: string) {}

  checkSign(request: CallbackQuery): boolean {
    if (!request.ss1) {
      return false;
    }
    const expected = md5(request.data + this.password);
    return expected === request.ss1;
  }
}
