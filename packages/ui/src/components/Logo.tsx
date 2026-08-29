import { clsx } from "clsx";

/** POP Trust interlocking mark + OTV product wordmark */
export function Logo({
  className,
  showWordmark = true,
  href = "/",
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string | false;
}) {
  const content = (
    <span className={clsx("inline-flex items-center gap-3", className)}>
      <svg width="36" height="22" viewBox="0 0 120 72" aria-hidden>
        <path d="M34 20c-10 0-18 8-18 18s8 18 18 18c6 0 11-3 14-7" stroke="#1e6bff" strokeWidth="10" strokeLinecap="square" fill="none" />
        <path d="M86 52c10 0 18-8 18-18s-8-18-18-18c-6 0-11 3-14 7" stroke="#1e6bff" strokeWidth="10" strokeLinecap="square" fill="none" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[11px] font-semibold tracking-[0.22em] text-[var(--otv-brand)]">POP TRUST</span>
          <span className="text-sm font-bold tracking-wide text-[var(--otv-text-primary)]">OpenTrust Verify</span>
        </span>
      )}
    </span>
  );
  return href ? <a href={href} aria-label="OpenTrust Verify by POP Trust">{content}</a> : content;
}
