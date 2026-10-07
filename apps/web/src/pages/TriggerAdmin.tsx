import { useEffect, useRef, useState } from "react";
import { getAddress } from "viem";
import { Alert, Button, Card } from "@otv/ui";
import { apiBase } from "@/lib/api";
import {
  connectMetaMaskEmbedded,
  disconnectMetaMaskEmbedded,
  metamaskNetwork,
  metamaskProjectName,
} from "@/lib/metamask-embedded";

type Phase = "opening" | "connected" | "closed";

export function TriggerAdminPage() {
  const started = useRef(false);
  const [phase, setPhase] = useState<Phase>("opening");
  const [address, setAddress] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setPhase("opening");
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

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <header>
        <p className="otv-kicker">/trigger/admin</p>
        <h1 className="otv-heading mt-2">{metamaskProjectName()}</h1>
        <p className="mt-2 text-sm text-[var(--otv-text-secondary)]">
          MetaMask Embedded Wallets on {metamaskNetwork()}. This page opens the sectool project.
        </p>
      </header>
      {error && (
        <Alert tone="danger" title="MetaMask">
          {error}
        </Alert>
      )}
      <Card className="space-y-3">
        {phase === "opening" && <p className="text-sm">Opening the MetaMask sign-in…</p>}
        {phase === "closed" && (
          <p className="text-sm">The sign-in was closed. Open it again to continue with sectool.</p>
        )}
        {phase === "connected" && address && (
          <>
            <p className="text-sm font-semibold">Connected</p>
            <p className="font-mono text-sm">{address}</p>
            <p className="text-sm text-[var(--otv-text-secondary)]">
              {verified
                ? "The identity token was verified with the sectool JWKS."
                : "The wallet is connected. This login did not return an identity token to verify."}
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {phase !== "connected" && (
            <Button type="button" size="sm" onClick={() => void run()}>
              Open MetaMask
            </Button>
          )}
          {phase === "connected" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                void disconnectMetaMaskEmbedded();
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
