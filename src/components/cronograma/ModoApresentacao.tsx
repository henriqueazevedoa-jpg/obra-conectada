/**
 * ModoApresentacao — Modo Fullscreen para o Cronograma
 *
 * Bloco 3: SPRINT-E (CRON-B)
 * Portal sobre document.body que remove toda a chrome da app
 * e exibe apenas o Gantt + KPIs no topo.
 * ESC para sair, ← → navegam entre tarefas destacadas.
 */

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, AlertTriangle, CheckCircle2, TrendingUp, BarChart3,
  ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import type { CronogramaTarefa } from '@/hooks/useCronograma';
import GanttCanvasPanel, { computeCriticalPath } from '@/components/cronograma/GanttCanvasPanel';
import type { CronogramaDependencia } from '@/hooks/useCronograma';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ModoApresentacaoProps {
  tarefas: CronogramaTarefa[];
  dependencias: CronogramaDependencia[];
  obraNome: string;
  progressoGeral: number;
  tasksAtrasadas: number;
  spi: number | null;
  onClose: () => void;
}

// ── KPI Badge ─────────────────────────────────────────────────────────────────

function KpiBadge({ icon, label, value, color, bg }: {
  icon: React.ReactNode; label: string; value: string; color: string; bg: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 18px',
      background: bg,
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {icon}
      <div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

// ── Inner Component ────────────────────────────────────────────────────────────

function ModoApresentacaoInner({
  tarefas, dependencias, obraNome, progressoGeral, tasksAtrasadas, spi, onClose,
}: ModoApresentacaoProps) {
  const [selectedTarefaId, setSelectedTarefaId] = useState<string | null>(null);

  const tarefasDestacadas = tarefas.filter(t =>
    t.tipo_tarefa === 'PADRAO' && t.data_inicio && t.data_fim,
  );
  const currentIdx = tarefasDestacadas.findIndex(t => t.id === selectedTarefaId);

  const goNext = useCallback(() => {
    if (tarefasDestacadas.length === 0) return;
    const next = (currentIdx + 1) % tarefasDestacadas.length;
    setSelectedTarefaId(tarefasDestacadas[next].id);
  }, [currentIdx, tarefasDestacadas]);

  const goPrev = useCallback(() => {
    if (tarefasDestacadas.length === 0) return;
    const prev = currentIdx <= 0 ? tarefasDestacadas.length - 1 : currentIdx - 1;
    setSelectedTarefaId(tarefasDestacadas[prev].id);
  }, [currentIdx, tarefasDestacadas]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  // ── Compute prazo total ────────────────────────────────────────────────────
  const dataInicio = tarefas
    .filter(t => t.data_inicio)
    .map(t => new Date(t.data_inicio!).getTime());
  const dataFim = tarefas
    .filter(t => t.data_fim)
    .map(t => new Date(t.data_fim!).getTime());

  const prazoTotalDias = dataInicio.length > 0 && dataFim.length > 0
    ? Math.ceil((Math.max(...dataFim) - Math.min(...dataInicio)) / (1000 * 60 * 60 * 24))
    : null;

  const criticalIds = computeCriticalPath(tarefas, dependencias);
  const childrenOf = (pid: string) => tarefas.filter(t => t.parent_tarefa_id === pid).sort((a, b) => a.ordem - b.ordem);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0F0F14',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 24px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <BarChart3 style={{ width: 18, height: 18, color: '#AFA9EC' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
            {obraNome}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
            — Modo Apresentação
          </span>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {prazoTotalDias !== null && (
            <KpiBadge
              icon={<CalendarDays style={{ width: 16, height: 16, color: '#AFA9EC' }} />}
              label="Prazo total"
              value={`${prazoTotalDias}d`}
              color="#fff"
              bg="rgba(83,74,183,0.25)"
            />
          )}
          <KpiBadge
            icon={<TrendingUp style={{ width: 16, height: 16, color: '#AFA9EC' }} />}
            label="Progresso"
            value={`${progressoGeral}%`}
            color="#AFA9EC"
            bg="rgba(83,74,183,0.2)"
          />
          {tasksAtrasadas > 0 ? (
            <KpiBadge
              icon={<AlertTriangle style={{ width: 16, height: 16, color: '#F87171' }} />}
              label="Em atraso"
              value={String(tasksAtrasadas)}
              color="#F87171"
              bg="rgba(248,113,113,0.12)"
            />
          ) : (
            <KpiBadge
              icon={<CheckCircle2 style={{ width: 16, height: 16, color: '#86EFAC' }} />}
              label="Em atraso"
              value="0"
              color="#86EFAC"
              bg="rgba(134,239,172,0.12)"
            />
          )}
          {spi !== null && (
            <KpiBadge
              icon={<BarChart3 style={{ width: 16, height: 16, color: spi >= 1 ? '#86EFAC' : spi >= 0.8 ? '#FCD34D' : '#F87171' }} />}
              label="SPI"
              value={`${spi.toFixed(2)} ${spi >= 1 ? '↑' : '↓'}`}
              color={spi >= 1 ? '#86EFAC' : spi >= 0.8 ? '#FCD34D' : '#F87171'}
              bg={spi >= 1 ? 'rgba(134,239,172,0.12)' : spi >= 0.8 ? 'rgba(252,211,77,0.12)' : 'rgba(248,113,113,0.12)'}
            />
          )}
        </div>

        {/* Nav tarefas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
          <button
            onClick={goPrev}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer', color: '#fff' }}
            title="Tarefa anterior (←)"
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 50, textAlign: 'center' }}>
            {tarefasDestacadas.length > 0
              ? `${Math.max(0, currentIdx) + 1}/${tarefasDestacadas.length}`
              : '—'}
          </span>
          <button
            onClick={goNext}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, cursor: 'pointer', color: '#fff' }}
            title="Próxima tarefa (→)"
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Fechar */}
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, cursor: 'pointer', color: '#F87171', fontSize: 12, fontWeight: 500 }}
          title="Sair (ESC)"
        >
          <X style={{ width: 13, height: 13 }} />
          ESC
        </button>
      </div>

      {/* Gantt fullscreen */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GanttCanvasPanel
          tarefas={tarefas}
          dependencias={dependencias}
          selectedId={selectedTarefaId}
          onSelectTarefa={setSelectedTarefaId}
          onOpenDrawer={() => {}}
          childrenOf={childrenOf}
          onUpdateDates={() => {}}
          onAddDependencia={async () => {}}
        />
      </div>
    </div>
  );
}

// ── Portal Wrapper ─────────────────────────────────────────────────────────────

export default function ModoApresentacao(props: ModoApresentacaoProps) {
  return createPortal(<ModoApresentacaoInner {...props} />, document.body);
}
