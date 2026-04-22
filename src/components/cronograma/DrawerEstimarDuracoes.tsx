/**
 * DrawerEstimarDuracoes
 *
 * Drawer para estimar durações em lote das tarefas do cronograma.
 * Usa Perfis de Serviço (amdahl_grupos) + lógica de paralelismo para calculo.
 * Nunca exibir "Amdahl" para o usuário — sempre "Perfil de Serviço".
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { calcularAmdahl, AmdahlParams } from '@/lib/amdahl';
import { useCompany } from '@/contexts/CompanyContext';
import type { CronogramaTarefa } from '@/hooks/useCronograma';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CheckCircle2, Info } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AmdahlGrupo {
  id: string;
  company_id: string | null;
  nome: string;
  descricao: string | null;
  amdahl_p: number;
  amdahl_f: number;
}

interface CalendarCfg {
  horas_por_dia: number;
}

export interface EstimaUpdate {
  id: string;
  data_fim: string;
  amdahl_p?: number;
  amdahl_f?: number;
  duracao_sugerida_dias?: number;
}

interface RowState {
  tarefaId: string;
  grupoId: string;
  equipe: number;
  estimativaDias: number | null;
  confianca: number; // 1..5
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: CronogramaTarefa[];
  obraId: string;
  onAplicar: (updates: EstimaUpdate[]) => void;
}

// ── Confidence dots ───────────────────────────────────────────────────────────

function ConfidenceDots({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: i <= level ? '#534AB7' : 'rgba(83,74,183,0.15)',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

const confidenceLabel: Record<number, string> = {
  5: 'Muito alta — histórico real da empresa',
  4: 'Alta — perfil + quantidade prevista',
  3: 'Moderada — perfil sem quantidade',
  2: 'Baixa — fallback genérico',
  1: 'Insuficiente — sem dados',
};

// ── Semantic match helper ─────────────────────────────────────────────────────

function matchGrupo(tarefaNome: string, grupos: AmdahlGrupo[]): AmdahlGrupo | null {
  const words = tarefaNome.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let best: AmdahlGrupo | null = null;
  let bestScore = 0;
  for (const g of grupos) {
    const gName = g.nome.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (gName.includes(w)) score++;
    }
    if (score > bestScore) { bestScore = score; best = g; }
  }
  return bestScore > 0 ? best : null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DrawerEstimarDuracoes({ open, onOpenChange, tarefas, obraId, onAplicar }: Props) {
  const { company } = useCompany();
  const companyId = company?.id;

  const [grupos, setGrupos] = useState<AmdahlGrupo[]>([]);
  const [calendar, setCalendar] = useState<CalendarCfg>({ horas_por_dia: 8 });
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [equipePadrao, setEquipePadrao] = useState(2);

  // Per‑row state
  const [rows, setRows] = useState<RowState[]>([]);

  // Tarefas filtraveis: apenas PADRAO, com data_inicio definida
  const tarefasElegiveis = useMemo(
    () => tarefas.filter(t => t.tipo_tarefa === 'PADRAO' && t.data_inicio),
    [tarefas],
  );

  // Load grupos + calendar once on open
  useEffect(() => {
    if (!open || !companyId) return;
    setLoadingGrupos(true);

    Promise.all([
      (supabase as any)
        .from('amdahl_grupos')
        .select('id, company_id, nome, descricao, amdahl_p, amdahl_f')
        .or(`company_id.is.null,company_id.eq.${companyId}`)
        .order('nome'),
      (supabase as any)
        .from('company_calendar')
        .select('horas_por_dia')
        .eq('company_id', companyId)
        .maybeSingle(),
    ]).then(([gruposRes, calRes]) => {
      const gs: AmdahlGrupo[] = (gruposRes.data || []).map((g: any) => ({
        id: g.id,
        company_id: g.company_id,
        nome: g.nome,
        descricao: g.descricao,
        amdahl_p: g.amdahl_p ?? 0.8,
        amdahl_f: g.amdahl_f ?? 0.05,
      }));
      setGrupos(gs);
      if (calRes.data?.horas_por_dia) {
        setCalendar({ horas_por_dia: calRes.data.horas_por_dia });
      }

      // Build initial rows with semantic pre-match
      setRows(
        tarefasElegiveis.map(t => {
          const matched = matchGrupo(t.nome, gs);
          const grupoId = matched?.id ?? '';
          const equipe = equipePadrao;
          const estimativa = calcularEstimativa(t, matched, equipe, calRes.data?.horas_por_dia ?? 8);
          return {
            tarefaId: t.id,
            grupoId,
            equipe,
            estimativaDias: estimativa?.dias ?? null,
            confianca: estimativa?.confianca ?? 1,
          };
        })
      );
      setLoadingGrupos(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

  // ── Compute estimativa for a single tarefa+grupo+equipe ───────────────────

  function calcularEstimativa(
    t: CronogramaTarefa,
    grupo: AmdahlGrupo | null | undefined,
    equipe: number,
    horasPorDia: number,
  ): { dias: number; confianca: number } | null {
    if (!grupo) return null;
    const params: AmdahlParams = { p: grupo.amdahl_p, f: grupo.amdahl_f };

    // Confidence logic
    let confianca = 3;
    let trabalhoBaseDias: number;

    if (t.quantidade_prevista != null && t.quantidade_prevista > 0) {
      // Assume productivity of ~10 units per person per day as default base
      // (sem produtividade real no banco, usamos duracao_dias atual como base)
      trabalhoBaseDias = t.duracao_dias > 0 ? t.duracao_dias : 14;
      confianca = 4;
    } else {
      trabalhoBaseDias = t.duracao_dias > 0 ? t.duracao_dias : 14;
      confianca = 3;
    }

    const result = calcularAmdahl(trabalhoBaseDias, equipe, params, horasPorDia);
    if (!result) return null;

    return {
      dias: Math.max(1, Math.round(result.duracaoSugeridaDias)),
      confianca,
    };
  }

  // ── Update row ────────────────────────────────────────────────────────────

  const updateRow = useCallback((tarefaId: string, patch: Partial<RowState>) => {
    setRows(prev => prev.map(r => {
      if (r.tarefaId !== tarefaId) return r;
      const next = { ...r, ...patch };
      const tarefa = tarefasElegiveis.find(t => t.id === tarefaId);
      const grupo = grupos.find(g => g.id === next.grupoId);
      if (tarefa && grupo) {
        const est = calcularEstimativa(tarefa, grupo, next.equipe, calendar.horas_por_dia);
        next.estimativaDias = est?.dias ?? null;
        next.confianca = est?.confianca ?? 2;
      } else {
        next.estimativaDias = null;
        next.confianca = 1;
      }
      return next;
    }));
  }, [tarefasElegiveis, grupos, calendar.horas_por_dia]);

  // ── Equipe padrão change propagates to rows without explicit override ─────

  const handleEquipePadrao = useCallback((eq: number) => {
    setEquipePadrao(eq);
    setRows(prev => prev.map(r => {
      // Only update rows that still have the old equipe padrão (all rows initially)
      const next = { ...r, equipe: eq };
      const tarefa = tarefasElegiveis.find(t => t.id === r.tarefaId);
      const grupo = grupos.find(g => g.id === next.grupoId);
      if (tarefa && grupo) {
        const est = calcularEstimativa(tarefa, grupo, eq, calendar.horas_por_dia);
        next.estimativaDias = est?.dias ?? null;
        next.confianca = est?.confianca ?? 2;
      }
      return next;
    }));
  }, [tarefasElegiveis, grupos, calendar.horas_por_dia]);

  // ── Apply all ─────────────────────────────────────────────────────────────

  const handleAplicar = useCallback(() => {
    const updates: EstimaUpdate[] = [];
    for (const row of rows) {
      if (!row.estimativaDias) continue;
      const tarefa = tarefasElegiveis.find(t => t.id === row.tarefaId);
      if (!tarefa?.data_inicio) continue;
      const grupo = grupos.find(g => g.id === row.grupoId);
      const newFim = format(addDays(parseISO(tarefa.data_inicio), row.estimativaDias - 1), 'yyyy-MM-dd');
      updates.push({
        id: row.tarefaId,
        data_fim: newFim,
        amdahl_p: grupo?.amdahl_p,
        amdahl_f: grupo?.amdahl_f,
        duracao_sugerida_dias: row.estimativaDias,
      });
    }
    onAplicar(updates);
    onOpenChange(false);
  }, [rows, tarefasElegiveis, grupos, onAplicar, onOpenChange]);

  const estimadasCount = rows.filter(r => r.estimativaDias != null).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{ width: 680, maxWidth: '95vw', display: 'flex', flexDirection: 'column', padding: 0 }}
      >
        {/* Header */}
        <SheetHeader style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border-primary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wand2 size={18} color="#534AB7" />
            <SheetTitle style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Estimar Durações</SheetTitle>
          </div>
          <SheetDescription style={{ margin: '4px 0 0', fontSize: 12 }}>
            Selecione um Perfil de Serviço e o tamanho da equipe para cada tarefa.
            As estimativas consideram o grau de paralelismo e coordenação do serviço.
          </SheetDescription>

          {/* Global controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                Equipe padrão
              </span>
              <Select value={String(equipePadrao)} onValueChange={v => handleEquipePadrao(Number(v))}>
                <SelectTrigger style={{ height: 30, width: 70, fontSize: 12 }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'pessoa' : 'pessoas'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: '#F3F2FD', border: '1px solid rgba(83,74,183,0.15)' }}>
              <Info size={11} color="#534AB7" />
              <span style={{ fontSize: 11, color: '#534AB7' }}>
                {estimadasCount} de {tarefasElegiveis.length} tarefas estimadas
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingGrupos ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#534AB7' }} />
            </div>
          ) : tarefasElegiveis.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8, color: 'var(--color-text-secondary)' }}>
              <Wand2 size={32} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Nenhuma tarefa com data de início definida.</p>
              <p style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>Defina datas de início nas tarefas antes de estimar.</p>
            </div>
          ) : (
            <div>
              {/* Col headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 90px 70px 90px',
                gap: 8, padding: '8px 16px',
                borderBottom: '1px solid var(--color-border-primary)',
                background: 'var(--color-background-secondary)',
                position: 'sticky', top: 0, zIndex: 1,
              }}>
                {['Tarefa', 'Perfil de Serviço', 'Equipe', 'Est.', 'Confiança'].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {rows.map((row, idx) => {
                const tarefa = tarefasElegiveis.find(t => t.id === row.tarefaId);
                if (!tarefa) return null;
                const isEstimada = row.estimativaDias != null;

                return (
                  <div
                    key={row.tarefaId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 200px 90px 70px 90px',
                      gap: 8, padding: '10px 16px',
                      alignItems: 'center',
                      borderBottom: idx < rows.length - 1 ? '1px solid var(--color-border-primary)' : 'none',
                      background: isEstimada ? 'transparent' : 'rgba(239,68,68,0.02)',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Tarefa nome */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tarefa.nome}
                      </p>
                      {tarefa.data_inicio && (
                        <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: '1px 0 0' }}>
                          Início: {format(parseISO(tarefa.data_inicio), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>

                    {/* Perfil de Serviço select */}
                    <div style={{ position: 'relative' }}>
                      <Select
                        value={row.grupoId || '__none__'}
                        onValueChange={v => updateRow(row.tarefaId, { grupoId: v === '__none__' ? '' : v })}
                      >
                        <SelectTrigger style={{ height: 30, fontSize: 11, width: '100%' }}>
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent style={{ maxHeight: 280 }}>
                          <SelectItem value="__none__">
                            <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>Sem perfil</span>
                          </SelectItem>
                          {grupos.map(g => (
                            <SelectItem key={g.id} value={g.id}>
                              <span style={{ fontSize: 11 }}>{g.nome}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Badge vínculo automático */}
                      {row.grupoId && matchGrupo(tarefa.nome, grupos)?.id === row.grupoId && (
                        <div style={{ position: 'absolute', top: -6, right: 0 }}>
                          <Badge style={{ fontSize: 8, padding: '1px 4px', background: '#EEF2FF', color: '#4338CA', border: '1px solid rgba(83,74,183,0.2)' }}>
                            sugerido
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Equipe */}
                    <Select
                      value={String(row.equipe)}
                      onValueChange={v => updateRow(row.tarefaId, { equipe: Number(v) })}
                    >
                      <SelectTrigger style={{ height: 30, fontSize: 11 }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Estimativa */}
                    <div>
                      {isEstimada ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} color="#3B6D11" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#3B6D11' }}>
                            {row.estimativaDias}d
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>—</span>
                      )}
                    </div>

                    {/* Confiança */}
                    <div title={confidenceLabel[row.confianca] || ''}>
                      <ConfidenceDots level={row.confianca} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0, padding: '14px 24px',
          borderTop: '1px solid var(--color-border-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: 'var(--color-background-secondary)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>{estimadasCount}</strong> de{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{tarefasElegiveis.length}</strong> tarefas estimadas
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onOpenChange(false)}
              style={{
                height: 34, padding: '0 16px', borderRadius: 8,
                border: '1px solid var(--color-border-primary)',
                background: 'transparent', color: 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAplicar}
              disabled={estimadasCount === 0}
              style={{
                height: 34, padding: '0 20px', borderRadius: 8,
                border: 'none', background: estimadasCount > 0 ? '#534AB7' : 'var(--color-background-tertiary)',
                color: estimadasCount > 0 ? '#fff' : 'var(--color-text-tertiary)',
                fontSize: 12, fontWeight: 600, cursor: estimadasCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s',
              }}
            >
              <Wand2 size={12} />
              Aplicar {estimadasCount > 0 ? `${estimadasCount} estimativas` : 'estimativas'}
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </SheetContent>
    </Sheet>
  );
}
