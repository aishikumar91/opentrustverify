import { clsx } from "clsx";

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  children?: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "var(--otv-success)"
      : tone === "warning"
        ? "var(--otv-warning)"
        : tone === "danger"
          ? "var(--otv-danger)"
          : "var(--otv-info)";
  return (
    <div className={clsx("rounded-[8px] border-2 px-4 py-3")} style={{ borderColor: `${color}66`, background: `${color}14` }}>
      <div className="text-sm font-semibold" style={{ color }}>{title}</div>
      {children && <div className="mt-1 text-sm text-[var(--otv-text-secondary)]">{children}</div>}
    </div>
  );
}
