import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Política de privacidade' };

export default function Privacidade() {
  return (
    <Prose title="Política de privacidade">
      <p className="text-sm text-ink-soft">Versão vigente: 2025-07-01</p>
      <p>
        A Soma do Bem respeita sua privacidade e trata dados pessoais em conformidade com a Lei Geral
        de Proteção de Dados (LGPD). Esta política explica quais dados coletamos e como os usamos.
      </p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail e senha (armazenada de forma cifrada).</li>
        <li>Organizador: CPF, data de nascimento, telefone e endereço — usados para verificação.</li>
        <li>Contribuições: nome, e-mail e valor, para emissão de recibo e comunicação.</li>
      </ul>
      <h2>Como usamos</h2>
      <p>
        Utilizamos os dados para operar a plataforma, prevenir fraudes, cumprir obrigações legais e
        melhorar a experiência. Dados sensíveis como CPF e informações bancárias{' '}
        <strong>nunca são exibidos publicamente</strong> e têm acesso restrito.
      </p>
      <h2>Compartilhamento</h2>
      <p>
        Compartilhamos dados apenas com prestadores essenciais (por exemplo, o provedor de
        pagamentos) e quando exigido por lei. Não vendemos dados pessoais e não enviamos informações
        sensíveis a ferramentas de analytics.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão dos seus dados. A exclusão/anonimização
        respeita as obrigações legais de retenção (por exemplo, registros financeiros).
      </p>
      <h2>Segurança</h2>
      <p>
        Adotamos controles de acesso, criptografia em trânsito, Row Level Security no banco e trilha
        de auditoria para proteger suas informações.
      </p>
    </Prose>
  );
}
