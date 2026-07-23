/**
 * WooviPaymentProvider — DESATIVADO por padrão (WOOVI_ENABLED=false).
 *
 * Somente código de servidor. Lê credenciais de variáveis de ambiente.
 * Implementa APENAS contratos documentados oficialmente (ver docs/09-woovi-readiness.md):
 *   - Auth: header Authorization: <AppID>
 *   - Base URL sandbox: https://api.woovi-sandbox.com | prod: https://api.openpix.com.br
 *   - Charge:   POST   /api/v1/charge            (value em centavos, correlationID idempotente)
 *   - Get:      GET    /api/v1/charge/{id}
 *   - Expire:   DELETE /api/v1/charge/{id}
 *   - Refund:   POST   /api/v1/charge/{id}/refund
 *   - Webhook:  HMAC-SHA1 base64 em X-OpenPix-Signature  OU  RSA-SHA256 em x-webhook-signature
 *
 * NÃO implementa recursos que dependem de habilitação comercial (split, subcontas,
 * saque/transfer, KYC/partner). Esses ficam como contratos/feature flags (ver docs/07, docs/09).
 *
 * ⚠️ Enquanto WOOVI_ENABLED/PAYMENTS_ENABLED estiverem false, qualquer chamada de rede lança erro.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateChargeInput,
  NormalizedCharge,
  NormalizedChargeStatus,
  NormalizedRefund,
  ParsedWebhook,
  PaymentProvider,
  RefundInput,
  WebhookVerification,
} from './provider';

export interface WooviConfig {
  enabled: boolean;
  appId: string;
  baseUrl: string;
  hmacSecret?: string;
  timeoutMs?: number;
}

class WooviDisabledError extends Error {
  constructor() {
    super('WooviPaymentProvider está desativado (WOOVI_ENABLED=false). Ative apenas no sandbox.');
    this.name = 'WooviDisabledError';
  }
}

function mapStatus(status: string | undefined): NormalizedChargeStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'paid';
    case 'EXPIRED':
      return 'expired';
    case 'ACTIVE':
      return 'pending';
    default:
      return 'created';
  }
}

export class WooviPaymentProvider implements PaymentProvider {
  readonly name = 'woovi' as const;

  constructor(private readonly config: WooviConfig) {}

  private assertEnabled() {
    if (!this.config.enabled || !this.config.appId) {
      throw new WooviDisabledError();
    }
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    this.assertEnabled();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 12_000);
    try {
      const res = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.config.appId, // AppID puro (sem "Bearer") — ver docs/09
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        // não loga corpo (pode conter dados sensíveis); usa status + correlation
        throw new Error(`Woovi HTTP ${res.status} em ${method} ${path}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async createCharge(input: CreateChargeInput): Promise<NormalizedCharge> {
    // POST /api/v1/charge — correlationID garante idempotência na criação.
    const data = await this.request<{ charge?: Record<string, unknown> }>(
      '/api/v1/charge',
      'POST',
      {
        correlationID: input.correlationId,
        value: input.amountCents, // centavos
        comment: input.comment,
        ...(input.customer
          ? {
              customer: {
                name: input.customer.name,
                email: input.customer.email,
                phone: input.customer.phone,
                taxID: input.customer.taxId,
              },
            }
          : {}),
        ...(input.expiresInSeconds ? { expiresIn: input.expiresInSeconds } : {}),
      },
    );
    const charge = data.charge ?? {};
    return {
      provider: 'woovi',
      correlationId: input.correlationId,
      externalChargeId: String(charge['identifier'] ?? charge['transactionID'] ?? ''),
      status: mapStatus(charge['status'] as string),
      amountCents: input.amountCents,
      brCode: charge['brCode'] as string | undefined,
      qrCodeImageUrl: charge['qrCodeImage'] as string | undefined,
      expiresAt: charge['expiresDate'] as string | undefined,
      raw: charge,
    };
  }

  async getCharge(externalChargeId: string): Promise<NormalizedCharge> {
    const data = await this.request<{ charge?: Record<string, unknown> }>(
      `/api/v1/charge/${encodeURIComponent(externalChargeId)}`,
      'GET',
    );
    const charge = data.charge ?? {};
    return {
      provider: 'woovi',
      correlationId: String(charge['correlationID'] ?? ''),
      externalChargeId,
      status: mapStatus(charge['status'] as string),
      amountCents: Number(charge['value'] ?? 0),
      brCode: charge['brCode'] as string | undefined,
      raw: charge,
    };
  }

  async expireCharge(externalChargeId: string): Promise<NormalizedCharge> {
    await this.request(`/api/v1/charge/${encodeURIComponent(externalChargeId)}`, 'DELETE');
    return {
      provider: 'woovi',
      correlationId: '',
      externalChargeId,
      status: 'expired',
      amountCents: 0,
    };
  }

  async refundCharge(input: RefundInput): Promise<NormalizedRefund> {
    const data = await this.request<{ refund?: Record<string, unknown> }>(
      `/api/v1/charge/${encodeURIComponent(input.externalChargeId)}/refund`,
      'POST',
      { correlationID: input.correlationId, value: input.amountCents, comment: input.reason },
    );
    const refund = data.refund ?? {};
    return {
      provider: 'woovi',
      correlationId: input.correlationId,
      externalRefundId: String(refund['id'] ?? refund['correlationID'] ?? ''),
      amountCents: input.amountCents,
      status: 'requested',
      raw: refund,
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerification {
    // Método HMAC-SHA1 base64 em X-OpenPix-Signature (ver docs/09).
    // O método RSA-SHA256 (x-webhook-signature) exige a chave pública oficial e
    // fica como TODO de hardening antes de ativar em produção.
    if (!this.config.hmacSecret) {
      return { valid: false, reason: 'WOOVI_WEBHOOK_HMAC_SECRET ausente' };
    }
    const provided = headers['x-openpix-signature'] ?? headers['X-OpenPix-Signature'];
    if (!provided) return { valid: false, reason: 'assinatura ausente' };
    const expected = createHmac('sha1', this.config.hmacSecret).update(rawBody, 'utf8').digest('base64');
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b)
        ? { valid: true }
        : { valid: false, reason: 'assinatura inválida' };
    } catch {
      return { valid: false, reason: 'assinatura malformada' };
    }
  }

  parseWebhook(rawBody: string): ParsedWebhook {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      charge?: Record<string, unknown>;
      pix?: Record<string, unknown>;
    };
    const charge = payload.charge ?? {};
    // eventId: usa endToEndId/transactionID/correlationID como chave única disponível.
    const pix = payload.pix ?? {};
    const eventId = String(
      pix['endToEndId'] ?? charge['transactionID'] ?? charge['correlationID'] ?? '',
    );
    return {
      provider: 'woovi',
      eventId,
      eventType: payload.event ?? 'unknown',
      chargeStatus: mapStatus(charge['status'] as string),
      correlationId: charge['correlationID'] as string | undefined,
      externalChargeId: charge['identifier'] as string | undefined,
      amountCents: Number(charge['value'] ?? 0),
      raw: payload,
    };
  }

  async reconcileCharge(externalChargeId: string): Promise<NormalizedCharge> {
    return this.getCharge(externalChargeId);
  }
}
