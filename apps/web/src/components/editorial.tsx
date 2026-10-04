import { Link } from "react-router-dom";

function Spark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path d="M8 1.2 9.15 6.85 14.8 8 9.15 9.15 8 14.8 6.85 9.15 1.2 8 6.85 6.85Z" fill="currentColor" />
    </svg>
  );
}

export function FloatingInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="otv-float-card">
      <span className="otv-float-mark">
        <Spark />
      </span>
      <p className="otv-float-label">{label}</p>
      <p className="otv-float-value">{value}</p>
    </div>
  );
}

export function ProductPreviewCard({
  title,
  meta,
  status,
  statusNote,
  actionLabel,
  to,
}: {
  title: string;
  meta: string;
  status: string;
  statusNote: string;
  actionLabel: string;
  to: string;
}) {
  return (
    <article className="otv-product-card">
      <div className="otv-product-thumb" aria-hidden>
        <InstrumentMark />
      </div>
      <div>
        <h2 className="otv-product-title">{title}</h2>
        <p className="otv-product-meta">{meta}</p>
        <p className="otv-product-status">
          {status}
          <span className="otv-product-note"> {statusNote}</span>
        </p>
      </div>
      <Link to={to} className="otv-product-action" aria-label={actionLabel}>
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}

function InstrumentMark() {
  return (
    <svg viewBox="0 0 72 72" aria-hidden>
      <rect width="72" height="72" fill="currentColor" fillOpacity="0.08" />
      <circle cx="36" cy="36" r="22" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      <circle cx="36" cy="36" r="10" fill="currentColor" />
      <path d="M36 8v10M36 54v10M8 36h10M54 36h10" stroke="currentColor" strokeOpacity="0.55" />
    </svg>
  );
}

export function VerdictOrbit({ size = "panel" }: { size?: "hero" | "panel" }) {
  const hero = size === "hero";
  return (
    <div className={hero ? "otv-orbit otv-orbit-hero" : "otv-orbit"} aria-hidden>
      <svg viewBox="0 0 480 480">
        <g className="otv-spin">
          <circle
            cx="240"
            cy="240"
            r="152"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeOpacity="0.72"
            strokeDasharray="1.4 8"
            strokeLinecap="round"
          />
          <circle cx="240" cy="88" r="4" fill="currentColor" />
        </g>
        <g className="otv-spin otv-spin-reverse">
          <circle
            cx="240"
            cy="240"
            r="122"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.85"
            strokeDasharray="36 730"
            strokeLinecap="round"
          />
        </g>
        <circle cx="240" cy="240" r="78" fill="currentColor" fillOpacity="0.16" />
        <circle cx="240" cy="240" r="78" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.4" />
        <path
          d="M240 118v22M240 340v22M118 240h22M340 240h22"
          stroke="currentColor"
          strokeOpacity="0.7"
          strokeWidth="2"
        />
        <text
          x="240"
          y="240"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontFamily="Barlow, sans-serif"
          fontSize="20"
          fontWeight="800"
          letterSpacing="3"
        >
          OTV
        </text>
        {hero && (
          <g
            fill="currentColor"
            fontFamily="Barlow, sans-serif"
            fontSize="12"
            fontWeight="600"
            letterSpacing="1.4"
          >
            <text x="240" y="28" textAnchor="middle" dominantBaseline="middle" fillOpacity="0.82">
              OBSERVED
            </text>
            <text x="240" y="452" textAnchor="middle" dominantBaseline="middle" fillOpacity="0.82">
              SPENDABLE
            </text>
            <text x="40" y="240" textAnchor="middle" dominantBaseline="middle" fillOpacity="0.72">
              BALANCE
            </text>
            <text x="440" y="240" textAnchor="middle" dominantBaseline="middle" fillOpacity="0.72">
              FINAL
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export function CinematicInstrument() {
  return <VerdictOrbit size="hero" />;
}
