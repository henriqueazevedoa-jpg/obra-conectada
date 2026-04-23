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

  const makeComposicao = useCallback((descricao?: string, unidade?: string, tipo: 'composicao' | 'insumo_direto' = 'composicao', tipo_item?: string): OrcamentoComposicao => {
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

  const addComposicao = (tipo: 'composicao' | 'insumo_direto' = 'composicao', tipo_item?: string) => {
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
          'group/etapa sticky top-7 z-10 grid items-center gap-0 border-b border-border/70',
          'bg-slate-100/80 dark:bg-slate-800/60',
          'min-h-[36px]',
          readOnly && 'opacity-80',
          PLANILHA_GRID
        )}
        style={{ height: '36px' }}
      >
        {/* Coluna 1: Drag + Chevron + Num + Nome */}
        <div className="flex items-center gap-1 h-full px-2 border-r border-border/60">
        {/* Drag handle */}
        {!readOnly && (
          <span
            {...(dragListeners ?? {})}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover/etapa:opacity-40 hover:!opacity-80 transition-opacity shrink-0 text-muted-foreground touch-none -ml-1"
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
            className="flex-1 min-w-0 h-full bg-primary/5 border-transparent rounded-none px-1 focus:outline focus:outline-[1.5px] focus:outline-primary focus:outline-offset-[-1px]"
            style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}
          />
        ) : (
          <span
            className={cn(
              'flex-1 min-w-0 truncate pr-2',
              !readOnly && 'cursor-text hover:text-primary transition-colors'
            )}
            style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}
            title={etapa.nome || 'Sem nome'}
            onDoubleClick={() => !readOnly && setEditingNome(true)}
          >
            {etapa.nome || <span className="text-muted-foreground italic">Sem nome</span>}
          </span>
        )}
        </div>

        {/* Coluna 2: UN */}
        <div className="h-full border-r border-border/60" />
        {/* Coluna 3: QTD */}
        <div className="h-full border-r border-border/60" />
        
        {/* Coluna 4: P.UNIT (Progresso) */}
        <div className="flex items-center justify-end gap-2 h-full px-2 border-r border-border/60">
          {totalComps > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground hidden sm:inline tabular-nums">
                {totalComps} comp.
              </span>
              <div className="flex items-center gap-1">
                <div className="w-14 h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${pctCotado}%` }}
                  />
                </div>
                <span className={cn(
                  'text-[10px] tabular-nums font-medium hidden sm:inline',
                  pctCotado === 100 ? 'text-emerald-600 dark:text-emerald-400' :
                  pctCotado > 0 ? 'text-blue-600 dark:text-blue-400' :
                  'text-muted-foreground'
                )}>
                  {pctCotado}%
                </span>
              </div>
            </div>
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

        {/* Coluna 6: Ações */}
        <div className="flex items-center justify-center gap-1 h-full px-1">
          {/* Adicionar... */}
          {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                tabIndex={-1}
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover/etapa:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                title="Adicionar item"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem className="text-xs gap-2" onClick={() => addComposicao('composicao')}>
                <Plus className="h-3 w-3" /> Nova composição
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Insumo direto</div>
              <DropdownMenuItem className="text-xs gap-2" onClick={() => addComposicao('insumo_direto', 'material')}>
                <Box className="h-3 w-3" /> Material
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={() => addComposicao('insumo_direto', 'mao_obra')}>
                <Users className="h-3 w-3" /> Mão de obra
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={() => addComposicao('insumo_direto', 'equipamento')}>
                <Truck className="h-3 w-3" /> Equipamento
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onClick={() => addComposicao('insumo_direto', 'servico')}>
                <Wrench className="h-3 w-3" /> Serviço
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Menu ⋯ */}
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                tabIndex={-1}
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover/etapa:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem className="text-xs gap-2" onClick={() => setEditingNome(true)}>
                Renomear etapa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2"
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
                  // Passa o clone para o pai via onChange com flag especial
                  // O OrcamentoEditor cuida de inserir — aqui só disparamos o evento
                  onChange({ ...etapa, __duplicate: clone } as OrcamentoEtapa & { __duplicate?: OrcamentoEtapa });
                }}
              >
                <Copy className="h-3 w-3" />
                Duplicar etapa
              </DropdownMenuItem>
              {onOpenCatalogo && (
                <DropdownMenuItem className="text-xs gap-2" onClick={() => { onOpenCatalogo(); setLocalExpanded(true); }}>
                  <Search className="h-3 w-3" />
                  Buscar composições
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs gap-2 text-destructive focus:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-3 w-3" />
                Excluir etapa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      </div>

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
