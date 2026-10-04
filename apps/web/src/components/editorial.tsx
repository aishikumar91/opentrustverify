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
      <rect width="72" height="72" fill="#2a1010" />
      <circle cx="36" cy="36" r="22" fill="none" stroke="#f0ebc6" strokeOpacity="0.35" />
      <circle cx="36" cy="36" r="10" fill="#7cff3a" />
      <path d="M36 8v10M36 54v10M8 36h10M54 36h10" stroke="#f0ebc6" strokeOpacity="0.45" />
    </svg>
  );
}

export function CinematicInstrument() {
  return (
    <div className="otv-instrument" aria-hidden>
      <svg viewBox="0 0 640 760" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="otv-lens" cx="50%" cy="46%" r="42%">
            <stop offset="0%" stopColor="#d8ffb0" />
            <stop offset="28%" stopColor="#7cff3a" />
            <stop offset="62%" stopColor="#1a4a12" />
            <stop offset="100%" stopColor="#120908" />
          </radialGradient>
          <linearGradient id="otv-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a1816" />
            <stop offset="55%" stopColor="#1a0d0c" />
            <stop offset="100%" stopColor="#070605" />
          </linearGradient>
        </defs>
        <rect width="640" height="760" fill="url(#otv-metal)" />
        <circle cx="330" cy="340" r="250" fill="none" stroke="#f0ebc6" strokeOpacity="0.08" />
        <circle cx="330" cy="340" r="188" fill="none" stroke="#f0ebc6" strokeOpacity="0.16" />
        <circle cx="330" cy="340" r="128" fill="url(#otv-lens)" />
        <circle cx="330" cy="340" r="128" fill="none" stroke="#f0ebc6" strokeOpacity="0.35" />
        <path d="M330 150v48M330 482v48M140 340h48M472 340h48" stroke="#7cff3a" strokeOpacity="0.7" strokeWidth="2" />
        <path d="M210 210l28 28M450 210l-28 28M210 470l28-28M450 470l-28-28" stroke="#f0ebc6" strokeOpacity="0.28" />
        <text x="330" y="348" textAnchor="middle" fill="#071204" fontFamily="Barlow, sans-serif" fontSize="22" fontWeight="800" letterSpacing="3">
          OTV
        </text>
        <g fill="#f0ebc6" fontFamily="Barlow, sans-serif" fontSize="11" letterSpacing="1.6">
          <text x="48" y="120" fillOpacity="0.55">OBSERVED</text>
          <text x="48" y="240" fillOpacity="0.7">EXECUTED</text>
          <text x="48" y="360" fillOpacity="0.85">BALANCE</text>
          <text x="48" y="480" fillOpacity="0.7">FINAL</text>
          <text x="48" y="600" fillOpacity="0.55">SPENDABLE</text>
        </g>
      </svg>
      <span className="otv-dot otv-dot-a" />
      <span className="otv-dot otv-dot-b" />
      <span className="otv-dot otv-dot-c" />
    </div>
  );
}
