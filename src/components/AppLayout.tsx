import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link, Outlet, useNavigate } from "react-router-dom";
import { useObras } from "@/contexts/ObrasContext";
import { useObraSelection } from "@/contexts/ObraSelectionContext";
import DemoModeBar from "@/components/DemoModeBar";
import CommandPalette from "@/components/CommandPalette";
import NotificationCenter from "@/components/NotificationCenter";
import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import {
  LayoutDashboard, Building2, DollarSign, CalendarDays, BookOpen,
  Package, User, LogOut, Menu, HardHat, Receipt, Shield, Users,
  Wallet, ListChecks, Store, FolderOpen, CalendarCheck, ShoppingBasket,
  Search, ChevronRight, ChevronDown, ChevronsUpDown, Check,
  BarChart3, Hammer,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import GlobalFAB from "@/components/GlobalFAB";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  icon?: React.ElementType;
  links: NavItem[];
}

// ─── Navigation Config ────────────────────────────────────────────────────────

const obraSection: NavItem[] = [
  { to: "/obras",  label: "Obras",         icon: Building2 },
  { to: "/painel", label: "Painel da Obra", icon: LayoutDashboard },
];

const planejamentoSection: NavItem[] = [
  { to: "/orcamento",  label: "Orçamento",  icon: DollarSign },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
];

const financeiroSection: NavItem[] = [
  { to: "/financeiro",  label: "Financeiro",       icon: Wallet },
  { to: "/relatorios",  label: "Relatórios & KPIs", icon: BarChart3 },
];

const canteiroSection: NavItem[] = [
  { to: "/execucao",   label: "Execução & Diário", icon: Hammer },
  { to: "/documentos", label: "Documentos",        icon: FolderOpen },
];

const redeSection: NavItem[] = [
  { to: "/contatos", label: "Contatos", icon: Users },
];

const gestorSections: NavSection[] = [
  { title: "Obra",         links: obraSection },
  { title: "Planejamento", links: planejamentoSection },
  { title: "Financeiro",   links: financeiroSection },
  { title: "Canteiro",     links: canteiroSection },
  { title: "Rede",         links: redeSection },
];

const funcionarioLinks: NavItem[] = [
  { to: "/obras",      label: "Obras",             icon: Building2 },
  { to: "/painel",     label: "Painel da Obra",    icon: LayoutDashboard },
  { to: "/cronograma", label: "Cronograma",        icon: CalendarDays },
  { to: "/execucao",   label: "Execução & Diário", icon: Hammer },
];

const clienteLinks: NavItem[] = [
  { to: "/obras",      label: "Obras",          icon: Building2 },
  { to: "/painel",     label: "Painel da Obra", icon: LayoutDashboard },
  { to: "/orcamento",  label: "Orçamento",      icon: DollarSign },
  { to: "/financeiro", label: "Financeiro",     icon: Wallet },
  { to: "/cronograma", label: "Cronograma",     icon: CalendarDays },
  { to: "/execucao",   label: "Diário de Obra", icon: BookOpen },
];

const mobileGestorTabs = [
  { to: "/obras",      label: "Obras",       icon: Building2 },
  { to: "/painel",     label: "Painel",      icon: LayoutDashboard },
  { to: "/financeiro", label: "Financeiro",  icon: Wallet },
  { to: "/execucao",   label: "Execução",   icon: Hammer },
  { to: "/_more",      label: "Mais",        icon: Menu },
];

const mobileFuncionarioTabs = [
  { to: "/obras",      label: "Obras",      icon: Building2 },
  { to: "/painel",     label: "Painel",     icon: LayoutDashboard },
  { to: "/execucao",   label: "Execução",  icon: Hammer },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/_more",      label: "Mais",       icon: Menu },
];

const mobileClienteTabs = [
  { to: "/obras",      label: "Obras",     icon: Building2 },
  { to: "/painel",     label: "Painel",    icon: LayoutDashboard },
  { to: "/orcamento",  label: "Orçamento", icon: DollarSign },
  { to: "/execucao",   label: "Execução",  icon: Hammer },
  { to: "/_more",      label: "Mais",      icon: Menu },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  gestor: "Gestor",
  funcionario: "Funcionário",
  cliente: "Cliente",
};

