import { Link } from "react-router-dom";
import { FolderKanban, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Fallback 404 route for unknown URLs. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center px-4 animate-fade-in">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
        <Sparkles size={24} className="text-primary" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
          404 &bull; Page Not Found
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Study Resource Unavailable
        </h1>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          The requested route, study notebook, or document may have been removed or relocated.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button asChild variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold gap-1.5">
          <Link to="/">
            <Home size={14} />
            <span>Return to Dashboard</span>
          </Link>
        </Button>
        <Button asChild variant="lime" size="sm" className="h-8 px-3 text-xs font-bold gap-1.5 shadow-xs">
          <Link to="/notebooks">
            <FolderKanban size={14} />
            <span>Open Notebooks</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
