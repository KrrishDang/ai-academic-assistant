import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";

/**
 * AppLayout adapter component.
 * Preserves backward compatibility with App.tsx routes while wrapping the
 * newly constructed unified AppShell.
 */
export function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export { AppShell };
