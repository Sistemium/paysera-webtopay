# paysera-webtopay

TypeScript SDK for [Paysera WebToPay](https://developers.paysera.com/en/checkout/integrations/integration-specification) checkout integration. A TypeScript port of the official PHP library [paysera/lib-webtopay](https://github.com/paysera/lib-webtopay).

## Features

- Build signed payment redirect URLs
- Validate callbacks with SS1 (MD5), SS2 (RSA-SHA1), SS3 (RSA-SHA256), and AES-256-GCM encrypted modes
- Fetch available payment methods from Paysera API
- Full TypeScript types for all request parameters and callback data
- Zero dependencies for core functionality (only `fast-xml-parser` for payment methods)
- Sandbox/production environment support

## Installation

```bash
npm install paysera-webtopay
# or
pnpm add paysera-webtopay
```

## Quick Start

```typescript
import { WebToPayClient, PaymentStatus } from 'paysera-webtopay';

const client = new WebToPayClient({
  projectId: 12345,
  password: 'your_project_password',
  sandbox: false, // set to true for testing
});
```

### Build a Payment Redirect URL

```typescript
const url = client.buildPaymentUrl({
  orderid: 'ORDER-123',
  amount: 1000, // in cents (10.00 EUR)
  currency: 'EUR',
  accepturl: 'https://yourshop.com/payment/accept',
  cancelurl: 'https://yourshop.com/payment/cancel',
  callbackurl: 'https://yourshop.com/payment/callback',
  // Optional:
  country: 'LT',
  lang: 'LIT',
  p_email: 'customer@example.com',
  test: 1, // enable test mode
});

// Redirect the user to this URL
res.redirect(url);
```

### Get Signed Request Data

If you need the raw `data` and `sign` values (e.g., for a form POST):

```typescript
const { data, sign } = client.buildRequest({
  orderid: 'ORDER-123',
  amount: 1000,
  currency: 'EUR',
  accepturl: 'https://yourshop.com/payment/accept',
  cancelurl: 'https://yourshop.com/payment/cancel',
  callbackurl: 'https://yourshop.com/payment/callback',
});
```

### Handle Payment Callback

Paysera sends a GET request to your `callbackurl`. Your server **must respond with "OK"**.

```typescript
// Express example
app.get('/payment/callback', async (req, res) => {
  try {
    const result = await client.validateCallback({
      data: req.query.data as string,
      ss1: req.query.ss1 as string,
      ss2: req.query.ss2 as string,
    });

    if (result.status === PaymentStatus.SUCCESSFUL) {
      // Payment successful — update your order
      console.log(`Order ${result.orderid} paid: ${result.amount} ${result.currency}`);
    }

    // IMPORTANT: Always respond with "OK"
    res.send('OK');
  } catch (error) {
    console.error('Invalid callback:', error);
    res.status(400).send('Invalid callback');
  }
});
```

### Validate Callback with Expected Values

You can verify that callback values match your original order:

```typescript
const result = await client.validateCallbackWithExpected(
  { data: req.query.data, ss1: req.query.ss1 },
  { orderid: 'ORDER-123', amount: '1000', currency: 'EUR' },
);
```

### Get Available Payment Methods

```typescript
const methods = await client.getPaymentMethods({
  amount: 1000,
  currency: 'EUR',
});

for (const country of methods.countries) {
  console.log(`Country: ${country.code}`);
  for (const group of country.groups) {
    console.log(`  Group: ${group.title['en']}`);
    for (const method of group.methods) {
      console.log(`    ${method.key}: ${method.title['en']}`);
    }
  }
}
```

## API Reference

### `WebToPayClient`

#### Constructor

```typescript
new WebToPayClient({
  projectId: number;        // Your Paysera project ID
  password: string;         // Your project sign/password
  sandbox?: boolean;        // Use sandbox environment (default: false)
  paymentUrl?: string;      // Override payment URL
  publicKeyUrl?: string;    // Override public key URL
  httpClient?: HttpClient;  // Custom HTTP client for testing
})
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `buildRequest(params)` | `SignedRequest` | Build signed `{data, sign}` (sync) |
| `buildPaymentUrl(params)` | `string` | Build full redirect URL (sync) |
| `buildRepeatRequest(orderId, amount, currency)` | `SignedRequest` | Build repeat payment request (sync) |
| `validateCallback(query)` | `Promise<ParsedCallback>` | Validate and parse callback (async) |
| `validateCallbackWithExpected(query, expected)` | `Promise<ParsedCallback>` | Validate callback + check fields (async) |
| `getPaymentMethods(options?)` | `Promise<PaymentMethodList>` | Fetch payment methods (async, cached) |

### `PaymentRequestParams`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderid` | `string` | Yes | Your order ID (max 40 chars) |
| `accepturl` | `string` | Yes | Success redirect URL |
| `cancelurl` | `string` | Yes | Cancellation redirect URL |
| `callbackurl` | `string` | Yes | Server-to-server callback URL |
| `amount` | `number` | No | Amount in cents |
| `currency` | `string` | No | ISO currency (EUR, USD, etc.) |
| `payment` | `string` | No | Specific payment method key |
| `country` | `string` | No | Payer country code (LT, EE, LV) |
| `lang` | `string` | No | Language (LIT, RUS, ENG, POL) |
| `test` | `0 \| 1` | No | Enable test mode |
| `p_email` | `string` | No | Payer email |
| `p_firstname` | `string` | No | Payer first name |
| `p_lastname` | `string` | No | Payer last name |

### `PaymentStatus` Enum

| Value | Name | Description |
|-------|------|-------------|
| `0` | `NOT_EXECUTED` | Payment not executed |
| `1` | `SUCCESSFUL` | Payment successful |
| `2` | `ACCEPTED` | Accepted but not yet executed |
| `3` | `ADDITIONAL_INFO` | Additional information needed |
| `4` | `EXECUTED_NO_CONFIRMATION` | Executed without bank confirmation |
| `5` | `REFUNDED` | Payment refunded |

## Error Handling

The SDK throws specific error classes:

```typescript
import {
  WebToPayError,
  WebToPayValidationError,
  WebToPayCallbackError,
  WebToPayConfigError,
} from 'paysera-webtopay';

try {
  await client.validateCallback(query);
} catch (error) {
  if (error instanceof WebToPayCallbackError) {
    // Invalid signature or decryption failure
  } else if (error instanceof WebToPayValidationError) {
    // Invalid request parameters
  }
}
```

## Standalone Utilities

For advanced use cases, encoding utilities are exported directly:

```typescript
import { encodeSafeUrlBase64, decodeSafeUrlBase64 } from 'paysera-webtopay';

const encoded = encodeSafeUrlBase64('some data');
const decoded = decodeSafeUrlBase64(encoded);
```

## License

MIT
