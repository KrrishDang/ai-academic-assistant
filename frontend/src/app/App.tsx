import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentProvider } from "@/features/documents/DocumentContext";
import { ConversationProvider } from "@/features/conversations/ConversationContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/** Root route tree for the student application. */
export function App() {
  return (
    <ThemeProvider>
      <DocumentProvider>
        <ConversationProvider>
          <Routes>
            {/* Core application routes */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </ConversationProvider>
      </DocumentProvider>
    </ThemeProvider>
  );
}
