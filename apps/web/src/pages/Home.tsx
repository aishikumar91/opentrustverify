import { Link } from "react-router-dom";
import { buttonClassName, BtnText } from "@otv/ui";
import { product } from "@otv/config";
import { useAuth } from "@/lib/auth";
import { LandingArt } from "@/components/LandingArt";
import { ExplorerSearchBar } from "@/components/ExplorerSearchBar";

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
      <section className="otv-hero">
        <div className="otv-container grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="banner_big_title">{product.tagline}</h1>
            <p className="mt-5 max-w-xl text-base text-[var(--otv-brand)]">
              A transaction hash can look paid while the recipient still cannot spend the asset. Send
              us the claim. We return a signed verdict your wallet or risk desk can show.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={buttonClassName("primary")}>
                <BtnText>Create an account</BtnText>
              </Link>
              <Link to="/docs" className={buttonClassName("secondary")}>
                <BtnText>Read the API</BtnText>
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.label}>
                  <Link className="otv-tag" to={tag.to}>
                    {tag.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <LandingArt
            src="/marketing/otv-hero-globe.png"
            alt="OpenTrust Verify globe showing incoming claim evidence, Ed25519 signature, and SPENDABLE verdict states"
            size="md"
          />
        </div>
        <div className="otv-container mt-10 max-w-4xl">
          <ExplorerSearchBar />
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container">
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2 className="otv-heading mb-0">What you get</h2>
            <Link to="/docs" className={`${buttonClassName("secondary")} hidden lg:inline-flex`}>
              <BtnText>Explore the API</BtnText>
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((x) => (
              <div key={x.t} className="otv-card otv-card-lift">
                <div className="mb-4">
                  <span className="otv-tag">{x.tag}</span>
                </div>
                <h3 className="text-2xl font-bold">{x.t}</h3>
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
          <div className="mt-8 text-center lg:hidden">
            <Link to="/docs" className={buttonClassName("secondary")}>
              <BtnText>Explore the API</BtnText>
            </Link>
          </div>
        </div>
      </section>

      <section className="otv-section otv-section-tint">
        <div className="otv-container">
          <h2 className="otv-heading mx-auto mb-12 max-w-3xl text-center">
            How a claim becomes a signed verdict
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="otv-serial">{s.n}</div>
                <hr className="my-4 border-[var(--otv-border)]" />
                <h3 className="text-xl font-bold">{s.t}</h3>
                <p className="mt-2 mb-0 text-[var(--otv-text-secondary)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="otv-section">
        <div className="otv-container grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-[var(--otv-text-secondary)]">
            <h2 className="otv-heading text-[var(--otv-text-primary)]">
              Crypto and web3 payment verification
            </h2>
            <p>
              Wallets, exchanges, explorers, and support desks use OpenTrust Verify to check an incoming
              crypto transfer before they show Paid. The API covers Ethereum, Bitcoin, Solana, Tron,
              Base, and other EVM networks, including native assets and tokens such as USDC.
            </p>
            <p>
              A chain event can be true and still worthless. Pending transfers, lookalike tokens, and
              logs that never moved a balance all fool a raw explorer view. OTV returns a signed
              verdict you can show: SPENDABLE, REJECTED, SUSPICIOUS, or UNVERIFIED.
            </p>
          </div>
          <LandingArt
            src="/marketing/otv-verdict-dashboard.png"
            alt="Incoming verdicts dashboard summarizing spendability and evidence themes"
            size="md"
          />
        </div>
      </section>

      <section className="otv-section otv-section-tint">
        <div className="otv-container">
          <h2 className="otv-heading mb-4">Wallets that can call the API</h2>
          <p className="mb-8 max-w-2xl text-[var(--otv-text-secondary)]">
            Any wallet, exchange, or custody product that can POST a claim. The marks below are
            examples of that market, not a partnership list and not an OTV certification.
          </p>
          <LandingArt
            src="/marketing/otv-wallet-integrations.png"
            alt="Example crypto wallet products that can integrate OpenTrust Verify: MetaMask, Coinbase Wallet, Trust Wallet, Phantom, Ledger, and others"
            size="wide"
          />
        </div>
      </section>

      <section className="otv-section otv-section-dark">
        <div className="otv-container grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="otv-heading">Create a project, then mint a key</h2>
            <p className="mt-4 max-w-xl text-[var(--otv-footer-muted)]">
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
