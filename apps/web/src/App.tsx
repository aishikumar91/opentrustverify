import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { RequireAuth } from "./components/RequireAuth";
import { PublicLayout, AuthLayout } from "./layouts/PublicLayout";
import { DocsLayout } from "./layouts/DocsLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { HomePage } from "./pages/Home";
import { AboutPage, WhitepaperPage } from "./pages/About";
import { FeaturesPage } from "./pages/Features";
import { ContactPage, SecurityPage } from "./pages/Public";
import { PrivacyPage, TermsPage } from "./pages/Legal";
import { VerifierPage } from "./pages/Verifier";
import {
  DashboardApi,
  DashboardAudit,
  DashboardBilling,
  DashboardOverview,
  DashboardSettings,
  DashboardVerifications,
  DashboardWebhooks,
} from "./pages/Dashboard";
import { WalletPage } from "./pages/Wallet";
import { DocsPage } from "./pages/Docs";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { RouteSeo } from "./components/RouteSeo";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteSeo />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/whitepaper" element={<WhitepaperPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/verifier" element={<VerifierPage />} />
          </Route>

          <Route element={<DocsLayout />}>
            <Route path="/docs" element={<DocsPage />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<PublicLayout />}>
              <Route path="/wallet" element={<WalletPage />} />
            </Route>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardOverview />} />
              <Route path="/dashboard/verifications" element={<DashboardVerifications />} />
              <Route path="/dashboard/api" element={<DashboardApi />} />
              <Route path="/dashboard/webhooks" element={<DashboardWebhooks />} />
              <Route path="/dashboard/billing" element={<DashboardBilling />} />
              <Route path="/dashboard/security" element={<DashboardAudit />} />
              <Route path="/dashboard/settings" element={<DashboardSettings />} />
            </Route>
          </Route>

          <Route path="/product" element={<Navigate to="/features" replace />} />
          <Route path="/how-it-works" element={<Navigate to="/features" replace />} />
          <Route path="/developers" element={<Navigate to="/docs" replace />} />
          <Route path="/standards" element={<Navigate to="/whitepaper" replace />} />
          <Route path="/research" element={<Navigate to="/about" replace />} />
          <Route path="/pricing" element={<Navigate to="/" replace />} />
          <Route path="/company" element={<Navigate to="/about" replace />} />
          <Route path="/marketing" element={<Navigate to="/" replace />} />
          <Route path="/policy" element={<Navigate to="/privacy" replace />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
          <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
          <Route path="/legal" element={<Navigate to="/terms" replace />} />

          <Route path="/verify" element={<Navigate to="/verifier" replace />} />
          <Route path="/api" element={<Navigate to="/docs" replace />} />
          <Route path="/faq" element={<Navigate to="/whitepaper" replace />} />
          <Route path="/web3" element={<Navigate to="/" replace />} />
          <Route path="/crypto" element={<Navigate to="/" replace />} />
          <Route path="/demo" element={<Navigate to="/wallet" replace />} />
          <Route path="/demo-wallet" element={<Navigate to="/wallet" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
