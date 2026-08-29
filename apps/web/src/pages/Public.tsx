import { Link } from "react-router-dom";
import { DocArticle } from "@/components/DocArticle";

export function SecurityPage() {
  return (
    <DocArticle title="Security" kicker="THREAT MODEL">
      <p>
        Primary threat: technically true but economically misleading chain data used in social
        engineering. Additional threats: forged claims, compromised RPC, malicious tokens, replayed
        verdicts, API abuse, webhook SSRF and spoofing.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>API keys stored as SHA-256 hashes; raw values shown once at creation.</li>
        <li>Sessions hashed at rest; browser clients send <code className="otv-mono">X-OTV-Session</code>.</li>
        <li>Signing keys never leave the API. Optional AES-256-GCM wrap via master key.</li>
        <li>Webhook URLs SSRF-checked; payloads HMAC-signed with per-endpoint secrets.</li>
        <li>Helmet, CORS credentials, Redis-backed rate limits.</li>
      </ul>
      <p>
        OIDC/SSO is specified but not enabled until an identity provider is configured. See{" "}
        <Link className="text-[var(--otv-brand)]" to="/docs">
          authentication docs
        </Link>
        .
      </p>
    </DocArticle>
  );
}

export function ContactPage() {
  return (
    <DocArticle title="Contact" kicker="SUPPORT">
      <p>
        Product and enterprise:{" "}
        <a className="text-[var(--otv-brand)]" href="mailto:enterprise@poptrust.me">
          enterprise@poptrust.me
        </a>
      </p>
      <p>
        API host in this deployment:{" "}
        <code className="otv-mono">{import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me"}</code>
      </p>
      <p>
        OpenAPI: append <code className="otv-mono">/docs</code> to the API base URL.
      </p>
    </DocArticle>
  );
}
