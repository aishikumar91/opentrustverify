import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  type Chain,
} from "viem";
import { english, generateMnemonic, mnemonicToAccount } from "viem/accounts";
import { base, mainnet, polygon } from "viem/chains";
import { formatBaseUnits } from "@otv/wallet-core";
import { Alert, Button, Card, Input } from "@otv/ui";
import { apiBase } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  cancelWalletConnectPairing,
  disconnectWalletConnect,
  restoreWalletConnect,
  startWalletConnectPairing,
  subscribeWalletConnect,
  walletConnectProjectId,
  walletConnectRequest,
  WalletConnectPairingError,
} from "@/lib/wallet-connect";
import {
  addressBook,
  connectedApps,
  hasVault,
  lockVault,
  openPhrase,
  readVaultRecord,
  rememberPhrase,
  saveAddressBook,
  saveConnectedApps,
  saveVault,
  saveWatchAddresses,
  sealPhrase,
  unlockedPhrase,
  watchAddresses,
  type AddressBookEntry,
  type ConnectedApp,
} from "@/lib/wallet-vault";

const NETWORKS: Array<{
  chain: string;
  network: string;
  chainId: number;
  viem: Chain;
  rpc: string;
  confirmations: number;
}> = [
  { chain: "ethereum", network: "mainnet", chainId: 1, viem: mainnet, rpc: "https://ethereum.publicnode.com", confirmations: 12 },
  { chain: "base", network: "mainnet", chainId: 8453, viem: base, rpc: "https://base.publicnode.com", confirmations: 20 },
  { chain: "polygon", network: "mainnet", chainId: 137, viem: polygon, rpc: "https://polygon-bor-rpc.publicnode.com", confirmations: 30 },
];

type AssetRow = { type: string; symbol: string; decimals: number; contract?: string; name?: string };
type BalanceState = "verified" | "unavailable" | "requires_reconciliation" | "stale";
type Holding = AssetRow & {
  assetId: string;
  balanceBaseUnits: string | null;
  verification: BalanceState;
  blockNumber: number | null;
  observedAt: string | null;
};
type SendPhase = "form" | "review" | "signed" | "broadcast" | "pending" | "included" | "failed";
type Session =
  | { kind: "local"; address: string; accountIndex: number }
  | { kind: "injected"; address: string }
  | { kind: "walletconnect"; address: string; origin: string }
  | { kind: "watch"; address: string };

interface EthereumRequest {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function injectedProvider(): EthereumRequest | null {
  const eth = (window as Window & { ethereum?: EthereumRequest }).ethereum;
  return eth ?? null;
}

function toBaseUnits(input: string, decimals: number): string | null {
  if (!/^\d+(\.\d+)?$/.test(input)) return null;
  const [whole, frac = ""] = input.split(".");
  if (frac.length > decimals) return null;
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt((frac.padEnd(decimals, "0") || "0").slice(0, decimals))).toString();
}

