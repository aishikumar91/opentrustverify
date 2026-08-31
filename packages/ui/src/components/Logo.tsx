import { clsx } from "clsx";
import logoUrl from "../assets/logo.png";
import markUrl from "../assets/otv-mark.svg";

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
    <span className={clsx("otv-logo", invert && "otv-logo-invert", className)}>
      <img
        src={showWordmark ? logoUrl : markUrl}
        alt=""
        className={clsx("otv-logo-img", !showWordmark && "otv-logo-img-mark")}
      />
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
