import type { GetServerSideProps } from "next";
import OpenTrustDashboard from "../../components/OpenTrustDashboard";
import LegacyDashboard from "../../components/OpenTrustDashboard.legacy";
import { isNewUI } from "../../lib/flags";
import ErrorBoundary from "../../components/ErrorBoundary";
import { verifySessionToken, verifyStaffSessionToken, parseCookie, COOKIE_NAME, STAFF_COOKIE_NAME } from "../../lib/auth";

export default function AdminPage({ role }: { role: "admin" | "staff" }) {
  return (
    <ErrorBoundary>{isNewUI() ? <OpenTrustDashboard role={role} /> : <LegacyDashboard />}</ErrorBoundary>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (session) {
    return { props: { role: "admin" } };
  }
  const staff = verifyStaffSessionToken(parseCookie(req.headers.cookie, STAFF_COOKIE_NAME));
  if (staff) {
    return { props: { role: "staff" } };
  }
  return { redirect: { destination: "/admin/login", permanent: false } };
};
