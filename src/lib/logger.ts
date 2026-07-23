/**
 * Logger estruturado (JSON) com redação de campos sensíveis.
 * Nunca logue CPF, e-mail, telefone, endereço, dados bancários ou payloads
 * de pagamento em claro. Use correlation ids e identificadores internos.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = [
  'cpf',
  'cpf_digits',
  'taxid',
  'password',
  'senha',
  'authorization',
  'service_role',
  'bank_payload',
  'brcode',
  'raw_payload',
  'email',
  'phone',
  'phone_e164',
];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.includes(k.toLowerCase()) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  campaignId?: string;
  paymentChargeId?: string;
  webhookEventId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const line = JSON.stringify({
    level,
    message,
    ...(context ? (redact(context) as object) : {}),
    ts: new Date().toISOString(),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (m: string, c?: LogContext) => emit('debug', m, c),
  info: (m: string, c?: LogContext) => emit('info', m, c),
  warn: (m: string, c?: LogContext) => emit('warn', m, c),
  error: (m: string, c?: LogContext) => emit('error', m, c),
};
