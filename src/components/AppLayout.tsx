import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  CalendarDays,
  BookOpen,
  Package,
  User,
  LogOut,
  Menu,
  X,
  HardHat,
  Receipt,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const gestorLinks = [
  { to: "/painel", label: "Painel da Obra", icon: LayoutDashboard },
  { to: "/obras", label: "Obras", icon: Building2 },
  { to: "/orcamento", label: "Orçamento", icon: DollarSign },
  { to: "/custo-real", label: "Custo Real", icon: Receipt },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/equipe", label: "Equipe", icon: Users },
];

const funcionarioLinks = [
  { to: "/painel", label: "Painel da Obra", icon: LayoutDashboard },
  { to: "/obras", label: "Obras", icon: Building2 },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/estoque", label: "Estoque", icon: Package },
];

const clienteLinks = [
  { to: "/painel", label: "Painel da Obra", icon: LayoutDashboard },
  { to: "/obras", label: "Obras", icon: Building2 },
  { to: "/orcamento", label: "Orçamento", icon: DollarSign },
  { to: "/custo-real", label: "Custo Real", icon: Receipt },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/diario", label: "Diário", icon: BookOpen },
];

const mobileGestorTabs = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/orcamento", label: "Orçamento", icon: DollarSign },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/_more", label: "Mais", icon: Menu },
];

const mobileFuncionarioTabs = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/_more", label: "Mais", icon: Menu },
];

const mobileClienteTabs = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/orcamento", label: "Orçamento", icon: DollarSign },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/_more", label: "Mais", icon: Menu },
];

const adminLinks = [
  { to: "/admin", label: "Admin Plataforma", icon: Shield },
  { to: "/painel", label: "Painel da Obra", icon: LayoutDashboard },
  { to: "/obras", label: "Obras", icon: Building2 },
  { to: "/orcamento", label: "Orçamento", icon: DollarSign },
  { to: "/custo-real", label: "Custo Real", icon: Receipt },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/equipe", label: "Equipe", icon: Users },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  funcionario: "Funcionário",
  cliente: "Cliente",
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  if (!user) return null;

  const links =
    user.role === "admin"
      ? adminLinks
      : user.role === "gestor"
      ? gestorLinks
      : user.role === "funcionario"
      ? funcionarioLinks
      : clienteLinks;

  const mobileTabs =
    user.role === "gestor"
      ? mobileGestorTabs
      : user.role === "funcionario"
      ? mobileFuncionarioTabs
      : mobileClienteTabs;

  const mobileTabRoutes = mobileTabs.filter((t) => t.to !== "/_more").map((t) => t.to);
  const moreLinks = links.filter((l) => !mobileTabRoutes.includes(l.to));

  const isActiveRoute = (to: string) => {
    if (to === "/_more") return moreLinks.some((l) => location.pathname === l.to) || moreMenuOpen;
    return location.pathname === to;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 border-r bg-card flex-col">
        <div className="h-16 px-6 border-b flex items-center gap-3">
          <HardHat className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">ObraFácil</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;

            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3">
          <Link
            to="/perfil"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/perfil"
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted"
            )}
          >
            <User className="h-4 w-4" />
            Perfil
          </Link>

          <div className="px-3">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">{roleLabels[user.role]}</div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-card z-40 flex items-center px-4">
        <div className="flex items-center gap-2">
          <HardHat className="h-6 w-6 text-primary" />
          <span className="font-bold">ObraFácil</span>
        </div>
      </header>

      {/* Mobile More Overlay */}
      {moreMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-card border-t rounded-t-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Mais opções</h3>
              <button onClick={() => setMoreMenuOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === link.to
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}

              <Link
                to="/perfil"
                onClick={() => setMoreMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-foreground hover:bg-muted"
              >
                <User className="h-4 w-4" />
                Perfil
              </Link>

              <button
                onClick={() => {
                  logout();
                  setMoreMenuOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-card z-40 flex">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActiveRoute(tab.to);

          if (tab.to === "/_more") {
            return (
              <button
                key={tab.to}
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px]">{tab.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={tab.to}
              to={tab.to}
              onClick={() => setMoreMenuOpen(false)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}