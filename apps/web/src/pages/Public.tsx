import { Link } from "react-router-dom";
import { DocArticle } from "@/components/DocArticle";

const API_ORIGIN = import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me";

export function SecurityPage() {
  return (
    <DocArticle title="Security" kicker="TRUST">
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
        <li>Request volume is limited so one key cannot knock the service over.</li>
      </ul>
      <p>
        Email and password work today. Single sign-on is designed and not enabled until an identity
        provider is configured. See{" "}
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
        Interactive API:{" "}
        <a className="text-[var(--otv-brand)]" href={`${API_ORIGIN}/api/docs`}>
          {API_ORIGIN}/api/docs
        </a>
      </p>
      <p>
        <Link className="text-[var(--otv-brand)]" to="/docs">
          Written integration guide
        </Link>
      </p>
    </DocArticle>
  );
}
