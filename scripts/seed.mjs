// Seed idempotente de DEV: bucket de Storage, usuários demo (admin/organizador/doador)
// e vaquinhas de exemplo. Uso: node --env-file=.env.local scripts/seed.mjs
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO = {
  admin: { email: 'admin@apoieaqui.dev', password: 'Admin!2026dev', name: 'Administração Demo', role: 'admin' },
  organizer: { email: 'organizador@apoieaqui.dev', password: 'Org!2026dev', name: 'Rafael Dias', role: 'organizer' },
  donor: { email: 'doador@apoieaqui.dev', password: 'Doa!2026dev', name: 'Camila Souza', role: 'donor' },
};

async function ensureBucket() {
  const { data } = await admin.storage.getBucket('campaign-media');
  if (!data) {
    await admin.storage.createBucket('campaign-media', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
    console.log('+ bucket campaign-media criado');
  } else {
    console.log('= bucket campaign-media já existe');
  }
}

async function ensureUser(u) {
  // procura por e-mail
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list.users.find((x) => x.email === u.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`+ usuário ${u.email} criado`);
  } else {
    console.log(`= usuário ${u.email} já existe`);
  }
  // garante papel
  await admin.from('user_roles').upsert({ user_id: user.id, role: u.role });
  await admin.from('profiles').update({ full_name: u.name }).eq('id', user.id);
  return user;
}

async function ensureCampaign(organizerId, { slug, title, story, goal, city, uf, categorySlug, status, raised }) {
  const { data: existing } = await admin.from('campaigns').select('id').eq('slug', slug).maybeSingle();
  const { data: cat } = await admin.from('campaign_categories').select('id').eq('slug', categorySlug).maybeSingle();
  if (existing) {
    console.log(`= vaquinha ${slug} já existe`);
    return existing.id;
  }
  const { data, error } = await admin
    .from('campaigns')
    .insert({
      slug,
      organizer_id: organizerId,
      category_id: cat?.id ?? null,
      title,
      story,
      goal_amount_cents: goal,
      city,
      state_uf: uf,
      status,
      raised_amount_cents: raised ?? 0,
      published_at: status === 'active' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  await admin.from('campaign_status_history').insert({
    campaign_id: data.id,
    from_status: null,
    to_status: status,
    changed_by: organizerId,
  });
  console.log(`+ vaquinha ${slug} criada (${status})`);
  return data.id;
}

async function main() {
  await ensureBucket();
  const org = await ensureUser(DEMO.organizer);
  await ensureUser(DEMO.admin);
  await ensureUser(DEMO.donor);

  await ensureCampaign(org.id, {
    slug: 'tratamento-da-dona-marlene-4a1b2c3d',
    title: 'Tratamento da Dona Marlene',
    story:
      'A Dona Marlene precisa de apoio para custear seu tratamento de saúde. Cada contribuição faz diferença para a recuperação dela e para a tranquilidade da família.',
    goal: 800000,
    city: 'Joinville',
    uf: 'SC',
    categorySlug: 'saude',
    status: 'active',
  });
  await ensureCampaign(org.id, {
    slug: 'resgate-de-animais-abandonados-9f8e7d6c',
    title: 'Resgate de animais abandonados',
    story:
      'Ajude nosso grupo a resgatar, tratar e encontrar lares para animais abandonados na nossa cidade. O valor cobre vacinas, castrações e alimentação.',
    goal: 500000,
    city: 'Florianópolis',
    uf: 'SC',
    categorySlug: 'animais',
    status: 'active',
  });
  await ensureCampaign(org.id, {
    slug: 'reforma-da-quadra-comunitaria-1a2b3c4d',
    title: 'Reforma da quadra comunitária',
    story: 'Vamos reformar a quadra do bairro para a criançada ter um espaço seguro para brincar e praticar esporte.',
    goal: 1200000,
    city: 'Curitiba',
    uf: 'PR',
    categorySlug: 'comunidade',
    status: 'pending_review',
  });

  console.log('\nSeed concluído.');
  console.log('Usuários demo (DEV):');
  console.log('  admin:       admin@apoieaqui.dev / Admin!2026dev');
  console.log('  organizador: organizador@apoieaqui.dev / Org!2026dev');
  console.log('  doador:      doador@apoieaqui.dev / Doa!2026dev');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
