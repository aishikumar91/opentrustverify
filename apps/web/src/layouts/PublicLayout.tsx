import { Outlet } from "react-router-dom";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="otv-container flex flex-1 items-center justify-center py-16">
        <Outlet />
      </main>
    </div>
  );
}
