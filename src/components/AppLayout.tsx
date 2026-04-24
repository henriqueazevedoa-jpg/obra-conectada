import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link, Outlet, useNavigate } from "react-router-dom";
import { useObras } from "@/contexts/ObrasContext";
import { useObraSelection } from "@/contexts/ObraSelectionContext";
import { useCompany } from "@/contexts/CompanyContext";
import CommandPalette from "@/components/CommandPalette";
import NotificationCenter from "@/components/NotificationCenter";
import { useCommandPalette } from "@/contexts/CommandPaletteContext";
import { useCronograma } from "@/hooks/useCronograma";
import {
  LayoutDashboard, Building2, DollarSign, CalendarDays, BookOpen,
  Package, LogOut, Menu, HardHat, Shield, Users,
  Wallet, FolderOpen, CalendarCheck, ShoppingCart,
  Search, ChevronRight, ChevronsUpDown, Check,
  BarChart3, ClipboardList, Home, Settings, MessageSquare, Calculator,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import ModalFeedback from "@/components/shared/ModalFeedback";

// ─── Lite mode detection ───────────────────────────────────────────────────────

function detectLiteMode(): boolean {
  try {
    const saved = localStorage.getItem('lastra_sidebar_lite');
    if (saved !== null) return saved === 'true';
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('backdrop-filter', 'blur(1px)')) return true;
  return false;
}

// ─── Recency helpers ───────────────────────────────────────────────────────────

const RECENCY_KEY = 'lastra_group_last_access';

function loadRecency(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RECENCY_KEY) || '{}'); } catch { return {}; }
}

function saveRecency(data: Record<string, number>) {
  try { localStorage.setItem(RECENCY_KEY, JSON.stringify(data)); } catch {}
}

function recencyLabel(ts: number | undefined): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 2) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

function recencyOpacity(ts: number | undefined): number {
  if (!ts) return 0.45;
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 30) return 1;
  if (mins < 120) return 0.72;
  return 0.45;
}


// ─── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  accent: string;
  glow: string;
  links: NavItem[];
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

function IconPlanejamento({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor"/>
      <rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.45"/>
      <rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.45"/>
      <rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.18"/>
    </svg>
  );
}

function IconFinanceiro({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="10" width="3.5" height="6" rx="1" fill="currentColor" opacity="0.45"/>
      <rect x="7.25" y="6" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="12.5" y="2" width="3.5" height="14" rx="1" fill="currentColor"/>
    </svg>
  );
}

function IconCanteiro({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M1.5 15.5 L9 3.5 L16.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 15.5 L4.5 11 L7.5 11 L7.5 15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
      <path d="M10.5 15.5 L10.5 8.5 L13.5 8.5 L13.5 15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
    </svg>
  );
}

function IconOutros({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.3"/>
      <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.4" opacity="0.55"/>
      <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    </svg>
  );
}

// ─── Nav config ─────────────────────────────────────────────────────────────────

const getGroups = (role: string): NavGroup[] => [
  {
    id: "planejamento",
    title: "Planejamento",
    icon: IconPlanejamento,
    accent: "#818CF8",
    glow: "rgba(129,140,248,0.35)",
    links: [
      { to: "/orcamento",   label: "Orçamento",   icon: DollarSign },
      { to: "/cronograma",  label: "Cronograma",  icon: CalendarDays },
      { to: "/contratos",   label: "Contratos",   icon: ClipboardList },
      { to: "/biblioteca",  label: "Biblioteca",  icon: BookOpen },
      { to: "/calculadora", label: "Calculadora", icon: Calculator },
    ],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: IconFinanceiro,
    accent: "#34D399",
    glow: "rgba(52,211,153,0.3)",
    links: [
      { to: "/financeiro", label: "Financeiro", icon: Wallet },
      { to: "/compras",    label: "Compras",    icon: ShoppingCart },
    ],
  },
  {
    id: "canteiro",
    title: "Canteiro",
    icon: IconCanteiro,
    accent: "#FB923C",
    glow: "rgba(251,146,60,0.3)",
    links: [
      { to: "/diario",     label: "Diário de Obra", icon: HardHat },
      { to: "/estoque",    label: "Estoque",        icon: Package },
      { to: "/equipe",     label: "Equipe",         icon: Users },
      { to: "/agenda",     label: "Agenda",         icon: CalendarCheck },
      { to: "/documentos", label: "Documentos",     icon: FolderOpen },
    ],
  },
  {
    id: "outros",
    title: "Outros",
    icon: IconOutros,
    accent: "#AFA9EC",
    glow: "rgba(175,169,236,0.25)",
    links: [
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/contatos",   label: "Contatos",   icon: Users },
    ],
  },
];

