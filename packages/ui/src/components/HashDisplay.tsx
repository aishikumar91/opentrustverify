import { useState } from "react";
import { Button } from "./Button";

export function HashDisplay({ value, label = "Hash" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const short = value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs text-[var(--otv-text-muted)]">{label}</div>
        <code className="otv-mono text-sm text-[var(--otv-text-primary)]" title={value}>{short}</code>
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
