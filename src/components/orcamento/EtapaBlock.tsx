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
} from 'lucide-react';
import ComposicaoRow from './ComposicaoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useEtapaDependencias } from '@/hooks/useEtapaDependencias';
import { OrcamentoVersao } from '@/contexts/OrcamentoContext';

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
  onOpenCatalogo?: () => void;
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

  const makeComposicao = useCallback((descricao?: string, unidade?: string, tipo: 'composicao' | 'insumo_direto' = 'composicao'): OrcamentoComposicao => {
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

  const addComposicao = (tipo: 'composicao' | 'insumo_direto' = 'composicao') => {
    const comps = [...etapa.composicoes, makeComposicao('', '', tipo)];
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
          'group/etapa sticky top-0 z-10 flex items-center gap-1 px-2 border-b border-border',
          'bg-muted/40 dark:bg-muted/20',
          'min-h-[34px]',
          readOnly && 'opacity-80'
        )}
        style={{ height: '34px' }}
      >
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
            className="flex-1 min-w-0 h-6 text-xs font-semibold bg-background border border-primary/40 rounded px-1 focus:outline-none"
          />
        ) : (
          <span
            className={cn(
              'flex-1 min-w-0 text-xs font-semibold truncate pr-2 text-foreground',
              !readOnly && 'cursor-text hover:text-primary transition-colors'
            )}
            title={etapa.nome || 'Sem nome'}
            onDoubleClick={() => !readOnly && setEditingNome(true)}
          >
            {etapa.nome || <span className="text-muted-foreground italic">Sem nome</span>}
          </span>
        )}

        {/* Info: composições + progresso */}
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

        {/* Total */}
        <span className="text-xs font-bold tabular-nums text-foreground shrink-0 min-w-[72px] text-right">
          {formatCurrency(etapa.precoTotal)}
        </span>

        {/* Menu ⋯ */}
        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
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
            />
          ))}

          {/* Linha de adição (28px) */}
          {!readOnly && (
            <div className="flex items-center gap-3 px-8 border-b border-dashed border-border/30 bg-transparent hover:bg-muted/5 transition-colors"
              style={{ height: '28px' }}
            >
              <button
                onClick={() => addComposicao('composicao')}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" />
                Composição
              </button>
              <button
                onClick={() => addComposicao('insumo_direto')}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                Insumo direto
              </button>
              {onOpenCatalogo && (
                <button
                  onClick={() => onOpenCatalogo()}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Search className="h-3 w-3" />
                  Buscar no catálogo
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {etapa.composicoes.length === 0 && readOnly && (
            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground border-b border-border/30">
              Nenhuma composição
            </div>
          )}
        </>
      )}
    </div>
  );
}
