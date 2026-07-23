import { describe, it, expect } from 'vitest';
import { MockPaymentProvider, signMockPayload, type MockWebhookPayload } from './mock-provider';

const SECRET = 'test-secret';
const provider = new MockPaymentProvider(SECRET);

describe('MockPaymentProvider', () => {
  it('cria cobrança pendente com brcode determinístico', async () => {
    const charge = await provider.createCharge({ correlationId: 'abc', amountCents: 2500 });
    expect(charge.status).toBe('pending');
    expect(charge.externalChargeId).toBe('mock_abc');
    expect(charge.brCode).toContain('abc');
    expect(charge.amountCents).toBe(2500);
  });

  it('não guarda CPF em claro no payload bruto', async () => {
    const charge = await provider.createCharge({
      correlationId: 'abc',
      amountCents: 2500,
      customer: { name: 'Fulano', taxId: '12345678901' },
    });
    expect(JSON.stringify(charge.raw)).not.toContain('12345678901');
  });

  it('verifica assinatura HMAC válida e rejeita adulteração', () => {
    const payload: MockWebhookPayload = {
      id: 'ev-1',
      event: 'mock.charge.paid',
      charge: { correlationId: 'abc', externalChargeId: 'mock_abc', status: 'COMPLETED', value: 2500 },
      occurredAt: '2026-07-23T12:00:00.000Z',
    };
    const raw = JSON.stringify(payload);
    const sig = signMockPayload(raw, SECRET);

    expect(provider.verifyWebhook(raw, { 'x-mock-signature': sig }).valid).toBe(true);
    expect(provider.verifyWebhook(raw, { 'x-mock-signature': 'deadbeef' }).valid).toBe(false);
    expect(provider.verifyWebhook(raw + ' ', { 'x-mock-signature': sig }).valid).toBe(false);
    expect(provider.verifyWebhook(raw, {}).valid).toBe(false);
  });

  it('parseia webhook para status normalizado', () => {
    const payload: MockWebhookPayload = {
      id: 'ev-1',
      event: 'mock.charge.paid',
      charge: { correlationId: 'abc', externalChargeId: 'mock_abc', status: 'COMPLETED', value: 2500 },
      occurredAt: '2026-07-23T12:00:00.000Z',
    };
    const parsed = provider.parseWebhook(JSON.stringify(payload));
    expect(parsed.chargeStatus).toBe('paid');
    expect(parsed.eventId).toBe('ev-1');
    expect(parsed.correlationId).toBe('abc');
    expect(parsed.amountCents).toBe(2500);
  });
});
