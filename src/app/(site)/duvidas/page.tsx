import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Dúvidas frequentes' };

const faqs = [
  {
    q: 'Como funciona uma vaquinha online?',
    a: 'Você cria a vaquinha, conta sua história, define uma meta e compartilha o link. As pessoas contribuem por Pix e você acompanha tudo pelo painel.',
  },
  {
    q: 'Preciso ter conta no banco para criar?',
    a: 'Não para criar. Os dados bancários só são solicitados quando você for sacar o valor arrecadado.',
  },
  {
    q: 'Quais as taxas para criar uma vaquinha?',
    a: 'Criar é gratuito. Há uma taxa apenas sobre as contribuições recebidas, detalhada em Taxas e prazos.',
  },
  {
    q: 'Quando o valor arrecadado é confirmado?',
    a: 'Somente após a confirmação do pagamento pelo provedor. Por segurança, nenhuma confirmação feita no navegador vale como pagamento.',
  },
  {
    q: 'Minha vaquinha precisa ser aprovada?',
    a: 'Sim. Toda vaquinha passa por moderação antes de ficar pública, para manter a plataforma segura e confiável.',
  },
];

export default function Duvidas() {
  return (
    <Prose title="Dúvidas frequentes">
      {faqs.map((f) => (
        <div key={f.q}>
          <h2>{f.q}</h2>
          <p>{f.a}</p>
        </div>
      ))}
    </Prose>
  );
}
