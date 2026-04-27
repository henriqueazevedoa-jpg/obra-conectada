import { useState, useCallback, useRef } from 'react';
import { OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  ChevronDown,
  Star
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ComposicaoRow from './ComposicaoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useEtapaDependencias } from '@/hooks/useEtapaDependencias';
import { OrcamentoVersao } from '@/contexts/OrcamentoContext';
import { BdiConfig } from './BdiPopover';
import { 
  PLANILHA_FLEX_ROW, CELL_DESC, CELL_TIPO, CELL_UN, 
  CELL_QTD, CELL_PUNIT, CELL_TOTAL, CELL_ACOES, getNivelLayout 
} from './planilhaGrid';

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
  depth?: number;
  onDoubleClickChevron?: (expanded: boolean, depth: number, tipo: 'etapa' | 'composicao') => void;
  isFlatHeaderOnly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SortableSubetapa(props: Props & { parentId: string; idx: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.etapa.id,
    data: { type: 'etapa', parentId: props.parentId }
  });

  return (
    <div 
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative"
      {...attributes}
    >
      <EtapaBlock {...props} dragListeners={listeners as React.HTMLAttributes<HTMLElement>} />
    </div>
  );
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
  depth = 1,
  onDoubleClickChevron,
  isFlatHeaderOnly,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [forceApplied, setForceApplied] = useState<boolean | undefined>(undefined);
  const [editingNome, setEditingNome] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rastrear IDs de composições recém-adicionadas
  const prevComposicaoIdsRef = useRef<Set<string>>(new Set(etapa.items.filter(i => i.tipo !== 'etapa').map(c => c.id)));
  const newComposicaoIds = useRef<Set<string>>(new Set());

  const currentIds = new Set(etapa.items.filter(i => i.tipo !== 'etapa').map(c => c.id));
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
    const existingCodes = etapa.items.filter(i => i.tipo !== 'etapa').map(c => c.codigo);
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
  }, [etapa.items, etapa.codigo, generateComposicaoCodigo]);

  const recalcCategoria = (items: Array<OrcamentoEtapa | OrcamentoComposicao>) =>
    items.reduce((s, c) => s + (c.precoTotal || 0), 0);

  const updateItem = useCallback((idx: number, updated: OrcamentoEtapa | OrcamentoComposicao) => {
    const items = [...etapa.items];
    items[idx] = updated;
    onChange({ ...etapa, items, precoTotal: recalcCategoria(items) });
  }, [etapa, onChange]);

  const removeItem = useCallback((idx: number) => {
    const items = etapa.items.filter((_, i) => i !== idx);
    onChange({ ...etapa, items, precoTotal: recalcCategoria(items) });
  }, [etapa, onChange]);

  const addSubetapa = useCallback(() => {
    const items = [...(etapa.items || [])];
    items.push({
      id: crypto.randomUUID(),
      codigo: `${etapa.codigo}.${items.filter(i => i.tipo === 'etapa').length + 1}`,
      nome: 'Nova Subetapa',
      precoTotal: 0,
      usaComposicoes: true,
      items: [],
      tipo: 'etapa',
      parentId: etapa.id
    });
    
    onChange({ ...etapa, items });
    setLocalExpanded(true);
  }, [etapa, onChange]);

  const addComposicao = (tipo: 'composicao' | 'insumo_direto' = 'composicao', tipo_item?: 'material' | 'mao_obra' | 'equipamento' | 'servico' | 'composicao') => {
    const items = [...etapa.items, makeComposicao('', '', tipo, tipo_item)];
    onChange({ ...etapa, usaComposicoes: true, items });
    if (!localExpanded) setLocalExpanded(true);
  };

  const updateNome = (nome: string) => {
    onChange({ ...etapa, nome });
  };

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `header-${etapa.id}`,
    data: { type: 'header', etapaId: etapa.id }
  });

  // Cálculos para o header
  const totalComps = etapa.items.filter(i => i.tipo !== 'etapa').length;
  const cotadasComps = etapa.items.filter(
    c => c.tipo !== 'etapa' && (((c as OrcamentoComposicao).precoUnitario != null && (c as OrcamentoComposicao).precoUnitario! > 0) || (c as OrcamentoComposicao).usaInsumos)
  ).length;
  const pctCotado = totalComps > 0 ? Math.round((cotadasComps / totalComps) * 100) : 0;

  const barColor =
    pctCotado === 0 ? 'bg-muted-foreground/20' :
      pctCotado === 100 ? 'bg-emerald-500' :
        'bg-blue-500';

  const { visual, stickyStyle, headerStickyStyle } = getNivelLayout(depth);

  return (
    <div className="contents">
      {/* ── Linha de grupo (sticky header da etapa) ── */}
      <div
        ref={setDropNodeRef}
        className={cn(
          'group/etapa sticky z-20 border-y border-border/80 shadow-sm transition-colors',
          readOnly && 'opacity-80',
          visual.bgClass,
          PLANILHA_FLEX_ROW,
          isOver && 'ring-2 ring-primary ring-inset bg-primary/5'
        )}
        style={{ 
          ...stickyStyle,
          minHeight: '40px',
        }}
      >
        {/* Coluna 1: Checkbox + Drag + Chevron + Num + Nome */}
        <div className={cn(CELL_DESC, "gap-0 px-1 border-l-4", visual.borderClass)}>
          {/* Spacer de Indentação exata */}
          {depth > 1 && <div style={{ width: `${(depth - 1) * 16}px` }} className="shrink-0" />}

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
          {!readOnly && dragListeners && (
            <span
              {...dragListeners}
              className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity shrink-0 text-muted-foreground touch-none flex justify-center w-5"
              title="Arrastar para reordenar"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}

          {/* Chevron expand/collapse */}
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.preventDefault();
              if (clickTimerRef.current) {
                // É um duplo clique!
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
                const next = isFlatHeaderOnly ? !!isCollapsed : !localExpanded;
                if (isFlatHeaderOnly && onToggleCollapse) onToggleCollapse();
                else setLocalExpanded(next);
                onDoubleClickChevron?.(next, depth, 'etapa');
              } else {
                // Primeiro clique, inicia o timer
                clickTimerRef.current = setTimeout(() => {
                  clickTimerRef.current = null;
                  if (isFlatHeaderOnly && onToggleCollapse) {
                    onToggleCollapse();
                  } else {
                    setLocalExpanded(v => !v);
                  }
                }, 250);
              }
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded flex justify-center w-5"
            aria-label={(isFlatHeaderOnly ? isCollapsed : !localExpanded) ? 'Expandir etapa' : 'Colapsar etapa'}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-200',
                (isFlatHeaderOnly ? !isCollapsed : localExpanded) && 'rotate-90'
              )}
            />
          </button>

          {/* Código WBS */}
          <span className="text-[10px] font-bold font-mono text-muted-foreground/50 shrink-0 tabular-nums select-none mr-1.5" title="Código WBS">
            {etapa.codigo}
          </span>

          {/* Nome da etapa */}
          {editingNome && !readOnly ? (
            <input
              autoFocus
              value={etapa.nome}
              onChange={e => updateNome(e.target.value)}
              onBlur={() => setEditingNome(false)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNome(false); }}
              className="flex-1 min-w-0 h-full bg-transparent border-transparent rounded-none px-1 focus:bg-primary/5 focus:outline focus:outline-[1.5px] focus:outline-primary focus:outline-offset-[-1px]"
              style={{ fontSize: visual.fontSize, fontWeight: visual.fontWeight, textTransform: visual.textTransform, letterSpacing: visual.letterSpacing }}
            />
          ) : (
            <span
              tabIndex={0}
              className={cn(
                'flex-1 min-w-0 truncate pr-2 focus:outline-none focus:ring-1 focus:ring-primary rounded',
                !readOnly && 'cursor-text hover:text-primary transition-colors'
              )}
              style={{ fontSize: visual.fontSize, fontWeight: visual.fontWeight, textTransform: visual.textTransform, letterSpacing: visual.letterSpacing, color: 'hsl(var(--foreground))' }}
              title={etapa.nome || 'Sem nome'}
              onClick={() => !readOnly && setEditingNome(true)}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.preventDefault();
                  if (isFlatHeaderOnly && onToggleCollapse) onToggleCollapse();
                  else setLocalExpanded(v => !v);
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
        <div className={CELL_TIPO} />
        {/* Coluna 3: UN (Vazio na etapa) */}
        <div className={CELL_UN} />
        
        {/* Coluna 4 & 5: Progresso (ocupa P.UNIT e QTD) */}
        <div 
          className="shrink-0 border-r border-border/60 flex items-center justify-end gap-2 px-3"
          style={{ width: 'calc(var(--w-qtd, 70px) + var(--w-punit, 100px))' }}
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

        {/* Coluna 6: Total */}
        <div className={cn(CELL_TOTAL, "px-2")}>
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

        {/* Coluna 7: Ações (Ações diretas: Favoritar, Duplicar, Excluir, + Comp) */}
        <div className={cn(CELL_ACOES, "gap-0.5 px-1")}>
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
                    composicoes: [],
                    items: etapa.items.map(i => i.tipo === 'etapa' ? {
                      ...i, id: crypto.randomUUID(), items: []
                    } : {
                      ...i,
                      id: crypto.randomUUID(),
                      insumos: (i as OrcamentoComposicao).insumos.map(ins => ({ ...ins, id: crypto.randomUUID() })),
                    }),
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => addComposicao('composicao')}
                className="h-7 px-2 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase"
                title="Nova composição"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Comp
              </Button>

              <div className="w-px h-4 bg-border/40 mx-0.5" />

              {/* Adicionar Subetapa */}
              <Button
                variant="ghost"
                size="sm"
                onClick={addSubetapa}
                className="h-7 px-2 text-muted-foreground hover:text-primary text-[10px] font-bold uppercase"
                title="Nova subetapa"
              >
                <Box className="h-3.5 w-3.5 mr-1" /> Sub
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Cabeçalho removido do EtapaBlock e unificado no OrcamentoEditor ── */}

      {/* ── Items (Mistos: Composições e Subetapas) ── */}
      {!isFlatHeaderOnly && localExpanded && (
        <>
          <div className="flex flex-col border-b border-border/40 last:border-b-0">
            <SortableContext items={etapa.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {etapa.items.map((item, idx) => {
                if (item.tipo === 'etapa') {
                  return (
                    <SortableSubetapa
                      key={item.id}
                      etapa={item as OrcamentoEtapa}
                      idx={idx}
                      parentId={etapa.id}
                      unidades={unidades}
                      onChange={(updated) => updateItem(idx, updated)}
                      onRemove={() => removeItem(idx)}
                      generateComposicaoCodigo={generateComposicaoCodigo}
                      generateInsumoCodigo={generateInsumoCodigo}
                      readOnly={readOnly}
                      obraId={obraId}
                      onGoCotacao={onGoCotacao}
                      priceSuggestionEnabled={priceSuggestionEnabled}
                      onPriceBadge={onPriceBadge}
                      selectedIds={selectedIds}
                      onToggleSelect={onToggleSelect}
                      bulkActive={bulkActive}
                      bdiConfig={bdiConfig}
                      depth={depth + 1}
                      onDoubleClickChevron={onDoubleClickChevron}
                    />
                  );
                } else {
                  const comp = item as OrcamentoComposicao;
                  return (
                    <ComposicaoRow
                      key={comp.id}
                      composicao={comp}
                      unidades={unidades}
                      onChange={c => updateItem(idx, c)}
                      onRemove={() => removeItem(idx)}
                      generateInsumoCodigo={generateInsumoCodigo}
                      readOnly={readOnly}
                      obraId={obraId}
                      onGoCotacao={onGoCotacao}
                      priceSuggestionEnabled={priceSuggestionEnabled}
                      onPriceBadge={onPriceBadge}
                      isNew={newComposicaoIds.current.has(comp.id)}
                      depth={depth + 1}
                      // Bulk
                      isSelected={selectedIds?.has(comp.id) ?? false}
                      onToggleSelect={() => onToggleSelect?.(comp.id)}
                      bulkActive={bulkActive}
                      bdiConfig={bdiConfig}
                      parentId={etapa.id}
                    />
                  );
                }
              })}
            </SortableContext>
          </div>

          {/* Empty state */}
          {etapa.items.length === 0 && !readOnly && (
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
