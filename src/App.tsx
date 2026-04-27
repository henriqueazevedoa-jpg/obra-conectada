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
import { SuprimentosProvider } from "@/contexts/SuprimentosContext";
import { CommandPaletteProvider } from "@/contexts/CommandPaletteContext";

import AppLayout from "@/components/AppLayout";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";

import LoginPage from "@/pages/LoginPage";
import LandingPage from "@/pages/LandingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ObrasPage from "@/pages/ObrasPage";
// ObraDetalhePage removed - clicking obra goes directly to Painel
import OrcamentoPage from "@/pages/OrcamentoPage";
import CotacaoPage from "@/pages/CotacaoPage";
import CustoRealPage from "@/pages/CustoRealPage";
import FinanceiroCentral from "@/pages/FinanceiroCentral";
import CronogramaPage from "@/pages/CronogramaPage";
import DiarioPage from "@/pages/DiarioPage";
import ExecucaoCentral from "@/pages/ExecucaoCentral";
import ComprasCentral from "@/pages/ComprasCentral";
import EstoquePage from "@/pages/EstoquePage";
import PagamentosPage from "@/pages/PagamentosPage";
import PainelObraPage from "@/pages/PainelObraPage";
import EquipePage from "@/pages/EquipePage";
import PerfilPage from "@/pages/PerfilPage";
import AgendaPage from "@/pages/AgendaPage";
import FornecedoresPage from "@/pages/FornecedoresPage";
import InsumosPage from "@/pages/InsumosPage";
import DocumentosPage from "@/pages/DocumentosPage";
import ContatosPage from "@/pages/ContatosPage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import VisualizacaoPublicaPage from "@/pages/public/VisualizacaoPublicaPage";
import OperacaoMobilePage from "@/pages/public/OperacaoMobilePage";
import BoletimPublicoPage from "@/pages/public/BoletimPublicoPage";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import AdminPlansPage from "@/pages/admin/AdminPlansPage";
import AdminAddonsPage from "@/pages/admin/AdminAddonsPage";
import AdminCompanyDetailPage from "@/pages/admin/AdminCompanyDetailPage";
import AdminCalculadoraPage from "@/pages/admin/AdminCalculadoraPage";
import AdminFeedbacksPage from "@/pages/admin/AdminFeedbacksPage";

import NotFound from "@/pages/NotFound";
import CotacaoPublicaPage from "@/pages/CotacaoPublicaPage";
import CalculadoraPublicaPage from "@/pages/CalculadoraPublicaPage";
import BibliotecaPage from "@/pages/BibliotecaPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import DashboardPage from "@/pages/DashboardPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import ContratosPage from "@/pages/ContratosPage";
import IntelligencePage from "@/pages/IntelligencePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // dados frescos por 1 minuto
      gcTime: 5 * 60 * 1000,     // cache mantido por 5 minutos
      refetchOnWindowFocus: false, // não refetch ao trocar aba
      retry: 1,                   // 1 retry em caso de erro
    }
  }
});

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
    return <Navigate to="/obras" replace />;
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
    return <Navigate to="/obras" replace />;
  }

  return <OnboardingPage />;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <ObrasProvider>
        <OrcamentoProvider>
          <EstoqueProvider>
            <CustoRealProvider>
              <SuprimentosProvider>
                <ObraSelectionProvider>{children}</ObraSelectionProvider>
              </SuprimentosProvider>
            </CustoRealProvider>
          </EstoqueProvider>
        </OrcamentoProvider>
      </ObrasProvider>
    </CommandPaletteProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/onboarding" element={<OnboardingRoute />} />

      <Route
        element={
          <ProtectedRoute>
            <AppProviders>
              <AppLayout />
              {/* PWA: Onboarding de instalação e notificações */}
              <InstallPrompt />
              <NotificationPrompt />
            </AppProviders>
          </ProtectedRoute>
        }
      >
        <Route path="obras" element={<ObrasPage />} />
        <Route path="painel" element={<PainelObraPage />} />
        <Route path="orcamento" element={<OrcamentoPage />} />
        <Route path="cotacao" element={<Navigate to="/orcamento?tab=cotacao" replace />} />
        <Route path="custo-real" element={<Navigate to="/financeiro?tab=custo-real" replace />} />
        <Route path="cronograma" element={<CronogramaPage />} />
        {/* Central de Execução — Diário, Estoque, Equipe */}
        <Route path="execucao" element={<ExecucaoCentral />} />
        {/* Central de Compras — Pedidos e Recebimentos */}
        <Route path="compras" element={<ComprasCentral />} />
        {/* Redirects para compatibilidade com links antigos */}
        <Route path="diario" element={<DiarioPage />} />
        <Route path="pendencias" element={<Navigate to="/agenda" replace />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="equipe" element={<EquipePage />} />
        <Route path="pedidos" element={<Navigate to="/compras?tab=pedidos" replace />} />
        <Route path="recebimentos" element={<Navigate to="/compras?tab=recebimentos" replace />} />
        {/* Central Financeira */}
        <Route path="financeiro" element={<FinanceiroCentral />} />
        <Route path="pagamentos" element={<Navigate to="/financeiro?tab=pagamentos" replace />} />
        {/* Relatórios */}
        <Route path="relatorios" element={<RelatoriosPage />} />
        {/* Contatos — substitui Fornecedores */}
        <Route path="contatos" element={<ContatosPage />} />
        <Route path="fornecedores" element={<Navigate to="/contatos" replace />} />
        {/* Insumos → Orçamento */}
        <Route path="insumos" element={<Navigate to="/orcamento" replace />} />
        <Route path="usuarios" element={<Navigate to="/equipe" replace />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="biblioteca" element={<BibliotecaPage />} />
        <Route path="perfil" element={<PerfilPage />} />
        {/* Rotas stub — implementadas nos próximos sprints */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contratos" element={<ContratosPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="intelligence" element={<IntelligencePage />} />
      </Route>

      {/* ── Rotas Públicas (sem autenticação) ───────────────────────── */}
      <Route path="/v/:token" element={<VisualizacaoPublicaPage />} />
      <Route path="/o/:token" element={<OperacaoMobilePage />} />
      <Route path="/bm/:token" element={<BoletimPublicoPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="companies/:id" element={<AdminCompanyDetailPage />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="addons" element={<AdminAddonsPage />} />
        <Route path="calculadora" element={<AdminCalculadoraPage />} />
        <Route path="feedbacks" element={<AdminFeedbacksPage />} />
      </Route>

      {/* Rota pública — calculadora de orçamento estimativo */}
      <Route path="/calculadora" element={<CalculadoraPublicaPage />} />

      {/* Rota pública — fornecedor preenche preços sem login */}
      <Route path="/cotacao/:token" element={<CotacaoPublicaPage />} />

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