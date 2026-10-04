import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";
import { FaqList, type FaqItem } from "@/components/FaqList";

const API_ORIGIN = import.meta.env.VITE_OTV_API_URL ?? "https://otv.poptrust.me";

const SECURITY_FAQS: FaqItem[] = [
  {
    q: "Can this website sign a verdict?",
    a: "No. Verdict signing keys stay on the API host, in the file store or a KMS envelope. The browser only checks a signature that already exists.",
  },
  {
    q: "What happens to an API key after I create it?",
    a: "The raw secret is shown once. What we store is a hash. If you lose the secret, rotate the key. It cannot be displayed again.",
  },
  {
    q: "How are webhooks constrained?",
    a: "The URL is checked so it cannot point at a private network. Each delivery body is HMAC-signed. The signing secret is returned once. Default events are verification.final, verification.failed, and verification.suspicious.",
  },
  {
    q: "Does a language model decide spendability?",
    a: "No. The status comes from deterministic checks. A model is not in that path.",
  },
];

export function SecurityPage() {
  return (
    <DocArticle title="Security" kicker="TRUST">
      <p>
        The main risk we exist to catch is a true-looking chain event that is not spendable money.
        Around that sit forged claims, a bad RPC, lookalike tokens, replayed verdicts, and webhook
        abuse. The controls below are what the hosted API actually does. They are not a certification.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Keys and sessions</h2>
      <p>
        API keys are stored as hashes. The raw secret is shown once when you create it. Sign-in
        sessions are hashed at rest. The browser sends a session header or a cookie. Email and
        password work. Google sign-in is on for the hosted site. A deployment with no OIDC issuer
        returns 501 from that login route.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Verdict signatures</h2>
      <p>
        Signing keys never leave the API. This site cannot mint a signature. A client that wants to
        check a result POSTs the payload to <code className="otv-mono">/v1/verdicts/verify</code>.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Webhooks and load</h2>
      <p>
        Webhook URLs are checked so they cannot point at private networks. Each body is HMAC-signed.
        Delivery runs from a Redis queue, with retries. Request volume is limited in Redis so one key
        cannot knock the service over.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Where the data lives</h2>
      <p>
        Production requires Postgres. MemoryStore is local and test only. Signing keys stay in the
        file store or a KMS envelope on the API host. Organizations do not see one another’s rows.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What is not in the path</h2>
      <p>
        Verification is deterministic. No language model writes a spendability status. We also do not
        custody assets or broadcast transactions. If you find a vulnerability, write to{" "}
        <a className="text-[var(--otv-brand)]" href="mailto:security@poptrust.me">
          security@poptrust.me
        </a>
        . Do not file that as a public issue.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Questions</h2>
      <FaqList items={SECURITY_FAQS} />
      <p>
        See{" "}
        <Link className="text-[var(--otv-brand)]" to="/docs">
          how you authenticate
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/privacy">
          Privacy
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/whitepaper">
          The model
        </Link>
      </p>
    </DocArticle>
  );
}

export function ContactPage() {
  return (
    <DocArticle title="Contact" kicker="TALK TO US">
      <p>
        Write to the mailbox that matches the question. There is no contact form on this site, and we
        do not publish a response-time promise. Include the chain, the network, and whether you are
        calling from a backend if the question is about an integration.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Product and the company</h2>
      <p>
        {product.builderTitle}, {product.builderName}:{" "}
        <a className="text-[var(--otv-brand)]" href={`mailto:${product.builderEmail}`}>
          {product.builderEmail}
        </a>
        . {product.name} is operated by {product.legalEntity}, RC {product.rcNumber}.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Enterprise workspace</h2>
      <p>
        <a className="text-[var(--otv-brand)]" href="mailto:enterprise@poptrust.me">
          enterprise@poptrust.me
        </a>
        . Sign-up already lands on the free plan. Developer, business, and enterprise names exist in
        the product. Card billing is not live. Say which chains you need and how you intend to call
        the API. Do not send a private key or a seed phrase.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Vulnerabilities</h2>
      <p>
        <a className="text-[var(--otv-brand)]" href="mailto:security@poptrust.me">
          security@poptrust.me
        </a>
        . Do not file those as public issues. The{" "}
        <Link className="text-[var(--otv-brand)]" to="/security">
          security page
        </Link>{" "}
        describes the controls that are already in the API.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Try it before you write</h2>
      <p>
        The{" "}
        <Link className="text-[var(--otv-brand)]" to="/docs">
          written integration guide
        </Link>{" "}
        covers the first request. The interactive reference is{" "}
        <a className="text-[var(--otv-brand)]" href={`${API_ORIGIN}/api/docs`}>
          {API_ORIGIN}/api/docs
        </a>
        . A stored verdict can be opened on the{" "}
        <Link className="text-[var(--otv-brand)]" to="/verifier">
          public verifier
        </Link>{" "}
        with no account.
      </p>
      <p>
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
