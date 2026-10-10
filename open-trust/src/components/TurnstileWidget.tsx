import { useEffect, useRef } from "react";

type TurnstileWindow = {
  turnstile?: {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  };
};

/** Cloudflare Turnstile widget (explicit render). Renders nothing when no site key is configured. */
export default function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    function render() {
      if (cancelled || !ref.current) return;
      const w = window as unknown as TurnstileWindow;
      if (!w.turnstile) {
        if (!document.querySelector("script[data-turnstile]")) {
          const sc = document.createElement("script");
          sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          sc.async = true;
          sc.defer = true;
          sc.setAttribute("data-turnstile", "1");
          document.head.appendChild(sc);
        }
        window.setTimeout(render, 500);
        return;
      }
      w.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [siteKey]);
  if (!siteKey) return null;
  return <div ref={ref} className="my-3 flex justify-center" />;
}
