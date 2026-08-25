import { describe, expect, it } from "vitest";
import { MemoryStore, DEMO_API_KEY } from "./lib/store.js";

describe("MemoryStore auth", () => {
  it("authenticates demo key", () => {
    const s = new MemoryStore();
    expect(s.authenticate(DEMO_API_KEY)?.id).toBe("key_demo");
    expect(s.authenticate("bad")).toBeNull();
  });
});
