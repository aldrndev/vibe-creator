import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { useEffect, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ui";

// Layouts (keep synchronous for layout stability)
import { AuthLayout } from "@/components/layout/AuthLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Landing and Auth pages (synchronous for fast first paint)
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// Lazy load dashboard pages for code splitting
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((m) => ({
    default: m.DashboardPage,
  }))
);
const ProjectsPage = lazy(() =>
  import("@/pages/dashboard/ProjectsPage").then((m) => ({
    default: m.ProjectsPage,
  }))
);
const PromptsPage = lazy(() =>
  import("@/pages/dashboard/PromptsPage").then((m) => ({
    default: m.PromptsPage,
  }))
);
const PromptBuilderPage = lazy(() =>
  import("@/pages/dashboard/PromptBuilderPage").then((m) => ({
    default: m.PromptBuilderPage,
  }))
);
const PromptDetailPage = lazy(() =>
  import("@/pages/dashboard/PromptDetailPage").then((m) => ({
    default: m.PromptDetailPage,
  }))
);
const DownloadsPage = lazy(() =>
  import("@/pages/dashboard/DownloadsPage").then((m) => ({
    default: m.DownloadsPage,
  }))
);
const SettingsPage = lazy(() =>
  import("@/pages/dashboard/SettingsPage").then((m) => ({
    default: m.SettingsPage,
  }))
);
const PricingPage = lazy(() =>
  import("@/pages/dashboard/PricingPage").then((m) => ({
    default: m.PricingPage,
  }))
);
const AdminPage = lazy(() =>
  import("@/pages/dashboard/AdminPage").then((m) => ({ default: m.AdminPage }))
);
const CommunityPage = lazy(() =>
  import("@/pages/dashboard/CommunityPage").then((m) => ({
    default: m.CommunityPage,
  }))
);

// Lazy load heavy editor and tools pages
const EditorPage = lazy(() =>
  import("@/pages/editor/EditorPage").then((m) => ({ default: m.EditorPage }))
);
const LoopCreatorPage = lazy(() =>
  import("@/pages/tools/LoopCreatorPage").then((m) => ({
    default: m.LoopCreatorPage,
  }))
);
const ReactionCreatorPage = lazy(() =>
  import("@/pages/tools/ReactionCreatorPage").then((m) => ({
    default: m.ReactionCreatorPage,
  }))
);
const LiveStreamPage = lazy(() =>
  import("@/pages/tools/LiveStreamPage").then((m) => ({
    default: m.LiveStreamPage,
  }))
);
const LiveStreamHistoryPage = lazy(() =>
  import("@/pages/tools/LiveStreamHistoryPage").then((m) => ({
    default: m.LiveStreamHistoryPage,
  }))
);
const StoryDirectorPage = lazy(() =>
  import("@/pages/tools/StoryDirectorPage").then((m) => ({
    default: m.StoryDirectorPage,
  }))
);
const ModernEditorPage = lazy(() =>
  import("@/pages/tools/ModernEditorPage").then((m) => ({
    default: m.ModernEditorPage,
  }))
);
const AiDirectorPage = lazy(() =>
  import("@/pages/tools/AiDirectorPage").then((m) => ({
    default: m.AiDirectorPage,
  }))
);

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Auth check is done at App level, no need to check here again

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { theme } = useThemeStore();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    // Check authentication status on mount
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth routes - English */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthLayout>
                  <RegisterPage />
                </AuthLayout>
              </PublicRoute>
            }
          />

          {/* Protected dashboard routes - English */}
          {/* Protected Dashboard Layout (Includes Dashboard & Tools) */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/projects"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProjectsPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/exports"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProjectsPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/prompts"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PromptsPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/prompts/new"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PromptBuilderPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/prompts/:id"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PromptDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/downloads"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DownloadsPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/settings"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/pricing"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PricingPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/community"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CommunityPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminPage />
                </Suspense>
              }
            />

            {/* Tools Routes (Now inside Dashboard Layout) */}
            <Route
              path="/tools/loop-creator"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LoopCreatorPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/reaction-creator"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ReactionCreatorPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/live-stream"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LiveStreamPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/live-stream-history"
              element={
                <Suspense fallback={<PageLoader />}>
                  <LiveStreamHistoryPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/story-director"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StoryDirectorPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/story-director/:projectId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <StoryDirectorPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/modern-editor"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ModernEditorPage />
                </Suspense>
              }
            />
            <Route
              path="/tools/ai-director"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AiDirectorPage />
                </Suspense>
              }
            />
          </Route>

          {/* Editor routes (full screen, no dashboard layout) */}
          <Route
            path="/tools/editor"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <EditorPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:projectId"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <EditorPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to dashboard if authenticated, otherwise landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
