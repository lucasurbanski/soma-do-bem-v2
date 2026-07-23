import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Taxas e prazos' };
export const dynamic = 'force-dynamic';

export default async function Taxas() {
  const supabase = await createSupabaseServerClient();
  const { data: fee } = await supabase
    .from('platform_fees')
    .select('platform_fee_bps, min_contribution_cents')
    .eq('is_active', true)
    .maybeSingle();

  const platformPct = fee ? (fee.platform_fee_bps / 100).toLocaleString('pt-BR') : '5';
  const minContribution = fee ? (Number(fee.min_contribution_cents) / 100).toFixed(2) : '5,00';

  return (
    <Prose title="Taxas e prazos">
      <p>
        Criar e divulgar sua vaquinha é <strong>gratuito</strong>. A plataforma cobra uma taxa apenas
        sobre as contribuições efetivamente recebidas, usada para manter o serviço seguro, o suporte
        e a operação de pagamentos.
      </p>
      <h2>Taxa da plataforma</h2>
      <p>
        Atualmente, a taxa da plataforma é de <strong>{platformPct}%</strong> sobre cada
        contribuição confirmada. Sobre esse valor também incide a taxa do provedor de pagamento (Pix).
      </p>
      <h2>Contribuição mínima</h2>
      <p>O valor mínimo por contribuição é de R$ {minContribution}.</p>
      <h2>Prazos</h2>
      <p>
        As contribuições por Pix são confirmadas de forma rápida. O prazo de liberação do saldo para
        saque e eventuais reservas de segurança seguem as regras vigentes, sempre exibidas de forma
        transparente no seu painel.
      </p>
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm">
        ⚠️ Os percentuais e prazos exibidos aqui são configuráveis e podem ser ajustados. Os valores
        oficiais são sempre os vigentes no momento da sua contribuição ou saque.
      </p>
    </Prose>
  );
}
