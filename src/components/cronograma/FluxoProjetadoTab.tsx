/**
 * FluxoProjetadoTab — Aba de Fluxo de Caixa Projetado
 *
 * Bloco 5: SPRINT-E (CRON-B)
 * Exibe distribuição mensal do orçamento baseada nas datas das tarefas.
 * Sobrepõe custo real vindo dos pagamentos agrupados por mês.
 * Curva S acumulada como linha sobreposta.
 */

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Info, ArrowRight } from 'lucide-react';
import { useFluxoCaixaProjetado } from '@/hooks/useFluxoCaixaProjetado';

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const previsto = payload.find((p: any) => p.dataKey === 'previsto')?.value ?? 0;
  const realizado = payload.find((p: any) => p.dataKey === 'realizado')?.value ?? 0;
  const accPrev = payload.find((p: any) => p.dataKey === 'acumuladoPrevisto')?.value ?? 0;
  const accReal = payload.find((p: any) => p.dataKey === 'acumuladoRealizado')?.value ?? 0;

  return (
    <div style={{
      background: 'var(--color-background-secondary)',
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      minWidth: 200,
    }}>
      <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--color-text-primary)' }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Previsto" value={fmt(previsto)} color="#534AB7" />
        {realizado > 0 && <Row label="Realizado" value={fmt(realizado)} color="#3B6D11" />}
        <div style={{ borderTop: '1px solid var(--color-border-secondary)', margin: '4px 0' }} />
        <Row label="Acum. Previsto" value={fmt(accPrev)} color="#8B7FE8" />
        {accReal > 0 && <Row label="Acum. Realizado" value={fmt(accReal)} color="#60A830" />}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '60px 32px', textAlign: 'center',
      background: 'var(--color-background-secondary)', borderRadius: 16,
      border: '1px dashed var(--color-border-secondary)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(83,74,183,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TrendingUp style={{ width: 22, height: 22, color: '#534AB7' }} />
      </div>
      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', margin: 0 }}>
        Nenhuma tarefa com datas cadastradas
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
        Adicione datas de início e fim às tarefas do cronograma para visualizar a distribuição financeira ao longo do projeto.
      </p>
    </div>
  );
}

function SemRealizadoBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: 'rgba(83,74,183,0.04)',
      border: '1px solid rgba(83,74,183,0.15)',
      borderRadius: 10, marginBottom: 20,
    }}>
      <Info style={{ width: 14, height: 14, color: '#534AB7', flexShrink: 0 }} />
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
        Custo realizado indisponível. Registre pagamentos no módulo{' '}
        <strong style={{ color: 'var(--color-text-primary)' }}>Financeiro</strong> para comparar previsto vs realizado.
      </p>
      <ArrowRight style={{ width: 12, height: 12, color: '#534AB7', flexShrink: 0, marginLeft: 'auto' }} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface FluxoProjetadoTabProps {
  obraId: string;
}

