import { describe, expect, it } from "vitest";
import { isSafeWebhookUrl } from "./lib/webhooks.js";

describe("webhook SSRF guard", () => {
  it("allows public https", () => {
    expect(isSafeWebhookUrl("https://hooks.example.com/otv")).toBe(true);
  });
  it("blocks localhost and private ranges", () => {
    expect(isSafeWebhookUrl("http://127.0.0.1/x")).toBe(false);
    expect(isSafeWebhookUrl("http://10.0.0.5/x")).toBe(false);
    expect(isSafeWebhookUrl("http://192.168.1.1/x")).toBe(false);
    expect(isSafeWebhookUrl("http://169.254.169.254/latest")).toBe(false);
  });
});
