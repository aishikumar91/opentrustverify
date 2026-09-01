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

export function ExplorerSearchBar({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(explorerQuery(value));
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-[8px] border-2 border-[var(--otv-border-strong)] bg-[var(--otv-surface)] p-2 ${className}`}
      role="search"
      aria-label="Look up a verdict or transaction"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="otv-explorer-q">
          Verdict ID or transaction hash
        </label>
        <input
          id="otv-explorer-q"
          className="otv-input otv-input-lg otv-mono min-w-0 flex-1 border-0 bg-[var(--otv-surface-muted)] sm:h-[56px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Verdict ID (vr_…) or transaction hash"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        <button type="submit" className={`${buttonClassName("primary")} h-12 w-full shrink-0 sm:h-[56px] sm:w-auto sm:min-w-[9rem]`}>
          <BtnText>Look up</BtnText>
        </button>
      </div>
      <p className="mt-2 px-1 text-xs text-[var(--otv-text-secondary)]">
        Public explorer. A verdict ID opens the signed record. A hash opens the verifier so you can
        attach a recipient.
      </p>
    </form>
  );
}