const mobileTabs: NavItem[] = [
  { to: "/obras",      label: "Obras",      icon: Building2 },
  { to: "/painel",     label: "Painel",     icon: Home },
  { to: "/diario",     label: "Diário",     icon: HardHat },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/_more",      label: "Mais",       icon: Menu },
];

const ROUTE_LABELS: Record<string, string> = {
  "/obras": "Obras", "/dashboard": "Dashboard", "/painel": "Painel da Obra",
  "/orcamento": "Orçamento", "/financeiro": "Financeiro", "/cronograma": "Cronograma",
  "/contratos": "Contratos", "/diario": "Diário de Obra", "/estoque": "Estoque",
  "/equipe": "Equipe", "/compras": "Compras", "/agenda": "Agenda",
  "/documentos": "Documentos", "/biblioteca": "Biblioteca", "/contatos": "Contatos",
  "/fornecedores": "Contatos", "/insumos": "Orçamento", "/relatorios": "Relatórios",
  "/configuracoes": "Configurações", "/perfil": "Perfil", "/admin": "Admin Plataforma",
};

// ─── CSS animations ─────────────────────────────────────────────────────────────

const ANIM_CSS = `
  @keyframes popoverIn {
    from { opacity: 0; transform: translateX(-8px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes popoverOut {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to   { opacity: 0; transform: translateX(-6px) scale(0.97); }
  }
  @keyframes tooltipIn {
    from { opacity: 0; transform: translateX(-4px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes breathe {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
`;

// ─── Progress Ring (logo) ──────────────────────────────────────────────────────

