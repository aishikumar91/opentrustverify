import { Link } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";
import { useAuth } from "@/lib/auth";
import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";
import { VerdictOrbit } from "@/components/editorial";
import { FaqList, type FaqItem } from "@/components/FaqList";

const FEATURES = [
  {
    t: "A hash is not a payment",
    d: "An explorer can show that something happened. We check whether the recipient's spendable balance actually moved.",
    tag: "Problem",
    href: "/features",
  },
  {
    t: "A verdict you can check",
    d: "Each result is signed on our servers as otv.verdict.v1. Your wallet or risk desk can verify the Ed25519 signature without trusting this page.",
    tag: "Proof",
    href: "/whitepaper",
  },
  {
    t: "One request from your app",
    d: "Send the chain, hash, and recipient. Get a status from the verdict enum. Keys for servers. A session for your team.",
    tag: "Build",
    href: "/docs",
  },
];

const STEPS = [
  { n: "01", t: "Send what you saw", d: "Chain, network, transaction hash, and the wallet that should have received the asset." },
  { n: "02", t: "We check the evidence", d: "Adapters read the chain. The engine walks OBSERVED → PENDING → EXECUTED → ASSET_CONFIRMED → BALANCE_CONFIRMED → FINAL." },
  { n: "03", t: "You get a signed status", d: "SPENDABLE, or a terminal REJECTED, SUSPICIOUS, or UNVERIFIED, with the evidence that led there." },
  { n: "04", t: "Show that status", d: "Use @otv/ui primitives. Keep raw explorer data visible. Do not relabel SPENDABLE as paid." },
];

const AUDIENCES = [
  {
    t: "Wallets",
    d: "Show a status before the interface says a deposit can be spent. The badge comes from the verdict enum, not from a raw transfer log.",
  },
  {
    t: "Exchanges and custody",
    d: "Check an inbound credit for the named recipient before ops treats it as settled value. The key stays in your backend.",
  },
  {
    t: "Explorers",
    d: "Keep the chain view on screen. Label the OTV column separately, using the primitives in @otv/ui rather than a second homemade badge.",
  },
  {
    t: "Support desks",
    d: "A stored verdict has a public ID. The person on the phone and the agent can open the same signed record.",
  },
];

const HOME_FAQS: FaqItem[] = [
  {
    q: "What does OpenTrust Verify check?",
    a: "You send a chain, network, transaction hash, and the recipient who should have received the asset. The engine checks inclusion, execution, asset match, balance change, and that network’s finality rule, then returns a signed verdict.",
  },
  {
    q: "Which chains can I verify?",
    a: "Bitcoin, Solana, Tron, and EVM networks including Ethereum, Polygon, Arbitrum, Optimism, Base, and BNB Smart Chain. The live catalog is GET /v1/chains. EVM checks cover native coins plus ERC-20, ERC-721, and ERC-1155 transfers. Bitcoin is native BTC. Solana covers SOL and SPL mints. Tron covers TRX and TRC-20 when the transaction encodes a contract.",
  },
  {
    q: "Is a blockchain event the same as a payment?",
    a: "No. A pending transfer, a lookalike token, or an event that never moved a balance can look paid on an explorer. SPENDABLE is a later status, and only after the earlier checks have passed.",
  },
  {
    q: "Do I need an API key to read a verdict?",
    a: "No. Anyone can open a stored verdict by its ID. Submitting a new claim needs a session or an API key. Keep that key on your server, not in a public website bundle.",
  },
  {
    q: "Does OTV hold the assets?",
    a: "No. The API does not custody funds or broadcast transactions. Verdict signing keys stay on the API host. This website does not mint signatures.",
  },
  {
    q: "What if the check used a mock adapter?",
    a: "When a live RPC is not configured, a mock adapter can still return a verdict and marks that result so you do not treat a demo as chain proof. Public RPC endpoints can also rate-limit. A dedicated endpoint is optional.",
  },
];

