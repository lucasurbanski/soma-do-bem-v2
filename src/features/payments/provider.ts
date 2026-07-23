/**
 * Abstração de provedor de pagamentos (Pix).
 * Implementações: MockPaymentProvider (dev) e WooviPaymentProvider (desativado).
 * Toda a lógica financeira sensível roda no servidor; o frontend nunca confirma pagamento.
 */
import type { Cents } from '@/lib/money';

export type ProviderName = 'mock' | 'woovi';

export type NormalizedChargeStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'expired'
  | 'failed';

export interface CreateChargeInput {
  /** identificador interno idempotente (não vaza dados sensíveis) */
  correlationId: string;
  amountCents: Cents;
  comment?: string;
  /** dados de cliente são opcionais; nunca logados em claro */
  customer?: {
    name?: string;
    email?: string;
    taxId?: string; // CPF (nunca em log)
    phone?: string;
  };
  expiresInSeconds?: number;
}

export interface NormalizedCharge {
  provider: ProviderName;
  correlationId: string;
  externalChargeId: string;
  status: NormalizedChargeStatus;
  amountCents: Cents;
  brCode?: string; // Pix copia-e-cola
  qrCodeImageUrl?: string;
  expiresAt?: string; // ISO
  raw?: unknown; // payload bruto (uso server-side/auditoria)
}

export interface RefundInput {
  correlationId: string;
  externalChargeId: string;
  amountCents: Cents;
  reason?: string;
}

export interface NormalizedRefund {
  provider: ProviderName;
  correlationId: string;
  externalRefundId: string;
  amountCents: Cents;
  status: 'requested' | 'confirmed' | 'rejected';
  raw?: unknown;
}

/** Resultado normalizado da verificação/parse de um webhook. */
export interface ParsedWebhook {
  provider: ProviderName;
  /** identificador ÚNICO do evento (idempotência) */
  eventId: string;
  eventType: string;
  /** status normalizado da cobrança, se aplicável */
  chargeStatus?: NormalizedChargeStatus;
  correlationId?: string;
  externalChargeId?: string;
  amountCents?: Cents;
  occurredAt?: string;
  raw: unknown;
}

export interface WebhookVerification {
  valid: boolean;
  reason?: string;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  createCharge(input: CreateChargeInput): Promise<NormalizedCharge>;
  getCharge(externalChargeId: string): Promise<NormalizedCharge>;
  expireCharge(externalChargeId: string): Promise<NormalizedCharge>;
  refundCharge(input: RefundInput): Promise<NormalizedRefund>;
  /** valida assinatura/autenticidade do webhook a partir do corpo BRUTO e headers */
  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerification;
  /** extrai/normaliza o evento do webhook já validado */
  parseWebhook(rawBody: string, headers: Record<string, string>): ParsedWebhook;
  /** reconciliação server-side: consulta o provedor e devolve o estado atual */
  reconcileCharge(externalChargeId: string): Promise<NormalizedCharge>;
}
