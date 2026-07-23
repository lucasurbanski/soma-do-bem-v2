export function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-ink">{title}</h1>
      <div className="space-y-4 text-ink-muted [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_a]:text-brand-600 [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