export default function FluxoProjetadoTab({ obraId }: FluxoProjetadoTabProps) {
  const { fluxo, temDadosRealizados } = useFluxoCaixaProjetado(obraId);

  if (fluxo.length === 0) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <EmptyState />
      </div>
    );
  }

  const totalPrevisto = fluxo[fluxo.length - 1]?.acumuladoPrevisto ?? 0;
  const totalRealizado = fluxo[fluxo.length - 1]?.acumuladoRealizado ?? 0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingUp style={{ width: 16, height: 16, color: '#534AB7' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Fluxo de Caixa Projetado — Curva S Financeira
        </span>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        <KpiCard
          label="Previsto total"
          value={fmt(totalPrevisto)}
          icon={<DollarSign style={{ width: 14, height: 14, color: '#534AB7' }} />}
          tint="rgba(83,74,183,0.06)"
          valueColor="#3C3489"
        />
        {temDadosRealizados && (
          <KpiCard
            label="Realizado total"
            value={fmt(totalRealizado)}
            icon={<DollarSign style={{ width: 14, height: 14, color: '#3B6D11' }} />}
            tint="rgba(59,109,17,0.06)"
            valueColor="#3B6D11"
          />
        )}
        {temDadosRealizados && (
          <KpiCard
            label="Desvio acumulado"
            value={fmt(Math.abs(totalRealizado - totalPrevisto))}
            sublabel={totalRealizado <= totalPrevisto ? 'dentro do previsto' : 'acima do previsto'}
            icon={<TrendingUp style={{ width: 14, height: 14, color: totalRealizado <= totalPrevisto ? '#3B6D11' : '#A32D2D' }} />}
            tint={totalRealizado <= totalPrevisto ? 'rgba(59,109,17,0.06)' : 'rgba(163,45,45,0.06)'}
            valueColor={totalRealizado <= totalPrevisto ? '#3B6D11' : '#A32D2D'}
          />
        )}
      </div>

      {/* Banner sem realizado */}
      {!temDadosRealizados && <SemRealizadoBanner />}

      {/* Chart */}
      <div style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 14,
        border: '1px solid var(--color-border-secondary)',
        padding: '24px 20px 16px',
      }}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={fluxo} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" opacity={0.6} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={72} />
            <RechartTooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
              formatter={(value: string) => ({
                previsto: 'Previsto mensal',
                realizado: 'Realizado mensal',
                acumuladoPrevisto: 'Curva S prevista',
                acumuladoRealizado: 'Curva S realizada',
              }[value] ?? value)}
            />
            <Bar dataKey="previsto" fill="#534AB7" opacity={0.8} radius={[4, 4, 0, 0]} barSize={22} />
            {temDadosRealizados && (
              <Bar dataKey="realizado" fill="#3B6D11" opacity={0.75} radius={[4, 4, 0, 0]} barSize={22} />
            )}
            <Line dataKey="acumuladoPrevisto" type="monotone" stroke="#8B7FE8" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
            {temDadosRealizados && (
              <Line dataKey="acumuladoRealizado" type="monotone" stroke="#60A830" strokeWidth={2.5} dot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 12,
        border: '1px solid var(--color-border-secondary)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--color-background-tertiary,rgba(0,0,0,0.04))' }}>
              {(['Mês', 'Previsto', ...(temDadosRealizados ? ['Realizado'] : []), 'Acum. Previsto', ...(temDadosRealizados ? ['Acum. Realizado'] : [])]).map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Mês' ? 'left' : 'right', fontWeight: 600, fontSize: 11, color: 'var(--color-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fluxo.map((row, i) => (
              <tr key={row.mesKey} style={{ borderTop: '1px solid var(--color-border-secondary)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                <td style={{ padding: '8px 14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.mes}</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', color: '#534AB7', fontWeight: 500 }}>{fmt(row.previsto)}</td>
                {temDadosRealizados && (
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: row.realizado > 0 ? '#3B6D11' : 'var(--color-text-secondary)' }}>
                    {row.realizado > 0 ? fmt(row.realizado) : '—'}
                  </td>
                )}
                <td style={{ padding: '8px 14px', textAlign: 'right', color: '#8B7FE8', fontWeight: 500 }}>{fmt(row.acumuladoPrevisto)}</td>
                {temDadosRealizados && (
                  <td style={{ padding: '8px 14px', textAlign: 'right', color: row.acumuladoRealizado > 0 ? '#60A830' : 'var(--color-text-secondary)' }}>
                    {row.acumuladoRealizado > 0 ? fmt(row.acumuladoRealizado) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KPI Card Helper ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sublabel, icon, tint, valueColor }: {
  label: string; value: string; sublabel?: string; icon: React.ReactNode; tint: string; valueColor: string;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0, padding: '14px 16px',
      background: tint, borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: valueColor }}>{value}</span>
      {sublabel && <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{sublabel}</span>}
    </div>
  );
}
