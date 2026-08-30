import { Link } from "react-router-dom";
import { product } from "@otv/config";
import { DocArticle } from "@/components/DocArticle";

const UPDATED = "30 August 2026";
const CONTACT = "enterprise@poptrust.me";

export function PrivacyPage() {
  return (
    <DocArticle title="Privacy policy" kicker="LEGAL">
      <p>
        This page is for the hosted {product.name} service at {product.domain}, run by{" "}
        {product.parentBrand}. Last updated {UPDATED}.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What we collect</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Account email, optional name, and a password hash. We do not store the password in plain text.</li>
        <li>If you use SSO, the identity provider sends us your email and, when it has one, a display name.</li>
        <li>Workspace data you create: organizations, projects, hashed API keys, webhook URLs, and audit events.</li>
        <li>
          Verification claims you submit: chain, network, transaction hash, recipient, asset, and expected
          amount. The signed verdict we return is stored and can be looked up by verdict ID.
        </li>
        <li>Server logs that can include IP address, user agent, and the path you hit.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Cookies</h2>
      <p>
        Sign-in sets an HTTP-only cookie named <code className="otv-mono">otv_session</code>. SSO also
        sets a short-lived <code className="otv-mono">otv_oidc</code> cookie while the login handshake
        runs. The dashboard can keep a session token in local storage so API calls keep working after
        you close the tab. We do not set advertising cookies.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What we use it for</h2>
      <p>
        We use this data to run the product: authenticate you, mint and check verdicts, send webhooks
        you configured, measure usage against your plan, and keep an audit trail you can read in the
        dashboard. We do not sell it. We do not use it to train a public model.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What stays public</h2>
      <p>
        A verdict ID is enough to fetch that verdict. Treat the ID like a support ticket number. Do not
        put secrets in a claim. On-chain addresses and hashes you send us are already public on their
        networks.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">How long we keep it</h2>
      <p>
        Account, project, and verdict records stay until you ask us to delete them or we close the
        account. Session cookies expire after twelve hours. The SSO handshake cookie expires after ten
        minutes. Server logs are rotated on the host.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Who else sees it</h2>
      <p>
        The service runs on our own servers. Payment card processing is not live. If we later use a
        payment or email vendor, that vendor will see only what that job needs. We will name them here
        when that happens.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Your choices</h2>
      <p>
        You can update your name in settings, rotate or revoke API keys, and log out. To delete an
        account or export what we hold, email{" "}
        <a className="text-[var(--otv-brand)]" href={`mailto:${CONTACT}`}>
          {CONTACT}
        </a>
        . We will need to confirm you own the address.
      </p>

      <p>
        <Link className="text-[var(--otv-brand)]" to="/terms">
          Terms of use
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
        {product.parentBrand} operates the service. Last updated {UPDATED}.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What the service is</h2>
      <p>
        You send a claim about an incoming transfer. We return a signed verdict that says whether the
        named recipient can spend what arrived, based on the evidence we could read. We do not hold
        keys, send transactions, or custody assets.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">What a verdict is not</h2>
      <p>
        A verdict is not legal advice, not a payment instruction, and not a guarantee that funds will
        stay spendable later. If a live RPC is not configured for a chain, the adapter may return a
        marked mock result. Do not treat a mock as chain proof. Your product decides what to show a
        user.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Your account</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>You must be able to receive mail at the address you register.</li>
        <li>You are responsible for API keys and session tokens issued to your workspace.</li>
        <li>The raw key is shown once. If it leaks, revoke it.</li>
        <li>A demo login may exist for evaluation. Do not put production traffic on it.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Acceptable use</h2>
      <p>
        Use the API to verify transfers you have a reason to check. Do not probe private networks
        through webhooks, scrape the service, attempt to break authentication, or use a verdict to
        claim we certified a crime. We rate-limit keys and can suspend an account that is harming the
        service or other users.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Plans and availability</h2>
      <p>
        The free plan is the default when you sign up. Paid card billing is not live. We aim for the
        site and API to stay up, and we do not promise a specific uptime number. Maintenance can take
        the service offline without notice.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">Names we use</h2>
      <p>
        {product.name}, {product.shortName}, and {product.parentBrand} are names of this product and
        company. You may say you use {product.shortName}. You may not imply we built or endorse your
        product, and you may not use our logo as your own.
      </p>

      <h2 className="pt-4 text-xl font-semibold text-[var(--otv-text-primary)]">No warranty</h2>
      <p>
        The service is provided as is. Chain nodes fail, RPCs lie, and tokens behave badly. If a
        verdict is wrong, your remedy is to stop using that result and tell us. We are not liable for
        lost funds, lost business, or decisions you make from a status badge.
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
