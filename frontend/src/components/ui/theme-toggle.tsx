import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme, type Theme } from "@/features/theme/ThemeContext";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const getLabel = () => {
    if (theme === "system") return `System (${resolvedTheme})`;
    return theme === "dark" ? "Dark" : "Light";
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className={className}
      title={`Theme: ${getLabel()} (click to cycle)`}
      aria-label={`Toggle theme (currently ${getLabel()})`}
    >
      {theme === "system" ? (
        <Laptop size={16} aria-hidden="true" />
      ) : resolvedTheme === "dark" ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
