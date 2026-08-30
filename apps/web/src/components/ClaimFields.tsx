import { useEffect, useMemo, useState } from "react";
import type { IncomingClaim } from "@otv/verdict-schema";
import { Input } from "@otv/ui";
import { publicClient } from "@/lib/api";

export type ClaimFormState = {
  chain: string;
  network: string;
  transactionHash: string;
  recipient: string;
  assetType: "auto" | "native" | "erc20" | "erc721" | "erc1155" | "other";
  contract: string;
  tokenId: string;
  amount: string;
};

const selectClass = "otv-input w-full";

export const EMPTY_CLAIM: ClaimFormState = {
  chain: "ethereum",
  network: "sepolia",
  transactionHash: "",
  recipient: "",
  assetType: "auto",
  contract: "",
  tokenId: "",
  amount: "",
};

export function buildIncomingClaim(form: ClaimFormState): IncomingClaim {
  const asset =
    form.assetType === "auto"
      ? form.contract
        ? { type: "other" as const, contract: form.contract, tokenId: form.tokenId || undefined }
        : undefined
      : {
          type: form.assetType === "other" ? ("other" as const) : form.assetType,
          contract: form.assetType === "native" ? undefined : form.contract || undefined,
          tokenId: form.tokenId || undefined,
        };
  return {
    chain: form.chain,
    network: form.network,
    transactionHash: form.transactionHash,
    recipient: form.recipient,
    asset,
    expectedAmount: form.amount || undefined,
  };
}

export function ClaimFields({
  form,
  onChange,
}: {
  form: ClaimFormState;
  onChange: (next: ClaimFormState) => void;
}) {
  const [chains, setChains] = useState<Array<{ id: string; name?: string; family?: string; networks: string[] }>>([]);
  const [assets, setAssets] = useState<
    Array<{ symbol: string; type: string; contract?: string; decimals: number; name?: string }>
  >([]);

  useEffect(() => {
    publicClient.listChains().then(setChains).catch(() => undefined);
  }, []);

  useEffect(() => {
    publicClient
      .listAssets(form.chain, form.network)
      .then(setAssets)
      .catch(() => setAssets([]));
  }, [form.chain, form.network]);

  const selected = useMemo(() => chains.find((c) => c.id === form.chain), [chains, form.chain]);
  const networks = selected?.networks ?? [form.network];
  const family = selected?.family ?? "evm";
  const tokenLike = family === "evm" || family === "solana" || family === "tron";

  function setChain(chain: string) {
    const next = chains.find((c) => c.id === chain);
    const network = next?.networks[0] ?? "mainnet";
    onChange({
      ...form,
      chain,
      network,
      assetType: next?.family === "bitcoin" ? "native" : "auto",
      contract: "",
    });
  }

  function applyKnown(symbol: string) {
    const asset = assets.find((a) => a.symbol === symbol);
    if (!asset) return;
    onChange({
      ...form,
      assetType: asset.type === "native" ? "native" : asset.type === "erc20" ? "erc20" : "other",
      contract: asset.contract ?? "",
    });
  }

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--otv-text-muted)]">Chain</span>
        <select className={selectClass} value={form.chain} onChange={(e) => setChain(e.target.value)}>
          {(chains.length ? chains : [{ id: form.chain, name: form.chain, networks: [form.network] }]).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.id}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--otv-text-muted)]">Network</span>
        <select
          className={selectClass}
          value={form.network}
          onChange={(e) => onChange({ ...form, network: e.target.value })}
        >
          {networks.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--otv-text-muted)]">Transaction hash</span>
        <Input
          className="otv-mono"
          value={form.transactionHash}
          onChange={(e) => onChange({ ...form, transactionHash: e.target.value })}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--otv-text-muted)]">Recipient</span>
        <Input
          className="otv-mono"
          value={form.recipient}
          onChange={(e) => onChange({ ...form, recipient: e.target.value })}
          required
        />
      </label>
      {tokenLike && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Token</span>
            <select
              className={selectClass}
              value={form.assetType === "auto" && !form.contract ? "" : form.contract || form.assetType}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || value === "auto") {
                  onChange({ ...form, assetType: "auto", contract: "" });
                  return;
                }
                if (value === "native") {
                  onChange({ ...form, assetType: "native", contract: "" });
                  return;
                }
                const known = assets.find((a) => a.symbol === value);
                if (known) {
                  applyKnown(value);
                  return;
                }
                onChange({ ...form, assetType: "other", contract: value });
              }}
            >
              <option value="">Detect from the transaction</option>
              <option value="native">Native coin</option>
              {assets
                .filter((a) => a.contract)
                .map((a) => (
                  <option key={`${a.symbol}-${a.contract}`} value={a.symbol}>
                    {a.symbol}
                    {a.name ? ` · ${a.name}` : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--otv-text-muted)]">Asset type</span>
            <select
              className={selectClass}
              value={form.assetType}
              onChange={(e) =>
                onChange({ ...form, assetType: e.target.value as ClaimFormState["assetType"] })
              }
            >
              <option value="auto">Auto</option>
              <option value="native">Native</option>
              {family === "evm" && (
                <>
                  <option value="erc20">ERC-20</option>
                  <option value="erc721">ERC-721</option>
                  <option value="erc1155">ERC-1155</option>
                </>
              )}
              {family !== "evm" && <option value="other">Token</option>}
            </select>
          </label>
        </>
      )}
      {form.assetType !== "native" && tokenLike && (
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--otv-text-muted)]">Contract or mint (optional)</span>
          <Input
            className="otv-mono"
            value={form.contract}
            onChange={(e) => onChange({ ...form, contract: e.target.value })}
            placeholder="Leave empty to detect"
          />
        </label>
      )}
      {(form.assetType === "erc721" || form.assetType === "erc1155") && (
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--otv-text-muted)]">Token id (optional)</span>
          <Input
            className="otv-mono"
            value={form.tokenId}
            onChange={(e) => onChange({ ...form, tokenId: e.target.value })}
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--otv-text-muted)]">Expected amount (optional)</span>
        <Input
          className="otv-mono"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
        />
      </label>
    </>
  );
}
