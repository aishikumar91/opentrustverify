import { subBaseUnits } from "./units.js";

export type DemoScenarioId = "phantom_event" | "balance_mismatch" | "valid_payment" | "pending_payment";

export type StepState = "success" | "failed" | "pending" | "skipped";

export type PaymentDecision = "verified" | "pending" | "rejected" | "unavailable" | "mismatch";

export interface VerificationStep {
  step: string;
  label: string;
  state: StepState;
  detail: string;
}

export interface PaymentFacts {
  eventDetected: boolean;
  transactionExists: boolean;
  receiptOk: boolean;
  recipientMatches: boolean;
  tokenContractMatches: boolean;
  amountMatches: boolean;
  confirmations: number;
  requiredConfirmations: number;
  balanceBefore: string;
  /** Null means the canonical read failed. That is not a zero balance. */
  balanceAfter: string | null;
  expectedDelta: string;
}

export interface PaymentEvaluation {
  mode: "simulation";
  steps: VerificationStep[];
  result: PaymentDecision;
  decision: string;
  eventOnlyWouldAccept: boolean;
  balanceUnchanged: boolean;
  checks: number;
  stateQueries: number;
  eventCount: number;
  trustAssumptions: number;
}

export interface DemoScenario {
  mode: "simulation";
  id: DemoScenarioId;
  title: string;
  description: string;
  network: "ethereum";
  tokenSymbol: "USDT";
  tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7";
  recipientLabel: "0xOTV_DEMO_ADDRESS";
  recipient: "0x07de000000000000000000000000000000000001";
  reference: "OTV-DEMO-001";
  decimals: 6;
  expectedAmountBaseUnits: "100000000";
  balanceBefore: string;
  balanceAfter: string | null;
  expectedBalance: string;
  blockNumber: number | null;
  transactionHash: string | null;
  confirmations: number;
  requiredConfirmations: number;
  evaluation: PaymentEvaluation;
}

const EXPECTED = "100000000";
const BEFORE = "500000000";
const AFTER = "600000000";
const REQUIRED = 12;

function step(id: string, label: string, state: StepState, detail: string): VerificationStep {
  return { step: id, label, state, detail };
}

