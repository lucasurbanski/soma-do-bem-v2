// Smoke test end-to-end do núcleo financeiro contra o banco DEV real.
// Prova: doação paga -> 4 lançamentos; saldo correto; idempotência (2x = 1 conjunto);
// RLS bloqueia usuário comum de alterar status/ledger.
// Uso: node --env-file=.env.local scripts/smoke-e2e.mjs
import 'dotenv/config';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const applyBps = (amt, bps) => Math.round((amt * bps) / 10000);
let failures = 0;
const assert = (cond, msg) => {
  console.log(`${cond ? '  ✓' : '  ✗ FALHA:'} ${msg}`);
  if (!cond) failures++;
};

async function main() {
  await client.connect();

  // Campanha ativa de demonstração
  const { rows: camps } = await client.query(
    `select id, raised_amount_cents from campaigns where slug = 'tratamento-da-dona-marlene-4a1b2c3d'`,
  );
  const campaign = camps[0];
  if (!campaign) throw new Error('Rode o seed antes (scripts/seed.mjs).');

  console.log('\n== 1) Cria doação + cobrança (mock) ==');
  const gross = 5000; // R$ 50,00
  const { rows: don } = await client.query(
    `insert into donations (campaign_id, donor_name, donor_email, amount_cents, status, provider, consent_terms)
     values ($1,'Teste E2E','e2e@dev.local',$2,'pending','mock',true) returning id`,
    [campaign.id, gross],
  );
  const donationId = don[0].id;
  const { rows: ch } = await client.query(
    `insert into payment_charges (donation_id, provider, correlation_id, external_charge_id, status, amount_cents)
     values ($1,'mock',$2,$3,'pending',$4) returning id`,
    [donationId, donationId, `mock_${donationId}`, gross],
  );
  const chargeId = ch[0].id;
  console.log(`  doação ${donationId.slice(0, 8)} / cobrança ${chargeId.slice(0, 8)} criadas`);

  const gatewayFee = applyBps(gross, 99);
  const platformFee = applyBps(gross, 500);
  const net = gross - gatewayFee - platformFee;

  console.log('\n== 2) Aplica pagamento (webhook -> apply_donation_paid) ==');
  await client.query(`select apply_donation_paid($1,null,now(),$2,$3,$4,$5,true)`, [
    chargeId, gross, gatewayFee, platformFee, net,
  ]);
  const { rows: entries1 } = await client.query(`select count(*)::int n from ledger_entries where campaign_id=$1 and donation_id=$2`, [campaign.id, donationId]);
  assert(entries1[0].n === 4, `4 lançamentos criados (obtido: ${entries1[0].n})`);

  const { rows: bal } = await client.query(`select * from campaign_ledger_balance($1)`, [campaign.id]);
  const b = bal[0];
  assert(Number(b.available_cents) >= net, `saldo disponível >= líquido (${b.available_cents} >= ${net})`);
  const { rows: donRow } = await client.query(`select status from donations where id=$1`, [donationId]);
  assert(donRow[0].status === 'paid', 'doação marcada como paga');

  console.log('\n== 3) IDEMPOTÊNCIA: reaplica o mesmo pagamento ==');
  let dupBlocked = false;
  try {
    await client.query(`select apply_donation_paid($1,null,now(),$2,$3,$4,$5,true)`, [
      chargeId, gross, gatewayFee, platformFee, net,
    ]);
  } catch (e) {
    dupBlocked = e.code === '23505';
  }
  assert(dupBlocked, 'reprocessamento bloqueado por idempotency_key único (23505)');
  const { rows: entries2 } = await client.query(`select count(*)::int n from ledger_entries where campaign_id=$1 and donation_id=$2`, [campaign.id, donationId]);
  assert(entries2[0].n === 4, `ainda 4 lançamentos (sem duplicação) — obtido: ${entries2[0].n}`);

  console.log('\n== 4) Ledger imutável ==');
  let updateBlocked = false;
  try {
    await client.query(`update ledger_entries set amount_cents = 1 where donation_id=$1`, [donationId]);
  } catch {
    updateBlocked = true;
  }
  assert(updateBlocked, 'UPDATE em ledger_entries é bloqueado (imutável)');

  console.log('\n== 5) RLS: usuário anônimo NÃO altera dados financeiros ==');
  const { data: ledgerAnon } = await anon.from('ledger_entries').select('id').limit(1);
  assert((ledgerAnon ?? []).length === 0, 'anon não lê ledger_entries (0 linhas)');
  // anon tenta rebaixar a campanha para draft: RLS deve impedir efeito
  await anon.from('campaigns').update({ status: 'draft' }).eq('id', campaign.id);
  const { rows: statusRows } = await client.query(`select status from campaigns where id=$1`, [campaign.id]);
  assert(statusRows[0].status === 'active', 'anon NÃO conseguiu alterar o status da campanha (RLS)');
  // anon tenta inserir lançamento no ledger
  const { error: insErr } = await anon
    .from('ledger_entries')
    .insert({ group_id: campaign.id, account: 'platform_revenue', entry_type: 'adjustment', direction: 1, amount_cents: 1, idempotency_key: `hack-${Date.now()}` });
  assert(!!insErr, 'anon NÃO consegue inserir no ledger (RLS bloqueia)');

  console.log('\n== 6) Cache da campanha reflete o ledger ==');
  const { rows: campAfter } = await client.query(`select raised_amount_cents from campaigns where id=$1`, [campaign.id]);
  assert(Number(campAfter[0].raised_amount_cents) >= gross, `cache raised >= ${gross} (obtido: ${campAfter[0].raised_amount_cents})`);

  await client.end();
  console.log(`\n${failures === 0 ? '✅ TODOS OS CHECKS PASSARAM' : `❌ ${failures} CHECK(S) FALHARAM`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
