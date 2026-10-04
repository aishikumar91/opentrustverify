import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

function useAos() {
  const { pathname } = useLocation();
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    AOS.init({
      duration: 650,
      once: true,
      offset: 32,
      easing: "ease-out-cubic",
      disable: reduce,
    });
  }, []);
  useEffect(() => {
    AOS.refresh();
  }, [pathname]);
}

export function PublicLayout() {
  useAos();
  return (
    <div className="otv-shell flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  );
}

export function AuthLayout() {
  useAos();
  return (
    <div className="otv-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="otv-container flex flex-1 items-center justify-center py-16">
        <Outlet />
      </main>
    </div>
  );
}
