import { useCallback, useEffect, useState } from "react";

export type ThemeName = "light" | "dark";

function readTheme(): ThemeName {
  try {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("otv-theme");
      if (saved === "dark" || saved === "light") return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
  } catch {}
  return "light";
}

/** Shared theme state: OS default, persisted, synced across tabs, applied to <body>. */
export function useTheme(): { theme: ThemeName; setTheme: (t: ThemeName) => void; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ThemeName>(readTheme);
  useEffect(() => {
    document.body.classList.add("nui-on");
    return () => {
      document.body.classList.remove("nui-on", "nui-dark");
    };
  }, []);
  useEffect(() => {
    document.body.classList.toggle("nui-dark", theme === "dark");
    try {
      window.localStorage.setItem("otv-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "otv-theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);
  return { theme, setTheme, toggleTheme };
}
