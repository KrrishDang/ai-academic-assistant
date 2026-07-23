import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

/** Fallback route for unknown URLs. */
export function NotFoundPage() {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"><p className="text-sm font-medium text-muted-foreground">404</p><h1 className="text-3xl font-bold">Page not found</h1><Button asChild><Link to="/">Return home</Link></Button></div>;
}