const PUBLIC_TAGS = [
  { to: "/features", label: "Features" },
  { to: "/verifier", label: "Verifier" },
  { to: "/docs", label: "API" },
];

export function HomePage() {
  const { user } = useAuth();
  const tags = user
    ? [...PUBLIC_TAGS, { to: "/dashboard", label: "Dashboard" }]
    : PUBLIC_TAGS;

  return (
    <>
      <section className="otv-stage">
        <div className="otv-container">
          <div className="otv-frame otv-frame-hero" data-aos="fade-up">
            <div className="otv-hero-layout">
              <div className="otv-hero-copy" data-aos="fade-up" data-aos-delay="40">
                <p className="otv-kicker">Incoming verification</p>
                <h1 className="otv-display">
                  Trust the balance,
                  <br />
                  not the event.
                </h1>
                <p className="otv-lede">
                  A hash can look paid while the recipient still cannot spend the asset. Send the claim.
                  The API returns a signed verdict.
                </p>
                <div className="otv-hero-actions">
                  <Link to="/register" className={buttonClassName("primary")}>
                    <BtnText>Create an account</BtnText>
                  </Link>
                  <Link to="/docs" className={buttonClassName("secondary", "otv-btn-invert")}>
                    <BtnText>Read the API</BtnText>
                  </Link>
                </div>
                <p className="otv-hero-note">
                  <Link to="/lab">Run the demo</Link>
                  <span aria-hidden> · </span>
                  <Link to="/verifier">Look up a verdict</Link>
                </p>
              </div>
              <div data-aos="zoom-in" data-aos-delay="80">
                <VerdictOrbit size="hero" />
              </div>
            </div>
          </div>
          <ExplorerSearchBar compact className="otv-hero-search" />
        </div>
      </section>

      <section className="otv-section-tight">
        <div className="otv-container">
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.label}>
                <Link className="otv-tag" to={tag.to}>
                  {tag.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="otv-section" data-aos="fade-up">
        <div className="otv-container">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2 className="otv-heading mb-0">What you get</h2>
            <Link to="/docs" className={`${buttonClassName("secondary")} hidden lg:inline-flex`}>
              <BtnText>Explore the API</BtnText>
            </Link>
          </div>
          <div className="otv-feature-grid">
            {FEATURES.map((x, i) => (
              <div key={x.t} className={`otv-card otv-card-lift ${i === 0 ? "otv-card-feature otv-feature-lead" : ""}`}>
                <div className="mb-4">
                  <span className="otv-tag">{x.tag}</span>
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight">{x.t}</h3>
                <p className="mt-3 text-[var(--otv-text-secondary)]">{x.d}</p>
                <Link className="otv-unfill mt-6" to={x.href}>
                  <span>View details</span>
                  <span className="otv-unfill-icon" aria-hidden>
                    →
                  </span>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8 lg:hidden">
            <Link to="/docs" className={buttonClassName("secondary")}>
              <BtnText>Explore the API</BtnText>
            </Link>
          </div>
        </div>
      </section>

      <section className="otv-section" data-aos="fade-up">
        <div className="otv-container">
          <div className="mb-10 max-w-3xl">
            <p className="otv-kicker">Who it is for</p>
            <h2 className="otv-heading">Teams that have to show a status</h2>
            <p className="otv-lede">
              The same claim shape fits a wallet, an exchange, an explorer, or a support tool. Your
              product decides the wording on screen. OTV does not rename the enum for you.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {AUDIENCES.map((x) => (
              <div key={x.t} className="otv-card">
                <h3 className="text-xl font-bold uppercase tracking-tight">{x.t}</h3>
                <p className="mt-3 mb-0 text-[var(--otv-text-secondary)]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="otv-section otv-section-tint" data-aos="fade-up">
        <div className="otv-container">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
            <h2 className="otv-heading mb-0 max-w-3xl">How a claim becomes a signed verdict</h2>
            <VerdictOrbit />
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="otv-step">
                <div className="otv-serial">{s.n}</div>
                <h3 className="mt-4 text-xl font-bold uppercase tracking-tight">{s.t}</h3>
                <p className="mt-2 mb-0 text-[var(--otv-text-secondary)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container otv-split">
          <h2 className="otv-heading">Crypto and web3 payment verification</h2>
          <div className="space-y-4 text-[var(--otv-text-secondary)]">
            <p>
              Wallets, exchanges, explorers, and support desks use OpenTrust Verify to check an incoming
              crypto transfer before they show that funds can be spent. The API covers Ethereum and
              other EVM networks: Polygon, Arbitrum, Optimism, Base, BNB Smart Chain, and more in{" "}
              <code className="otv-mono text-sm">GET /v1/chains</code> — plus Bitcoin, Solana, and Tron.
            </p>
            <p>
              On EVM networks the adapter reads the native coin and ERC-20, ERC-721, and ERC-1155
              transfers. A token does not have to be on the convenience list. Pass the contract.
              Bitcoin checks are native BTC. Solana covers SOL and SPL mints. Tron covers TRX and
              TRC-20 when the transaction encodes a contract.
            </p>
            <p className="mb-0">
              A chain event can be true and still worthless. Pending transfers, lookalike tokens, and
              logs that never moved a balance all fool a raw explorer view. OTV returns a signed
              verdict you can show: SPENDABLE, REJECTED, SUSPICIOUS, or UNVERIFIED. The{" "}
              <Link className="text-[var(--otv-brand)]" to="/whitepaper">
                decision model
              </Link>{" "}
              explains why those words stay separate. Public RPC endpoints can rate-limit. A dedicated
              node is optional, not required to boot.
            </p>
          </div>
        </div>
      </section>

      <section className="otv-section otv-section-tint">
        <div className="otv-container otv-split">
          <h2 className="otv-heading">What can call the API</h2>
          <div className="max-w-xl space-y-4 text-[var(--otv-text-secondary)]">
            <p>
              Any wallet, exchange, or custody product that can POST a claim. The request needs the
              chain, the network, the transaction hash, and the recipient. An asset hint is optional.
              Naming a wallet product is not a partnership and not an OTV certification. The{" "}
              <Link className="text-[var(--otv-brand)]" to="/features">
                feature notes
              </Link>{" "}
              keep that distinction explicit.
            </p>
            <p className="mb-0">
              After sign-up you mint a key in the dashboard and keep it on the server that talks to
              OTV. People looking up a verdict someone already shared do not need a key. They can use
              the{" "}
              <Link className="text-[var(--otv-brand)]" to="/verifier">
                public verifier
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container otv-split items-start">
          <div>
            <p className="otv-kicker">Questions</p>
            <h2 className="otv-heading">Before you send a claim</h2>
            <p className="otv-lede">
              The short version of the{" "}
              <Link className="text-[var(--otv-brand)]" to="/docs">
                API guide
              </Link>
              , the{" "}
              <Link className="text-[var(--otv-brand)]" to="/security">
                security notes
              </Link>
              , and the{" "}
              <Link className="text-[var(--otv-brand)]" to="/whitepaper">
                model
              </Link>
              .
            </p>
          </div>
          <FaqList items={HOME_FAQS} />
        </div>
      </section>

      <section className="otv-section otv-section-dark">
        <div className="otv-container otv-split items-center">
          <div>
            <h2 className="otv-heading">Create a project, then mint a key</h2>
            <p className="otv-band-copy mt-4 max-w-xl">
              Sign up and you get a team workspace on the free plan. Keep the key in your backend.
              Anyone can still look up a stored verdict by ID.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className={buttonClassName("secondary", "otv-btn-solid-light")}>
              <BtnText>Create an account</BtnText>
            </Link>
            <Link to="/verifier" className={buttonClassName("secondary", "otv-btn-invert")}>
              <BtnText>Public verifier</BtnText>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