export function evaluatePayment(facts: PaymentFacts): PaymentEvaluation {
  const steps: VerificationStep[] = [];
  let stateQueries = 0;

  steps.push(
    facts.eventDetected
      ? step("event_detected", "Event received", "success", "An indexer reported an incoming transfer. This is activity, not payment proof.")
      : step("event_detected", "Event received", "skipped", "No event arrived. A missing event does not by itself reject a matching chain state.")
  );

  steps.push(step("payment_intent", "Payment intent matched", "success", "Network, token contract, recipient, amount, and reference are the expected payment."));

  stateQueries += 1;
  if (!facts.transactionExists) {
    steps.push(step("transaction_lookup", "Transaction lookup", "failed", "No transaction was found for this payment."));
    steps.push(step("receipt", "Receipt verification", "skipped", "There is no receipt to read."));
    steps.push(step("recipient", "Recipient verification", "skipped", "Recipient was not checked because the transaction is missing."));
    steps.push(step("token", "Token verification", "skipped", "Token contract was not checked because the transaction is missing."));
    steps.push(step("amount", "Amount verification", "skipped", "Transfer amount was not checked because the transaction is missing."));
    steps.push(step("confirmations", "Confirmation check", "skipped", "Confirmations require an included transaction."));
  } else {
    steps.push(step("transaction_lookup", "Transaction lookup", "success", "The transaction exists."));
    stateQueries += 1;
    steps.push(
      facts.receiptOk
        ? step("receipt", "Receipt verification", "success", "The receipt succeeded.")
        : step("receipt", "Receipt verification", "failed", "The receipt is missing or the transaction failed.")
    );
    steps.push(
      facts.recipientMatches
        ? step("recipient", "Recipient verification", "success", "The recipient matches the payment intent.")
        : step("recipient", "Recipient verification", "failed", "The recipient does not match the payment intent.")
    );
    steps.push(
      facts.tokenContractMatches
        ? step("token", "Token verification", "success", "The token contract matches the registry entry for this network.")
        : step("token", "Token verification", "failed", "The token contract does not match. A symbol alone is not identity.")
    );
    steps.push(
      facts.amountMatches
        ? step("amount", "Amount verification", "success", "The transfer amount matches the expected base units.")
        : step("amount", "Amount verification", "failed", "The transfer amount does not match the expected base units.")
    );
    if (facts.confirmations >= facts.requiredConfirmations) {
      steps.push(
        step(
          "confirmations",
          "Confirmation check",
          "success",
          `${facts.confirmations} confirmations meet the required ${facts.requiredConfirmations}.`
        )
      );
    } else {
      steps.push(
        step(
          "confirmations",
          "Confirmation check",
          "pending",
          `${facts.confirmations} of ${facts.requiredConfirmations} confirmations. Not final.`
        )
      );
    }
  }

  stateQueries += 1;
  const delta = facts.balanceAfter == null ? null : subBaseUnits(facts.balanceAfter, facts.balanceBefore);
  const balanceUnchanged = facts.balanceAfter != null && facts.balanceAfter === facts.balanceBefore;
  if (facts.balanceAfter == null) {
    steps.push(
      step("balance", "Canonical balance", "failed", "The balance read failed. This is not a zero balance.")
    );
  } else if (delta === facts.expectedDelta) {
    steps.push(step("balance", "Canonical balance", "success", "The token balance moved by the expected base units."));
  } else {
    steps.push(
      step(
        "balance",
        "Canonical balance",
        "failed",
        balanceUnchanged ? "The canonical token balance is unchanged." : "The canonical token balance does not match the expected amount."
      )
    );
  }

  const hardFail = steps.some(
    (item) => item.state === "failed" && item.step !== "balance" && item.step !== "confirmations"
  );
  const balanceFailed = steps.some((item) => item.step === "balance" && item.state === "failed");
  const waiting = steps.some((item) => item.step === "confirmations" && item.state === "pending");

  let result: PaymentDecision;
  let decision: string;
  if (facts.balanceAfter == null) {
    result = "unavailable";
    decision = "Do not release payment. Blockchain state could not be read. This is not a zero balance.";
  } else if (!facts.transactionExists || hardFail) {
    result = "rejected";
    decision = "Do not release payment. Blockchain state does not confirm the reported payment.";
  } else if (balanceFailed) {
    result = "mismatch";
    decision = "Do not release payment. The canonical token balance does not reflect the expected amount.";
  } else if (waiting) {
    result = "pending";
    decision = "Do not release payment yet. The transaction has not reached the required confirmation depth.";
  } else {
    result = "verified";
    decision = "Release payment. Transaction, recipient, token, amount, confirmations, and canonical balance agree.";
  }

  steps.push(
    step(
      "final_decision",
      "Final decision",
      result === "verified" ? "success" : result === "pending" ? "pending" : "failed",
      decision
    )
  );

  return {
    mode: "simulation",
    steps,
    result,
    decision,
    eventOnlyWouldAccept: facts.eventDetected,
    balanceUnchanged,
    checks: steps.filter((item) => item.state !== "skipped").length,
    stateQueries,
    eventCount: facts.eventDetected ? 1 : 0,
    trustAssumptions: 0,
  };
}

