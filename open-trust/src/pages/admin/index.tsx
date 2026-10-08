import type { GetServerSideProps } from "next";
import OpenTrustDashboard from "../../components/OpenTrustDashboard";
import { verifySessionToken, parseCookie, COOKIE_NAME } from "../../lib/auth";

export default function AdminPage() {
  return <OpenTrustDashboard />;
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = verifySessionToken(parseCookie(req.headers.cookie, COOKIE_NAME));
  if (!session) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  return { props: {} };
};
