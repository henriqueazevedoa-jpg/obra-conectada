/**
 * AdminDashboardPage — Dashboard de Analytics para Super Admins
 *
 * Métricas globais da plataforma:
 * - KPIs: total de empresas, obras, usuários, add-ons
 * - Distribuição de status das empresas
 * - Breakdown por plano
 * - Tabela de empresas mais ativas (obras + usuários)
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useNavigate } from 'react-router-dom';
import {
  Building2, HardHat, Users, Puzzle,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  ArrowRight, Package,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string;
  nome: string;
  status: string;
  plan_id: string | null;
  plan_nome: string;
  obra_count: number;
  user_count: number;
  addon_count: number;
}

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  suspendedCompanies: number;
  inactiveCompanies: number;
  totalObras: number;
  totalUsers: number;
  totalAddons: number;
  byPlan: Record<string, number>;
  topCompanies: CompanyRow[];
}

const emptyStats: PlatformStats = {
  totalCompanies: 0, activeCompanies: 0, trialCompanies: 0,
  suspendedCompanies: 0, inactiveCompanies: 0,
  totalObras: 0, totalUsers: 0, totalAddons: 0,
  byPlan: {}, topCompanies: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNumber(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ativo:     { label: 'Ativo',      color: '#15803D', bg: '#DCFCE7', icon: <CheckCircle2 size={14} /> },
  teste:     { label: 'Trial',      color: '#1D4ED8', bg: '#DBEAFE', icon: <Clock size={14} /> },
  suspenso:  { label: 'Suspenso',   color: '#B91C1C', bg: '#FEE2E2', icon: <AlertCircle size={14} /> },
  inativo:   { label: 'Inativo',    color: '#6B7280', bg: '#F3F4F6', icon: <AlertCircle size={14} /> },
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, tint = '#F3F2FD', iconColor = '#4F46E5',
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; tint?: string; iconColor?: string;
}) {
  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      border: '1px solid var(--color-border-primary)',
      borderRadius: 14, padding: '20px 22px',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: tint, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
          {formatNumber(Number(value))}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0 0', fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

function StatusBar({ stats }: { stats: PlatformStats }) {
  const total = stats.totalCompanies || 1;
  const segments = [
    { key: 'ativo',    count: stats.activeCompanies    },
    { key: 'teste',    count: stats.trialCompanies     },
    { key: 'suspenso', count: stats.suspendedCompanies },
    { key: 'inativo',  count: stats.inactiveCompanies  },
  ].filter(s => s.count > 0);

  return (
    <div style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: 14, padding: '20px 22px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 14px' }}>Status das Empresas</p>
      
      {/* Bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 100, overflow: 'hidden', gap: 2, marginBottom: 16 }}>
        {segments.map(s => {
          const meta = STATUS_META[s.key];
          return (
            <div key={s.key} style={{ flex: s.count / total, background: meta.color, minWidth: 4, borderRadius: 100, transition: 'flex 0.4s' }} />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
        {segments.map(s => {
          const meta = STATUS_META[s.key];
          const pct = Math.round((s.count / total) * 100);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {meta.label} <strong style={{ color: 'var(--color-text-primary)' }}>{s.count}</strong>
                <span style={{ color: 'var(--color-text-tertiary)' }}> ({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanBreakdown({ byPlan }: { byPlan: Record<string, number> }) {
  const entries = Object.entries(byPlan).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);
  const PLAN_COLORS = ['#4F46E5', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div style={{ background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: 14, padding: '20px 22px' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Distribuição por Plano</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0
          ? <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Nenhum dado de plano disponível.</p>
          : entries.map(([plan, count], i) => (
            <div key={plan}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{plan}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 100, background: 'var(--color-background-tertiary,rgba(0,0,0,0.06))' }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  width: `${(count / max) * 100}%`,
                  background: PLAN_COLORS[i % PLAN_COLORS.length],
                  transition: 'width 0.4s',
                }} />
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: companies },
        { data: plans },
        { data: addons },
      ] = await Promise.all([
        (supabase as any).from('companies').select('id, nome, status, plan_id'),
        (supabase as any).from('plans').select('id, slug, nome_comercial'),
        (supabase as any).from('company_addons').select('id, company_id, status').neq('status', 'inactive'),
      ]);

      if (!companies) { setLoading(false); return; }

      // Build plan lookup
      const planMap: Record<string, string> = {};
      for (const p of (plans || []) as any[]) {
        planMap[p.id] = p.nome_comercial || p.slug;
      }

      // Fetch counts for each company in parallel batches
      const enriched: CompanyRow[] = [];
      await Promise.all(
        (companies as any[]).map(async (c) => {
          const [
            { count: obras },
            { count: users },
          ] = await Promise.all([
            (supabase as any).from('obras').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
            (supabase as any).from('user_roles').select('id', { count: 'exact', head: true }).eq('company_id', c.id),
          ]);
          enriched.push({
            id: c.id,
            nome: c.nome,
            status: c.status,
            plan_id: c.plan_id,
            plan_nome: c.plan_id ? (planMap[c.plan_id] || '—') : '—',
            obra_count: obras || 0,
            user_count: users || 0,
            addon_count: ((addons || []) as any[]).filter((a: any) => a.company_id === c.id).length,
          });
        })
      );

      // Compute aggregates
      const byPlan: Record<string, number> = {};
      for (const c of enriched) {
        const planName = c.plan_nome === '—' ? 'Sem Plano' : c.plan_nome;
        byPlan[planName] = (byPlan[planName] || 0) + 1;
      }

      setStats({
        totalCompanies: enriched.length,
        activeCompanies:    enriched.filter(c => c.status === 'ativo').length,
        trialCompanies:     enriched.filter(c => c.status === 'teste').length,
        suspendedCompanies: enriched.filter(c => c.status === 'suspenso').length,
        inactiveCompanies:  enriched.filter(c => c.status === 'inativo').length,
        totalObras: enriched.reduce((s, c) => s + c.obra_count, 0),
        totalUsers: enriched.reduce((s, c) => s + c.user_count, 0),
        totalAddons: ((addons || []) as any[]).length,
        byPlan,
        topCompanies: [...enriched]
          .sort((a, b) => (b.obra_count + b.user_count) - (a.obra_count + a.user_count))
          .slice(0, 8),
      });
    } catch (e) {
      console.error('AdminDashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.2s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <TrendingUp size={20} color="#4F46E5" />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Dashboard</h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Visão consolidada de toda a plataforma
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            borderRadius: 8, border: '1px solid var(--color-border-primary)',
            background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard icon={<Building2 size={18} />} label="Empresas" value={stats.totalCompanies}
          sub={`${stats.activeCompanies} ativas`} tint="#EEF2FF" iconColor="#4338CA" />
        <KpiCard icon={<HardHat size={18} />} label="Obras" value={stats.totalObras}
          tint="#F0FDF4" iconColor="#15803D" />
        <KpiCard icon={<Users size={18} />} label="Usuários" value={stats.totalUsers}
          sub="gestores + equipes" tint="#FFF7ED" iconColor="#C2410C" />
        <KpiCard icon={<Puzzle size={18} />} label="Add-ons Ativos" value={stats.totalAddons}
          tint="#FDF4FF" iconColor="#7C3AED" />
      </div>

      {/* Status + Plan row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <StatusBar stats={stats} />
        <PlanBreakdown byPlan={stats.byPlan} />
      </div>

      {/* Top Companies table */}
      <div style={{
        background: 'var(--color-background-secondary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--color-border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            Empresas Mais Ativas
          </p>
          <button
            onClick={() => navigate('/admin/companies')}
            style={{
              fontSize: 11, fontWeight: 600, color: '#4F46E5', background: 'transparent',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: 0,
            }}
          >
            Ver todas <ArrowRight size={11} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #4F46E5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : stats.topCompanies.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                  {['Empresa', 'Status', 'Plano', 'Obras', 'Usuários', 'Add-ons', ''].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.topCompanies.map((c, i) => {
                  const statusMeta = STATUS_META[c.status] || STATUS_META['inativo'];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/admin/companies/${c.id}`)}
                      style={{
                        borderBottom: i < stats.topCompanies.length - 1 ? '1px solid var(--color-border-primary)' : 'none',
                        cursor: 'pointer', transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-tertiary,rgba(0,0,0,0.03))')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '11px 16px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.nome}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                          background: statusMeta.bg, color: statusMeta.color,
                        }}>
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', color: 'var(--color-text-secondary)' }}>{c.plan_nome}</td>
                      <td style={{ padding: '11px 16px', color: 'var(--color-text-primary)', fontWeight: 600, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Package size={11} color="#6B7280" /> {c.obra_count}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', color: 'var(--color-text-primary)', fontWeight: 600, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Users size={11} color="#6B7280" /> {c.user_count}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>{c.addon_count}</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                        <ArrowRight size={13} color="#9CA3AF" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
