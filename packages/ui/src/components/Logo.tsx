import { clsx } from "clsx";

export function Logo({
  className,
  showWordmark = true,
  href = "/",
  invert = false,
}: {
  className?: string;
  showWordmark?: boolean;
  href?: string | false;
  invert?: boolean;
}) {
  const content = (
    <span className={clsx("otv-logo", invert && "otv-logo-invert", !showWordmark && "otv-logo-compact", className)}>
      <img className="otv-logo-mark" src="/favicon.png" alt="" width={36} height={36} />
      <span className="otv-logo-word">{showWordmark ? "Open Trust" : "OTV"}</span>
    </span>
  );
  return href ? (
    <a href={href} aria-label="OpenTrust Verify by POP Trust">
      {content}
    </a>
  ) : (
    content
  );
}
