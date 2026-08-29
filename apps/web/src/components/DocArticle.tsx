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
      {kicker && (
        <p className="mb-3 text-xs font-semibold tracking-[0.28em] text-[var(--otv-brand)]">{kicker}</p>
      )}
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
      <div className="prose-otv mt-8 space-y-4 text-[var(--otv-text-secondary)]">{children}</div>
    </main>
  );
}
