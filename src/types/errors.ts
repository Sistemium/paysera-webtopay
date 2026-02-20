export enum WebToPayErrorCode {
  E_MISSING = 1,
  E_MAXLEN = 2,
  E_REGEXP = 3,
  E_INVALID = 4,
}

export class WebToPayError extends Error {
  constructor(
    message: string,
    public code?: WebToPayErrorCode,
  ) {
    super(message);
    this.name = 'WebToPayError';
  }
}

export class WebToPayValidationError extends WebToPayError {
  constructor(
    message: string,
    code: WebToPayErrorCode,
    public field?: string,
  ) {
    super(message, code);
    this.name = 'WebToPayValidationError';
  }
}

export class WebToPayCallbackError extends WebToPayError {
  constructor(message: string, code?: WebToPayErrorCode) {
    super(message, code);
    this.name = 'WebToPayCallbackError';
  }
}

export class WebToPayConfigError extends WebToPayError {
  constructor(message: string) {
    super(message);
    this.name = 'WebToPayConfigError';
  }
}
