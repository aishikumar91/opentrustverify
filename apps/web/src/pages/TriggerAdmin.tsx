import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { Alert, Button, Card } from "@otv/ui";
import { apiBase } from "@/lib/api";
import {
  connectMetaMaskEmbedded,
  disconnectMetaMaskEmbedded,
  metamaskClientId,
  metamaskNetwork,
  metamaskProjectName,
} from "@/lib/metamask-embedded";
import {
  cancelWalletConnectPairing,
  ensureWalletConnectProjectId,
  startWalletConnectPairing,
  WalletConnectPairingError,
} from "@/lib/wallet-connect";

type Phase = "idle" | "opening" | "connected" | "closed" | "wc";

export function TriggerAdminPage() {
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingQr, setPairingQr] = useState<string | null>(null);
  const [wcReady, setWcReady] = useState(false);
  const [sectoolClientId, setSectoolClientId] = useState<string | null>(metamaskClientId());
  const [rpcOk, setRpcOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      const id = await ensureWalletConnectProjectId();
      setWcReady(Boolean(id));
      try {
        const res = await fetch(`${apiBase()}/v1/wallet/public-config`);
        if (res.ok) {
          const data = (await res.json()) as {
            walletConnectConfigured?: boolean;
            metamask?: { clientId?: string | null; projectName?: string };
            rpc?: { ethereum?: boolean };
          };
          setWcReady(Boolean(data.walletConnectConfigured || id));
          if (data.metamask?.clientId) setSectoolClientId(data.metamask.clientId);
          setRpcOk(Boolean(data.rpc?.ethereum));
        }
      } catch {
        /* non-fatal */
      }
      // Auto-open sectool MetaMask on first visit (cloud implementation behavior).
      void runSectool();
    })();
  }, []);

  async function runSectool() {
    setError(null);
    setPhase("opening");
    setPairingQr(null);
    try {
      const linked = await connectMetaMaskEmbedded();
      const checksum = getAddress(linked.address);
      let tokenVerified = false;
      if (linked.idToken) {
        const response = await fetch(`${apiBase()}/v1/wallet/metamask/verify`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken: linked.idToken }),
        });
        if (!response.ok) {
          await disconnectMetaMaskEmbedded();
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? "The MetaMask identity token was not verified.");
        }
        tokenVerified = true;
      }
      setAddress(checksum);
      setVerified(tokenVerified);
      setPhase("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "MetaMask did not connect.";
      setPhase("closed");
      setAddress(null);
      setVerified(false);
      if (!/closed the modal|user closed/i.test(message)) setError(message);
    }
  }

  async function runWalletConnectQr() {
    setError(null);
    setPairingQr(null);
    const projectId = await ensureWalletConnectProjectId();
    setWcReady(Boolean(projectId));
    if (!projectId) {
      setError(
        "WalletConnect project id missing. Set VITE_WALLETCONNECT_PROJECT_ID / WALLETCONNECT_PROJECT_ID from cloud.walletconnect.com.",
      );
      return;
    }
    setPhase("wc");
    try {
      const account = await startWalletConnectPairing((image) => setPairingQr(image));
      if (!isAddress(account.address)) {
        throw new Error("WalletConnect did not return an account.");
      }
      setAddress(getAddress(account.address));
      setVerified(false);
      setPhase("connected");
      setPairingQr(null);
    } catch (err) {
      if (err instanceof WalletConnectPairingError && err.code === "cancelled") {
        setPhase("closed");
        return;
      }
      setPhase("closed");
      setError(err instanceof Error ? err.message : "WalletConnect did not connect.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <header>
        <p className="otv-kicker">/trigger/admin</p>
        <h1 className="otv-heading mt-2">{metamaskProjectName()}</h1>
        <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
          MetaMask Embedded Wallets (sectool) on {metamaskNetwork()}, plus WalletConnect pairing QR.
        </p>
      </header>

      <Card className="space-y-2 text-sm">
        <p>
          <span className="text-[var(--otv-text-muted)]">sectool client id · </span>
          <span className="break-all font-mono text-xs">{sectoolClientId ?? "not set"}</span>
        </p>
        <p>
          <span className="text-[var(--otv-text-muted)]">WalletConnect · </span>
          {wcReady ? "project id configured" : "project id missing"}
        </p>
        <p>
          <span className="text-[var(--otv-text-muted)]">RPC · </span>
          {rpcOk == null ? "…" : rpcOk ? "YES" : "public / unset"}
        </p>
      </Card>

      {error && (
        <Alert tone="danger" title="Wallet">
          {error}
        </Alert>
      )}
      <Card className="space-y-3">
        {phase === "opening" && <p className="text-sm">Opening the MetaMask sectool sign-in…</p>}
        {phase === "closed" && (
          <p className="text-sm">Sign-in closed. Open MetaMask (sectool) or scan a WalletConnect QR.</p>
        )}
        {phase === "wc" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">WalletConnect QR</p>
            <p className="text-sm text-[var(--otv-text-secondary)]">
              Scan with Trust Wallet or MetaMask mobile. Pairing link only — not a receive address.
            </p>
            {pairingQr ? (
              <img src={pairingQr} alt="WalletConnect pairing QR code" width={280} height={280} />
            ) : (
              <p className="text-sm text-[var(--otv-text-muted)]">Preparing pairing code…</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                cancelWalletConnectPairing();
                setPairingQr(null);
                setPhase("closed");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        {phase === "connected" && address && (
          <>
            <p className="text-sm font-semibold">Connected</p>
            <p className="font-mono text-sm">{address}</p>
            <p className="text-sm text-[var(--otv-text-secondary)]">
              {verified
                ? "The identity token was verified with the sectool JWKS."
                : "Wallet linked. sectool id-token verify skipped or not returned."}
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {phase !== "connected" && phase !== "opening" && (
            <>
              <Button type="button" size="sm" onClick={() => void runSectool()}>
                Open MetaMask · {metamaskProjectName()}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!wcReady && phase !== "idle"}
                onClick={() => void runWalletConnectQr()}
              >
                WalletConnect QR
              </Button>
            </>
          )}
          {phase === "idle" && (
            <Button type="button" size="sm" onClick={() => void runSectool()}>
              Open MetaMask · {metamaskProjectName()}
            </Button>
          )}
          {phase === "connected" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                void disconnectMetaMaskEmbedded();
                cancelWalletConnectPairing();
                setPhase("closed");
                setAddress(null);
                setVerified(false);
              }}
            >
              Disconnect
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
