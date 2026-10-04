export function DocArticle({
  title,
  kicker,
  mark,
  children,
}: {
  title: string;
  kicker?: string;
  mark?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="otv-container max-w-3xl py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          {kicker && <p className="otv-kicker">{kicker}</p>}
          <h1 className="otv-doc-title">{title}</h1>
        </div>
        {mark}
      </div>
      <div className="otv-prose mt-8 space-y-4 text-[var(--otv-text-secondary)]">{children}</div>
    </main>
  );
}
