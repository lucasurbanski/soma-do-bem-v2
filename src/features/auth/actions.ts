'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export interface AuthState {
  error?: string;
  ok?: boolean;
  info?: string;
}

// Mensagens genéricas (previne enumeração de usuários).
const GENERIC_LOGIN_ERROR = 'E-mail ou senha inválidos.';

const emailSchema = z.string().email('Informe um e-mail válido.');
const passwordSchema = z.string().min(8, 'A senha deve ter ao menos 8 caracteres.');

async function limitOrThrow(prefix: string, limit = 8, windowMs = 60_000) {
  const h = await headers();
  const res = rateLimit(clientKey(h, prefix), limit, windowMs);
  if (!res.ok) {
    throw new Error('Muitas tentativas. Tente novamente em instantes.');
  }
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  try {
    await limitOrThrow('login');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro' };
  }

  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, 'Informe a senha.') })
    .safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_LOGIN_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logger.warn('login_failed', { correlationId: 'auth' });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const next = String(formData.get('next') || '/painel');
  redirect(next.startsWith('/') ? next : '/painel');
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  try {
    await limitOrThrow('register', 5, 60_000);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro' };
  }

  const parsed = z
    .object({
      fullName: z.string().min(2, 'Informe seu nome completo.').max(120),
      email: emailSchema,
      password: passwordSchema,
      acceptTerms: z.literal('on', { errorMap: () => ({ message: 'É preciso aceitar os termos.' }) }),
    })
    .safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      password: formData.get('password'),
      acceptTerms: formData.get('acceptTerms'),
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const admin = createSupabaseAdminClient();

  // Cria usuário já confirmado (fluxo de DEV; em produção usar signUp + verificação por e-mail).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (createErr || !created.user) {
    // mensagem genérica (não revela se o e-mail já existe)
    logger.warn('register_failed', {});
    return { error: 'Não foi possível concluir o cadastro. Verifique os dados e tente novamente.' };
  }

  // Registra aceite de termos versionado.
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'terms_version')
    .maybeSingle();
  const termsVersion = typeof setting?.value === 'string' ? setting.value : String(setting?.value ?? 'v1');
  const h = await headers();
  await admin.from('terms_acceptances').insert({
    user_id: created.user.id,
    email: parsed.data.email,
    terms_version: termsVersion,
    document_kind: 'terms_of_use',
    user_agent: h.get('user-agent') ?? null,
  });

  // Inicia sessão.
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) {
    return { ok: true, info: 'Conta criada! Faça login para continuar.' };
  }

  redirect('/onboarding');
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  try {
    await limitOrThrow('forgot', 5, 60_000);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro' };
  }
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) {
    return { error: 'Informe um e-mail válido.' };
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data);
  // Resposta sempre genérica (previne enumeração).
  return {
    ok: true,
    info: 'Se este e-mail estiver cadastrado, enviaremos instruções de recuperação.',
  };
}
