import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ObrasProvider } from "@/contexts/ObrasContext";
import { OrcamentoProvider } from "@/contexts/OrcamentoContext";
import { EstoqueProvider } from "@/contexts/EstoqueContext";
import { CustoRealProvider } from "@/contexts/CustoRealContext";
import { ObraSelectionProvider } from "@/contexts/ObraSelectionContext";
import { CompanyProvider, useCompany } from "@/contexts/CompanyContext";

import AppLayout from "@/components/AppLayout";

import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ObrasPage from "@/pages/ObrasPage";
import ObraDetalhePage from "@/pages/ObraDetalhePage";
import OrcamentoPage from "@/pages/OrcamentoPage";
import CustoRealPage from "@/pages/CustoRealPage";
import CronogramaPage from "@/pages/CronogramaPage";
import DiarioPage from "@/pages/DiarioPage";
import EstoquePage from "@/pages/EstoquePage";
import PainelObraPage from "@/pages/PainelObraPage";
import EquipePage from "@/pages/EquipePage";
import PerfilPage from "@/pages/PerfilPage";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import AdminPlansPage from "@/pages/admin/AdminPlansPage";
import AdminAddonsPage from "@/pages/admin/AdminAddonsPage";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const { needsOnboarding, loading: companyLoading } = useCompany();

  if (loading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding && user?.role !== "admin") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/painel" replace />;
  }

  return <LoginPage />;
}

function OnboardingRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const { needsOnboarding, loading: companyLoading } = useCompany();

  if (loading || companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!needsOnboarding || user?.role === "admin") {
    return <Navigate to="/painel" replace />;
  }

  return <OnboardingPage />;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ObrasProvider>
      <OrcamentoProvider>
        <EstoqueProvider>
          <CustoRealProvider>
            <ObraSelectionProvider>{children}</ObraSelectionProvider>
          </CustoRealProvider>
        </EstoqueProvider>
      </OrcamentoProvider>
    </ObrasProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppProviders>
              <AppLayout />
            </AppProviders>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="painel" element={<PainelObraPage />} />
        <Route path="obras" element={<ObrasPage />} />
        <Route path="obras/:id" element={<ObraDetalhePage />} />
        <Route path="orcamento" element={<OrcamentoPage />} />
        <Route path="custo-real" element={<CustoRealPage />} />
        <Route path="cronograma" element={<CronogramaPage />} />
        <Route path="diario" element={<DiarioPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="equipe" element={<EquipePage />} />
        <Route path="perfil" element={<PerfilPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/companies" replace />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="addons" element={<AdminAddonsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
              <Sonner />
            </BrowserRouter>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}