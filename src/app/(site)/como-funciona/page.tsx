import type { Metadata } from 'next';
import Link from 'next/link';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Como funciona' };

export default function ComoFunciona() {
  return (
    <Prose title="Como funciona uma vaquinha online">
      <p>
        Na Soma do Bem, acreditamos que toda boa história merece um começo forte. Criar sua vaquinha
        é simples, gratuito e leva poucos minutos.
      </p>
      <h2>1. Crie sua vaquinha</h2>
      <p>
        Conte sua história, escolha uma categoria, defina a meta e adicione uma imagem. Você pode
        salvar como rascunho e continuar depois.
      </p>
      <h2>2. Envie para análise</h2>
      <p>
        Antes de publicar, nossa equipe revisa cada vaquinha para manter a plataforma segura e
        confiável para doadores e organizadores.
      </p>
      <h2>3. Compartilhe e receba</h2>
      <p>
        Com a vaquinha aprovada, compartilhe o link com amigos e nas redes. As contribuições chegam
        por Pix e você acompanha tudo pelo seu painel, com saldo e histórico transparentes.
      </p>
      <h2>4. Saque com segurança</h2>
      <p>
        Quando quiser, solicite o saque do saldo disponível. Os dados bancários só são pedidos nesse
        momento — nunca antes.
      </p>
      <p>
        <Link href="/criar-vaquinha">Comece agora a sua vaquinha →</Link>
      </p>
    </Prose>
  );
}
