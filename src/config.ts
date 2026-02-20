export type Environment = 'production' | 'sandbox';

export interface Routes {
  publicKey: string;
  payment: string;
  paymentMethodList: string;
}

export const PRODUCTION_ROUTES: Routes = {
  publicKey: 'https://www.paysera.com/download/public.key',
  payment: 'https://bank.paysera.com/pay/',
  paymentMethodList: 'https://www.paysera.com/payment-methods/',
};

export const SANDBOX_ROUTES: Routes = {
  publicKey: 'https://sandbox.paysera.com/download/public.key',
  payment: 'https://sandbox.paysera.com/pay/',
  paymentMethodList: 'https://sandbox.paysera.com/payment-methods/',
};

export const API_VERSION = '1.6';

export function getRoutes(env: Environment): Routes {
  return env === 'sandbox' ? SANDBOX_ROUTES : PRODUCTION_ROUTES;
}
