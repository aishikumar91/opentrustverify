import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";
import { FaqList, type FaqItem } from "@/components/FaqList";

const ABOUT_FAQS: FaqItem[] = [
  {
    q: "Who operates OpenTrust Verify?",
    a: `${product.legalEntity}, RC ${product.rcNumber}, under the ${product.parentBrand} brand. ${product.builderName} is ${product.builderTitle}.`,
  },
  {
    q: "Is OTV a wallet or an explorer?",
    a: "Neither. It answers whether an incoming transfer became spendable value for a named recipient. Your product can keep its own explorer view beside the verdict.",
  },
  {
    q: "Where do I start?",
    a: "Read how a check runs, then create an account and mint a key for your backend. A verdict ID can be opened without a key.",
  },
];

const MODEL_FAQS: FaqItem[] = [
  {
    q: "Why read the balance instead of summing transfer logs?",
    a: "Event sums lie on fee-on-transfer and rebasing tokens. The check reads the balance change for the named recipient, then applies the network’s finality rule.",
  },
  {
    q: "When is a result not chain proof?",
    a: "When live RPC is not configured, a mock adapter can still return a verdict and marks that result. Do not treat a marked demo as proof of a mainnet deposit.",
  },
  {
    q: "Who can re-check the signature?",
    a: "Anyone with the verdict payload. POST it to /v1/verdicts/verify. The signing key never leaves the API, and this page does not sign.",
  },
];

export function AboutPage() {
  return (
    <DocArticle title="About OpenTrust Verify" kicker="POP TRUST">
      <p>
        {product.name} is how {product.parentBrand} answers a question explorers leave open: did this
        incoming transfer become money the recipient can actually spend?
      </p>
      <p>
        A hash, a pending transfer, or a token event can be technically true and still worthless to the
        person who thinks they were paid. Attackers lean on that gap. Product teams should not ask a
        customer to decode logs.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Founder and CEO</h2>
      <figure className="grid items-start gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
        <img
          src="/about/ifeanyi-obibi.jpg"
          alt={`${product.builderName}, ${product.builderTitle} of ${product.parentBrand}`}
          width={440}
          height={720}
          className="w-full max-w-[220px] rounded-[14px] border border-[var(--otv-border)] bg-[var(--otv-surface)] object-cover"
        />
        <figcaption className="space-y-3">
          <p className="mb-0 text-xl font-bold text-[var(--otv-text-primary)]">{product.builderName}</p>
          <p className="mb-0">
            {product.builderTitle} of {product.parentBrand}.
          </p>
          <p className="mb-0">
            <a className="text-[var(--otv-brand)]" href={`mailto:${product.builderEmail}`}>
              {product.builderEmail}
            </a>
            {" · "}
            <a className="text-[var(--otv-brand)]" href={`mailto:${product.builderEmailPersonal}`}>
              {product.builderEmailPersonal}
            </a>
          </p>
          <p className="mb-0">
            {product.name} is a product of {product.legalEntity}, RC {product.rcNumber}.
          </p>
        </figcaption>
      </figure>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who it is for</h2>
      <p>
        Wallet, exchange, explorer, and support teams that need a status they can show. One HTTP call
        returns a signed verdict. Your UI decides how to present Spendable, Pending, or Rejected.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What you get</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>A verification API that checks inclusion, execution, asset, recipient, balance, and finality.</li>
        <li>A dashboard for keys, webhooks, usage, and an audit trail. Organizations stay isolated.</li>
        <li>Public lookup of any stored verdict by ID, so a support agent can open the same record.</li>
        <li>Explorer components in @otv/ui. Do not rebuild those badges in your own markup.</li>
      </ul>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What we do not do</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>We do not hold keys or send transactions.</li>
        <li>We do not replace your explorer. Raw chain data can stay on screen.</li>
        <li>We do not invent a balance. If the evidence is thin, the verdict says so.</li>
      </ul>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">The company</h2>
      <p>
        {product.name} is a product of {product.legalEntity}, RC {product.rcNumber}. The hosted
        service is at {product.domain}. {product.builderName} is {product.builderTitle}.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">How the work is split</h2>
      <p>
        The API reads chain evidence through adapters and signs the verdict. Your server holds the
        API key. Your client, if it shows a result, checks the signature. It does not create one.
        Organizations, projects, and keys stay isolated from one another.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Questions</h2>
      <FaqList items={ABOUT_FAQS} />
      <p>
        <Link className="text-[var(--otv-brand)]" to="/whitepaper">
          Read the model
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/features">
          Features
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/contact">
          Contact
        </Link>
      </p>
    </DocArticle>
  );
}

export function WhitepaperPage() {
  return (
    <DocArticle title="How OpenTrust Verify decides" kicker="MODEL">
      <p>
        Wallets already simulate what you are about to sign. OpenTrust Verify works on the inbound
        side. You tell us what arrived. We say whether that arrival is spendable value for the named
        recipient.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">The failure we exist for</h2>
      <p>
        Explorers are good at chain fidelity. Users hear "paid." A pending transfer, a lookalike token,
        or an event that never moved a balance can all look like a deposit. Simulation tools stop a bad
        outbound signature. They do not tell a recipient whether incoming funds can be spent.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What we refuse to mix</h2>
      <p>
        Activity on a chain is not the same as a successful execution. A successful execution is not
        the same as a transfer. A transfer is not the same as a balance increase. A balance increase
        is not the same as finality. Finality is not the same as spendable funds. Each step has to
        pass on its own.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">How a check runs</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Find the transaction and confirm it is included.</li>
        <li>Confirm execution succeeded.</li>
        <li>Match the asset and the recipient you named.</li>
        <li>Read the balance change, not only the transfer log. Event sums lie on fee-on-transfer and rebasing tokens.</li>
        <li>Wait for the finality rule of that network.</li>
        <li>Only then call the result spendable, or stop earlier with a clear failure.</li>
      </ol>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Statuses you can show</h2>
      <p>
        Observed, pending, executed, asset confirmed, balance confirmed, final, spendable, rejected,
        suspicious, or unverified. Your product maps those words to a badge. We keep the evidence
        that produced them.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Signatures</h2>
      <p>
        The API hashes a stable JSON form of the verdict and signs it with Ed25519. Anyone can POST
        that payload to <code className="otv-mono">/v1/verdicts/verify</code>. Signing keys stay on the
        API. This page never signs.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Honesty about live vs mock</h2>
      <p>
        When a live Ethereum RPC is configured, evidence comes from that node. When it is not, a mock
        adapter still returns a verdict and marks the result so you do not treat a demo as chain
        proof. The same idea applies on the other chains: public endpoints can rate-limit, and a
        dedicated RPC is optional. Google sign-in is live on the hosted site. We do not publish
        market-size figures as facts.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who should read this</h2>
      <p>
        Engineers wiring a wallet or an exchange, and support leads who need to explain a badge.
        The{" "}
        <Link className="text-[var(--otv-brand)]" to="/features">
          status list
        </Link>{" "}
        is the enum. This page is why the enum refuses synonyms.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Questions</h2>
      <FaqList items={MODEL_FAQS} />
      <p>
        <Link className="text-[var(--otv-brand)]" to="/docs">
          First request
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/security">
          Security
        </Link>
      </p>
    </DocArticle>
  );
}
