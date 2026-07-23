import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';

export const metadata: Metadata = { title: 'Quem somos' };

export default function Sobre() {
  return (
    <Prose title="Quem somos">
      <p>
        A <strong>Soma do Bem</strong> é uma empresa orgulhosamente catarinense, nascida em
        Joinville, com a missão de conectar histórias reais a pessoas dispostas a ajudar. Através da
        plataforma <strong>Apoie Aqui</strong>, tornamos simples e seguro criar uma vaquinha e
        receber contribuições para transformar objetivos em realidade.
      </p>
      <h2>Nossa causa</h2>
      <p>
        Acreditamos que solidariedade se constrói com confiança e transparência. Por isso, cada
        vaquinha passa por moderação, cada contribuição é registrada e cada organizador acompanha seu
        saldo com clareza.
      </p>
      <h2>Nossos valores</h2>
      <ul>
        <li>Transparência total sobre para onde vai o dinheiro.</li>
        <li>Segurança em cada etapa, do cadastro ao saque.</li>
        <li>Proximidade e acolhimento com quem precisa de ajuda.</li>
      </ul>
    </Prose>
  );
}
