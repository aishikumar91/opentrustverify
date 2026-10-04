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
      <svg viewBox="0 0 360 360">
        <circle cx="180" cy="180" r="158" fill="none" stroke="currentColor" strokeOpacity="0.16" />
        <circle cx="180" cy="180" r="118" fill="none" stroke="currentColor" strokeOpacity="0.32" />
        <circle cx="180" cy="180" r="76" fill="currentColor" fillOpacity="0.16" />
        <circle cx="180" cy="180" r="76" fill="none" stroke="currentColor" strokeOpacity="0.85" />
        <path d="M180 58v24M180 278v24M58 180h24M278 180h24" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" />
        <text
          x="180"
          y="186"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="Barlow, sans-serif"
          fontSize="18"
          fontWeight="800"
          letterSpacing="3"
        >
          OTV
        </text>
        {hero && (
          <g fill="currentColor" fontFamily="Barlow, sans-serif" fontSize="11" letterSpacing="1.5">
            <text x="180" y="34" textAnchor="middle" fillOpacity="0.72">
              OBSERVED
            </text>
            <text x="180" y="346" textAnchor="middle" fillOpacity="0.72">
              SPENDABLE
            </text>
            <text x="8" y="184" fillOpacity="0.6">
              BALANCE
            </text>
            <text x="286" y="184" fillOpacity="0.6">
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
