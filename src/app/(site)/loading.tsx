export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500"
        role="status"
        aria-label="Carregando"
      />
    </div>
  );
}
