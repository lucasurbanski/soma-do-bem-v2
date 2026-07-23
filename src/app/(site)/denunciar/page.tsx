import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReportForm } from '@/features/reports/ReportForm';

export const metadata: Metadata = { title: 'Denunciar vaquinha' };

type SP = Promise<{ causeId?: string }>;

export default async function DenunciarPage({ searchParams }: { searchParams: SP }) {
  const { causeId } = await searchParams;
  if (!causeId) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold text-ink">Denunciar esta vaquinha</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Se você acredita que esta vaquinha viola nossos termos, conte o que aconteceu. Sua denúncia é
        confidencial.
      </p>
      <div className="mt-6">
        <ReportForm causeId={causeId} />
      </div>
    </div>
  );
}
