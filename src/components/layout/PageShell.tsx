/**
 * PageShell — componente canônico de infraestrutura de página.
 *
 * Desktop (≥640px):
 *   L1: 52px — ícone + título | abas | ações
 *   L2: KPI cards em flex-start (wrap)
 *   L3: Toolbar opcional
 *   L4: Conteúdo scrollável
 *
 * Mobile (<640px):
 *   L1a: 44px — ícone + título + ações como ícone
 *   L1b: 40px — abas em scroll horizontal (overflow-x auto)
 *   L2: KPI cards em carrossel horizontal com scroll-snap
 *   L3: Toolbar opcional (ocultar ou simplificar via prop)
 *   L4: Conteúdo scrollável
 *
 * Sticky: todo o header (L1+L2+L3) fica fixo no topo.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface PageTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string | null;
  badgeDanger?: boolean;
}

export interface PageKPI {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  /** Cor de fundo do card. Ex: '#F3F2FD' */
  tint?: string;
  /** Cor do valor. Ex: '#3C3489' */
  valueColor?: string;
  /** Cor do label. Ex: '#534AB7' */
  labelColor?: string;
  sublabel?: string;
  progress?: number;
  progressColor?: string;
  main?: boolean;
}

export interface PageActionSplitItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  separator?: boolean;
  labelRight?: string;
}

export interface PageAction {
  label: string;
  onClick: () => void;
  variant: 'primary' | 'ghost' | 'split';
  disabled?: boolean;
  tooltip?: string;
  splitItems?: PageActionSplitItem[];
}

