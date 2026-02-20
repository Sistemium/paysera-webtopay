export interface PaymentMethod {
  key: string;
  title: Record<string, string>;
  logoUrl: Record<string, string>;
  minAmount: number | null;
  maxAmount: number | null;
  currency: string | null;
  isIban: boolean;
  baseCurrency: string | null;
}

export interface PaymentMethodGroup {
  key: string;
  title: Record<string, string>;
  methods: PaymentMethod[];
}

export interface PaymentMethodCountry {
  code: string;
  title: Record<string, string>;
  groups: PaymentMethodGroup[];
}

export interface PaymentMethodList {
  projectId: number;
  currency: string;
  countries: PaymentMethodCountry[];
}

export interface PaymentMethodOptions {
  amount?: number;
  currency?: string;
  language?: string;
}
