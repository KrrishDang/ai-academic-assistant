import { useState, useEffect } from "react";
import { Cpu, Thermometer, Check, Sparkles, ShieldCheck, Copy, Database, RefreshCw, Sun, Moon, Laptop } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAnonymousSessionId } from "@/lib/api";
import { clearAllLocalData } from "@/lib/db";
import { useTheme } from "@/features/theme/ThemeContext";

export function SettingsPage() {
  const [model, setModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setSessionId(getAnonymousSessionId());
    const savedModel = localStorage.getItem("settings_model") || "gemini-2.5-flash";
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

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  const handleClearCache = async () => {
    if (window.confirm("Clear all locally cached generated notes and quizzes? This will not delete server documents.")) {
      await clearAllLocalData();
      alert("Local cache cleared successfully.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          Preferences & System
        </p>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground text-xs font-medium">
          Configure AI model parameters, appearance theme, session credentials, and local storage.
        </p>
      </header>

      {/* Save toast */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-400 text-xs font-bold shadow-xl z-50 animate-fade-in">
          <Check size={14} />
          Settings Saved Automatically
        </div>
      )}

      {/* ── Theme Appearance ─────────────────────────────────────────── */}
      <Card className="border border-border/80 bg-card p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={15} className="text-primary" />
            <span>Appearance & Theme</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Choose your preferred interface theme. Default is high-contrast Midnight Black.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              theme === "dark"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <Moon size={16} className={theme === "dark" ? "text-primary" : "text-muted-foreground"} />
              {theme === "dark" && <Badge variant="lime" className="text-[9px] px-1 py-0">Active</Badge>}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Dark Mode</p>
              <p className="text-[10px] text-muted-foreground">Midnight Black & Lime</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              theme === "light"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <Sun size={16} className={theme === "light" ? "text-primary" : "text-muted-foreground"} />
              {theme === "light" && <Badge variant="lime" className="text-[9px] px-1 py-0">Active</Badge>}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Light Mode</p>
              <p className="text-[10px] text-muted-foreground">Crisp Clean Slate</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              theme === "system"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                : "border-border/80 bg-card hover:border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <Laptop size={16} className={theme === "system" ? "text-primary" : "text-muted-foreground"} />
              {theme === "system" && <Badge variant="lime" className="text-[9px] px-1 py-0">Active</Badge>}
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">System Sync</p>
              <p className="text-[10px] text-muted-foreground">Follow OS settings</p>
            </div>
          </button>
        </div>
      </Card>

      {/* ── AI Model Configuration ───────────────────────────────────── */}
      <Card className="border border-border/80 bg-card p-5 space-y-5 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Cpu size={15} className="text-primary" />
            <span>AI Model & Parameters</span>
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tune response length, creativity, and model parameters for your study sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Model selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              LLM Architecture
            </label>
            <select
              value={model}
              onChange={handleModelChange}
              className="flex h-9 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-foreground"
            >
              <option value="gemini-2.5-flash">
                gemini-2.5-flash (Production High Speed)
              </option>
              <option value="gemini-2.5-pro">
                gemini-2.5-pro (Extended Analytical Reasoning)
              </option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Thermometer size={13} className="text-muted-foreground" />
                <span>Creativity (Temperature)</span>
              </label>
              <span className="text-xs font-bold text-primary">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.1"
              value={temperature}
              onChange={handleTempChange}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              0.0 = Factually Grounded | 1.0+ = Creative Explanations
            </p>
          </div>
        </div>
      </Card>

      {/* ── Anonymous Visitor Session ────────────────────────────────── */}
      <Card className="border border-border/80 bg-card p-5 space-y-3.5 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={15} className="text-primary" />
          <span>Anonymous Visitor Session</span>
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Your documents and conversation history are isolated using this unique session token.
        </p>

        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 text-xs font-mono">
          <span className="truncate max-w-[280px] text-muted-foreground">{sessionId}</span>
          <Button
            onClick={handleCopySession}
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-[11px] font-bold gap-1 text-primary hover:text-primary hover:bg-primary/10"
          >
            {copiedSession ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedSession ? "Copied" : "Copy ID"}</span>
          </Button>
        </div>
      </Card>

      {/* ── System Storage & Cache ───────────────────────────────────── */}
      <Card className="border border-border/80 bg-card p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Database size={15} className="text-primary" />
          <span>Storage & Cache Management</span>
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 text-xs">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">AI Academic Assistant Design System</p>
              <p className="text-[10px] text-muted-foreground">Midnight Black, Electric Lime, and Pure White</p>
            </div>
          </div>
          <Badge variant="success" className="text-[9px] px-2 py-0.5">
            Active
          </Badge>
        </div>

        <div className="pt-1">
          <Button
            onClick={handleClearCache}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw size={12} />
            <span>Clear Local IndexedDB Cache</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
