import { getRoutes, type Environment, type Routes } from './config';
import { RequestBuilder } from './request-builder';
import { CallbackValidator } from './callback-validator';
import { PaymentMethodListProvider } from './payment-methods';
import { SS1SignChecker } from './sign/ss1-sign-checker';
import { SSOpenSslSignChecker } from './sign/ss-openssl-sign-checker';
import type { SignChecker } from './sign/sign-checker';
import { NodeHttpClient, type HttpClient } from './util/http';
import type { PaymentRequestParams, SignedRequest } from './types/request';
import type { CallbackQuery, ParsedCallback } from './types/callback';
import type { PaymentMethodList, PaymentMethodOptions } from './types/payment-method';
import { WebToPayConfigError } from './types/errors';

export interface WebToPayClientConfig {
  projectId: number;
  password: string;
  sandbox?: boolean;

  // Override URLs for testing
  paymentUrl?: string;
  publicKeyUrl?: string;
  paymentMethodListUrl?: string;

  // Dependency injection for testability
  httpClient?: HttpClient;
}

export class WebToPayClient {
  private routes: Routes;
  private requestBuilder: RequestBuilder;
  private httpClient: HttpClient;
  private cachedPublicKey: string | null = null;
  private paymentMethodProvider: PaymentMethodListProvider | null = null;

  constructor(private config: WebToPayClientConfig) {
    if (!config.projectId) {
      throw new WebToPayConfigError('projectId is required');
    }
    if (!config.password) {
      throw new WebToPayConfigError('password is required');
    }

    const env: Environment = config.sandbox ? 'sandbox' : 'production';
    this.routes = getRoutes(env);

    // Apply URL overrides
    if (config.paymentUrl) this.routes.payment = config.paymentUrl;
    if (config.publicKeyUrl) this.routes.publicKey = config.publicKeyUrl;
    if (config.paymentMethodListUrl) this.routes.paymentMethodList = config.paymentMethodListUrl;

    this.httpClient = config.httpClient || new NodeHttpClient();
    this.requestBuilder = new RequestBuilder(config.projectId, config.password);
  }

  /**
   * Build a signed payment request (data + sign).
   * Synchronous — no network calls.
   */
  buildRequest(params: PaymentRequestParams): SignedRequest {
    return this.requestBuilder.buildRequest(params);
  }

  /**
   * Build a complete payment redirect URL.
   * Synchronous — no network calls.
   */
  buildPaymentUrl(params: PaymentRequestParams): string {
    return this.requestBuilder.buildRequestUrl(params, this.routes.payment);
  }

  /**
   * Build a repeat payment request.
   * Synchronous — no network calls.
   */
  buildRepeatRequest(orderId: string, amount: number, currency: string): SignedRequest {
    return this.requestBuilder.buildRepeatRequest(orderId, amount, currency);
  }

  /**
   * Validate and parse a callback from Paysera.
   * Async — may fetch the RSA public key on first call (for SS2/SS3 verification).
   */
  async validateCallback(query: CallbackQuery): Promise<ParsedCallback> {
    const signChecker = await this.getSignChecker(query);
    const validator = new CallbackValidator(
      this.config.projectId,
      signChecker,
      this.config.password,
    );
    return validator.validateAndParseData(query);
  }

  /**
   * Validate callback and check that expected fields match.
   * Convenience method combining validation and field checking.
   */
  async validateCallbackWithExpected(
    query: CallbackQuery,
    expected: Partial<ParsedCallback>,
  ): Promise<ParsedCallback> {
    const signChecker = await this.getSignChecker(query);
    const validator = new CallbackValidator(
      this.config.projectId,
      signChecker,
      this.config.password,
    );
    const result = validator.validateAndParseData(query);
    validator.checkExpectedFields(result, expected);
    return result;
  }

  /**
   * Get available payment methods from Paysera.
   * Async — fetches XML from Paysera API. Results are cached.
   */
  async getPaymentMethods(options?: PaymentMethodOptions): Promise<PaymentMethodList> {
    if (!this.paymentMethodProvider) {
      this.paymentMethodProvider = new PaymentMethodListProvider(
        this.config.projectId,
        this.routes.paymentMethodList,
        this.httpClient,
      );
    }
    return this.paymentMethodProvider.getPaymentMethodList(options);
  }

  private async getSignChecker(query: CallbackQuery): Promise<SignChecker> {
    // If SS2 or SS3 is present, use RSA verification
    if (query.ss2 || query.ss3) {
      const publicKey = await this.fetchPublicKey();
      return new SSOpenSslSignChecker(publicKey);
    }

    // Fall back to SS1 (MD5)
    return new SS1SignChecker(this.config.password);
  }

  private async fetchPublicKey(): Promise<string> {
    if (this.cachedPublicKey) {
      return this.cachedPublicKey;
    }

    this.cachedPublicKey = await this.httpClient.get(this.routes.publicKey);
    return this.cachedPublicKey;
  }
}