export interface PageShellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  tabs?: PageTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Ações no header (desktop). Em mobile ficam como ícones ou via PageFAB. */
  actions?: PageAction[];
  /** Ações ao lado dos KPI cards. Renderiza na L2, à direita dos cards. */
  kpiActions?: PageAction[];
  /** KPI cards (L2). Omitir para ocultar. */
  kpis?: PageKPI[];
  /** Toolbar padronizada (L3). Omitir para ocultar. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

// ─── KPICardShell ────────────────────────────────────────────────────────────

function KPICardShell(kpi: PageKPI) {
  const {
    label, value, icon,
    tint, valueColor, labelColor,
    sublabel, progress, progressColor = '#534AB7',
    main = false,
  } = kpi;

  const bg = tint ?? 'var(--color-background-secondary)';
  const valColor = valueColor ?? 'var(--color-text-primary)';
  const lblColor = labelColor ?? 'var(--color-text-secondary)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      padding: '10px 14px',
      minHeight: 72,
      minWidth: 155,
      maxWidth: 230,
      flexShrink: 0,
      background: bg,
      borderRadius: 10,
      boxSizing: 'border-box',
      scrollSnapAlign: 'start',
      /* Destaque: borda sutil + sombra */
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04)',
    }}>
      {icon && (
        <div style={{
          width: 32, height: 32,
          borderRadius: 7,
          background: 'rgba(255,255,255,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: main ? 18 : 16,
          fontWeight: 600,
          lineHeight: 1.1,
          color: valColor,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 3,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 400,
          color: lblColor,
          lineHeight: 1.3,
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{
            fontSize: 10,
            color: lblColor,
            opacity: 0.8,
            marginTop: 2,
            lineHeight: 1.3,
          }}>
            {sublabel}
          </div>
        )}
        {progress !== undefined && (
          <div style={{
            marginTop: 6, height: 3, borderRadius: 2,
            background: 'rgba(0,0,0,0.08)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: progressColor,
              width: `${Math.min(100, Math.max(0, progress))}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SplitButton (desktop only) ──────────────────────────────────────────────

function SplitButton({ action }: { action: PageAction }) {
  const items = action.splitItems ?? [];
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        title={action.tooltip}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 30, padding: '0 12px',
          background: '#534AB7', color: '#fff',
          border: 'none', borderRadius: '6px 0 0 6px',
          fontSize: 12, fontWeight: 500,
          cursor: action.disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          opacity: action.disabled ? 0.5 : 1,
        }}
        onMouseEnter={e => { if (!action.disabled) (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#534AB7'; }}
      >
        {action.label}
      </button>
      <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={action.disabled}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 30, width: 28,
              background: '#534AB7', color: '#fff',
              border: 'none', borderRadius: '0 6px 6px 0',
              cursor: action.disabled ? 'not-allowed' : 'pointer',
              opacity: action.disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!action.disabled) (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#534AB7'; }}
          >
            <ChevronDown style={{ width: 14, height: 14 }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ minWidth: 160 }}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.icon && <span style={{ lineHeight: 0, flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.labelRight && (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {item.labelRight}
                  </span>
                )}
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── PageShell ───────────────────────────────────────────────────────────────

export default function PageShell({
  icon, title, subtitle,
  tabs = [], activeTab, onTabChange,
  actions = [],
  kpiActions,
  kpis,
  toolbar,
  children,
}: PageShellProps) {
  const [kpisCollapsed, setKpisCollapsed] = React.useState(false);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--color-background-primary)',
    }}>

      {/* ── STICKY HEADER (L1 + L2 + L3) ──────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column',
        /* Superfície lilac-tinted claramente distinta do conteúdo branco */
        background: '#F0EFF8',
        /* Linha de divisão nítida entre header e conteúdo */
        boxShadow: '0 2px 0 #DDD8F7, 0 4px 16px rgba(83,74,183,0.08)',
      }}>

        {/* ── L1 DESKTOP: ícone + título | abas | ações ──────────────── */}
        {/* Visível apenas em sm+ via CSS */}
        <div className="hidden sm:flex" style={{
          alignItems: 'center',
          height: 52,
          background: 'transparent', // herda do container sticky
          padding: '0 20px', gap: 0,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>

          {/* Ícone + Título */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0, paddingRight: 16,
            borderRight: '1px solid var(--color-border-tertiary)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#EEEDFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{
                fontSize: 15, fontWeight: 500,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
              }}>
                {title}
              </span>
              {subtitle && (
                <span style={{
                  fontSize: 11, fontWeight: 400,
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Abas — underline roxo na ativa */}
          <div style={{
            display: 'flex', alignItems: 'flex-end',
            height: '100%', flex: 1, gap: 0,
            padding: '0 4px 0 16px',
            minWidth: 0, overflow: 'hidden',
          }}>
            {tabs && tabs.length > 0 && tabs.map(tab => {
              const isAct = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13,
                    padding: '0 16px',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isAct ? '2.5px solid #534AB7' : '2.5px solid transparent',
                    color: isAct ? '#534AB7' : 'var(--color-text-secondary)',
                    fontWeight: isAct ? 500 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    top: '1px',
                    transition: 'color 0.15s, border-color 0.15s',
                    outline: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isAct) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={e => {
                    if (!isAct) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                  }}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge != null && (
                    <span style={{
                      fontSize: 10, padding: '1px 6px',
                      borderRadius: 10, fontWeight: 500,
                      background: tab.badgeDanger ? '#FCEBEB' : 'var(--color-background-secondary)',
                      color: tab.badgeDanger ? '#A32D2D' : 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ações desktop e toggle de KPIs */}
          {(actions.length > 0 || (kpis && kpis.length > 0)) && (
            <div style={{
              display: 'flex', alignItems: 'center',
              gap: 8, flexShrink: 0,
              paddingLeft: 16,
              borderLeft: '1px solid var(--color-border-tertiary)',
            }}>
              {actions?.map((action, i) => {
                if (action.variant === 'ghost') {
                  return (
                    <button
                      key={i}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      title={action.tooltip}
                      style={{
                        display: 'flex', alignItems: 'center',
                        height: 28, padding: '0 12px',
                        border: '0.5px solid #AFA9EC',
                        background: 'transparent', color: '#3C3489',
                        borderRadius: 6, fontSize: 12, fontWeight: 500,
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: action.disabled ? 0.5 : 1,
                      }}
                    >
                      {action.label}
                    </button>
                  );
                }
                if (action.variant === 'primary') {
                  return (
                    <button
                      key={i}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      title={action.tooltip}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        height: 28, padding: '0 12px',
                        background: '#534AB7', color: '#fff',
                        border: 'none', borderRadius: 6,
                        fontSize: 12, fontWeight: 500,
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: action.disabled ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (!action.disabled) (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#534AB7'; }}
                    >
                      {action.label}
                    </button>
                  );
                }
                if (action.variant === 'split') {
                  return <SplitButton key={i} action={action} />;
                }
                return null;
              })}
              
              {kpis && kpis.length > 0 && (
                <>
                  <div style={{ width: 1, height: 20, background: 'var(--color-border-tertiary)', margin: '0 4px' }} />
                  <button
                    onClick={() => setKpisCollapsed(!kpisCollapsed)}
                    title={kpisCollapsed ? "Expandir KPIs" : "Recolher KPIs"}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 28, width: 28,
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      border: 'none', borderRadius: 6,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-background-secondary)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <ChevronDown style={{ width: 16, height: 16, transform: kpisCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── L1 MOBILE: linha 1 — ícone + título + ação primária ───── */}
        <div className="flex sm:hidden" style={{
          alignItems: 'center',
          height: 48,
          background: 'transparent', // herda do container sticky
          padding: '0 16px',
          gap: 10,
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#EEEDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 15, fontWeight: 500,
              color: 'var(--color-text-primary)',
              display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title}
            </span>
            {subtitle && (
              <span style={{
                fontSize: 10, fontWeight: 400,
                color: 'var(--color-text-secondary)',
                display: 'block', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {subtitle}
              </span>
            )}
          </div>

          {/* Em mobile: apenas ghost actions aparecem — primary/split vai via PageFAB */}
          {actions.filter(a => a.variant === 'ghost').map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              title={action.tooltip}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 32, width: 32,
                border: '0.5px solid var(--color-border-secondary)',
                background: 'transparent',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              {/* ícone genérico de exportar — 3 linhas */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          ))}
          
          {kpis && kpis.length > 0 && (
            <button
              onClick={() => setKpisCollapsed(!kpisCollapsed)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 32, width: 32,
                border: '0.5px solid var(--color-border-secondary)',
                background: 'transparent', borderRadius: 6,
                cursor: 'pointer', color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}
            >
              <ChevronDown style={{ width: 16, height: 16, transform: kpisCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
          )}
        </div>

        {/* ── L1 MOBILE: linha 2 — abas em scroll horizontal ────────── */}
        <div
          className="flex sm:hidden"
          style={{
            height: 40,
            background: 'transparent', // herda do container sticky
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            height: '100%',
            padding: '0 4px',
            gap: 0,
            minWidth: 'max-content',
          }}>
            {tabs && tabs.length > 0 && tabs.map(tab => {
              const isAct = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: isAct ? 500 : 400,
                    padding: '0 14px',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isAct ? '2.5px solid #534AB7' : '2.5px solid transparent',
                    color: isAct ? '#534AB7' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    top: '1px',
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: 44, // iOS HIG touch target
                  } as React.CSSProperties}
                >
                  {tab.label}
                  {tab.badge != null && (
                    <span style={{
                      fontSize: 9, padding: '0px 5px',
                      borderRadius: 10, fontWeight: 500,
                      background: tab.badgeDanger ? '#FCEBEB' : 'var(--color-background-secondary)',
                      color: tab.badgeDanger ? '#A32D2D' : 'var(--color-text-secondary)',
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Ocultar scrollbar webkit */}
          <style>{`.ps-tabs-mobile::-webkit-scrollbar { display: none; }`}</style>
        </div>

        {/* ── L2 — KPI Row + Actions ───────────────────────────────────── */}
        {!kpisCollapsed && ((kpis && kpis.length > 0) || (kpiActions && kpiActions.length > 0)) ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px 14px',
              background: 'transparent', // herda do container sticky
              borderTop: '0.5px solid var(--color-border-tertiary)',
              borderBottom: '1px solid var(--color-border-secondary)',
              flexShrink: 0,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            } as React.CSSProperties}
          >
            {/* KPI Cards (scrollable) */}
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', flex: 1, minWidth: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="ps-kpi-scroll">
              {kpis && kpis.map(kpi => (
                <KPICardShell key={kpi.id} {...kpi} />
              ))}
            </div>

            {/* Actions Section — à direita dos KPI cards */}
            {kpiActions && kpiActions.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
                paddingLeft: 10,
                borderLeft: '1px solid var(--color-border-tertiary)',
              }}>
                {kpiActions.map((action, i) => {
                  if (action.variant === 'ghost') {
                    return (
                      <button
                        key={i}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        title={action.tooltip}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 28,
                          padding: '0 12px',
                          border: '0.5px solid #AFA9EC',
                          background: 'transparent',
                          color: '#3C3489',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: action.disabled ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: action.disabled ? 0.5 : 1,
                        }}
                      >
                        {action.label}
                      </button>
                    );
                  }
                  if (action.variant === 'primary') {
                    return (
                      <button
                        key={i}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        title={action.tooltip}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 28,
                          padding: '0 12px',
                          background: '#534AB7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: action.disabled ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: action.disabled ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!action.disabled) (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#534AB7'; }}
                      >
                        {action.label}
                      </button>
                    );
                  }
                  if (action.variant === 'split') {
                    return <SplitButton key={i} action={action} />;
                  }
                  return null;
                })}
              </div>
            )}

            <style>{`
              .ps-kpi-scroll::-webkit-scrollbar { display: none; }
            `}</style>
          </div>
        ) : null}

        {/* ── L3 — Toolbar ───────────────────────────────────────────── */}
        {toolbar && (
          <div style={{
            display: 'flex', alignItems: 'center',
            minHeight: 44, padding: '0 20px', gap: 8,
            background: 'var(--color-background-secondary)',
            borderBottom: '1px solid var(--color-border-secondary)',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            {toolbar}
          </div>
        )}
      </div>

      {/* ── L4 — Conteúdo ──────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}
