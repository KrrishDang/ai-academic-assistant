import { useState, useEffect } from "react";
import { Cpu, Thermometer, Check, Sparkles, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

export function SettingsPage() {
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#b4befe]">
          Preferences
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-xs font-medium">
          Configure AI model parameters and generation options.
        </p>
      </header>

      {/* Save toast */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2.5 text-green-600 text-xs font-bold shadow-lg z-50 animate-fade-in">
          <Check size={13} />
          Saved
        </div>
      )}

      {/* ── AI Model Configuration ───────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-6">
        <div>
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
            <Cpu size={15} className="text-[#b4befe]" />
            AI Model Configuration
          </h3>
          <p className="text-[10px] text-muted-foreground font-medium mt-1">
            Choose model parameters for generating study materials and chat explanations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              Gemini Model
            </label>
            <p className="text-[10px] text-muted-foreground font-medium leading-normal">
              Select the AI engine for document parsing and study generation.
            </p>
            <select
              value={model}
              onChange={handleModelChange}
              className="flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#b4befe]/40 text-foreground"
            >
              <option value="gemini-3.6-flash">
                gemini-3.6-flash (Fast & Low Latency)
              </option>
              <option value="gemini-3.6-pro">
                gemini-3.6-pro (Deep Reasoning & Analysis)
              </option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Thermometer size={13} className="text-muted-foreground" />
                Creativity (Temperature)
              </label>
              <span className="text-xs font-extrabold text-[#b4befe]">
                {temperature.toFixed(1)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium leading-normal">
              Lower values produce factual, concise answers. Higher values produce expanded explanations.
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

      {/* ── System Status & Specs ──────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-4">
        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#b4befe]" />
          System & Workspace Theme
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-primary shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-foreground">Catppuccin Mocha</span>
              <span className="text-[10px] text-muted-foreground font-medium">Official dark theme applied globally</span>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-500 border border-green-500/20">
            Active
          </span>
        </div>
      </Card>
    </div>
  );
}
