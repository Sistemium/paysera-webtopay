import type { CallbackQuery } from '../types/callback';

export interface SignChecker {
  checkSign(request: CallbackQuery): boolean;
}
