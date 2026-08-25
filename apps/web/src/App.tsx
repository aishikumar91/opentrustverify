import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MarketingHome, MarketingPage } from "./pages/Marketing";
import { VerifierPage } from "./pages/Verifier";
import { DashboardOverview, DashboardSimple, DashboardApi } from "./pages/Dashboard";
import { DemoWalletPage } from "./pages/DemoWallet";
import { DocsPage } from "./pages/Docs";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route
          path="/product"
          element={
            <MarketingPage
              title="Product"
              body="Vendor-neutral verification infrastructure for wallets, exchanges, explorers, and fintech apps."
            />
          }
        />
        <Route
          path="/how-it-works"
          element={
            <MarketingPage
              title="How it works"
              body="Claim → lookup → execution → asset → recipient → amount → balance → finality → spendability → signed verdict."
            />
          }
        />
        <Route
          path="/developers"
          element={
            <MarketingPage
              title="Developers"
              body="Integrate with the TypeScript SDK, React hooks, and OpenAPI. Open /docs for the developer portal."
            />
          }
        />
        <Route
          path="/security"
          element={
            <MarketingPage
              title="Security"
              body="Threat-modeled API, hashed API keys, signed webhooks, server-side signing keys, and auditable evidence."
            />
          }
        />
        <Route
          path="/standards"
          element={
            <MarketingPage
              title="Standards"
              body="OTV RFCs define verdict schema, wallet profile, explorer profile, and conformance."
            />
          }
        />
        <Route
          path="/research"
          element={
            <MarketingPage
              title="Research"
              body="Competitor analysis and consumer-protection research informed by emerging-market realities."
            />
          }
        />
        <Route
          path="/pricing"
          element={
            <MarketingPage
              title="Pricing"
              body="FREE · DEVELOPER · BUSINESS · ENTERPRISE. Metered verifications with a replaceable billing provider."
            />
          }
        />
        <Route
          path="/company"
          element={
            <MarketingPage
              title="Company"
              body="A POP Trust product — global infrastructure standard born from a real consumer-protection problem."
            />
          }
        />
        <Route
          path="/contact"
          element={
            <MarketingPage title="Contact" body="enterprise@poptrust.me · support for verify.poptrust.me" />
          }
        />

        <Route path="/verifier" element={<VerifierPage />} />
        <Route path="/demo" element={<DemoWalletPage />} />
        <Route path="/demo-wallet" element={<DemoWalletPage />} />
        <Route path="/docs" element={<DocsPage />} />

        <Route path="/dashboard" element={<DashboardOverview />} />
        <Route
          path="/dashboard/verifications"
          element={
            <DashboardSimple
              title="Verifications"
              body="Search by transaction hash, wallet, or verdict ID."
            />
          }
        />
        <Route path="/dashboard/api" element={<DashboardApi />} />
        <Route
          path="/dashboard/webhooks"
          element={
            <DashboardSimple
              title="Webhooks"
              body="Signed webhook delivery with retries and idempotency keys."
            />
          }
        />
        <Route
          path="/dashboard/billing"
          element={
            <DashboardSimple
              title="Billing"
              body="FREE / DEVELOPER / BUSINESS / ENTERPRISE — provider abstracted."
            />
          }
        />
        <Route
          path="/dashboard/security"
          element={
            <DashboardSimple title="Security" body="Sessions, audit logs, key events, and alerts." />
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <DashboardSimple
              title="Settings"
              body="Project configuration and policy version selection."
            />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
