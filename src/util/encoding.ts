export function encodeSafeUrlBase64(text: string): string {
  const base64 = Buffer.from(text, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_');
}

export function decodeSafeUrlBase64(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}