// Mapa rota → nome para breadcrumb
const ROUTE_LABELS: Record<string, string> = {
  "/obras":        "Obras",
  "/painel":       "Painel da Obra",
  "/orcamento":    "Orçamento",
  "/financeiro":   "Financeiro",
  "/custo-real":   "Financeiro",
  "/pagamentos":   "Financeiro",
  "/cronograma":   "Cronograma",
  "/execucao":     "Execução & Canteiro",
  "/agenda":       "Execução & Canteiro",
  "/estoque":      "Execução & Canteiro",
  "/documentos":   "Documentos",
  "/biblioteca":   "Biblioteca",
  "/contatos":     "Contatos",
  "/fornecedores": "Contatos",
  "/insumos":      "Orçamento",
  "/relatorios":   "Relatórios & KPIs",
  "/usuarios":     "Usuários",
  "/perfil":       "Perfil",
  "/admin":        "Admin Plataforma",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SidebarLink({
  link,
  active,
  onClick,
  collapsed,
}: {
  link: NavItem;
  active: boolean;
  onClick?: () => void;
  collapsed: boolean;
}) {
  const Icon = link.icon;

  return (
    <Link
      to={link.to}
      onClick={onClick}
      title={collapsed ? link.label : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
        active
          ? "bg-sidebar-primary/15 text-sidebar-primary"
          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sidebar-primary rounded-r-full" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-sidebar-primary" : "text-slate-500 group-hover:text-slate-300"
        )}
      />
      <span
        className={cn(
          "truncate transition-all duration-200 origin-left",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
}

function SidebarSection({
  section,
  activePath,
  collapsed,
}: {
  section: NavSection;
  activePath: string;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p
        className={cn(
          "px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition-all duration-200",
          collapsed ? "opacity-0 h-0 pt-0 pb-0 overflow-hidden" : "opacity-100"
        )}
      >
        {section.title}
      </p>
      {section.links.map((link) => (
        <SidebarLink
          key={link.to}
          link={link}
          active={activePath === link.to}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

// Obra Selector no top header
function ObraSelector() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedObra = obras.find((o) => o.id === selectedObraId) || obras[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!obras.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
          "border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600",
          "text-slate-200 max-w-[220px]"
        )}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" />
        <span className="truncate font-medium text-xs">
          {selectedObra?.nome || "Selecionar obra"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500 ml-auto" />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
              Selecionar Obra
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
            {obras.map((obra) => (
              <button
                key={obra.id}
                onClick={() => {
                  setSelectedObraId(obra.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800",
                  selectedObraId === obra.id && "bg-sidebar-primary/10"
                )}
              >
                <div className="h-7 w-7 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-sidebar-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100 truncate">{obra.nome}</p>
                  {obra.endereco && (
                    <p className="text-xs text-slate-500 truncate">{obra.endereco}</p>
                  )}
                </div>
                {selectedObraId === obra.id && (
                  <Check className="h-4 w-4 text-sidebar-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-800 px-3 py-2">
            <button
              onClick={() => { setOpen(false); navigate("/obras"); }}
              className="w-full text-xs text-sidebar-primary hover:text-sidebar-primary/80 transition-colors text-center"
            >
              + Gerenciar todas as obras
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toggle: openPalette } = useCommandPalette();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  if (!user) return null;

  const collapsed = !sidebarHovered;

  // Breadcrumb dinâmico
  const currentLabel = ROUTE_LABELS[location.pathname] || location.pathname;

  const contaLinks: NavItem[] = [
    { to: "/usuarios", label: "Usuários", icon: Users },
    { to: "/perfil",   label: "Perfil",   icon: User },
  ];

  const mainSections: NavSection[] =
    user.role === "gestor" || user.role === "admin"
      ? [
          ...(user.role === "admin"
            ? [{ title: "Admin", links: [{ to: "/admin", label: "Admin Plataforma", icon: Shield }] }]
            : []),
          ...gestorSections,
          { title: "Conta", links: contaLinks },
        ]
      : user.role === "funcionario"
      ? [
          { title: "Geral",  links: funcionarioLinks },
          { title: "Conta",  links: [{ to: "/perfil", label: "Perfil", icon: User }] },
        ]
      : [
          { title: "Geral",  links: clienteLinks },
          { title: "Conta",  links: [{ to: "/perfil", label: "Perfil", icon: User }] },
        ];

  const allLinks = mainSections.flatMap((s) => s.links);
  const mobileTabLinks =
    user.role === "gestor" || user.role === "admin"
      ? mobileGestorTabs
      : user.role === "funcionario"
      ? mobileFuncionarioTabs
      : mobileClienteTabs;

  const mobileTabRoutes = mobileTabLinks.filter((t) => t.to !== "/_more").map((t) => t.to);
  const moreLinks = allLinks.filter((l) => !mobileTabRoutes.includes(l.to));
  const isActiveRoute = (to: string) => {
    if (to === "/_more") return moreLinks.some((l) => location.pathname === l.to) || moreMenuOpen;
    return location.pathname === to;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ══ Command Palette ══════════════════════════════════════ */}
      <CommandPalette />

      {/* ══ Desktop Sidebar ══════════════════════════════════════ */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={cn(
          "hidden md:flex fixed left-0 top-0 h-screen flex-col z-50 transition-all duration-200 ease-in-out overflow-hidden",
          "bg-slate-950 border-r border-slate-800/60",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center border-b border-slate-800/60 shrink-0 h-14 px-3 gap-3">
          {/* Símbolo Lastra — sempre visível */}
          <div className="shrink-0 w-8 h-8 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="lastra-cut-sidebar">
                  <rect width="48" height="52" fill="white"/>
                  <path d="M 0 30 C 12 8, 24 40, 48 18" stroke="black" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                </mask>
              </defs>
              <g mask="url(#lastra-cut-sidebar)">
                <rect x="4"  y="4"  width="8" height="36" rx="2" fill="#AFA9EC"/>
                <rect x="15" y="4"  width="8" height="36" rx="2" fill="#AFA9EC" opacity=".85"/>
                <rect x="26" y="18" width="8" height="22" rx="2" fill="#AFA9EC" opacity=".6"/>
                <rect x="37" y="26" width="8" height="14" rx="2" fill="#AFA9EC" opacity=".4"/>
                <rect x="4"  y="43" width="41" height="3"  rx="1.5" fill="#AFA9EC"/>
              </g>
            </svg>
          </div>
          {/* Wordmark — aparece com o expand via opacity */}
          <span
            className={cn(
              "text-white font-semibold text-base tracking-tight transition-all duration-200 origin-left whitespace-nowrap",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            Lastra
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2 scrollbar-none">
          {mainSections.map((section, i) => (
            <SidebarSection
              key={i}
              section={section}
              activePath={location.pathname}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800/60 shrink-0 py-3 px-2 space-y-1">
          <div
            className={cn(
              "px-2 pb-2 transition-all duration-200 overflow-hidden",
              collapsed ? "opacity-0 h-0 pb-0" : "opacity-100"
            )}
          >
            <DemoModeBar />
          </div>

          {/* User info */}
          <div className="flex items-center gap-2.5 rounded-lg py-2 px-3">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/25 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-sidebar-primary/80" />
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 transition-all duration-200",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}
            >
              <div className="text-xs font-semibold text-slate-100 truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500">{roleLabels[user.role]}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            title={collapsed ? "Sair" : undefined}
            className="flex items-center gap-2.5 w-full rounded-lg py-2 px-3 text-xs text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "transition-all duration-200",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}
            >
              Sair da conta
            </span>
          </button>
        </div>
      </aside>

      {/* ══ Desktop Top Header ═══════════════════════════════════ */}
      <header
        className={cn(
          "hidden md:flex fixed top-0 right-0 z-40 h-14 items-center gap-3 px-4 border-b",
          "bg-slate-950/80 backdrop-blur-sm border-slate-800/60",
          "left-[60px]"
        )}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
          <span className="text-slate-500 text-xs">Lastra</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-700 shrink-0" />
          <span className="font-medium text-slate-200 text-xs truncate">{currentLabel}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Obra Selector */}
          <ObraSelector />

          {/* Search / Command */}
          <button
            onClick={openPalette}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs",
              "border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600",
              "text-slate-400 hover:text-slate-200 transition-all"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Pesquisar</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-400 font-mono text-[10px] leading-none ml-1">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <NotificationCenter />
        </div>
      </header>

      {/* ══ Mobile Top Header ════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-slate-950 border-slate-800 z-40 flex items-center px-4 gap-3">
        <div className="h-7 w-7 flex items-center justify-center shrink-0">
          <svg width="28" height="28" viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="lastra-cut-mobile">
                <rect width="48" height="52" fill="white"/>
                <path d="M 0 30 C 12 8, 24 40, 48 18" stroke="black" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
              </mask>
            </defs>
            <g mask="url(#lastra-cut-mobile)">
              <rect x="4"  y="4"  width="8" height="36" rx="2" fill="#AFA9EC"/>
              <rect x="15" y="4"  width="8" height="36" rx="2" fill="#AFA9EC" opacity=".85"/>
              <rect x="26" y="18" width="8" height="22" rx="2" fill="#AFA9EC" opacity=".6"/>
              <rect x="37" y="26" width="8" height="14" rx="2" fill="#AFA9EC" opacity=".4"/>
              <rect x="4"  y="43" width="41" height="3"  rx="1.5" fill="#AFA9EC"/>
            </g>
          </svg>
        </div>
        <span className="font-semibold text-sm text-white flex-1">Lastra</span>
        <button
          onClick={openPalette}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        <NotificationCenter />
      </header>

      {/* ══ Mobile More Overlay ──────────────────────────────── */}
      {moreMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary/15 text-sidebar-primary"
                        : "text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ Mobile Bottom Nav ═══════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-slate-950 border-slate-800 z-40 flex items-stretch">
        {mobileTabLinks.map((tab) => {
          const Icon = tab.icon;
          const active = isActiveRoute(tab.to);

          if (tab.to === "/_more") {
            return (
              <button
                key={tab.to}
                onClick={() => setMoreMenuOpen((v) => !v)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                  active ? "text-sidebar-primary" : "text-slate-500 hover:text-slate-300"
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
                active ? "text-sidebar-primary" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ══ Global FAB ══════════════════════════════════════════ */}
      <GlobalFAB />

      {/* ══ Main Content ════════════════════════════════════════ */}
      <main
        className={cn(
          // Mobile: top nav + bottom nav
          "pt-14 pb-16 md:pb-0",
          // Desktop: sidebar fixo em 60px (sidebar flutua sobre o conteúdo no hover)
          "md:ml-[60px] md:pt-14",
          // Altura restante fixa + sem overflow próprio → PageShell gerencia o scroll interno
          "h-screen overflow-hidden"
        )}
      >
        {/* Wrapper que preenche 100% da main para pages com PageShell */}
        <div className="h-full overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
