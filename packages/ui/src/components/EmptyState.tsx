export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-[8px] border-2 border-dashed border-[var(--otv-border)] p-10 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">{description}</p>}
    </div>
  );
}
