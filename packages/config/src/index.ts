export const product = {
  name: "OpenTrust Verify",
  shortName: "OTV",
  tagline: "Trust the balance, not just the blockchain event.",
  parentBrand: "POP Trust",
  domain: "otv.poptrust.me",
  apiDomain: "otv.poptrust.me",
  docsDomain: "otv.poptrust.me",
} as const;

export const plans = ["FREE", "DEVELOPER", "BUSINESS", "ENTERPRISE"] as const;

export const defaultPorts = {
  api: 4080,
  web: 4090,
} as const;
