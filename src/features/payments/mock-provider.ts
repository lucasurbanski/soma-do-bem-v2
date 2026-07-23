/**
 * MockPaymentProvider — provedor de pagamentos para DESENVOLVIMENTO.
 * Permite exercitar todo o fluxo (criar cobrança, confirmar via webhook,
 * reembolsar) SEM dinheiro real. A confirmação é simulada apenas em dev e
 * SEMPRE passa pelo mesmo pipeline de webhook (idempotente).
 *
 * O webhook mock é assinado com HMAC-SHA256 usando MOCK_WEBHOOK_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateChargeInput,
  NormalizedCharge,
  NormalizedRefund,
  ParsedWebhook,
  PaymentProvider,
  RefundInput,
  WebhookVerification,
} from './provider';

const MOCK_HEADER = 'x-mock-signature';

function fakeBrCode(correlationId: string, amountCents: number): string {
  // Não é um BR Code Pix real — apenas um placeholder determinístico p/ dev.
  return `MOCK-PIX-${correlationId}-${amountCents}`;
}

export interface MockWebhookPayload {
  id: string; // eventId (único)
  event: 'mock.charge.paid' | 'mock.charge.expired';
  charge: {
    correlationId: string;
    externalChargeId: string;
    status: 'COMPLETED' | 'EXPIRED';
    value: number; // centavos
  };
  occurredAt: string;
}

export function signMockPayload(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  constructor(private readonly webhookSecret: string) {}

  async createCharge(input: CreateChargeInput): Promise<NormalizedCharge> {
    const externalChargeId = `mock_${input.correlationId}`;
    const expiresAt = input.expiresInSeconds
      ? new Date(Date.now() + input.expiresInSeconds * 1000).toISOString()
      : undefined;
    return {
      provider: 'mock',
      correlationId: input.correlationId,
      externalChargeId,
      status: 'pending',
      amountCents: input.amountCents,
      brCode: fakeBrCode(input.correlationId, input.amountCents),
      qrCodeImageUrl: undefined,
      expiresAt,
      // não guarda CPF (taxId) em claro no payload bruto
      raw: {
        mock: true,
        correlationId: input.correlationId,
        amountCents: input.amountCents,
        comment: input.comment,
        customer: input.customer
          ? { name: input.customer.name, email: input.customer.email, phone: input.customer.phone }
          : undefined,
      },
    };
  }

  async getCharge(externalChargeId: string): Promise<NormalizedCharge> {
    // Mock é stateless; o estado real vive no banco. Retorna "pending" por padrão.
    return {
      provider: 'mock',
      correlationId: externalChargeId.replace(/^mock_/, ''),
      externalChargeId,
      status: 'pending',
      amountCents: 0,
    };
  }

  async expireCharge(externalChargeId: string): Promise<NormalizedCharge> {
    return {
      provider: 'mock',
      correlationId: externalChargeId.replace(/^mock_/, ''),
      externalChargeId,
      status: 'expired',
      amountCents: 0,
    };
  }

  async refundCharge(input: RefundInput): Promise<NormalizedRefund> {
    return {
      provider: 'mock',
      correlationId: input.correlationId,
      externalRefundId: `mockref_${input.correlationId}`,
      amountCents: input.amountCents,
      status: 'confirmed',
      raw: { mock: true },
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerification {
    const provided = headers[MOCK_HEADER] ?? headers[MOCK_HEADER.toLowerCase()];
    if (!provided) return { valid: false, reason: 'assinatura ausente' };
    const expected = signMockPayload(rawBody, this.webhookSecret);
    try {
      const a = Buffer.from(provided, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length) return { valid: false, reason: 'assinatura inválida' };
      return timingSafeEqual(a, b)
        ? { valid: true }
        : { valid: false, reason: 'assinatura inválida' };
    } catch {
      return { valid: false, reason: 'assinatura malformada' };
    }
  }

  parseWebhook(rawBody: string): ParsedWebhook {
    const payload = JSON.parse(rawBody) as MockWebhookPayload;
    const chargeStatus =
      payload.event === 'mock.charge.paid'
        ? 'paid'
        : payload.event === 'mock.charge.expired'
          ? 'expired'
          : 'pending';
    return {
      provider: 'mock',
      eventId: payload.id,
      eventType: payload.event,
      chargeStatus,
      correlationId: payload.charge.correlationId,
      externalChargeId: payload.charge.externalChargeId,
      amountCents: payload.charge.value,
      occurredAt: payload.occurredAt,
      raw: payload,
    };
  }

  async reconcileCharge(externalChargeId: string): Promise<NormalizedCharge> {
    return this.getCharge(externalChargeId);
  }
}
