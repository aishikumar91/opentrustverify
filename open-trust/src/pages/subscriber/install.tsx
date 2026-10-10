import { useEffect, useState } from "react";
import { Smartphone, Laptop, Apple } from "lucide-react";
import { withBasePath } from "../../lib/basePath";
import BrandMark from "../../components/BrandMark";
import ActionStatus, { type ActionTone } from "../../components/ActionStatus";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../lib/useTheme";

type Device = "android" | "iphone" | "desktop" | "unknown";

export type PwaInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

declare global {
  interface Window {
    __pwaInstallEvent?: PwaInstallPrompt | null;
  }
}

function detectDevice(): Device {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const COPY: Record<Device, { title: string; steps: string[] }> = {
  android: {
    title: "Install on Android",
    steps: ["Tap Install below.", "Confirm Add to Home screen.", "Open 3GGA from your home screen."],
  },
  iphone: {
    title: "Install on iPhone",
    steps: ["Tap Share in Safari.", "Tap Add to Home Screen.", "Open 3GGA from your home screen."],
  },
  desktop: {
    title: "Install on desktop",
    steps: ["Tap Install below.", "Confirm the install prompt.", "Launch 3GGA from your apps."],
  },
  unknown: {
    title: "Install the app",
    steps: ["Use Chrome, Edge or Safari.", "Follow your browser install prompt.", "Launch 3GGA from your apps."],
  },
};

export default function InstallPage() {
  const { theme, toggleTheme } = useTheme();
  const [device, setDevice] = useState<Device>("unknown");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: ActionTone; title: string; detail?: string } | null>(null);

  useEffect(() => {
    setDevice(detectDevice());
    function onReady() {
      setReady(Boolean(window.__pwaInstallEvent));
    }
    onReady();
    window.addEventListener("pwa-install-ready", onReady);
    return () => window.removeEventListener("pwa-install-ready", onReady);
  }, []);

  async function onInstall() {
    const ev = window.__pwaInstallEvent;
    if (!ev) {
      setStatus({
        tone: "info",
        title: device === "iphone" ? "Use Safari Share" : "No install prompt yet",
        detail:
          device === "iphone"
            ? "iPhone installs from Safari: Share, then Add to Home Screen."
            : "If no prompt appears, use the browser menu: Install app / Add to Home screen.",
      });
      return;
    }
    setBusy(true);
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice?.outcome === "accepted") {
        setStatus({ tone: "ok", title: "Install started", detail: "Find 3GGA on your home screen or apps." });
      } else {
        setStatus({ tone: "warn", title: "Install dismissed", detail: "You can retry any time from this page." });
      }
    } catch {
      setStatus({ tone: "fail", title: "Install failed", detail: "Retry, or use the browser menu install option." });
    } finally {
      setBusy(false);
    }
  }

  const copy = COPY[device];
  const Icon = device === "iphone" ? Apple : device === "desktop" ? Laptop : Smartphone;

  return (
    <div className="nui font-ui min-h-screen bg-[#E9EDF4] text-[#101828]">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
        <BrandMark size="sm" />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-8">
        <BrandMark size="md" as="h1" className="mb-1" />
        <p className="mb-5 text-sm text-[#5B6472]">Add 3GGA to your device</p>
        <div className="rounded-[24px] border border-[#DDE1EA] bg-white p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#101828]">
            <Icon className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <p className="mt-3 text-base font-semibold text-[#101828]">{copy.title}</p>
          <p className="mt-1 text-xs text-[#5B6472]">Detected: {device === "unknown" ? "browser" : device}</p>
          <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-[#374151]">
            {copy.steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="tnum font-mono text-[#8A8D93]">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => void onInstall()}
            disabled={busy}
            className="mt-5 min-h-[44px] w-full rounded-full bg-[#D7FF00] py-2.5 text-sm font-medium text-[#0B0F14] transition hover:bg-[#B8E600] disabled:opacity-50"
          >
            {busy ? "Working…" : "Download / Install"}
          </button>
          {status && (
            <div className="mt-3 text-left">
              <ActionStatus tone={status.tone} title={status.title} detail={status.detail} onClose={() => setStatus(null)} />
            </div>
          )}
        </div>
        <nav className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-6 text-[11px] text-[#6B7280]">
          <a href={withBasePath("/subscriber/login")} className="hover:text-[#2E7CF6]">Subscriber sign-in</a>
          <a href={withBasePath("/subscriber/fulfillment")} className="hover:text-[#2E7CF6]">Fulfillment</a>
          <a href={withBasePath("/privacy")} className="hover:text-[#2E7CF6]">Privacy</a>
        </nav>
      </main>
    </div>
  );
}
