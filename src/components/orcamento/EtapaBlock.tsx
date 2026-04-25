import { useState, useCallback, useRef } from 'react';
import { OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  Plus,
  Search,
  MoreHorizontal,
  GripVertical,
  Trash2,
  Copy,
  Box,
  Users,
  Truck,
  Wrench,
  HelpCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import ComposicaoRow from './ComposicaoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useEtapaDependencias } from '@/hooks/useEtapaDependencias';
import { OrcamentoVersao } from '@/contexts/OrcamentoContext';
import { BdiConfig } from './BdiPopover';
import { PLANILHA_GRID } from './planilhaGrid';

// Re-exportar para retrocompatibilidade com InsumoRow e outros
export { COMPOSICAO_GRID, toSinapiDisplayName } from './ComposicaoRow';

interface Props {
  etapa: OrcamentoEtapa;
  unidades: string[];
  onChange: (updated: OrcamentoEtapa) => void;
  onRemove: () => void;
  generateComposicaoCodigo: (catCode: string, existing: string[]) => string;
  generateInsumoCodigo: (compCode: string, existing: string[]) => string;
  forceExpanded?: boolean;
  readOnly?: boolean;
  obraId?: string;
  allEtapas?: OrcamentoEtapa[];
  dragListeners?: React.HTMLAttributes<HTMLElement>;
  onOpenCatalogo?: (tab?: string, query?: string) => void;
  compactMode?: boolean;
  densityMode?: 'detalhado' | 'padrao' | 'compacto';
  densityLevel?: 'normal' | 'compact' | 'ultra';
  posicao?: number;
  onGoCotacao?: (descricao: string) => void;
  priceSuggestionEnabled?: boolean;
  onPriceBadge?: (composicaoId: string, badge: string | null) => void;
  // Bulk selection
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  bulkActive?: boolean;
  bdiConfig?: BdiConfig;
}

export default function EtapaBlock({
  etapa,
  unidades,
  onChange,
  onRemove,
  generateComposicaoCodigo,
  generateInsumoCodigo,
  forceExpanded,
  readOnly,
  obraId,
  allEtapas = [],
  dragListeners,
  onOpenCatalogo,
  posicao,
  onGoCotacao,
  priceSuggestionEnabled = false,
  onPriceBadge,
  selectedIds,
  onToggleSelect,
  bulkActive = false,
  bdiConfig,
}: Props) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [forceApplied, setForceApplied] = useState<boolean | undefined>(undefined);
  const [editingNome, setEditingNome] = useState(false);

  // Rastrear IDs de composições recém-adicionadas
  const prevComposicaoIdsRef = useRef<Set<string>>(new Set(etapa.composicoes.map(c => c.id)));
  const newComposicaoIds = useRef<Set<string>>(new Set());

  const currentIds = new Set(etapa.composicoes.map(c => c.id));
  for (const id of Array.from(currentIds)) {
    if (!prevComposicaoIdsRef.current.has(id)) {
      newComposicaoIds.current.add(id);
      setTimeout(() => { newComposicaoIds.current.delete(id); }, 1500);
    }
  }
  prevComposicaoIdsRef.current = currentIds;

  // Sync forceExpanded
  if (forceExpanded !== undefined && forceExpanded !== forceApplied) {
    setLocalExpanded(forceExpanded);
    setForceApplied(forceExpanded);
  }

  const makeComposicao = useCallback((descricao?: string, unidade?: string, tipo: 'composicao' | 'insumo_direto' = 'composicao', tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico' | 'composicao'): OrcamentoComposicao => {
    const existingCodes = etapa.composicoes.map(c => c.codigo);
    return {
      id: crypto.randomUUID(),
      codigo: generateComposicaoCodigo(etapa.codigo, existingCodes),
      descricao: descricao || '',
      unidade: unidade || '',
      quantidade: null,
      precoUnitario: null,
      precoTotal: 0,
      insumos: [],
      usaInsumos: false,
      tipo,
      tipo_item: tipo_item || 'material',
    };
  }, [etapa.composicoes, etapa.codigo, generateComposicaoCodigo]);

  const recalcCategoria = (comps: OrcamentoComposicao[]) =>
    comps.reduce((s, c) => s + c.precoTotal, 0);

  const updateComposicao = (idx: number, comp: OrcamentoComposicao) => {
    const comps = [...etapa.composicoes];
    comps[idx] = comp;
    onChange({ ...etapa, composicoes: comps, precoTotal: recalcCategoria(comps) });
  };

  const removeComposicao = (idx: number) => {
    const comps = etapa.composicoes.filter((_, i) => i !== idx);
    onChange({ ...etapa, composicoes: comps, precoTotal: recalcCategoria(comps) });
  };

  const addComposicao = (tipo: 'composicao' | 'insumo_direto' = 'composicao', tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico' | 'composicao') => {
    const comps = [...etapa.composicoes, makeComposicao('', '', tipo, tipo_item)];
    onChange({ ...etapa, usaComposicoes: true, composicoes: comps });
    if (!localExpanded) setLocalExpanded(true);
  };

  const updateNome = (nome: string) => {
    onChange({ ...etapa, nome });
  };

  // Cálculos para o header
  const totalComps = etapa.composicoes.length;
  const cotadasComps = etapa.composicoes.filter(
    c => (c.precoUnitario != null && c.precoUnitario > 0) || c.usaInsumos
  ).length;
  const pctCotado = totalComps > 0 ? Math.round((cotadasComps / totalComps) * 100) : 0;

  const barColor =
    pctCotado === 0 ? 'bg-muted-foreground/20' :
      pctCotado === 100 ? 'bg-emerald-500' :
        'bg-blue-500';

  return (
    <div className="contents">
      {/* ── Linha de grupo (sticky header da etapa) ── */}
      <div
        className={cn(
          'group/etapa sticky top-0 z-20 grid items-center gap-0 border-y border-border/80 shadow-sm transition-colors',
          'bg-slate-100 dark:bg-slate-800 border-l-4 border-l-violet-500',
          readOnly && 'opacity-80',
          PLANILHA_GRID
        )}
        style={{ 
          minHeight: '40px',
        }}
      >
        {/* Coluna 1: Checkbox + Drag + Chevron + Num + Nome */}
        <div className="flex items-center gap-1.5 h-full px-2 border-r border-border/60 min-w-0">
          {/* Checkbox de seleção */}
          {!readOnly && (
            <div className="flex items-center justify-center h-6 w-6 shrink-0">
              <Checkbox 
                checked={selectedIds?.has(etapa.id) ?? false} 
                onCheckedChange={() => onToggleSelect?.(etapa.id)}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
            </div>
          )}

          {/* Drag handle */}
          {!readOnly && (
            <span
              {...(dragListeners ?? {})}
              className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity shrink-0 text-muted-foreground touch-none"
              title="Arrastar para reordenar"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Chevron expand/collapse */}
          <button
            tabIndex={-1}
            onClick={() => setLocalExpanded(v => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            aria-label={localExpanded ? 'Colapsar etapa' : 'Expandir etapa'}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                localExpanded && 'rotate-90'
              )}
            />
          </button>

          {/* Posição */}
          {posicao != null && (
            <span className="text-[10px] font-bold font-mono text-muted-foreground/50 shrink-0 tabular-nums select-none">
              #{posicao}
            </span>
          )}

          {/* Nome da etapa */}
          {editingNome && !readOnly ? (
            <input
              autoFocus
              value={etapa.nome}
              onChange={e => updateNome(e.target.value)}
              onBlur={() => setEditingNome(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNome(false); }}
              className="flex-1 min-w-0 h-full bg-transparent border-transparent rounded-none px-1 focus:bg-primary/5 focus:outline focus:outline-[1.5px] focus:outline-primary focus:outline-offset-[-1px]"
              style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}
            />
          ) : (
            <span
              tabIndex={0}
              className={cn(
                'flex-1 min-w-0 truncate pr-2 focus:outline-none focus:ring-1 focus:ring-primary rounded',
                !readOnly && 'cursor-text hover:text-primary transition-colors'
              )}
              style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', color: 'hsl(var(--foreground))' }}
              title={etapa.nome || 'Sem nome'}
              onClick={() => !readOnly && setEditingNome(true)}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault();
                  setLocalExpanded(v => !v);
                }
                if (e.key === 'Enter' || e.key === 'F2') {
                  e.preventDefault();
                  if (!readOnly) setEditingNome(true);
                }
              }}
            >
              {etapa.nome || <span className="text-muted-foreground italic">Sem nome</span>}
            </span>
          )}
        </div>

        {/* Coluna 2: TIPO (Vazio na etapa) */}
        <div className="h-full border-r border-border/60" />
        {/* Coluna 3: UN (Vazio na etapa) */}
        <div className="h-full border-r border-border/60" />
        
        {/* Coluna 4 & 5: Progresso (ocupa P.UNIT e QTD) */}
        <div
          className="flex items-center justify-end gap-2 h-full px-3 border-r border-border/60"
          style={{ gridColumn: 'span 2' }}
        >
          {totalComps > 0 && (
            <>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {totalComps} comp.
              </span>
              <div className="w-24 h-1 bg-border overflow-hidden">
                <div className={cn('h-full transition-all', barColor)}
                  style={{ width: `${pctCotado}%` }} />
              </div>
              <span className="text-[11px] tabular-nums font-medium"
                style={{
                  color: pctCotado === 100 ? '#10b981' :
                    pctCotado > 0 ? '#3b82f6' : undefined
                }}>
                {pctCotado}%
              </span>
            </>
          )}
        </div>

        {/* Coluna 5: Total */}
        <div className="flex items-center justify-end h-full px-2 border-r border-border/60">
          <span className="tabular-nums text-foreground shrink-0 text-right" style={{ fontSize: '13px', fontWeight: 700 }}>
            {bdiConfig?.enabled && etapa.precoTotal > 0 ? (
              <span className="cursor-help decoration-dashed underline decoration-muted-foreground/50 underline-offset-2" title={`Base: ${formatCurrency(etapa.precoTotal)} | BDI (${bdiConfig.rate}%): ${formatCurrency(etapa.precoTotal * (bdiConfig.rate / 100))}`}>
                {formatCurrency(etapa.precoTotal * (1 + bdiConfig.rate / 100))}
              </span>
            ) : (
              formatCurrency(etapa.precoTotal)
            )}
          </span>
        </div>

        {/* Coluna 6: Ações (Ações diretas: Favoritar, Duplicar, Excluir, + Comp) */}
        <div className="flex items-center justify-center gap-0.5 h-full px-1">
          {!readOnly && (
            <>
              {/* Favoritar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                title="Favoritar etapa (em breve)"
              >
                <Star className="h-3.5 w-3.5" />
              </Button>

              {/* Duplicar */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => {
                  const clone: OrcamentoEtapa = {
                    ...etapa,
                    id: crypto.randomUUID(),
                    nome: `${etapa.nome} (cópia)`,
                    composicoes: etapa.composicoes.map(c => ({
                      ...c,
                      id: crypto.randomUUID(),
                      insumos: c.insumos.map(i => ({ ...i, id: crypto.randomUUID() })),
                    })),
                  };
                  onChange({ ...etapa, __duplicate: clone } as OrcamentoEtapa & { __duplicate?: OrcamentoEtapa });
                }}
                title="Duplicar etapa"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>

              {/* Excluir */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                title="Excluir etapa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

              <div className="w-px h-4 bg-border/40 mx-0.5" />

              {/* Adicionar Comp */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addComposicao('composicao')}
                className="h-7 px-2 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase"
                title="Nova composição"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Comp
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Cabeçalho de colunas sticky (Bloco 6) ── */}
      {localExpanded && (
        <div className={cn(
          "sticky top-[40px] z-10 grid items-center gap-0 border-b border-border/70 bg-white dark:bg-slate-900/90 backdrop-blur-sm",
          "h-7 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider shadow-sm",
          PLANILHA_GRID
        )}>
          <div className="pl-12">Descrição</div>
          <div className="text-center px-0 text-muted-foreground/60" title="Tipo do item">T.</div>
          <div className="text-center px-1">UN</div>
          <div className="text-right px-1">QTD</div>
          <div className="text-right px-1">R$/UN</div>
          <div className="text-right px-1">TOTAL</div>
          <div className="text-center">Ações</div>
        </div>
      )}


      {/* ── Composições (visíveis quando expandida) ── */}
      {localExpanded && (
        <>
          {etapa.composicoes.map((comp, idx) => (
            <ComposicaoRow
              key={comp.id}
              composicao={comp}
              unidades={unidades}
              onChange={c => updateComposicao(idx, c)}
              onRemove={() => removeComposicao(idx)}
              generateInsumoCodigo={generateInsumoCodigo}
              readOnly={readOnly}
              obraId={obraId}
              onGoCotacao={onGoCotacao}
              priceSuggestionEnabled={priceSuggestionEnabled}
              onPriceBadge={onPriceBadge}
              isNew={newComposicaoIds.current.has(comp.id)}
              // Bulk
              isSelected={selectedIds?.has(comp.id) ?? false}
              onToggleSelect={() => onToggleSelect?.(comp.id)}
              bulkActive={bulkActive}
              bdiConfig={bdiConfig}
            />
          ))}

          {/* Empty state */}
          {etapa.composicoes.length === 0 && !readOnly && (
            <div className="flex flex-col items-center gap-3 py-8 border-b border-border/30 bg-muted/5">
              <p className="text-xs text-muted-foreground">Nenhuma composição nesta etapa</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenCatalogo?.()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-800 transition-colors"
                >
                  ✨ Sugerir da Biblioteca
                </button>
                <button
                  onClick={() => onOpenCatalogo?.()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 text-muted-foreground transition-colors"
                >
                  🔍 Buscar no SINAPI
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
