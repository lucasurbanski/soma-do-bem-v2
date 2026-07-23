import type { Metadata } from 'next';
import { requireUser } from '@/features/auth/session';
import { OnboardingForm } from '@/features/onboarding/OnboardingForm';

export const metadata: Metadata = { title: 'Complete seu cadastro' };

export default async function OnboardingPage() {
  await requireUser('/onboarding');
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Complete seu cadastro de organizador</h1>
      <p className="mt-1 text-ink-soft">
        Precisamos de alguns dados para liberar o envio da sua vaquinha para análise.
      </p>
      <div className="mt-8">
        <OnboardingForm />
      </div>
    </div>
  );
}
