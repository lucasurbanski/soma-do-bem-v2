import { NextResponse } from 'next/server';
import { handleWebhook } from '@/server/webhook-handler';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook do provedor MOCK. Fluxo idêntico ao de um provedor real:
 * 1) recebe o corpo BRUTO, 2) valida a assinatura (HMAC), 3) processa de forma
 * idempotente, 4) responde rápido. O frontend NUNCA confirma pagamento.
 */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request.headers, 'wh-mock'), 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  try {
    const result = await handleWebhook('mock', rawBody, headers);
    // 2xx rápido; corpo mínimo.
    const status = result.outcome === 'invalid_signature' ? 401 : 200;
    return NextResponse.json({ outcome: result.outcome }, { status });
  } catch {
    // Falha no processamento: responde 500 para o provedor reenviar (idempotente).
    return NextResponse.json({ error: 'processing_error' }, { status: 500 });
  }
}
