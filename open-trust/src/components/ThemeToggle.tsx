import { Moon, Sun } from "lucide-react";
import type { ThemeName } from "../lib/useTheme";

/** Sun/moon switch used on every system page. Neutral chrome, readable in both themes. */
export default function ThemeToggle({
  theme,
  onToggle,
  className = "",
}: {
  theme: ThemeName;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle theme"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DDE1EA] bg-white transition hover:border-[#B8E600] ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-[#B54708]" strokeWidth={1.5} />
      ) : (
        <Moon className="h-4 w-4 text-[#5B6472]" strokeWidth={1.5} />
      )}
    </button>
  );
}
