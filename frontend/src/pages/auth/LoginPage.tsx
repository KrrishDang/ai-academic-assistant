import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, BookOpen, Lock, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: trimmedEmail, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background selection:bg-[#C6F432]/30">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-[#C6F432]/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="h-10 w-10 rounded-xl bg-[#0B0B0C] border border-[#C6F432]/40 flex items-center justify-center text-[#C6F432] shadow-sm shadow-[#C6F432]/20">
              <Sparkles size={20} className="text-[#C6F432]" aria-hidden="true" />
            </div>
            <span>
              Study<span className="text-[#C6F432]">Hub</span>{" "}
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#C6F432]/15 text-[#C6F432] border border-[#C6F432]/30 font-bold ml-1">
                V2
              </span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground font-medium">
            AI-powered academic workspace with source-grounded intelligence
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/80 shadow-lg bg-card/90 backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access your notebooks, sources, and study assistants
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4 pt-0">
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in"
                >
                  <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Input
                  label="Email address"
                  type="email"
                  id="login-email"
                  placeholder="student@university.edu"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type="password"
                  id="login-password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                variant="lime"
                size="lg"
                className="w-full h-11 text-sm font-bold gap-2"
                isLoading={loading}
              >
                Sign In
                {!loading && <ArrowRight size={16} aria-hidden="true" />}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-bold text-foreground hover:text-[#C6F432] underline-offset-4 hover:underline transition-colors"
                >
                  Create one now
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted-foreground">
          StudyHub V2 • Protected by JWT Token Authentication
        </div>
      </div>
    </div>
  );
}
