import { useState, useEffect } from "react";
import { Cpu, Thermometer, Check, Sparkles, ShieldCheck, Copy, Database, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAnonymousSessionId } from "@/lib/api";
import { clearAllLocalData } from "@/lib/db";

export function SettingsPage() {
  const [model, setModel] = useState("gemini-2.5-flash");
  const [temperature, setTemperature] = useState(0.7);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSession, setCopiedSession] = useState(false);
  const [sessionId, setSessionId] = useState("");

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
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#b4befe]">
          Preferences & System
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-xs font-medium">
          Configure AI model parameters, session credentials, and local cache.
        </p>
      </header>

      {/* Save toast */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-400 text-xs font-bold shadow-xl z-50 animate-fade-in">
          <Check size={14} />
          Settings Saved Automatically
        </div>
      )}

      {/* ── AI Model Configuration ───────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-6">
        <div>
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} className="text-primary" />
            <span>AI Engine & Parameters</span>
          </h3>
          <p className="text-[11px] text-muted-foreground font-medium mt-1">
            Tune response length, creativity, and model weights for your study session.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              LLM Architecture
            </label>
            <select
              value={model}
              onChange={handleModelChange}
              className="flex h-9 w-full rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-foreground"
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Thermometer size={14} className="text-muted-foreground" />
                <span>Creativity (Temperature)</span>
              </label>
              <span className="text-xs font-extrabold text-primary">
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
            <p className="text-[10px] text-muted-foreground font-medium">
              0.0 = Precise & Factual | 1.0+ = Creative & Detailed
            </p>
          </div>
        </div>
      </Card>

      {/* ── Anonymous Visitor Session ────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-4">
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <span>Anonymous Visitor Session</span>
        </h3>
        <p className="text-[11px] text-muted-foreground font-medium">
          Your documents and conversation history are isolated using this anonymous session identifier.
        </p>

        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 text-xs font-mono">
          <span className="truncate max-w-[280px] text-muted-foreground">{sessionId}</span>
          <Button
            onClick={handleCopySession}
            variant="ghost"
            className="h-7 px-3 text-[10px] font-bold gap-1 text-primary"
          >
            {copiedSession ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedSession ? "Copied" : "Copy ID"}</span>
          </Button>
        </div>
      </Card>

      {/* ── System Status & Storage ───────────────────────────────────── */}
      <Card className="border border-border/60 bg-card p-6 space-y-4">
        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-2">
          <Database size={16} className="text-primary" />
          <span>Storage & System Theme</span>
        </h3>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 text-xs">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-primary shrink-0" />
            <div>
              <p className="font-bold text-foreground">Catppuccin Mocha Palette</p>
              <p className="text-[10px] text-muted-foreground">Official academic dark theme</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleClearCache}
            variant="outline"
            className="h-9 px-4 text-xs font-bold gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw size={13} />
            <span>Clear Local IndexedDB Cache</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
