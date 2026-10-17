import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";

function explorerQuery(raw: string): string {
  const q = raw.trim();
  if (!q) return "/verifier";
  if (/^vr[_-]/i.test(q)) {
    return `/verifier?id=${encodeURIComponent(q)}`;
  }
  return `/scan?hash=${encodeURIComponent(q)}`;
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
      className={`otv-search ${className}`}
      role="search"
      aria-label="Look up a verdict or transaction"
    >
      <label className="otv-lookup-label" htmlFor="otv-explorer-q">
        Transaction hash or verdict ID
      </label>
      <div className="flex flex-row items-stretch gap-2">
        <input
          id="otv-explorer-q"
          className={`otv-input otv-mono min-w-0 flex-1 ${compact ? "h-10 text-sm" : ""}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Transaction hash or verdict ID (vr_...)."
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
        />
        <button
          type="submit"
          className={`${buttonClassName("primary")} w-auto shrink-0 ${compact ? "min-w-[7rem]" : "min-w-[6.5rem]"}`}
        >
          <BtnText>Look up</BtnText>
        </button>
      </div>
    </form>
  );
}