function short(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletShell() {
  const { client } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [panel, setPanel] = useState<"home" | "receive" | "send" | "merchant" | "settings">("home");
  const [networkIndex, setNetworkIndex] = useState(0);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [phraseDraft, setPhraseDraft] = useState("");
  const [phraseConfirm, setPhraseConfirm] = useState("");
  const [setup, setSetup] = useState<"idle" | "backup" | "import" | "watch">("idle");
  const [watchInput, setWatchInput] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const pairingTicket = useRef(0);
  const [activity, setActivity] = useState(0);
  const network = NETWORKS[networkIndex] ?? NETWORKS[0]!;

  useEffect(() => {
    if (session?.kind !== "local") return;
    const timer = window.setTimeout(() => {
      lockVault();
      setSession(null);
      setNotice("Wallet locked after five minutes.");
    }, 5 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [session, activity]);

  useEffect(() => {
    if (!session) {
      setQr(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(session.address, { margin: 1, width: 196, color: { dark: "#120908", light: "#f0ebc6" } })
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function refreshBalances(current = session) {
    if (!current) return;
    setLoadingBalances(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase()}/v1/assets?chain=${network.chain}&network=${network.network}`);
      if (!res.ok) throw new Error("The asset registry could not be loaded.");
      const assets = (await res.json()) as AssetRow[];
      const listed = assets.filter((item) => item.type === "native" || item.type === "erc20").slice(0, 8);
      const next = await Promise.all(
        listed.map(async (asset) => {
          const assetId = asset.type === "native" ? "native" : asset.contract ?? "";
          try {
            const read = await client.walletBalance({
              chain: network.chain,
              network: network.network,
              address: current.address,
              asset: assetId,
            });
            return {
              ...asset,
              assetId,
              balanceBaseUnits: read.balanceBaseUnits,
              verification: read.verification,
              blockNumber: read.blockNumber,
              observedAt: read.observedAt,
            } satisfies Holding;
          } catch {
            return {
              ...asset,
              assetId,
              balanceBaseUnits: null,
              verification: "unavailable" as const,
              blockNumber: null,
              observedAt: null,
            } satisfies Holding;
          }
        })
      );
      setHoldings((previous) =>
        next.map((item) => {
          if (item.verification !== "unavailable") return item;
          const prior = previous.find((row) => row.assetId === item.assetId && row.verification === "verified");
          if (!prior) return item;
          return { ...prior, verification: "stale", observedAt: prior.observedAt };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Balances could not be read.");
    } finally {
      setLoadingBalances(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void restoreWalletConnect()
      .then((account) => {
        if (cancelled || !account || !isAddress(account.address)) return;
        const checksum = getAddress(account.address);
        rememberLinkedWallet(account.name, account.origin, checksum, NETWORKS[0]!.network);
        setSession({ kind: "walletconnect", address: checksum, origin: account.origin });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session?.kind !== "walletconnect") return;
    return subscribeWalletConnect({
      disconnect: () => {
        setSession(null);
        setPairing(false);
        setPairingQr(null);
        setNotice("The wallet disconnected this link.");
      },
      accountsChanged: (accounts) => {
        const next = accounts[0];
        if (!next || !isAddress(next)) {
          setSession(null);
          return;
        }
        setSession({ kind: "walletconnect", address: getAddress(next), origin: session.origin });
      },
    });
  }, [session?.kind, session && session.kind === "walletconnect" ? session.origin : ""]);

  useEffect(() => {
    if (session) void refreshBalances(session);
    // Network and account changes should re-read. refreshBalances is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.address, session?.kind, network.chain, network.network]);

  async function createWallet() {
    setError(null);
    const phrase = generateMnemonic(english);
    setPhraseDraft(phrase);
    setSetup("backup");
  }

  async function finishCreate() {
    setError(null);
    const words = phraseDraft.trim().split(/\s+/);
    if (phraseConfirm.trim() !== words[words.length - 1]) {
      setError("The last word does not match the recovery phrase on this screen.");
      return;
    }
    if (password.length < 8) {
      setError("Use a wallet password of at least 8 characters. It stays in this browser.");
      return;
    }
    try {
      const account = mnemonicToAccount(phraseDraft);
      const ciphertext = await sealPhrase(phraseDraft, password);
      saveVault({ address: account.address, ciphertext, createdAt: new Date().toISOString() });
      rememberPhrase(phraseDraft);
      setPhraseDraft("");
      setPhraseConfirm("");
      setPassword("");
      setSetup("idle");
      setSession({ kind: "local", address: account.address, accountIndex: 0 });
      void client.walletAudit("wallet_created").catch(() => undefined);
    } catch {
      setError("The wallet could not be created on this device.");
    }
  }

  async function finishImport() {
    setError(null);
    if (password.length < 8) {
      setError("Use a wallet password of at least 8 characters.");
      return;
    }
    try {
      const account = mnemonicToAccount(phraseDraft.trim());
      const ciphertext = await sealPhrase(phraseDraft.trim(), password);
      saveVault({ address: account.address, ciphertext, createdAt: new Date().toISOString() });
      rememberPhrase(phraseDraft.trim());
      setPhraseDraft("");
      setPassword("");
      setSetup("idle");
      setSession({ kind: "local", address: account.address, accountIndex: 0 });
      void client.walletAudit("wallet_imported").catch(() => undefined);
    } catch {
      setError("That recovery phrase was not accepted.");
    }
  }

  async function unlock() {
    setError(null);
    const record = readVaultRecord();
    if (!record) {
      setError("No local wallet is stored in this browser.");
      return;
    }
    try {
      const phrase = await openPhrase(record.ciphertext, password);
      const account = mnemonicToAccount(phrase, { addressIndex: 0 });
      rememberPhrase(phrase);
      setPassword("");
      setSession({ kind: "local", address: account.address, accountIndex: 0 });
    } catch {
      setError("Could not unlock this wallet.");
    }
  }

  function switchAccount(index: number) {
    const phrase = unlockedPhrase();
    if (!phrase) return;
    const account = mnemonicToAccount(phrase, { addressIndex: index });
    setSession({ kind: "local", address: account.address, accountIndex: index });
    setActivity((value) => value + 1);
  }

  async function connectInjected() {
    setError(null);
    const provider = injectedProvider();
    if (!provider) {
      setError("No injected wallet was found in this browser.");
      return;
    }
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0];
      if (!address || !isAddress(address)) {
        setError("The injected wallet did not return an address.");
        return;
      }
      setSession({ kind: "injected", address: getAddress(address) });
    } catch {
      setError("The injected wallet rejected the connection.");
    }
  }

  function rememberLinkedWallet(name: string, origin: string, account: string, networkName: string) {
    const entry: ConnectedApp = {
      origin,
      name,
      account,
      network: networkName,
      permissions: ["accounts", "sign"],
      lastActivity: new Date().toISOString(),
    };
    saveConnectedApps([entry, ...connectedApps().filter((item) => item.origin !== origin)]);
  }

  async function connectWalletConnect() {
    setError(null);
    setNotice(null);
    if (!walletConnectProjectId()) {
      setError("WalletConnect is not configured on this deployment. Use an injected wallet or create a local wallet.");
      return;
    }
    const ticket = ++pairingTicket.current;
    setPairing(true);
    setPairingQr(null);
    try {
      const account = await startWalletConnectPairing((image) => {
        if (ticket === pairingTicket.current) setPairingQr(image);
      });
      if (ticket !== pairingTicket.current) return;
      if (!isAddress(account.address)) {
        setError("WalletConnect did not return an account.");
        return;
      }
      const checksum = getAddress(account.address);
      rememberLinkedWallet(account.name, account.origin, checksum, network.network);
      setSession({ kind: "walletconnect", address: checksum, origin: account.origin });
    } catch (err) {
      if (ticket !== pairingTicket.current) return;
      if (err instanceof WalletConnectPairingError && err.code === "cancelled") return;
      setError(err instanceof Error ? err.message : "WalletConnect did not connect. No session was stored.");
    } finally {
      if (ticket === pairingTicket.current) {
        setPairing(false);
        setPairingQr(null);
      }
    }
  }

  function cancelPairing() {
    pairingTicket.current += 1;
    cancelWalletConnectPairing();
    setPairing(false);
    setPairingQr(null);
  }

  function addWatch() {
    setError(null);
    if (!isAddress(watchInput)) {
      setError("That is not a valid EVM address.");
      return;
    }
    let checksum = watchInput;
    try {
      checksum = getAddress(watchInput);
    } catch {
      setError("The address checksum does not match. Check it before watching.");
      return;
    }
    const existing = watchAddresses();
    if (existing.some((item) => item.address.toLowerCase() === checksum.toLowerCase())) {
      setError("That address is already in the watch list.");
      return;
    }
    saveWatchAddresses([{ address: checksum, label: "Watch", createdAt: new Date().toISOString() }, ...existing]);
    setWatchInput("");
    setSetup("idle");
    setLoadingBalances(true);
    setSession({ kind: "watch", address: checksum });
    void client.walletAudit("address_watched").catch(() => undefined);
  }

  const statusLine = useMemo(() => {
    if (!session) return "No account linked";
    if (session.kind === "watch") return "WATCH ONLY";
    if (session.kind === "local") return `Account ${String(session.accountIndex + 1).padStart(2, "0")}`;
    if (session.kind === "walletconnect") return "WalletConnect";
    return "Injected wallet";
  }, [session]);

  return (
    <div className="space-y-6" onPointerDown={() => setActivity((value) => value + 1)}>
      <header>
        <p className="otv-kicker">Open Trust Wallet</p>
        <h1 className="otv-heading mt-2">Wallet</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--otv-text-secondary)]">
          Keys stay on this device. OpenTrust reads public chain state and never receives a seed phrase, private key,
          or wallet password. Balances come from the chain adapter, not from transfer events.
        </p>
      </header>

      {error && (
        <Alert tone="danger" title="Wallet">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="info" title="Wallet">
          {notice}
        </Alert>
      )}

      {!session && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={createWallet}>Create wallet</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSetup("import")}>Import wallet</Button>
            <Button type="button" size="sm" variant="secondary" onClick={connectInjected}>Connect wallet</Button>
            <Button type="button" size="sm" variant="secondary" disabled={pairing} onClick={() => void connectWalletConnect()}>
              Link with QR
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSetup("watch")}>Watch address</Button>
            {hasVault() && (
              <Button type="button" size="sm" variant="secondary" onClick={unlock}>Unlock</Button>
            )}
          </div>
          {pairing && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Link with a QR code</h2>
              <p className="text-sm">
                Scan this WalletConnect code with a wallet on your phone. The code is a pairing link. It is not a
                payment, a receive address, or a spendability verdict.
              </p>
              {pairingQr ? (
                <img src={pairingQr} alt="WalletConnect pairing QR code" width={280} height={280} />
              ) : (
                <p className="text-sm text-[var(--otv-text-secondary)]">Preparing the pairing code…</p>
              )}
              <p className="text-xs text-[var(--otv-text-muted)]">
                The code expires. Cancel and create another if the wallet does not open it.
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={cancelPairing}>
                Cancel
              </Button>
            </div>
          )}
          {hasVault() && setup === "idle" && (
            <label className="block max-w-sm text-sm">
              Wallet password
              <Input className="mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          {setup === "backup" && (
            <div className="space-y-3">
              <p className="text-sm">Write these words down. They are shown once and are not sent to OpenTrust.</p>
              <p className="rounded-[14px] border border-[var(--otv-border)] p-4 font-mono text-sm">{phraseDraft}</p>
              <label className="block text-sm">
                Last word
                <Input className="mt-1" value={phraseConfirm} onChange={(e) => setPhraseConfirm(e.target.value)} autoComplete="off" />
              </label>
              <label className="block text-sm">
                Wallet password
                <Input className="mt-1" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <Button type="button" size="sm" onClick={finishCreate}>I wrote this down</Button>
            </div>
          )}
          {setup === "import" && (
            <div className="space-y-3">
              <label className="block text-sm">
                Recovery phrase
                <textarea className="otv-input mt-1 min-h-24 w-full" value={phraseDraft} onChange={(e) => setPhraseDraft(e.target.value)} autoComplete="off" />
              </label>
              <label className="block text-sm">
                Wallet password
                <Input className="mt-1" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <Button type="button" size="sm" onClick={finishImport}>Import on this device</Button>
            </div>
          )}
          {setup === "watch" && (
            <div className="space-y-3">
              <p className="text-sm">A watch address can show balances and incoming checks. It cannot sign.</p>
              <Input value={watchInput} onChange={(e) => setWatchInput(e.target.value)} placeholder="0x" />
              <Button type="button" size="sm" onClick={addWatch}>Watch this address</Button>
            </div>
          )}
        </Card>
      )}

      {session && (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--otv-text-muted)]">{statusLine}</p>
                <p className="mt-2 font-mono text-lg">{short(session.address)}</p>
                <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">
                  {network.viem.name} · chain {network.chainId}
                </p>
                <p className="mt-3 text-sm text-[var(--otv-text-secondary)]">
                  {loadingBalances ? "Checking blockchain state…" : "Balances are chain units. This wallet has no price feed, so it does not show a dollar total."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => setPanel("send")} disabled={session.kind === "watch"}>Send</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPanel("receive")}>Receive</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPanel("merchant")}>Payment check</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPanel("settings")}>Settings</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (session.kind === "walletconnect") void disconnectWalletConnect();
                    lockVault();
                    setSession(null);
                    setPanel("home");
                  }}
                >
                  Lock
                </Button>
              </div>
            </div>
            {session.kind === "watch" && (
              <p className="mt-4 text-sm font-semibold">WATCH ONLY. This address is monitored. OpenTrust does not hold its key.</p>
            )}
            <label className="mt-4 block max-w-xs text-sm">
              Network
              <select
                className="otv-input mt-1 w-full"
                value={networkIndex}
                onChange={(e) => setNetworkIndex(Number(e.target.value))}
              >
                {NETWORKS.map((item, index) => (
                  <option key={item.chain} value={index}>{item.viem.name}</option>
                ))}
              </select>
            </label>
            {session.kind === "local" && (
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant={session.accountIndex === 0 ? "primary" : "secondary"} onClick={() => switchAccount(0)}>Account 01</Button>
                <Button type="button" size="sm" variant={session.accountIndex === 1 ? "primary" : "secondary"} onClick={() => switchAccount(1)}>Account 02</Button>
              </div>
            )}
          </Card>

          {panel === "home" && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Assets</h2>
                <Button type="button" size="sm" variant="secondary" onClick={() => refreshBalances()}>Refresh state</Button>
              </div>
              <ul className="space-y-3">
                {holdings.map((item) => (
                  <li key={item.assetId} className="flex items-start justify-between gap-3 border-b border-[var(--otv-border)] pb-3">
                    <div>
                      <div className="font-semibold">{item.name ?? item.symbol}</div>
                      <div className="text-xs text-[var(--otv-text-muted)]">
                        {item.symbol} · {item.contract ? item.contract : "native"} · {network.viem.name}
                      </div>
                    </div>
                    <BalanceRead item={item} />
                  </li>
                ))}
              </ul>
              {!loadingBalances && holdings.length === 0 && (
                <p className="text-sm text-[var(--otv-text-secondary)]">No registry assets for this network yet.</p>
              )}
            </Card>
          )}

          {panel === "receive" && (
            <ReceivePanel address={session.address} networkName={network.viem.name} qr={qr} symbol={holdings[0]?.symbol ?? network.viem.nativeCurrency.symbol} />
          )}
          {panel === "send" && (
            <SendPanel
              session={session}
              network={network}
              holdings={holdings}
              onDone={() => {
                setPanel("home");
                void refreshBalances();
              }}
              onAudit={() => {
                void client.walletAudit("broadcast_submitted").catch(() => undefined);
              }}
            />
          )}
          {panel === "merchant" && (
            <MerchantPanel session={session} network={network} holdings={holdings} />
          )}
          {panel === "settings" && (
            <SettingsPanel
              networkName={network.viem.name}
              account={session.address}
              onUnlink={(origin) => {
                if (session.kind === "walletconnect" && session.origin === origin) {
                  void disconnectWalletConnect();
                  setSession(null);
                  setPanel("home");
                }
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function BalanceRead({ item }: { item: Holding }) {
  if (item.verification === "unavailable" || item.balanceBaseUnits == null) {
    return (
      <div className="text-right text-sm">
        <div className="font-semibold text-[var(--otv-danger)]">Blockchain state unavailable</div>
        <div className="text-xs text-[var(--otv-text-muted)]">This is not a zero balance.</div>
      </div>
    );
  }
  if (item.verification === "requires_reconciliation") {
    return <div className="text-right text-sm font-semibold">Reconciliation required</div>;
  }
  const amount = formatBaseUnits(item.balanceBaseUnits, item.decimals);
  return (
    <div className="text-right text-sm">
      <div className="font-semibold">{item.verification === "stale" ? "Stale snapshot" : "Verified"}</div>
      <div>{amount} {item.symbol}</div>
      <div className="text-xs text-[var(--otv-text-muted)]">
        {item.verification === "verified" && item.balanceBaseUnits === "0" ? "Chain returned zero. " : ""}
        State: latest{item.blockNumber ? ` · block ${item.blockNumber.toLocaleString()}` : " · head block not pinned"}
      </div>
    </div>
  );
}

function ReceivePanel({ address, networkName, qr, symbol }: { address: string; networkName: string; qr: string | null; symbol: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Receive</h2>
      <p className="text-sm">Only send {symbol} on {networkName} to this address. The same text address on another network is a different payment.</p>
      {qr && <img src={qr} alt="" width={196} height={196} />}
      <p className="break-all font-mono text-sm">{address}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy address"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            if (navigator.share) await navigator.share({ text: address });
          }}
        >
          Share
        </Button>
      </div>
    </Card>
  );
}

function SendPanel({
  session,
  network,
  holdings,
  onDone,
  onAudit,
}: {
  session: Session;
  network: (typeof NETWORKS)[number];
  holdings: Holding[];
  onDone: () => void;
  onAudit: () => void;
}) {
  const [assetId, setAssetId] = useState(holdings[0]?.assetId ?? "native");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [ensName, setEnsName] = useState("");
  const [phase, setPhase] = useState<SendPhase>("form");
  const [hash, setHash] = useState<string | null>(null);
  const [fee, setFee] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const asset = holdings.find((item) => item.assetId === assetId) ?? holdings[0];
  const baseUnits = asset ? toBaseUnits(amount, asset.decimals) : null;
  const recipientWarning = useMemo(() => {
    if (!to || !isAddress(to)) return null;
    if (to.toLowerCase() === session.address.toLowerCase()) return "This is your own address.";
    if (asset?.contract && to.toLowerCase() === asset.contract.toLowerCase()) return "This is the token contract, not a wallet.";
    return null;
  }, [to, session.address, asset?.contract]);

  async function resolveEns() {
    setError(null);
    if (network.chainId !== 1) {
      setError("ENS resolution is only offered on Ethereum mainnet.");
      return;
    }
    try {
      const publicClient = createPublicClient({ chain: mainnet, transport: http(network.rpc) });
      const resolved = await publicClient.getEnsAddress({ name: ensName.trim() });
      if (!resolved) {
        setError("That name did not resolve. The name is not an address.");
        return;
      }
      setTo(getAddress(resolved));
    } catch {
      setError("ENS lookup failed.");
    }
  }

  function review() {
    setError(null);
    if (session.kind === "watch") {
      setError("A watch-only address cannot sign.");
      return;
    }
    if (!asset || !baseUnits) {
      setError("Enter an amount that fits the token decimals.");
      return;
    }
    if (!isAddress(to)) {
      setError("The recipient address is not valid.");
      return;
    }
    try {
      setTo(getAddress(to));
    } catch {
      setError("The recipient checksum does not match.");
      return;
    }
    setPhase("review");
    void estimate();
  }

  async function estimate() {
    if (!asset || !baseUnits || !isAddress(to)) return;
    try {
      const publicClient = createPublicClient({ chain: network.viem, transport: http(network.rpc) });
      const gas = await publicClient.estimateGas(
        asset.assetId === "native"
          ? { account: session.address as `0x${string}`, to: getAddress(to), value: BigInt(baseUnits) }
          : {
              account: session.address as `0x${string}`,
              to: getAddress(asset.contract ?? to),
              data: encodeFunctionData({
                abi: transferAbi,
                functionName: "transfer",
                args: [getAddress(to), BigInt(baseUnits)],
              }),
            }
      );
      const price = await publicClient.getGasPrice();
      setFee(formatBaseUnits((gas * price).toString(), 18));
    } catch {
      setFee(null);
    }
  }

  async function signAndSend() {
    if (!asset || !baseUnits) return;
    setError(null);
    const recipient = getAddress(to);
    const data =
      asset.assetId === "native"
        ? undefined
        : encodeFunctionData({
            abi: transferAbi,
            functionName: "transfer",
            args: [recipient, BigInt(baseUnits)],
          });
    try {
      let txHash: string;
      if (session.kind === "local") {
        const phrase = unlockedPhrase();
        if (!phrase) {
          setError("Unlock the wallet before signing.");
          return;
        }
        const account = mnemonicToAccount(phrase, { addressIndex: session.accountIndex });
        const walletClient = createWalletClient({ account, chain: network.viem, transport: http(network.rpc) });
        setPhase("signed");
        txHash = await walletClient.sendTransaction({
          to: asset.assetId === "native" ? recipient : getAddress(asset.contract ?? recipient),
          value: asset.assetId === "native" ? BigInt(baseUnits) : 0n,
          data,
        });
      } else if (session.kind === "walletconnect") {
        const tx: { from: string; to: string; value: string; data?: string } = {
          from: session.address,
          to: asset.assetId === "native" ? recipient : getAddress(asset.contract ?? recipient),
          value: asset.assetId === "native" ? `0x${BigInt(baseUnits).toString(16)}` : "0x0",
        };
        if (data) tx.data = data;
        await walletConnectRequest({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
        setPhase("signed");
        txHash = await walletConnectRequest<string>({
          method: "eth_sendTransaction",
          params: [tx],
        });
      } else {
        const provider = injectedProvider();
        if (!provider) {
          setError("The connected wallet is not available for signing.");
          return;
        }
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
        setPhase("signed");
        txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: session.address,
              to: asset.assetId === "native" ? recipient : asset.contract,
              value: asset.assetId === "native" ? `0x${BigInt(baseUnits).toString(16)}` : "0x0",
              data,
            },
          ],
        })) as string;
      }
      setHash(txHash);
      setPhase("broadcast");
      onAudit();
      const publicClient = createPublicClient({ chain: network.viem, transport: http(network.rpc) });
      setPhase("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}`, timeout: 60_000 });
      setPhase(receipt.status === "success" ? "included" : "failed");
    } catch {
      setPhase("failed");
      setError("The transaction was not included. Broadcast success is not a completed send.");
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Send</h2>
      {session.kind === "watch" && <p className="text-sm font-semibold">WATCH ONLY. Signing is disabled.</p>}
      <label className="block text-sm">
        Asset
        <select className="otv-input mt-1 w-full" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          {holdings.map((item) => (
            <option key={item.assetId} value={item.assetId}>{item.symbol} · {item.contract ?? "native"}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Recipient
        <Input className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x" />
      </label>
      {recipientWarning && <p className="text-sm text-[var(--otv-warning)]">{recipientWarning}</p>}
      <div className="flex flex-wrap gap-2">
        <Input value={ensName} onChange={(e) => setEnsName(e.target.value)} placeholder="name.eth" />
        <Button type="button" size="sm" variant="secondary" onClick={resolveEns}>Resolve ENS</Button>
      </div>
      <p className="text-xs text-[var(--otv-text-muted)]">A resolved name is still an address. Check it before signing.</p>
      <label className="block text-sm">
        Amount
        <Input className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      </label>
      {phase === "form" && (
        <Button type="button" size="sm" onClick={review} disabled={session.kind === "watch"}>Review</Button>
      )}
      {phase !== "form" && asset && (
        <div className="space-y-2 rounded-[14px] border border-[var(--otv-border)] p-4 text-sm">
          <p>From {session.address}</p>
          <p>To {to}</p>
          <p>Network {network.viem.name}</p>
          <p>Asset {asset.symbol}{asset.contract ? ` · ${asset.contract}` : ""}</p>
          <p>Amount {amount} ({baseUnits ?? "—"} base units)</p>
          <p>Estimated fee {fee ? `${fee} ${network.viem.nativeCurrency.symbol}` : "Fee unavailable. This is not a free transaction."}</p>
          {asset.contract && (
            <p>Contract interaction: transfer on {asset.contract}. This is not a native send. No approval is requested.</p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            I checked the address, network, and amount.
          </label>
          {phase === "review" && (
            <Button type="button" size="sm" disabled={!checked} onClick={signAndSend}>Sign and broadcast</Button>
          )}
          <p>Status: {phase}</p>
          {hash && <p className="break-all font-mono text-xs">{hash}</p>}
          {phase === "included" && (
            <p>Included in a block. This is not marked finalized. Required confirmations on this network: {network.confirmations}.</p>
          )}
          {phase === "included" && <Button type="button" size="sm" variant="secondary" onClick={onDone}>Re-query balance</Button>}
        </div>
      )}
      {error && <p className="text-sm text-[var(--otv-danger)]">{error}</p>}
      <AddressBookForm network={network.network} onPick={setTo} />
    </Card>
  );
}

const transferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

function AddressBookForm({ network, onPick }: { network: string; onPick: (address: string) => void }) {
  const [entries, setEntries] = useState<AddressBookEntry[]>(() => addressBook());
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Address book</h3>
      <p className="text-xs text-[var(--otv-text-muted)]">A saved name is a label. It is not proof of who controls the address.</p>
      <ul className="space-y-1 text-sm">
        {entries.filter((item) => item.network === network).map((item) => (
          <li key={item.address}>
            <button type="button" className="font-mono text-xs" onClick={() => onPick(item.address)}>{item.label} · {item.address}</button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x" />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!isAddress(address)) return;
            const next = [{ label: label || "Saved", address: getAddress(address), network }, ...entries];
            saveAddressBook(next);
            setEntries(next);
            setLabel("");
            setAddress("");
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function MerchantPanel({
  session,
  network,
  holdings,
}: {
  session: Session;
  network: (typeof NETWORKS)[number];
  holdings: Holding[];
}) {
  const { client } = useAuth();
  const [assetId, setAssetId] = useState(holdings.find((item) => item.contract)?.assetId ?? holdings[0]?.assetId ?? "native");
  const [amount, setAmount] = useState("100");
  const [reference, setReference] = useState("OTV-");
  const [tx, setTx] = useState("");
  const [verdictStatus, setVerdictStatus] = useState<string | null>(null);
  const [balanceNote, setBalanceNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asset = holdings.find((item) => item.assetId === assetId);

  async function check() {
    setError(null);
    setVerdictStatus(null);
    setBalanceNote(null);
    if (!asset) return;
    const base = toBaseUnits(amount, asset.decimals);
    if (!base) {
      setError("Amount does not fit the token decimals.");
      return;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) {
      setError("A transaction hash is required. An event notice is not enough.");
      return;
    }
    try {
      const verdict = await client.verifyIncoming({
        chain: network.chain,
        network: network.network,
        transactionHash: tx,
        recipient: session.address,
        asset: asset.contract
          ? { type: "erc20", contract: asset.contract, symbol: asset.symbol, decimals: asset.decimals }
          : { type: "native", symbol: asset.symbol, decimals: asset.decimals },
        expectedAmount: base,
      });
      setVerdictStatus(verdict.status);
      const read = await client.walletBalance({
        chain: network.chain,
        network: network.network,
        address: session.address,
        asset: asset.assetId,
      });
      if (read.verification !== "verified" || read.balanceBaseUnits == null || read.decimals == null) {
        setBalanceNote(`Reference ${reference} stays on this screen. Canonical balance: unavailable. That is not a zero balance and it is not a verified payment.`);
      } else {
        setBalanceNote(`Reference ${reference} stays on this screen. Canonical balance: ${formatBaseUnits(read.balanceBaseUnits, read.decimals)} ${asset.symbol}. Read status: ${read.verification}. Block tag: ${read.blockTag}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The payment check failed.");
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold">Payment check</h2>
      <p className="text-sm text-[var(--otv-text-secondary)]">
        LIVE VERIFICATION uses the existing OTV claim path plus a separate balance read. A detected event is not this result.
      </p>
      <p className="text-sm">Recipient {session.address}</p>
      <p className="text-sm">Network {network.viem.name}</p>
      <label className="block text-sm">
        Asset
        <select className="otv-input mt-1 w-full" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          {holdings.map((item) => (
            <option key={item.assetId} value={item.assetId}>{item.symbol}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Expected amount
        <Input className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className="block text-sm">
        Reference
        <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
      </label>
      <label className="block text-sm">
        Transaction hash
        <Input className="mt-1" value={tx} onChange={(e) => setTx(e.target.value)} placeholder="0x" />
      </label>
      <Button type="button" size="sm" onClick={check}>Verify payment</Button>
      {verdictStatus && <p className="text-sm">Signed verdict status: {verdictStatus}</p>}
      {balanceNote && <p className="text-sm">{balanceNote}</p>}
      {error && <p className="text-sm text-[var(--otv-danger)]">{error}</p>}
    </Card>
  );
}

function SettingsPanel({
  networkName,
  account,
  onUnlink,
}: {
  networkName: string;
  account: string;
  onUnlink: (origin: string) => void;
}) {
  const [apps, setApps] = useState<ConnectedApp[]>(() => connectedApps());
  return (
    <Card className="space-y-4">
      <h2 className="text-sm font-semibold">Settings</h2>
      <p className="text-sm">Security: this browser locks a local wallet after five minutes. Unlock uses the wallet password. Biometric unlock is not claimed on this web app.</p>
      <p className="text-sm">Networks in this wallet: Ethereum, Base, Polygon. Active: {networkName}.</p>
      <p className="text-sm">Assets come from the verified registry. A symbol is not enough to identify a token.</p>
      <p className="text-sm">Privacy: recovery material is encrypted in this browser and is not written to the API, the address bar, or analytics.</p>
      <div>
        <h3 className="text-sm font-semibold">Connected apps</h3>
        {apps.length === 0 && <p className="mt-1 text-sm text-[var(--otv-text-secondary)]">No app is connected.</p>}
        <ul className="mt-2 space-y-2">
          {apps.map((app) => (
            <li key={app.origin} className="text-sm">
              <div>{app.name}</div>
              <div className="text-xs text-[var(--otv-text-muted)]">{app.origin} · {app.account} · {app.permissions.join(", ")}</div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  const next = apps.filter((item) => item.origin !== app.origin);
                  saveConnectedApps(next);
                  setApps(next);
                  onUnlink(app.origin);
                }}
              >
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-[var(--otv-text-muted)]">Account {account}</p>
    </Card>
  );
}
