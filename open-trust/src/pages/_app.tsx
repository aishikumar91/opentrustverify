import { useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import "../styles/globals.css";
import { withBasePath } from "../lib/basePath";
import ErrorBoundary from "../components/ErrorBoundary";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register(withBasePath("/sw.js")).catch(() => {});
    }
    function onBIP(e: Event) {
      e.preventDefault();
      window.__pwaInstallEvent = e as unknown as {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      window.dispatchEvent(new Event("pwa-install-ready"));
    }
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);
  return (
    <ErrorBoundary>
      <Head>
        <title>3GGA — Live On-Chain Fraud Interception</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="3GGA is a live on-chain fraud interception and verification console: mempool lures, zero-value transfers, address-poisoning drills and verdicts on Base and Polygon." />
        <meta name="keywords" content="3GGA, crypto fraud detection, on-chain verification, mempool lure, address poisoning, zero-value transfer, fake token detection, Base, Polygon, threat scoring, web3 security" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#101828" />
        <link rel="icon" type="image/svg+xml" href="/trigger/favicon.svg" />
        <link rel="apple-touch-icon" href="/trigger/apple-touch-icon.png" />
        <link rel="manifest" href="/trigger/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="3GGA" />
        <link rel="canonical" href="https://otv.poptrust.me/trigger/admin/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="3GGA" />
        <meta property="og:title" content="3GGA — Live On-Chain Fraud Interception" />
        <meta property="og:description" content="Fire controlled fraud vectors with your own wallet and verify live verdicts: mempool lures, zero-value transfers, poisoning drills." />
        <meta property="og:url" content="https://otv.poptrust.me/trigger/" />
        <meta property="og:image" content="https://otv.poptrust.me/trigger/og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="3GGA — Live On-Chain Fraud Interception" />
        <meta name="twitter:description" content="Controlled fraud drills with live on-chain verdicts on Base and Polygon." />
        <meta name="twitter:image" content="https://otv.poptrust.me/trigger/og.png" />
      </Head>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