function ProgressRing({ progress, size = 44, stroke = 2.5, lite }: {
  progress: number; size?: number; stroke?: number; lite: boolean;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(1, progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#534AB7"/>
          <stop offset="100%" stopColor="#818CF8"/>
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(175,169,236,0.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={lite ? "#534AB7" : "url(#ring-grad)"}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}


// ─── Popover ──────────────────────────────────────────────────────────────────

function GroupPopoverPortal({
  group, activePath, pos, onNavigate, lite, closing, onMouseEnter, onMouseLeave,
}: {
  group: NavGroup; activePath: string;
  pos: { top: number; left: number };
  onNavigate: () => void; lite: boolean; closing: boolean;
  onMouseEnter?: () => void; onMouseLeave?: () => void;
}) {
  const cardStyle: React.CSSProperties = lite
    ? {
        minWidth: 172,
        borderRadius: 12,
        overflow: "hidden",
        background: "#1A1728",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }
    : {
        minWidth: 172,
        borderRadius: 14,
        overflow: "hidden",
        background: "rgba(14,12,24,0.94)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(28px) saturate(1.5)",
        WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        boxShadow: [
          "0 24px 48px rgba(0,0,0,0.7)",
          "0 8px 24px rgba(0,0,0,0.5)",
          "0 0 0 1px rgba(0,0,0,0.4)",
          "inset 0 1px 0 rgba(255,255,255,0.05)",
          `0 0 40px ${group.glow}`,
        ].join(", "),
      };

  return createPortal(
    <>
      {/* Blur overlay behind popover */}
      {!lite && (
        <div style={{
          position: "fixed", top: 0, left: 60, right: 0, bottom: 0,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          background: "rgba(0,0,0,0.12)",
          zIndex: 99997,
          pointerEvents: "none",
        }} />
      )}

      <div
        id="sidebar-popover-portal"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: "fixed",
          top: pos.top, left: pos.left,
          zIndex: 99999, pointerEvents: "auto",
          animation: closing
            ? "popoverOut 0.12s cubic-bezier(0.4,0,1,1) forwards"
            : "popoverIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Arrow */}
        <div style={{
          position: "absolute", left: -5, top: 18,
          width: 0, height: 0,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          borderRight: lite ? "5px solid #1A1728" : "5px solid rgba(14,12,24,0.94)",
        }} />

        <div style={cardStyle}>
          {/* Header */}
          <div style={{
            padding: "10px 12px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            position: "relative", overflow: "hidden",
            background: lite ? "transparent" : "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)",
          }}>
            {/* Top glow line */}
            {!lite && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg, transparent, ${group.accent}65, transparent)`,
              }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: `${group.accent}18`,
                border: `1px solid ${group.accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: group.accent, flexShrink: 0,
              }}>
                <group.icon size={11} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: group.accent,
              }}>
                {group.title}
              </span>
            </div>
          </div>

          {/* Links */}
          <div style={{ padding: "4px 4px 6px" }}>
            {group.links.map((link) => {
              const LinkIcon = link.icon;
              const active = activePath === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onNavigate}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 10px",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: active ? 500 : 400,
                    color: active ? group.accent : "rgba(195,190,228,0.72)",
                    background: active
                      ? `linear-gradient(135deg, ${group.accent}15, ${group.accent}07)`
                      : "transparent",
                    border: active ? `1px solid ${group.accent}18` : "1px solid transparent",
                    transition: "all 0.1s ease",
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLElement).style.color = "rgba(220,217,245,0.9)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "rgba(195,190,228,0.72)";
                    }
                  }}
                >
                  {active && (
                    <div style={{
                      position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      width: 2.5, height: 13, borderRadius: "0 2px 2px 0",
                      background: group.accent,
                      boxShadow: lite ? "none" : `0 0 7px ${group.accent}80`,
                    }} />
                  )}
                  <LinkIcon style={{ width: 12, height: 12, flexShrink: 0, opacity: active ? 0.85 : 0.5 }} />
                  <span style={{ flex: 1 }}>{link.label}</span>
                  {active && (
                    <div style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: group.accent, flexShrink: 0,
                      boxShadow: lite ? "none" : `0 0 5px ${group.accent}`,
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Group Icon Button ─────────────────────────────────────────────────────────

function GroupIconButton({
  group, activePath, isOpen, onOpen, onClose, onNavigate,
  lite, recencyTs, showKbHint,
}: {
  group: NavGroup; activePath: string; isOpen: boolean;
  onOpen: () => void; onClose: () => void; onNavigate: () => void;
  lite: boolean; recencyTs: number | undefined; showKbHint: boolean;
}) {
  const isGroupActive = group.links.some(l => activePath === l.to);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [closing, setClosing] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 2, left: r.right + 10 });
      setClosing(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!lite) {
      setClosing(true);
      animTimer.current = setTimeout(() => setClosing(false), 130);
    }
  }, [lite]);

  useEffect(() => {
    if (!isOpen) handleClose();
    return () => { if (animTimer.current) clearTimeout(animTimer.current); };
  }, [isOpen, handleClose]);

  const showPortal = isOpen || closing;
  const showHighlight = isGroupActive || isOpen;
  const opacity = showHighlight ? 1 : recencyOpacity(recencyTs);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onOpen();
    }, 120);

    if (!showHighlight && btnRef.current) {
      btnRef.current.style.color = "rgba(200,196,230,0.85)";
      btnRef.current.style.background = "rgba(255,255,255,0.05)";
      btnRef.current.style.opacity = "1";
    }
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 180);

    if (!showHighlight && btnRef.current) {
      btnRef.current.style.color = "rgba(148,140,195,0.55)";
      btnRef.current.style.background = "transparent";
      btnRef.current.style.opacity = String(opacity);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        title={group.title}
        onClick={onOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative",
          width: 40, height: 40,
          borderRadius: 11,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: lite ? "background 0.15s, color 0.15s" : "all 0.18s cubic-bezier(0.16,1,0.3,1)",
          opacity,
          color: showHighlight ? group.accent : "rgba(148,140,195,0.55)",
          background: showHighlight ? `${group.accent}14` : "transparent",
          boxShadow: lite ? "none" : isGroupActive
            ? `0 0 16px ${group.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
            : isOpen ? `0 0 10px ${group.glow}` : "none",
        }}
      >
        {/* Active indicator */}
        {isGroupActive && (
          <div style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 3, height: 20, borderRadius: "0 3px 3px 0",
            background: `linear-gradient(180deg, ${group.accent}, ${group.accent}aa)`,
            boxShadow: lite ? "none" : `0 0 10px ${group.accent}80, 0 0 4px ${group.accent}`,
          }} />
        )}

        {/* Open dot */}
        {isOpen && !isGroupActive && (
          <div style={{
            position: "absolute", top: 6, right: 6,
            width: 4, height: 4, borderRadius: "50%",
            background: group.accent,
            boxShadow: lite ? "none" : `0 0 5px ${group.accent}`,
          }} />
        )}

        {/* Keyboard shortcut hint */}
        {showKbHint && (
          <div style={{
            position: "absolute", bottom: 3, right: 3,
            width: 11, height: 11,
            borderRadius: 3,
            background: `${group.accent}20`,
            border: `1px solid ${group.accent}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 7, fontWeight: 800,
            color: group.accent, fontFamily: "monospace",
            lineHeight: 1,
          }}>
            {group.id === "planejamento" ? "P" :
             group.id === "financeiro" ? "F" :
             group.id === "canteiro" ? "C" : "O"}
          </div>
        )}

        <group.icon size={17} />
      </button>

      {showPortal && (
        <GroupPopoverPortal
          group={group}
          activePath={activePath}
          pos={pos}
          onNavigate={onNavigate}
          lite={lite}
          closing={closing}
          onMouseEnter={() => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
          }}
          onMouseLeave={() => {
            closeTimerRef.current = setTimeout(() => {
              onClose();
            }, 120);
          }}
        />
      )}
    </>
  );
}

