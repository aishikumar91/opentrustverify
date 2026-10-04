export function DocArticle({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="otv-container max-w-3xl py-16">
      {kicker && <p className="otv-kicker">{kicker}</p>}
      <h1 className="otv-doc-title">{title}</h1>
      <div className="otv-prose mt-8 space-y-4 text-[var(--otv-text-secondary)]">{children}</div>
    </main>
  );
}
