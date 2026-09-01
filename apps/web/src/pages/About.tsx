import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";
import { LandingArt } from "@/components/LandingArt";

export function AboutPage() {
  return (
    <DocArticle title="About OpenTrust Verify" kicker="POP TRUST">
      <LandingArt
        src="/marketing/otv-hero-globe.png"
        alt="OpenTrust Verify globe with incoming claim, evidence, and SPENDABLE states"
        size="md"
      />
      <p>
        {product.name} is how {product.parentBrand} answers a question explorers leave open: did this
        incoming transfer become money the recipient can actually spend?
      </p>
      <p>
        A hash, a pending transfer, or a token event can be technically true and still worthless to the
        person who thinks they were paid. Attackers lean on that gap. Product teams should not ask a
        customer to decode logs.
      </p>
      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who it is for</h2>
      <p>
        Wallet, exchange, explorer, and support teams that need a status they can show. One HTTP call
        returns a signed verdict. Your UI decides how to present Spendable, Pending, or Rejected.
      </p>
      <LandingArt
        src="/marketing/otv-wallet-integrations.png"
        alt="Example wallet products that can integrate OTV. Not a partnership list."
        size="wide"
      />
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
      <p>
        <Link className="text-[var(--otv-brand)]" to="/whitepaper">
          Read the model
        </Link>
      </p>
    </DocArticle>
  );
}

export function WhitepaperPage() {
  return (
    <DocArticle title="How OpenTrust Verify decides" kicker="MODEL">
      <LandingArt
        src="/marketing/otv-verdict-dashboard.png"
        alt="Incoming verdicts dashboard: spendability summary and evidence themes"
        size="md"
      />
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
        proof. Google sign-in is live on the hosted site. We do not publish market-size figures as
        facts.
      </p>
      <p>
        <Link className="text-[var(--otv-brand)]" to="/docs">
          First request
        </Link>
      </p>
    </DocArticle>
  );
}
