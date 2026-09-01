import { Link } from "react-router-dom";
import { DocArticle } from "@/components/DocArticle";
import { LandingArt } from "@/components/LandingArt";

const API_ORIGIN = import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me";

export function SecurityPage() {
  return (
    <DocArticle title="Security" kicker="TRUST">
      <LandingArt
        src="/marketing/otv-hero-globe.png"
        alt="OpenTrust Verify globe: keys stay on the host, verdicts are signed evidence"
      />
      <p>
        The main risk we exist to catch is a true-looking chain event that is not spendable money.
        Around that sit forged claims, a bad RPC, lookalike tokens, replayed verdicts, and webhook
        abuse.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>API keys are stored as hashes. The raw secret is shown once when you create it.</li>
        <li>Sign-in sessions are hashed at rest. Your browser sends a session header or a cookie.</li>
        <li>Verdict signing keys never leave the API. This site cannot mint a signature.</li>
        <li>Webhook URLs are checked so they cannot point at private networks. Each body is HMAC-signed.</li>
        <li>Request volume is limited in Redis so one key cannot knock the service over.</li>
        <li>Production requires Postgres. Signing keys stay in the file or KMS store on the API host.</li>
        <li>Verification is deterministic. No language model writes a spendability status.</li>
      </ul>
      <p>
        Email and password work. Google sign-in is on for the hosted site. See{" "}
        <Link className="text-[var(--otv-brand)]" to="/docs">
          how you authenticate
        </Link>
        .
      </p>
    </DocArticle>
  );
}

export function ContactPage() {
  return (
    <DocArticle title="Contact" kicker="TALK TO US">
      <p>
        Product and enterprise:{" "}
        <a className="text-[var(--otv-brand)]" href="mailto:enterprise@poptrust.me">
          enterprise@poptrust.me
        </a>
      </p>
      <p>
        Vulnerabilities:{" "}
        <a className="text-[var(--otv-brand)]" href="mailto:security@poptrust.me">
          security@poptrust.me
        </a>
        . Do not file those as public issues.
      </p>
      <p>
        Interactive API:{" "}
        <a className="text-[var(--otv-brand)]" href={`${API_ORIGIN}/api/docs`}>
          {API_ORIGIN}/api/docs
        </a>
      </p>
      <p>
        <Link className="text-[var(--otv-brand)]" to="/docs">
          Written integration guide
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/privacy">
          Privacy
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/terms">
          Terms
        </Link>
      </p>
    </DocArticle>
  );
}
