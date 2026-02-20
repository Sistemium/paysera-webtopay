import { describe, it, expect } from 'vitest';
import { parsePaymentMethodsXml } from '../util/xml-parser';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<payment_types>
  <country code="LT">
    <title language="lt">Lietuva</title>
    <title language="en">Lithuania</title>
    <payment_group key="e-banking">
      <title language="lt">El. bankininkystė</title>
      <title language="en">E-banking</title>
      <payment_type key="hanza" min="10" max="1000000" currency="EUR" is_iban="1" base_currency="EUR">
        <title language="lt">SEB bankas</title>
        <title language="en">SEB bank</title>
        <logo_url language="lt">https://bank.paysera.com/assets/image/payment/seb_lt.png</logo_url>
        <logo_url language="en">https://bank.paysera.com/assets/image/payment/seb_en.png</logo_url>
      </payment_type>
      <payment_type key="vb2" min="1" max="500000" currency="EUR">
        <title language="lt">Swedbank</title>
        <title language="en">Swedbank</title>
      </payment_type>
    </payment_group>
    <payment_group key="card">
      <title language="lt">Mokėjimo kortelės</title>
      <title language="en">Payment cards</title>
      <payment_type key="card">
        <title language="lt">Visa / Mastercard</title>
        <title language="en">Visa / Mastercard</title>
      </payment_type>
    </payment_group>
  </country>
  <country code="EE">
    <title language="en">Estonia</title>
    <payment_group key="e-banking">
      <title language="en">E-banking</title>
      <payment_type key="nordea_ee" min="1" max="100000" currency="EUR">
        <title language="en">Luminor</title>
      </payment_type>
    </payment_group>
  </country>
</payment_types>`;

describe('parsePaymentMethodsXml', () => {
  it('parses countries', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    expect(result.projectId).toBe(123);
    expect(result.currency).toBe('EUR');
    expect(result.countries).toHaveLength(2);
    expect(result.countries[0].code).toBe('LT');
    expect(result.countries[1].code).toBe('EE');
  });

  it('parses country titles', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const lt = result.countries[0];
    expect(lt.title['lt']).toBe('Lietuva');
    expect(lt.title['en']).toBe('Lithuania');
  });

  it('parses payment groups', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const lt = result.countries[0];
    expect(lt.groups).toHaveLength(2);
    expect(lt.groups[0].key).toBe('e-banking');
    expect(lt.groups[1].key).toBe('card');
  });

  it('parses group titles', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const banking = result.countries[0].groups[0];
    expect(banking.title['lt']).toBe('El. bankininkystė');
    expect(banking.title['en']).toBe('E-banking');
  });

  it('parses payment methods', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const banking = result.countries[0].groups[0];
    expect(banking.methods).toHaveLength(2);

    const seb = banking.methods[0];
    expect(seb.key).toBe('hanza');
    expect(seb.title['lt']).toBe('SEB bankas');
    expect(seb.title['en']).toBe('SEB bank');
    expect(seb.minAmount).toBe(10);
    expect(seb.maxAmount).toBe(1000000);
    expect(seb.currency).toBe('EUR');
    expect(seb.isIban).toBe(true);
    expect(seb.baseCurrency).toBe('EUR');
  });

  it('parses logo URLs', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const seb = result.countries[0].groups[0].methods[0];
    expect(seb.logoUrl['lt']).toBe('https://bank.paysera.com/assets/image/payment/seb_lt.png');
    expect(seb.logoUrl['en']).toBe('https://bank.paysera.com/assets/image/payment/seb_en.png');
  });

  it('handles methods without min/max/currency', () => {
    const result = parsePaymentMethodsXml(SAMPLE_XML, 123, 'EUR');
    const card = result.countries[0].groups[1].methods[0];
    expect(card.key).toBe('card');
    expect(card.minAmount).toBeNull();
    expect(card.maxAmount).toBeNull();
    expect(card.currency).toBeNull();
  });

  it('returns empty countries for empty XML', () => {
    const result = parsePaymentMethodsXml('<root/>', 123, 'EUR');
    expect(result.countries).toEqual([]);
  });

  it('handles single country (non-array)', () => {
    const xml = `<?xml version="1.0"?>
    <payment_types>
      <country code="LV">
        <title language="en">Latvia</title>
        <payment_group key="e-banking">
          <title language="en">E-banking</title>
          <payment_type key="citadele_lv">
            <title language="en">Citadele</title>
          </payment_type>
        </payment_group>
      </country>
    </payment_types>`;

    const result = parsePaymentMethodsXml(xml, 456, 'EUR');
    expect(result.countries).toHaveLength(1);
    expect(result.countries[0].code).toBe('LV');
    expect(result.countries[0].groups[0].methods[0].key).toBe('citadele_lv');
  });
});
