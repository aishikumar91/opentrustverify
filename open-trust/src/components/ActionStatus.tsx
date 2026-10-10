export type ActionTone = "ok" | "fail" | "warn" | "info";

const TONE: Record<ActionTone, { dot: string; border: string }> = {
  ok: { dot: "bg-[#12B76A]", border: "border-[#B8E600]" },
  fail: { dot: "bg-[#D92D20]", border: "border-[#D92D20]" },
  warn: { dot: "bg-[#B54708]", border: "border-[#B54708]" },
  info: { dot: "bg-[#2E7CF6]", border: "border-[#2E7CF6]" },
};

/** One action outcome card: wallet connect, fire, verify, deploy, submit. */
export default function ActionStatus({
  tone,
  title,
  detail,
  onClose,
}: {
  tone: ActionTone;
  title: string;
  detail?: string | null;
  onClose?: () => void;
}) {
  const t = TONE[tone];
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-[24px] border bg-white p-4 ${t.border}`}
    >
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#101828]">{title}</p>
        {detail ? <p className="mt-1 break-words font-mono text-[11px] text-[#5B6472]">{detail}</p> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="shrink-0 rounded-full border border-[#DDE1EA] px-2 py-1 text-[11px] text-[#5B6472] transition hover:border-[#B8E600] hover:text-[#0B0F14]"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
