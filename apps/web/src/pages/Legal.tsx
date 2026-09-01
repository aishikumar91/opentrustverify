import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";

const UPDATED = "1 September 2026";
const CONTACT = "enterprise@poptrust.me";
const SECURITY = "security@poptrust.me";

export function PrivacyPage() {
  return (
    <DocArticle title="Privacy policy" kicker="LEGAL">
      <p>
        This policy is for the hosted {product.name} service at {product.domain}, operated by{" "}
        {product.parentBrand}. Last updated {UPDATED}.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who we are</h2>
      <p>
        {product.parentBrand} runs {product.name} ({product.shortName}). We are the controller of
        account and workspace data you give us. A signed verdict is a record we store so you, or anyone
        with the verdict ID, can look it up later.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What we collect</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Account email, optional name, and a password hash. We do not store the password in plain text.</li>
        <li>If you use Google sign-in, Google sends us your email and, when it has one, a display name.</li>
        <li>
          Workspace data you create: organizations, projects, hashed API keys, webhook URLs, usage
          meters, and audit events.
        </li>
        <li>
          Verification claims: chain, network, transaction hash, recipient, asset, and expected amount.
          The signed verdict we return is stored and can be fetched by verdict ID.
        </li>
        <li>Server logs that can include IP address, user agent, and the path you hit.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Why we use it</h2>
      <p>
        We use this to run the product you asked for: authenticate you, mint and check verdicts, deliver
        webhooks you configured, meter the free plan, and keep an audit trail you can read. That is
        the contract. We do not sell personal data. We do not put it into a public model. There is no
        LLM on the spendability path.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Cookies and local storage</h2>
      <p>
        Sign-in sets an HTTP-only cookie named <code className="otv-mono">otv_session</code>. SSO also
        sets a short-lived <code className="otv-mono">otv_oidc</code> cookie while the handshake runs.
        The dashboard can keep <code className="otv-mono">otv_session_token</code> in local storage so
        API calls still work after you close the tab. We do not set advertising cookies.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What stays public</h2>
      <p>
        A verdict ID is enough to fetch that verdict. Treat the ID like a support ticket number. Do not
        put secrets in a claim. On-chain addresses and hashes you send us are already public on their
        networks.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who else sees it</h2>
      <p>
        The API and this site run on servers we operate. Payment card processing is not live. Google
        sees the email you use for SSO. If we later add a mail or billing vendor, that vendor will see
        only what that job needs, and we will name them here.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">How long we keep it</h2>
      <p>
        Account, project, and verdict records stay until you ask us to delete them or we close the
        account. Session cookies expire after twelve hours. The SSO handshake cookie expires after ten
        minutes. Server logs rotate on the host.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Your choices</h2>
      <p>
        You can update your name in settings, rotate or revoke API keys, and log out. Email{" "}
        <a className="text-[var(--otv-brand)]" href={`mailto:${CONTACT}`}>
          {CONTACT}
        </a>{" "}
        to export what we hold or delete an account. We will confirm you own the address. Security
        issues go to{" "}
        <a className="text-[var(--otv-brand)]" href={`mailto:${SECURITY}`}>
          {SECURITY}
        </a>
        , not a public issue tracker.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Children</h2>
      <p>
        The service is for people who can open an account and keep an API key safe. Do not register a
        child. If we learn an account belongs to a child, we will close it.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Where data lives</h2>
      <p>
        You can call the API from anywhere. Records sit on the hosts that run {product.domain}. We do
        not claim a specific national privacy statute on this page. If you need a data-processing
        addendum, write {CONTACT}.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Changes</h2>
      <p>
        We change this policy by updating this page. The date at the top is the version that applies.
      </p>

      <p>
        <Link className="text-[var(--otv-brand)]" to="/terms">
          Terms of use
        </Link>
        {" · "}
        <Link className="text-[var(--otv-brand)]" to="/security">
          Security
        </Link>
      </p>
    </DocArticle>
  );
}

export function TermsPage() {
  return (
    <DocArticle title="Terms of use" kicker="LEGAL">
      <p>
        These terms cover the hosted {product.name} API and this website at {product.domain}.{" "}
        {product.parentBrand} operates the service. Last updated {UPDATED}. By creating an account or
        calling the API you accept them.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What the service is</h2>
      <p>
        You send a claim about an incoming transfer. We walk evidence through the{" "}
        {product.shortName} verdict statuses and return a signed <code className="otv-mono">otv.verdict.v1</code>{" "}
        record. We do not hold keys, send transactions, or custody assets. A chain event is not
        execution, is not a transfer, is not a balance increase, is not finality, and is not spendable
        funds. We do not collapse those states.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What a verdict is not</h2>
      <p>
        A verdict is not legal advice, not a payment instruction, and not a promise that funds stay
        spendable later. If a live RPC is not configured for a chain, the adapter may return a marked
        mock. Do not treat a mock as chain proof. Your product decides what to show a user.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Your account</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>You must be able to receive mail at the address you register.</li>
        <li>You are responsible for API keys and session tokens issued to your workspace.</li>
        <li>The raw key is shown once. If it leaks, revoke it.</li>
        <li>A demo login may exist for evaluation. Do not put production traffic on it.</li>
        <li>Tenant rows stay in your organization. Do not try to read another workspace.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Acceptable use</h2>
      <p>
        Use the API to verify transfers you have a reason to check. Do not point webhooks at private
        networks, scrape the service, break authentication, or use a verdict to claim we certified a
        crime. We rate-limit keys and can suspend an account that is harming the service or other
        users.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Plans</h2>
      <p>
        Sign-up lands on the free plan. Developer, business, and enterprise names exist in the product.
        Card billing is not live. We can change limits. We do not promise a specific uptime number.
        Maintenance can take the service offline.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Names and marks</h2>
      <p>
        {product.name}, {product.shortName}, and {product.parentBrand} are names of this product and
        brand. You may say you use {product.shortName}. You may not imply we built or endorse your
        product, and you may not use our mark as your own. Compatibility language is in the
        repository trademark policy.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">No warranty</h2>
      <p>
        The service is provided as is. Chain nodes fail, RPCs lie, and tokens behave badly. If a
        verdict is wrong, stop using that result and tell us. We are not liable for lost funds, lost
        business, or decisions you make from a status badge.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Ending the account</h2>
      <p>
        You can stop using the service at any time and ask us to delete the account. We can close an
        account that breaks these terms or that we cannot keep running safely.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Changes</h2>
      <p>
        We can change these terms or the privacy policy by updating this site. The date at the top of
        each page is the version that applies. If you keep using the service after that date, you
        accept the new text. A signed enterprise contract, when we have one, beats this page.
      </p>

      <p>
        Questions:{" "}
        <a className="text-[var(--otv-brand)]" href={`mailto:${CONTACT}`}>
          {CONTACT}
        </a>
        . Also see the{" "}
        <Link className="text-[var(--otv-brand)]" to="/privacy">
          privacy policy
        </Link>
        .
      </p>
    </DocArticle>
  );
}
