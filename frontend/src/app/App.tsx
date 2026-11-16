import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DocumentProvider } from "@/features/documents/DocumentContext";
import { ConversationProvider } from "@/features/conversations/ConversationContext";

import { DashboardPage } from "@/pages/DashboardPage";
import { UploadPage } from "@/pages/UploadPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { AIToolsPage } from "@/pages/AIToolsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { NotebookDashboardPage } from "@/pages/notebooks/NotebookDashboardPage";
import { NotebookWorkspacePage } from "@/pages/notebooks/NotebookWorkspacePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DesignSystemShowcasePage } from "@/pages/DesignSystemShowcasePage";
import { PublicLandingPage } from "@/pages/PublicLandingPage";

/** Root route tree for the student application. */
export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DocumentProvider>
          <ConversationProvider>
            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Core Application Shell Routes */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/landing" element={<PublicLandingPage />} />
                <Route path="/welcome" element={<PublicLandingPage />} />
                
                {/* Protected V2 Notebook Routes */}
                <Route
                  path="/notebooks"
                  element={
                    <ProtectedRoute>
                      <NotebookDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notebooks/:id"
                  element={
                    <ProtectedRoute>
                      <NotebookWorkspacePage />
                    </ProtectedRoute>
                  }
                />

                {/* Existing V1 Application Routes */}
                <Route path="/documents" element={<UploadPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/chat" element={<WorkspacePage />} />
                <Route path="/workspace" element={<WorkspacePage />} />
                <Route path="/tools" element={<AIToolsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/design-system" element={<DesignSystemShowcasePage />} />

                {/* 404 & Fallback */}
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </ConversationProvider>
        </DocumentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
