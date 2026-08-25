import { describe, expect, it } from "vitest";
import { OpenTrustVerify } from "./index.js";

describe("sdk-core shape", () => {
  it("constructs client", () => {
    const otv = new OpenTrustVerify({ baseUrl: "http://localhost:4080", apiKey: "otv_test" });
    expect(otv).toBeTruthy();
  });
});
