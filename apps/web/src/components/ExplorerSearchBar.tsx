import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";

function explorerQuery(raw: string): string {
  const q = raw.trim();
  if (!q) return "/verifier";
  if (/^vr[_-]/i.test(q)) {
    return `/verifier?id=${encodeURIComponent(q)}`;
  }
  return `/verifier?hash=${encodeURIComponent(q)}`;
}

export function ExplorerSearchBar({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(explorerQuery(value));
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${compact ? "max-w-xl p-1.5" : "p-2"} rounded-[8px] border-2 border-[var(--otv-border-strong)] bg-[var(--otv-surface)] ${className}`}
      role="search"
      aria-label="Look up a verdict or transaction"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="otv-explorer-q">
          Verdict ID or transaction hash
        </label>
        <input
          id="otv-explorer-q"
          className={`otv-input otv-mono min-w-0 flex-1 border-0 bg-[var(--otv-surface-muted)] ${compact ? "h-10 text-sm" : "otv-input-lg sm:h-[56px]"}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Verdict ID (vr_…) or transaction hash"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        <button
          type="submit"
          className={`${buttonClassName("primary")} w-full shrink-0 ${compact ? "h-10 sm:w-auto sm:min-w-[7rem]" : "h-12 sm:h-[56px] sm:w-auto sm:min-w-[9rem]"}`}
        >
          <BtnText>Look up</BtnText>
        </button>
      </div>
      <p className={`px-1 text-[var(--otv-text-secondary)] ${compact ? "mt-1.5 text-[11px] leading-snug" : "mt-2 text-xs"}`}>
        Public explorer. A verdict ID opens the signed record. A hash opens the verifier so you can
        attach a recipient.
      </p>
    </form>
  );
}