// ─── Sidebar Icon Link (fixed items) ──────────────────────────────────────────

function SidebarIconLink({ to, label, icon: Icon, active, lite, accent = "#818CF8" }: {
  to: string; label: string; icon: React.ElementType;
  active: boolean; lite?: boolean; accent?: string;
}) {
  const btnRef = useRef<HTMLAnchorElement>(null);

  return (
    <>
      <Link
        ref={btnRef}
        to={to}
        title={label}
        style={{
          position: "relative",
          width: 40, height: 40,
          borderRadius: 11,
          display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: "none",
          transition: lite ? "background 0.15s, color 0.15s" : "all 0.18s cubic-bezier(0.16,1,0.3,1)",
          color: active ? "#AFA9EC" : "rgba(148,140,195,0.55)",
          background: active ? "rgba(83,74,183,0.15)" : "transparent",
          boxShadow: (active && !lite)
            ? "0 0 16px rgba(83,74,183,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "none",
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(200,196,230,0.85)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(148,140,195,0.55)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {active && (
          <div style={{
            position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
            width: 3, height: 20, borderRadius: "0 3px 3px 0",
            background: "linear-gradient(180deg, #818CF8, #534AB7aa)",
            boxShadow: lite ? "none" : "0 0 10px rgba(129,140,248,0.7), 0 0 4px rgba(83,74,183,0.8)",
          }} />
        )}
        <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
      </Link>
    </>
  );
}

// ─── Obra Selector ─────────────────────────────────────────────────────────────

function ObraSelector() {
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedObra = obras.find(o => o.id === selectedObraId) || obras[0];

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!obras.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-200 max-w-[220px] transition-all text-xs font-medium"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-[#818CF8]" />
        <span className="truncate">{selectedObra?.nome || "Selecionar obra"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500 ml-auto" />
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-50 w-72 rounded-xl overflow-hidden"
          style={{
            background: "rgba(14,12,24,0.97)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
          }}>
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Selecionar Obra</p>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.04]">
            {obras.map(obra => (
              <button key={obra.id}
                onClick={() => { setSelectedObraId(obra.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                style={selectedObraId === obra.id ? { background: "rgba(83,74,183,0.12)" } : undefined}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(83,74,183,0.15)", border: "1px solid rgba(129,140,248,0.2)" }}>
                  <Building2 className="h-3.5 w-3.5 text-[#818CF8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-100 truncate">{obra.nome}</p>
                  {obra.endereco && <p className="text-xs text-slate-500 truncate">{obra.endereco}</p>}
                </div>
                {selectedObraId === obra.id && <Check className="h-4 w-4 text-[#818CF8] shrink-0" />}
              </button>
            ))}
          </div>
          <div className="border-t border-white/[0.06] px-3 py-2">
            <button onClick={() => { setOpen(false); navigate("/obras"); }}
              className="w-full text-xs text-[#818CF8] hover:text-[#AFA9EC] transition-colors text-center">
              + Gerenciar todas as obras
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { company, isImpersonating, stopImpersonating } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggle: openPalette } = useCommandPalette();
  const { selectedObraId } = useObraSelection();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [liteMode, setLiteMode] = useState<boolean>(() => detectLiteMode());
  const [recency, setRecency] = useState<Record<string, number>>(() => loadRecency());
  const [showKbHint, setShowKbHint] = useState(false);
  const [kbBuffer, setKbBuffer] = useState('');
  const sidebarRef = useRef<HTMLElement>(null);

  // Progress ring — usa dados do cronograma da obra selecionada
  const { stats: cronoStats } = useCronograma(selectedObraId);
  const obraProgress = cronoStats?.progressoGeral ?? 0;

  // Fechar popover ao clicar fora
  useEffect(() => {
    if (!openGroupId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const portal = document.getElementById("sidebar-popover-portal");
      if (sidebarRef.current?.contains(target) || portal?.contains(target)) return;
      setOpenGroupId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openGroupId]);

  // ★ Atalhos de teclado G+letra
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Não disparar dentro de inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key.toLowerCase() === 'g') {
        setKbBuffer('G');
        setShowKbHint(true);
        setTimeout(() => { setKbBuffer(''); setShowKbHint(false); }, 1500);
        return;
      }
      if (kbBuffer === 'G') {
        const MAP: Record<string, string> = { p: 'planejamento', f: 'financeiro', c: 'canteiro', o: 'outros' };
        const groupId = MAP[e.key.toLowerCase()];
        if (groupId) {
          setOpenGroupId(prev => prev === groupId ? null : groupId);
          setKbBuffer('');
          setShowKbHint(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kbBuffer]);

  const handleNavigate = useCallback((groupId?: string) => {
    // Salvar recência do grupo navegado
    if (groupId) {
      setRecency(prev => {
        const next = { ...prev, [groupId]: Date.now() };
        saveRecency(next);
        return next;
      });
    }
    setOpenGroupId(null);
    setMoreMenuOpen(false);
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroupId(prev => prev === id ? null : id);
  }, []);

  const toggleLiteMode = useCallback(() => {
    setLiteMode(prev => {
      const next = !prev;
      try { localStorage.setItem('lastra_sidebar_lite', String(next)); } catch {}
      return next;
    });
  }, []);

  if (!user) return null;

  const userRole = user.role;
  const groups = getGroups(userRole);
  const currentLabel = ROUTE_LABELS[location.pathname] || location.pathname;
  const allLinks = groups.flatMap(g => g.links);
  const mobileTabRoutes = mobileTabs.filter(t => t.to !== "/_more").map(t => t.to);
  const moreLinks = allLinks.filter(l => !mobileTabRoutes.includes(l.to));
  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const isActiveRoute = (to: string) => {
    if (to === "/_more") return moreLinks.some(l => isActive(l.to)) || moreMenuOpen;
    return isActive(to);
  };

  const initials = user.name
    ? user.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "?";

  const activeGroup = groups.find(g => g.links.some(l => isActive(l.to)));

  return (
    <div className="min-h-screen bg-background">
      <style>{ANIM_CSS}</style>
      
      {/* ══ Banner de Impersonation ════════════════════════════════════════════ */}
      {isImpersonating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 99999, height: 32,
          background: '#B45309',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
            ⚠️ Impersonando: {company?.nome}
            — você está operando como esta empresa
          </span>
          <button
            onClick={stopImpersonating}
            style={{
              fontSize: 11, padding: '2px 10px',
              borderRadius: 4, border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)', color: 'white',
              cursor: 'pointer',
            }}
          >
            Sair da Impersonação
          </button>
        </div>
      )}

      <CommandPalette />
      <ModalFeedback origem="lastra" open={feedbackOpen} onOpenChange={setFeedbackOpen} />

      {/* ══ Desktop Sidebar ════════════════════════════════════════════ */}
      <aside
        ref={sidebarRef}
        className="hidden md:flex fixed left-0 top-0 h-screen flex-col z-50 w-[60px]"
        style={{
          background: liteMode
            ? "#0F0D1A"
            : "linear-gradient(180deg, #0F0D1A 0%, #0C0A16 50%, #0A0812 100%)",
          borderRight: "1px solid rgba(175,169,236,0.08)",
          boxShadow: (liteMode || !activeGroup)
            ? "4px 0 24px rgba(0,0,0,0.4)"
            : `inset -1px 0 0 ${activeGroup.accent}20, 4px 0 24px rgba(0,0,0,0.4)`,
          transition: "box-shadow 0.5s ease",
        }}
      >
        {/* ★ Logo com Progress Ring */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 56, flexShrink: 0,
          borderBottom: "1px solid rgba(175,169,236,0.07)",
          position: "relative",
        }}>
          <div style={{ position: "relative", width: 44, height: 44 }}>
            <ProgressRing progress={obraProgress} lite={liteMode} />
            {!liteMode && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(83,74,183,0.16) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
            )}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="26" height="28" viewBox="0 0 48 52" fill="none">
                <defs>
                  <mask id="lastra-cut">
                    <rect width="48" height="52" fill="white"/>
                    <path d="M 0 30 C 12 8, 24 40, 48 18" stroke="black" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                  </mask>
                </defs>
                <g mask="url(#lastra-cut)">
                  <rect x="4"  y="4"  width="8" height="36" rx="2" fill="#AFA9EC"/>
                  <rect x="15" y="4"  width="8" height="36" rx="2" fill="#AFA9EC" opacity=".85"/>
                  <rect x="26" y="18" width="8" height="22" rx="2" fill="#AFA9EC" opacity=".6"/>
                  <rect x="37" y="26" width="8" height="14" rx="2" fill="#AFA9EC" opacity=".4"/>
                  <rect x="4"  y="43" width="41" height="3"  rx="1.5" fill="#AFA9EC"/>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "10px 10px", gap: 2,
          overflowY: "auto", overflowX: "clip",
        }}>
          {userRole === "admin" && (
            <>
              <SidebarIconLink to="/admin" label="Admin Plataforma" icon={Shield}
                active={location.pathname.startsWith("/admin")} lite={liteMode} />
              <div style={{ width: 20, height: 1, background: "rgba(175,169,236,0.08)", margin: "4px 0" }} />
            </>
          )}

          {/* ★ Ícones fixos */}
          <SidebarIconLink 
            to="/obras" 
            label="Obras" 
            icon={Building2}
            active={isActive('/obras')}
            lite={liteMode}
          />
          <div style={{ width: 20, height: 1, background: 'rgba(175,169,236,0.1)', margin: '4px auto' }} />
          <SidebarIconLink 
            to="/dashboard" 
            label="Dashboard" 
            icon={LayoutDashboard}
            active={isActive('/dashboard')}
            lite={liteMode}
          />
          <SidebarIconLink 
            to="/painel" 
            label="Painel da Obra" 
            icon={Home}
            active={isActive('/painel')}
            lite={liteMode}
          />

          {/* Divisor */}
          <div style={{
            width: 24, height: 1,
            background: 'rgba(175,169,236,0.15)',
            margin: '6px auto',
            borderRadius: 1,
          }} />

          {/* Grupos colapsáveis */}
          {groups.map(group => (
            <GroupIconButton
              key={group.id}
              group={group}
              activePath={location.pathname}
              isOpen={openGroupId === group.id}
              onOpen={() => {
                setOpenGroupId(group.id);
                // Atualizar recência ao abrir
                setRecency(prev => {
                  const next = { ...prev, [group.id]: Date.now() };
                  saveRecency(next);
                  return next;
                });
              }}
              onClose={() => {
                setOpenGroupId(prev => prev === group.id ? null : prev);
              }}
              onNavigate={() => {
                handleNavigate(group.id);
              }}
              lite={liteMode}
              recencyTs={recency[group.id]}
              showKbHint={showKbHint}
            />
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(175,169,236,0.07)",
          padding: "8px 10px 14px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
          {/* Feedback */}
          <button
            onClick={() => setFeedbackOpen(true)}
            title="Enviar feedback"
            style={{
              width: 40, height: 36, borderRadius: 11,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(148,140,195,0.4)',
              background: 'transparent', transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(175,169,236,0.8)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(148,140,195,0.4)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <MessageSquare style={{ width: 14, height: 14, flexShrink: 0 }} />
          </button>

          <SidebarIconLink to="/configuracoes" label="Configurações" icon={Settings}
            active={isActive("/configuracoes")} lite={liteMode} />

          {/* Avatar */}
          <button
            onClick={() => navigate("/perfil")}
            title={user.name}
            style={{
              width: 40, height: 40, borderRadius: 11,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", transition: "background 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(135deg, #534AB7 0%, #818CF8 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "white",
              letterSpacing: "0.02em",
              boxShadow: liteMode
                ? "0 0 0 1.5px rgba(129,140,248,0.3)"
                : "0 0 0 1.5px rgba(129,140,248,0.35), 0 0 12px rgba(83,74,183,0.4)",
            }}>
              {(user as any).avatar_url ? (
                <img 
                  src={(user as any).avatar_url} 
                  alt={user.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { 
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <>{initials}</>
              )}
            </div>
          </button>

          {/* Toggle Lite/Standard */}
          <button
            onClick={toggleLiteMode}
            title={liteMode ? "Modo Standard" : "Modo Lite (hardware limitado)"}
            style={{
              width: 40, height: 26, borderRadius: 7,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              color: liteMode ? "rgba(175,169,236,0.35)" : "rgba(175,169,236,0.2)",
              fontSize: 8, fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(175,169,236,0.65)";
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = liteMode ? "rgba(175,169,236,0.35)" : "rgba(175,169,236,0.2)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {liteMode ? "LITE" : "STD"}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Sair da conta"
            style={{
              width: 40, height: 36, borderRadius: 11,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(148,140,195,0.3)",
              background: "transparent", transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.8)";
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(148,140,195,0.3)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <LogOut style={{ width: 14, height: 14, flexShrink: 0 }} />
          </button>
        </div>
      </aside>

      {/* ══ Desktop Top Header ════════════════════════════════════════════ */}
      <header
        className="hidden md:flex fixed top-0 right-0 z-40 h-14 items-center gap-3 px-5 left-[60px]"
        style={{
          background: liteMode ? "#0F0D1A" : "rgba(11,9,22,0.82)",
          backdropFilter: liteMode ? "none" : "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: liteMode ? "none" : "blur(20px) saturate(1.2)",
          borderBottom: "1px solid rgba(175,169,236,0.07)",
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span style={{ fontSize: 11, color: "rgba(148,140,195,0.4)", fontWeight: 500 }}>Lastra</span>
          <ChevronRight style={{ width: 11, height: 11, color: "rgba(148,140,195,0.22)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(220,217,245,0.88)" }} className="truncate">
            {currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ObraSelector />
          <button
            onClick={openPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(148,140,195,0.65)",
            }}
          >
            <Search style={{ width: 13, height: 13 }} />
            <span className="hidden lg:inline">Pesquisar</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] ml-1"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,140,195,0.45)" }}>
              ⌘K
            </kbd>
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* ══ Mobile Top Header ════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-4 gap-3"
        style={{ background: "#0F0D1A", borderBottom: "1px solid rgba(175,169,236,0.07)" }}>
        <div className="h-7 w-7 flex items-center justify-center shrink-0">
          <svg width="28" height="28" viewBox="0 0 48 52" fill="none">
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
        <button onClick={openPalette} className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(148,140,195,0.6)" }}>
          <Search className="h-4 w-4" />
        </button>
        <NotificationCenter />
      </header>

      {/* ══ Mobile More Overlay ════════════════════════════════════════════ */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setMoreMenuOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 rounded-t-2xl p-4 pb-6"
            style={{ background: "#13101F", borderTop: "1px solid rgba(175,169,236,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: "rgba(175,169,236,0.2)" }} />
            <div className="grid grid-cols-3 gap-2">
              {moreLinks.map(link => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link key={link.to} to={link.to} onClick={() => setMoreMenuOpen(false)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors"
                    style={{
                      background: active ? "rgba(83,74,183,0.15)" : "transparent",
                      color: active ? "#818CF8" : "rgba(148,140,195,0.6)",
                    }}>
                    <Icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ Mobile Bottom Nav ════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 flex items-stretch"
        style={{ background: "#0F0D1A", borderTop: "1px solid rgba(175,169,236,0.07)" }}>
        {mobileTabs.map(tab => {
          const Icon = tab.icon;
          const active = isActiveRoute(tab.to);
          if (tab.to === "/_more") {
            return (
              <button key={tab.to} onClick={() => setMoreMenuOpen(v => !v)}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                style={{ color: moreMenuOpen ? "#818CF8" : "rgba(148,140,195,0.45)" }}>
                <Icon className="h-5 w-5" />
                <span className="text-[11px]">{tab.label}</span>
              </button>
            );
          }
          return (
            <Link key={tab.to} to={tab.to} onClick={() => setMoreMenuOpen(false)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
              style={{ color: active ? "#818CF8" : "rgba(148,140,195,0.45)" }}>
              <Icon className="h-5 w-5" />
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ══ Main Content ════════════════════════════════════════════════ */}
      <main className={`pt-14 pb-16 md:pb-0 md:ml-[60px] ${isImpersonating ? 'md:pt-[88px] pt-[88px]' : 'md:pt-14'} h-screen overflow-auto`}>
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
