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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition hover:border-[#B8E600] ${
        theme === "dark"
          ? "border-[#1C2430] bg-[#0A0E14] text-[#D7FF00]"
          : "border-[#DDE1EA] bg-white text-[#5B6472]"
      } ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-[#D7FF00]" strokeWidth={1.5} />
      ) : (
        <Moon className="h-4 w-4 text-[#5B6472]" strokeWidth={1.5} />
      )}
    </button>
  );
}
