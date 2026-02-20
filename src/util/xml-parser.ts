import { XMLParser } from 'fast-xml-parser';
import type {
  PaymentMethod,
  PaymentMethodCountry,
  PaymentMethodGroup,
  PaymentMethodList,
} from '../types/payment-method';

export function parsePaymentMethodsXml(
  xml: string,
  projectId: number,
  currency: string,
): PaymentMethodList {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['country', 'payment_group', 'payment_type', 'title'].includes(name),
  });

  const parsed = parser.parse(xml);
  const root = parsed.payment_types || parsed.webtopay;

  if (!root) {
    return { projectId, currency, countries: [] };
  }

  const countriesRaw = ensureArray(root.country) as Record<string, unknown>[];
  const countries: PaymentMethodCountry[] = countriesRaw.map((countryNode) =>
    parseCountry(countryNode),
  );

  return { projectId, currency, countries };
}

function parseCountry(node: Record<string, unknown>): PaymentMethodCountry {
  const code = (node['@_code'] as string) || '';
  const title = parseTitles(node['title']);

  const groupsRaw = ensureArray(node['payment_group']) as Record<string, unknown>[];
  const groups: PaymentMethodGroup[] = groupsRaw.map((groupNode) =>
    parseGroup(groupNode),
  );

  return { code, title, groups };
}

function parseGroup(node: Record<string, unknown>): PaymentMethodGroup {
  const key = (node['@_key'] as string) || '';
  const title = parseTitles(node['title']);

  const methodsRaw = ensureArray(node['payment_type']) as Record<string, unknown>[];
  const methods: PaymentMethod[] = methodsRaw.map((methodNode) =>
    parseMethod(methodNode),
  );

  return { key, title, methods };
}

function parseMethod(node: Record<string, unknown>): PaymentMethod {
  const key = (node['@_key'] as string) || '';

  const title: Record<string, string> = parseTitles(node['title']);
  const logoUrl: Record<string, string> = parseLogos(node['logo_url']);

  const minAmount = node['@_min'] ? Number(node['@_min']) : null;
  const maxAmount = node['@_max'] ? Number(node['@_max']) : null;
  const currency = (node['@_currency'] as string) || null;
  const isIban = node['@_is_iban'] === '1';
  const baseCurrency = (node['@_base_currency'] as string) || null;

  return { key, title, logoUrl, minAmount, maxAmount, currency, isIban, baseCurrency };
}

function parseTitles(titlesNode: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  const titles = ensureArray(titlesNode);
  for (const t of titles) {
    if (t && typeof t === 'object') {
      const lang = (t as Record<string, string>)['@_language'] || 'en';
      const text = (t as Record<string, string>)['#text'] || '';
      result[lang] = text;
    }
  }
  return result;
}

function parseLogos(logosNode: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!logosNode || typeof logosNode !== 'object') {
    return result;
  }

  // Logo URLs may be keyed by language (e.g., <logo_url language="lt">...</logo_url>)
  const logos = ensureArray(logosNode);
  for (const logo of logos) {
    if (logo && typeof logo === 'object') {
      const lang = (logo as Record<string, string>)['@_language'] || 'en';
      const url = (logo as Record<string, string>)['#text'] || '';
      result[lang] = url;
    } else if (typeof logo === 'string') {
      result['en'] = logo;
    }
  }
  return result;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
