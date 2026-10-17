import { Link } from "react-router-dom";
import { product } from "@otv/config";

export function PricingPage() {
  return (
    <main className="otv-container otv-copy max-w-3xl py-12">
      <p className="otv-kicker">Plans</p>
      <h1 className="otv-doc-title">Pricing</h1>
      <div className="otv-prose mt-8 space-y-4 text-[var(--otv-text-secondary)]">
        <p>
          OpenTrust Verify does not publish a rate card on this page. A workspace starts from the
          account you create. Volume beyond that is a written agreement.
        </p>
        <p>
          Write to{" "}
          <a className="text-[var(--otv-brand-text)]" href={`mailto:${product.builderEmail}`}>
            {product.builderEmail}
          </a>{" "}
          for a limit, or read the{" "}
          <Link className="text-[var(--otv-brand-text)]" to="/docs">
            API
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
