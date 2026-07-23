import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Fale conosco' };

export default function Contato() {
  return (
    <Prose title="Fale conosco">
      <p>
        Precisa de ajuda ou quer falar com a nossa equipe? Estamos por aqui para apoiar organizadores
        e doadores.
      </p>
      <h2>Atendimento</h2>
      <p>
        E-mail: <a href="mailto:contato@somadobem.com.br">contato@somadobem.com.br</a>
      </p>
      <p>
        Trabalhe conosco: envie seu currículo para{' '}
        <a href="mailto:vagas@somadobem.com.br">vagas@somadobem.com.br</a>.
      </p>
      <p className="text-sm text-ink-soft">Soma do Bem · Joinville, Santa Catarina.</p>
    </Prose>
  );
}
