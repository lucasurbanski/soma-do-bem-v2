import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function Termos() {
  return (
    <Prose title="Termos de uso">
      <p className="text-sm text-ink-soft">Versão vigente: 2025-07-01</p>
      <p>
        Estes Termos regem o uso da plataforma Apoie Aqui, operada pela Soma do Bem. Ao criar uma
        conta, criar uma vaquinha ou contribuir, você declara que leu e concorda com estas condições.
      </p>
      <h2>1. Elegibilidade</h2>
      <p>É necessário ser maior de 18 anos e fornecer informações verdadeiras e atualizadas.</p>
      <h2>2. Vaquinhas e organizadores</h2>
      <p>
        O organizador é responsável pela veracidade das informações e pela destinação dos recursos.
        Vaquinhas passam por moderação e podem ser recusadas, pausadas ou encerradas em caso de
        violação destes Termos, fraude ou denúncia procedente.
      </p>
      <h2>3. Contribuições</h2>
      <p>
        As contribuições são voluntárias. A confirmação de pagamento ocorre exclusivamente após o
        processamento pelo provedor de pagamento; nenhuma confirmação informada no navegador é válida
        para fins financeiros.
      </p>
      <h2>4. Taxas</h2>
      <p>
        A plataforma cobra taxas sobre contribuições recebidas, detalhadas na página de Taxas e
        prazos, que integra estes Termos.
      </p>
      <h2>5. Saques</h2>
      <p>
        O saque do saldo disponível segue as regras de liberação vigentes e pode exigir verificação
        de identidade (KYC) e dados bancários do titular.
      </p>
      <h2>6. Condutas proibidas</h2>
      <ul>
        <li>Fornecer informações falsas ou enganosas.</li>
        <li>Utilizar a plataforma para fins ilícitos ou lavagem de dinheiro.</li>
        <li>Tentar burlar mecanismos de segurança ou pagamentos.</li>
      </ul>
      <h2>7. Alterações</h2>
      <p>
        Estes Termos podem ser atualizados; a versão vigente é sempre identificada por data. O uso
        continuado após alterações implica concordância.
      </p>
      <p className="rounded-lg bg-surface-warm px-4 py-3 text-sm">
        📝 Este é o texto operacional da plataforma. A redação jurídica definitiva deve ser validada
        pelo jurídico da Soma do Bem antes da produção.
      </p>
    </Prose>
  );
}
