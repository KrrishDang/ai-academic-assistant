import { useState, useEffect } from "react";
import { Sun, Monitor, Moon, Cpu, Thermometer, Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useTheme } from "@/features/theme/ThemeContext";

export function SettingsPage() {
  const {
    themeMode,
    selectedThemeId,
    setThemeMode,
    setSelectedThemeId,
    selectableThemes,
    effectiveType,
  } = useTheme();

  const [model, setModel] = useState("gemini-3.6-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const savedModel =
      localStorage.getItem("settings_model") || "gemini-3.6-flash";
    setModel(savedModel);
    const savedTemp = localStorage.getItem("settings_temperature");
    setTemperature(savedTemp ? parseFloat(savedTemp) : 0.7);
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setModel(v);
    localStorage.setItem("settings_model", v);
    triggerSave();
  };

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setTemperature(v);
    localStorage.setItem("settings_temperature", v.toString());
    triggerSave();
  };

  const triggerSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const modeOptions = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#b4befe]">
          Preferences
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-xs font-medium">
          Customize your Study Hub experience.
        </p>
      </header>

      {/* Save toast */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2.5 text-green-600 text-xs font-bold shadow-lg z-50 animate-fade-in">
          <Check size={13} />
          Saved
        </div>
      )}

      {/* ── Appearance ─────────────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
            <Sun size={15} className="text-[#b4befe]" />
            Appearance
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium mt-1">
            Choose your preferred theme and display mode.
          </p>
        </div>

        {/* ── Mode — segmented control ───────────────────────── */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Mode
          </label>
          <div
            role="radiogroup"
            aria-label="Display mode selection"
            className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5"
          >
            {modeOptions.map(({ value, label, icon: Icon }) => {
              const isActive = themeMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`${label} mode`}
                  onClick={() => {
                    setThemeMode(value);
                    triggerSave();
                  }}
                  className={`
                    relative flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                    ${
                      isActive
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <Icon size={13} aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Theme grid ─────────────────────────────────────── */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Theme
          </label>

          {effectiveType === "light" ? (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                <Sun size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Catppuccin Latte</span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Catppuccin Latte is the official light theme.
                </span>
              </div>
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Catppuccin dark color theme selection"
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {selectableThemes.map((t) => {
                const isActive = selectedThemeId === t.id;
                const bgHsl = `hsl(${t.variables.background})`;
                const cardHsl = `hsl(${t.variables.card})`;
                const primaryHsl = `hsl(${t.variables.primary})`;
                const accentHsl = `hsl(${t.variables.accent})`;

                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={`${t.name} theme`}
                    onClick={() => {
                      setSelectedThemeId(t.id);
                      triggerSave();
                    }}
                    className={`
                      relative p-2.5 rounded-xl border flex flex-col items-center text-center gap-2
                      transition-all duration-150 cursor-pointer
                      hover:scale-[1.02] hover:shadow-md
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                      ${
                        isActive
                          ? "border-[#b4befe] shadow-[0_0_12px_-3px_rgba(180,190,254,0.35)] bg-[#b4befe]/[0.06]"
                          : "border-border/50 bg-card hover:border-[#b4befe]/30"
                      }
                    `}
                  >
                    {/* Checkmark badge */}
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#b4befe] flex items-center justify-center">
                        <Check size={10} className="text-background" strokeWidth={3} />
                      </span>
                    )}

                    {/* Miniature preview mockup */}
                    <div
                      className="w-full h-11 rounded-lg flex flex-col p-1.5 gap-0.5 relative overflow-hidden border border-black/10"
                      style={{ backgroundColor: bgHsl }}
                    >
                      <div
                        className="h-1 w-2/3 rounded-full opacity-70"
                        style={{ backgroundColor: primaryHsl }}
                      />
                      <div
                        className="flex-1 rounded flex gap-1 p-0.5 border border-white/5"
                        style={{ backgroundColor: cardHsl }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: primaryHsl }}
                        />
                        <div className="flex-1 flex flex-col gap-0.5 justify-center">
                          <div
                            className="h-0.5 w-full rounded-full opacity-50"
                            style={{ backgroundColor: accentHsl }}
                          />
                          <div
                            className="h-0.5 w-2/3 rounded-full opacity-50"
                            style={{ backgroundColor: accentHsl }}
                          />
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-bold truncate w-full text-foreground">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── AI Model ───────────────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-5">
        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          <Cpu size={15} className="text-[#b4befe]" />
          AI Model
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              Gemini Model
            </label>
            <p className="text-[10px] text-muted-foreground font-medium leading-normal">
              Select the AI model for generation and chat.
            </p>
            <select
              value={model}
              onChange={handleModelChange}
              className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#b4befe]/40 text-foreground"
            >
              <option value="gemini-3.6-flash">
                gemini-3.6-flash (Fast)
              </option>
              <option value="gemini-3.6-pro">
                gemini-3.6-pro (Deep Reasoning)
              </option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Thermometer size={13} className="text-muted-foreground" />
                Temperature
              </label>
              <span className="text-xs font-extrabold text-[#b4befe]">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium leading-normal">
              Lower values produce focused answers. Higher values produce more
              creative responses.
            </p>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.1"
              value={temperature}
              onChange={handleTempChange}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#b4befe]"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
