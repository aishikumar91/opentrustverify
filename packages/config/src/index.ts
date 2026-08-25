export const product = {
  name: "OpenTrust Verify",
  shortName: "OTV",
  tagline: "Trust the balance, not just the blockchain event.",
  parentBrand: "POP Trust",
  domain: "verify.poptrust.me",
  apiDomain: "api.verify.poptrust.me",
  docsDomain: "docs.verify.poptrust.me",
} as const;

export const plans = ["FREE", "DEVELOPER", "BUSINESS", "ENTERPRISE"] as const;

export const defaultPorts = {
  api: 4080,
  dashboard: 4081,
  verifier: 4082,
  marketing: 4083,
  demoWallet: 4084,
  docs: 4085,
} as const;
