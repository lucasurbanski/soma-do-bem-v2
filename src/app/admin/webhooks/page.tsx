import { requireStaff } from '@/features/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminPageHeader, DataTable } from '@/components/admin/DataTable';

export const dynamic = 'force-dynamic';

export default async function AdminWebhooks() {
  await requireStaff();
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('payment_webhook_events')
    .select('id, provider, event_type, event_id, signature_valid, processed_at, received_at')
    .order('received_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <AdminPageHeader
        title="Eventos de webhook"
        subtitle="Recepção idempotente de eventos de pagamento (mock nesta fase). Payload bruto não é exibido."
      />
      <DataTable
        columns={['Provedor', 'Evento', 'ID do evento', 'Assinatura', 'Processado', 'Recebido']}
        rows={(data ?? []).map((w) => [
          w.provider,
          w.event_type,
          w.event_id.slice(0, 16),
          w.signature_valid ? '✅' : '❌',
          w.processed_at ? '✅' : '⏳',
          new Date(w.received_at).toLocaleString('pt-BR'),
        ])}
        empty="Nenhum evento recebido ainda."
      />
    </div>
  );
}