const SCENARIOS: Record<DemoScenarioId, Omit<DemoScenario, "evaluation">> = {
  phantom_event: {
    mode: "simulation",
    id: "phantom_event",
    title: "Phantom Event",
    description: "An incoming event is reported, but no corresponding blockchain transaction exists.",
    network: "ethereum",
    tokenSymbol: "USDT",
    tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    recipientLabel: "0xOTV_DEMO_ADDRESS",
    recipient: "0x07de000000000000000000000000000000000001",
    reference: "OTV-DEMO-001",
    decimals: 6,
    expectedAmountBaseUnits: EXPECTED,
    balanceBefore: BEFORE,
    balanceAfter: BEFORE,
    expectedBalance: AFTER,
    blockNumber: null,
    transactionHash: null,
    confirmations: 0,
    requiredConfirmations: REQUIRED,
  },
  balance_mismatch: {
    mode: "simulation",
    id: "balance_mismatch",
    title: "Event / Balance Mismatch",
    description: "An incoming transfer event exists, but the canonical token balance does not reflect the expected amount.",
    network: "ethereum",
    tokenSymbol: "USDT",
    tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    recipientLabel: "0xOTV_DEMO_ADDRESS",
    recipient: "0x07de000000000000000000000000000000000001",
    reference: "OTV-DEMO-001",
    decimals: 6,
    expectedAmountBaseUnits: EXPECTED,
    balanceBefore: BEFORE,
    balanceAfter: BEFORE,
    expectedBalance: AFTER,
    blockNumber: 23456789,
    transactionHash: "0xde01000000000000000000000000000000000000000000000000000000000001",
    confirmations: 20,
    requiredConfirmations: REQUIRED,
  },
  valid_payment: {
    mode: "simulation",
    id: "valid_payment",
    title: "Valid Payment",
    description: "Transaction, recipient, amount, confirmations, and blockchain state all agree.",
    network: "ethereum",
    tokenSymbol: "USDT",
    tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    recipientLabel: "0xOTV_DEMO_ADDRESS",
    recipient: "0x07de000000000000000000000000000000000001",
    reference: "OTV-DEMO-001",
    decimals: 6,
    expectedAmountBaseUnits: EXPECTED,
    balanceBefore: BEFORE,
    balanceAfter: AFTER,
    expectedBalance: AFTER,
    blockNumber: 23456789,
    transactionHash: "0xde02000000000000000000000000000000000000000000000000000000000002",
    confirmations: 32,
    requiredConfirmations: REQUIRED,
  },
  pending_payment: {
    mode: "simulation",
    id: "pending_payment",
    title: "Pending Payment",
    description: "Transaction exists but has not reached the required confirmation depth.",
    network: "ethereum",
    tokenSymbol: "USDT",
    tokenContract: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    recipientLabel: "0xOTV_DEMO_ADDRESS",
    recipient: "0x07de000000000000000000000000000000000001",
    reference: "OTV-DEMO-001",
    decimals: 6,
    expectedAmountBaseUnits: EXPECTED,
    balanceBefore: BEFORE,
    balanceAfter: AFTER,
    expectedBalance: AFTER,
    blockNumber: 23456780,
    transactionHash: "0xde03000000000000000000000000000000000000000000000000000000000003",
    confirmations: 2,
    requiredConfirmations: REQUIRED,
  },
};

function factsFor(scenario: Omit<DemoScenario, "evaluation">): PaymentFacts {
  return {
    eventDetected: true,
    transactionExists: scenario.transactionHash != null && scenario.id !== "phantom_event",
    receiptOk: scenario.id !== "phantom_event",
    recipientMatches: scenario.id !== "phantom_event",
    tokenContractMatches: scenario.id !== "phantom_event",
    amountMatches: scenario.id !== "phantom_event",
    confirmations: scenario.confirmations,
    requiredConfirmations: scenario.requiredConfirmations,
    balanceBefore: scenario.balanceBefore,
    balanceAfter: scenario.balanceAfter,
    expectedDelta: scenario.expectedAmountBaseUnits,
  };
}

export function isDemoScenario(value: string): value is DemoScenarioId {
  return value in SCENARIOS;
}

export function runDemo(id: DemoScenarioId): DemoScenario {
  const scenario = SCENARIOS[id];
  return { ...scenario, evaluation: evaluatePayment(factsFor(scenario)) };
}

export function listDemoScenarios(): Array<Pick<DemoScenario, "id" | "title" | "description">> {
  return (Object.keys(SCENARIOS) as DemoScenarioId[]).map((id) => {
    const scenario = SCENARIOS[id];
    return { id, title: scenario.title, description: scenario.description };
  });
}
