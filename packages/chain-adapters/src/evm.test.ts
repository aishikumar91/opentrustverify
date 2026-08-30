import { describe, expect, it } from "vitest";
import { decodeAbiString } from "./evm.js";
import { createAdapter } from "./ethereum.js";

describe("EVM token decode", () => {
  it("reads a bytes32 symbol", () => {
    const hex = `0x${Buffer.from("DAI").toString("hex").padEnd(64, "0")}`;
    expect(decodeAbiString(hex)).toBe("DAI");
  });

  it("uses the mock path for ethereum under vitest", () => {
    const adapter = createAdapter("ethereum", "sepolia");
    expect(adapter.isLive).toBe(false);
    expect(adapter.chainId).toBe("ethereum");
  });

  it("routes polygon through the evm adapter", () => {
    const adapter = createAdapter("polygon", "mock");
    expect(adapter.chainId).toBe("polygon");
    expect(adapter.isLive).toBe(false);
  });
});
