import { useTheme } from "@/lib/theme";

export function ThemeSwitcher({ compact: _compact = false }: { compact?: boolean }) {
  const { resolved, setPreference } = useTheme();
  const toDark = resolved !== "dark";

  return (
    <button
      type="button"
      className="otv-theme-icon"
      aria-label={toDark ? "Switch to dark theme" : "Switch to light theme"}
      onClick={() => setPreference(toDark ? "dark" : "light")}
    >
      {toDark ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
