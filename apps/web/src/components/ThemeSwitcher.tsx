import { buttonClassName } from "@otv/ui";
import { useTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "system", label: "Device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={buttonClassName("ghost", undefined, "sm")}
          aria-pressed={preference === opt.id}
          onClick={() => setPreference(opt.id)}
        >
          {compact && opt.id === "system" ? "Auto" : opt.label}
        </button>
      ))}
    </div>
  );
}
