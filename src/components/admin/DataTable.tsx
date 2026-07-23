export function DataTable({
  columns,
  rows,
  empty = 'Nenhum registro.',
}: {
  columns: string[];
  rows: (string | number | React.ReactNode)[][];
  empty?: string;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-line bg-surface-warm">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center italic text-ink-soft">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-surface-line last:border-0 hover:bg-surface-warm/50">
                {r.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap px-4 py-3 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}
