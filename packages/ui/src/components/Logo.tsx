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
      <span className="otv-logo-word">{showWordmark ? "Open Trust Verify" : "OTV"}</span>
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
