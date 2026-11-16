import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Layers,
  FileText,
  FileQuestion,
  GraduationCap,
  Lock,
  ChevronRight,
  Play,
  RotateCcw,
  BookMarked,
  Shield,
  Zap,
  Clock,
  Compass,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Public Landing Page — Cinematic Black & Electric Lime Visual Identity.
 *
 * Implements the agreed Phase D editorial direction:
 * - Deep black (#0B0B0C) and charcoal backgrounds with electric lime (#C6F432) visual motif.
 * - Coordinated opening sequence: counting lime ring folding into product identity.
 * - Interactive hero demonstration showing realistic student workflow with actual cited sources.
 * - 4-phase interactive workflow preview (Ingest -> Grounded Dialogue -> Citations -> Study Studio).
 * - Full reduced-motion and mobile-responsive accessibility.
 * - Authentic product capabilities, avoiding fabricated metrics or fake customer logos.
 */
export function PublicLandingPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Opening sequence countdown state: 3 -> 2 -> 1 -> ready
  const [openingCount, setOpeningCount] = useState<number>(3);
  const [openingComplete, setOpeningComplete] = useState<boolean>(false);

  useEffect(() => {
    if (shouldReduceMotion) {
      setOpeningComplete(true);
      return;
    }
    const timer1 = setTimeout(() => setOpeningCount(2), 350);
    const timer2 = setTimeout(() => setOpeningCount(1), 700);
    const timer3 = setTimeout(() => {
      setOpeningComplete(true);
    }, 1050);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [shouldReduceMotion]);

  // Hero interactive workflow simulator state (1 to 4)
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAutoplaying, setIsAutoplaying] = useState<boolean>(true);

  useEffect(() => {
    if (!isAutoplaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoplaying]);

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-[#FAFAFA] selection:bg-[#C6F432]/30 selection:text-[#C6F432] font-sans antialiased overflow-x-hidden">
      {/* ─── Global Background Ambient Lime Gradient Glow ────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.08, 1],
            opacity: [0.12, 0.17, 0.12],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-b from-[#C6F432]/14 via-[#C6F432]/5 to-transparent blur-[120px] rounded-full"
        />
        <motion.div
          animate={shouldReduceMotion ? {} : {
            x: [0, 15, 0],
            y: [0, -15, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[35%] -right-40 w-[450px] h-[450px] bg-[#C6F432]/6 blur-[110px] rounded-full"
        />
        <motion.div
          animate={shouldReduceMotion ? {} : {
            x: [0, -15, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[20%] -left-40 w-[500px] h-[500px] bg-[#C6F432]/6 blur-[120px] rounded-full"
        />
      </div>

      {/* ─── Top Public Navigation Bar ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0B0B0C]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Identity */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#C6F432] rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-xl bg-[#C6F432] text-[#0B0B0C] flex items-center justify-center font-black text-sm shadow-[0_0_16px_rgba(198,244,50,0.35)] shrink-0">
              <Sparkles className="w-4 h-4 text-[#0B0B0C]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">
                AI Academic Assistant
              </span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
                Academic Workspace
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Hidden on small mobile) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-300">
            <a href="#hero-demo" className="hover:text-[#C6F432] transition-colors">
              Interactive Demo
            </a>
            <a href="#capabilities" className="hover:text-[#C6F432] transition-colors">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-[#C6F432] transition-colors">
              Study Journey
            </a>
            <a href="#studio" className="hover:text-[#C6F432] transition-colors">
              Study Studio
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C6F432] text-[#0B0B0C] hover:bg-[#b2e022] shadow-[0_0_20px_rgba(198,244,50,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 1. Opening Sequence & Hero Header ───────────────────────────── */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Animated Lime Countdown Ring Sequence */}
        {!openingComplete && !shouldReduceMotion && (
          <div className="flex items-center justify-center mb-8">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-[#C6F432]/30 border-t-[#C6F432]"
              />
              <span className="font-mono text-lg font-black text-[#C6F432]">
                {openingCount}
              </span>
            </div>
          </div>
        )}

        {/* Hero Eyebrow Pill */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[#C6F432]/30 text-[#C6F432] text-xs font-semibold tracking-wide uppercase mb-6 shadow-[0_0_24px_rgba(198,244,50,0.12)]"
        >
          <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-pulse" />
          <span>The Grounded Academic Assistant</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]"
        >
          Master your courses with AI that{" "}
          <span className="text-[#C6F432] relative inline-block">
            cites every word.
            <svg
              className="absolute -bottom-2 left-0 w-full text-[#C6F432]/40"
              viewBox="0 0 300 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 9C60 3 140 3 299 9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-base sm:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Attach lecture slides, research papers, and textbook chapters. Ask
          demanding questions and receive precision answers backed by
          page-numbered source citations, active-recall flashcards, and exam
          rubrics.
        </motion.p>

        {/* Hero Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold rounded-2xl bg-[#C6F432] text-[#0B0B0C] hover:bg-[#b5e324] shadow-[0_0_30px_rgba(198,244,50,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Free Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#hero-demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] text-zinc-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-[#C6F432]" />
            <span>Watch Workflow Simulation</span>
          </a>
        </motion.div>

        {/* Trust & Guarantee Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C6F432]" />
            Zero Hallucination Retrieval
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C6F432]" />
            PDF, DOCX, PPTX & TXT
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#C6F432]" />
            Private Student Isolation
          </span>
        </div>
      </section>

      {/* ─── 2. Hero Interactive Product Demonstration ───────────────────── */}
      <section id="hero-demo" className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/20 px-3 py-1 rounded-full">
            Simulated Interactive Walkthrough
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
            Experience the Grounded Academic Workflow
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Toggle through each stage of an inquiry to see how sources are ingested, parsed, and cited.
          </p>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {[
            { id: 1, title: "1. Attach Sources", icon: BookOpen },
            { id: 2, title: "2. Student Prompt", icon: FileQuestion },
            { id: 3, title: "3. Grounded Answer", icon: Sparkles },
            { id: 4, title: "4. Study Studio", icon: GraduationCap },
          ].map((step) => {
            const Icon = step.icon;
            const active = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveStep(step.id);
                  setIsAutoplaying(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  active
                    ? "bg-[#C6F432] text-[#0B0B0C] border-[#C6F432] shadow-[0_0_16px_rgba(198,244,50,0.3)]"
                    : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-[#0B0B0C]" : "text-[#C6F432]"}`} />
                <span>{step.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsAutoplaying((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.08] rounded-xl"
            title={isAutoplaying ? "Pause Autoplay" : "Resume Autoplay"}
          >
            <RotateCcw className={`w-3 h-3 ${isAutoplaying ? "text-[#C6F432] animate-spin" : ""}`} />
            <span>{isAutoplaying ? "Autoplay ON" : "Paused"}</span>
          </button>
        </div>

        {/* 3D Tilted Glass-like Application Window */}
        <div className="relative rounded-2xl sm:rounded-3xl border border-white/[0.14] bg-[#121214]/90 backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2 hidden sm:inline">
                Quantum_Mechanics_PHYS301 • Course Workspace
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#C6F432]/10 border border-[#C6F432]/25 text-[#C6F432] text-[10px]">
                2 Documents Attached
              </Badge>
              <Badge className="bg-white/[0.04] text-zinc-300 border-white/[0.1] text-[10px]">
                Active Session
              </Badge>
            </div>
          </div>

          {/* Interactive Stage Content */}
          <div className="p-4 sm:p-8 min-h-[360px] flex flex-col justify-between">
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Griffiths_Quantum_Mechanics_Ch3.pdf</p>
                      <p className="text-xs text-zinc-400 font-mono">PDF • 4.2 MB • 38 Pages • 14,200 Words</p>
                    </div>
                  </div>
                  <Badge className="bg-[#C6F432]/15 text-[#C6F432] border-[#C6F432]/30 text-[11px]">
                    Processed & Chunked
                  </Badge>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Lecture_07_Uncertainty_Relations.pptx</p>
                      <p className="text-xs text-zinc-400 font-mono">PPTX • 8.1 MB • 24 Slides • 4,800 Words</p>
                    </div>
                  </div>
                  <Badge className="bg-[#C6F432]/15 text-[#C6F432] border-[#C6F432]/30 text-[11px]">
                    Processed & Chunked
                  </Badge>
                </div>

                <p className="text-xs text-zinc-400 italic">
                  💡 Ingestion extracts clean text into PostgreSQL chunks with token budgeting. Raw documents are isolated strictly to your course workspace.
                </p>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex gap-3 max-w-xl ml-auto flex-row-reverse">
                  <div className="w-8 h-8 rounded-xl bg-[#C6F432] text-[#0B0B0C] font-bold text-xs flex items-center justify-center shrink-0">
                    You
                  </div>
                  <div className="p-4 rounded-2xl bg-[#C6F432] text-[#0B0B0C] font-semibold text-xs sm:text-sm leading-relaxed shadow-sm">
                    How does the non-commutativity of position and momentum operators lead directly to Heisenberg&apos;s Uncertainty Principle?
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#C6F432] animate-ping" />
                  <p className="text-xs text-zinc-300 font-mono">
                    Searching 2 attached documents across 62 parsed chunks...
                  </p>
                </div>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex gap-3 max-w-2xl mr-auto">
                  <div className="w-8 h-8 rounded-xl bg-[#C6F432]/15 border border-[#C6F432]/30 text-[#C6F432] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#C6F432]" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white text-xs sm:text-sm leading-relaxed space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06] text-[11px] font-semibold text-[#C6F432]">
                      <BookMarked className="w-3.5 h-3.5" />
                      <span>Document-Grounded Response (2 Sources)</span>
                    </div>
                    <p>
                      In quantum mechanics, position operator x and momentum operator p satisfy the canonical commutation relation: [x, p] = i&#8463;.
                    </p>
                    <p>
                      According to the Generalized Uncertainty Principle for any two observables A and B: &sigma;<sub>A</sub> &sigma;<sub>B</sub> &ge; &frac12;|&#10216;[A, B]&#10217;|. Substituting position and momentum yields the classic inequality &sigma;<sub>x</sub> &sigma;<sub>p</sub> &ge; &#8463;/2.
                    </p>

                    {/* Grounded Citation Chips */}
                    <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[#C6F432]/15 border border-[#C6F432]/30 text-[#C6F432]">
                        <span>[1]</span>
                        <span>Griffiths_QM_Ch3.pdf</span>
                        <span className="text-zinc-400">p.45</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-[#C6F432]/15 border border-[#C6F432]/30 text-[#C6F432]">
                        <span>[2]</span>
                        <span>Lecture_07_Slides.pptx</span>
                        <span className="text-zinc-400">Slide 12</span>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Active-Recall Flashcard Preview */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#C6F432] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      Active Flashcard
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Card 1 of 8</span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                    <p className="text-xs font-semibold text-white">
                      Q: What is the commutator [x, p&sup2;] in terms of momentum p?
                    </p>
                    <p className="text-[11px] text-[#C6F432] mt-2 font-mono">
                      A: 2i&#8463;p (via commutator product rule)
                    </p>
                  </div>
                </div>

                {/* Exam Question Rubric Preview */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#C6F432] flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      10-Mark University Question
                    </span>
                    <Badge className="bg-[#C6F432]/10 text-[#C6F432] border-[#C6F432]/20 text-[10px]">
                      10 Marks
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                    <p className="text-xs font-semibold text-white">
                      Prove the generalized uncertainty principle for arbitrary Hermitian operators A and B.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-2">
                      Includes 5-step derivation key and marking criteria based on course text.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Bottom Simulated Input Bar */}
            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Shield className="w-3.5 h-3.5 text-[#C6F432]" />
                Zero external telemetry • Encrypted in PostgreSQL & JWT session
              </span>
              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1))}
                className="inline-flex items-center gap-1 text-[#C6F432] font-semibold hover:underline"
              >
                <span>Next step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Connected Transition Visual Motif ─────────────────────────── */}
      <div className="relative py-8 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <div className="w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-[#C6F432]/50 to-transparent" />
        <div className="absolute w-6 h-6 rounded-full bg-[#0B0B0C] border-2 border-[#C6F432] shadow-[0_0_12px_#C6F432] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C6F432]" />
        </div>
      </div>

      {/* ─── 4. Product Capabilities Grid ─────────────────────────────────── */}
      <section id="capabilities" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/20 px-3 py-1 rounded-full">
            Engineering Precision
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Built for Academic Rigor, Not Casual Chitchat
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Generic LLMs invent facts when pressed. AI Academic Assistant grounds every single answer in your actual course materials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Multi-Document Ingestion",
              desc: "Attach multiple PDFs, Word documents, PowerPoint slide decks, and text files to one course chat workspace without data collisions.",
              icon: BookOpen,
              tag: "PDF, DOCX, PPTX, TXT",
            },
            {
              title: "Grounded Citation Traces",
              desc: "Every claim cites the exact document title and chunk page number so you can instantly verify formulas, quotes, and theorems.",
              icon: BookMarked,
              tag: "Deterministic Attribution",
            },
            {
              title: "Active-Recall Flashcards",
              desc: "Generate 3D flippable flashcard decks directly from your course notes. Practice active recall with self-paced answer evaluation.",
              icon: Layers,
              tag: "Spaced Repetition",
            },
            {
              title: "5-Mark & 10-Mark Exam Papers",
              desc: "Simulate university exam sections with strictly allocated marks, authentic marking rubrics, and detailed sample answers.",
              icon: GraduationCap,
              tag: "Curriculum Aligned",
            },
            {
              title: "Oral Defense & Viva Questions",
              desc: "Prepare for high-stakes lab vivas, thesis defenses, and professor cross-examinations with targeted conceptual interrogation.",
              icon: FileQuestion,
              tag: "Viva Readiness",
            },
            {
              title: "Private Multi-Tenant Isolation",
              desc: "Each student workspace is fortified with authenticated user scoping and strict ownership checks. Cross-tenant leakage is impossible.",
              icon: Lock,
              tag: "JWT & Row-Level Scoping",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-[#C6F432]/40 transition-all hover:bg-white/[0.04] hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-[#C6F432]/10 border border-[#C6F432]/25 text-[#C6F432] group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#C6F432]" />
                  </div>
                  <span className="text-[10px] font-mono font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[#C6F432] transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. Student Study Journey Workflow ───────────────────────────── */}
      <section id="workflow" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/20 px-3 py-1 rounded-full">
            The Study Loop
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            From Dense Lecture Notes to Exam Mastery
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            A cohesive 4-stage academic methodology designed for students tackling demanding STEM, Humanities, and Professional curricula.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              num: "01",
              title: "Upload & Ingest",
              desc: "Drop lecture PDFs, syllabus outlines, and slide decks. Documents are parsed and stored with token budgeting.",
              icon: Zap,
            },
            {
              num: "02",
              title: "Grounded Chat",
              desc: "Ask nuanced questions. The assistant searches your sources and builds streaming responses with explicit citations.",
              icon: Sparkles,
            },
            {
              num: "03",
              title: "Active Flashcards",
              desc: "Reinforce recall with flippable flashcard decks generated directly from the most critical concepts in your material.",
              icon: Layers,
            },
            {
              num: "04",
              title: "Exam Simulation",
              desc: "Practice with timed university exam papers, full 5-mark and 10-mark questions, and comprehensive scoring rubrics.",
              icon: GraduationCap,
            },
          ].map((stage, idx) => {
            const Icon = stage.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-[#C6F432]/40">
                      {stage.num}
                    </span>
                    <Icon className="w-5 h-5 text-[#C6F432]" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{stage.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 6. Study Studio Deep Dive ───────────────────────────────────── */}
      <section id="studio" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="rounded-3xl border border-[#C6F432]/25 bg-gradient-to-b from-[#18181B]/80 to-[#121214]/90 p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#C6F432] bg-[#C6F432]/10 border border-[#C6F432]/20 px-3 py-1 rounded-full">
              Built-in Academic Tools
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
              Study Studio Inside Every Academic Chat
            </h2>
            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
              Never switch between fragmented apps for note-taking, flashcards, and quizzes. Study Studio is built directly into every course chat, allowing instant conversion of conversation insights into persistent study artifacts.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6F432] text-[#0B0B0C] text-xs font-bold hover:bg-[#b5e324] shadow-[0_0_20px_rgba(198,244,50,0.3)] transition-all"
              >
                <span>Launch Your Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.1] text-xs font-semibold hover:bg-white/[0.08] transition-colors"
              >
                <span>Sign In to Existing Account</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. Final Conversion Section ─────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Ready to turn course overload into{" "}
          <span className="text-[#C6F432]">academic confidence?</span>
        </h2>
        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
          Create an independent chat workspace for your courses in seconds. No credit card required.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold rounded-2xl bg-[#C6F432] text-[#0B0B0C] hover:bg-[#b5e324] shadow-[0_0_35px_rgba(198,244,50,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Create Free Student Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-2xl bg-white/[0.04] text-zinc-200 border border-white/[0.12] hover:bg-white/[0.08] transition-colors"
          >
            <span>Log In to Workspace</span>
          </Link>
        </div>
      </section>

      {/* ─── 8. Modern Editorial Footer ──────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-[#070708] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#C6F432] text-[#0B0B0C] flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#0B0B0C]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Academic Assistant</p>
              <p className="text-[10px] text-zinc-400 font-mono">
                Precision Academic Dialogue & Course Workspace Engine
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Register
            </Link>
            <a href="#hero-demo" className="hover:text-white transition-colors">
              Interactive Demo
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
          </div>

          <p className="text-[10px] text-zinc-400 font-mono">
            &copy; {new Date().getFullYear()} AI Academic Assistant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
