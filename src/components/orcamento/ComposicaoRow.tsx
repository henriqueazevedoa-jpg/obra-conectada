import { useState, useEffect, useRef, useCallback } from 'react';
import { OrcamentoComposicao, OrcamentoInsumo, useOrcamento } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Trash2, Plus, ChevronRight, Star, Search, ClipboardList,
  MoreHorizontal, GripVertical, Lock, Layers,
  Box, Users, Truck, Wrench, Copy, List,
  CheckCheck, X,
} from 'lucide-react';
import InsumoRowDense from './InsumoRowDense';
import InsumoSkeletonRow from './InsumoSkeletonRow';
import DescricaoAutocompleteCell from './DescricaoAutocompleteCell';
import { formatCurrency, formatCurrencyShort } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import SinapiPricePopover from './SinapiPricePopover';
import ListaCotacaoPopover from './ListaCotacaoPopover';
import { usePriceSuggestion } from '@/hooks/usePriceSuggestion';
import { useComposicaoInsumos, InsumoRascunho } from '@/hooks/useComposicaoInsumos';
import { SearchItem } from '@/hooks/useItemSearch';
import { Checkbox } from '@/components/ui/checkbox';
import { BdiConfig } from './BdiPopover';


// ÔöÇÔöÇ Exports mantidos para retrocompatibilidade com InsumoRow ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

import { 
  PLANILHA_FLEX_ROW, CELL_DESC, CELL_TIPO, CELL_UN, 
  CELL_QTD, CELL_PUNIT, CELL_TOTAL, CELL_ACOES, getNivelLayout 
} from './planilhaGrid';

export const COMPOSICAO_GRID = '[grid-template-columns:var(--wbs-cols,45fr_5fr_5fr_7fr_8fr_15fr_15fr)]';

export function toSinapiDisplayName(descricao: string): string {
  if (!descricao) return descricao;
  const LOWER = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'ou']);
  return descricao.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !LOWER.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

function normalizarDescricao(d: string) {
  return d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ÔöÇÔöÇ Props ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

interface Props {
  composicao: OrcamentoComposicao;
  unidades: string[];
  onChange: (updated: OrcamentoComposicao) => void;
  onRemove: () => void;
  generateInsumoCodigo: (compCode: string, existing: string[]) => string;
  obraId?: string;
  readOnly?: boolean;
  compactMode?: boolean;
  onGoCotacao?: (descricao: string) => void;
  priceSuggestionEnabled?: boolean;
  priceCriterio?: string;
  onPriceBadge?: (composicaoId: string, badge: string | null) => void;
  isNew?: boolean;
  // Bulk
  isSelected?: boolean;
  onToggleSelect?: () => void;
  bulkActive?: boolean;
  bdiConfig?: BdiConfig;
  onOpenCatalogo?: (tab?: string, query?: string) => void;
  forceExpanded?: boolean;
  onDoubleClickChevron?: (expanded: boolean, depth: number, tipo: 'etapa' | 'composicao') => void;
  globalSelectedIds?: Set<string>;
  onToggleSelectGlobal?: (id: string, childrenIdsToDeselect?: string[]) => void;
  depth?: number;
}

// ÔöÇÔöÇ Component ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ComposicaoRow({
  composicao, unidades, onChange, onRemove, generateInsumoCodigo,
  obraId, readOnly, onGoCotacao, priceSuggestionEnabled = false,
  onPriceBadge, isNew = false,
  isSelected = false, onToggleSelect, bulkActive = false,
  bdiConfig, onOpenCatalogo, forceExpanded, onDoubleClickChevron,
  globalSelectedIds, onToggleSelectGlobal, depth = 2,
  parentId
}: Props & { parentId?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: composicao.id,
    data: { type: 'composicao', parentId }
  });
  const isSinapi = composicao.fonteReferencia === 'SINAPI';
  const isInsumodireto = composicao.tipo === 'insumo_direto';
  const [insumosExpanded, setInsumosExpanded] = useState(!isSinapi);
  const [forceApplied, setForceApplied] = useState<boolean | undefined>(undefined);
  const [showAllInsumos, setShowAllInsumos] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [lotesIds, setLotesIds] = useState<string[]>([]);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [descTooltip, setDescTooltip] = useState({ visible: false, text: '' });
  const [selectedInsumoIds, setSelectedInsumoIds] = useState<Set<string>>(new Set());
  const descRef = useRef<HTMLDivElement>(null);

  const handleDescMouseEnter = () => {
    if (descRef.current && descRef.current.scrollWidth > descRef.current.clientWidth) {
      setDescTooltip({ visible: true, text: composicao.descricao });
    }
  };

  // onBlur local state
  const [localPreco, setLocalPreco] = useState<string>(
    composicao.precoUnitario != null ? String(composicao.precoUnitario) : ''
  );
  const [localQtd, setLocalQtd] = useState<string>(
    composicao.quantidade != null ? String(composicao.quantidade) : ''
  );

  // Fonte badge
  type FonteBadge = 'sinapi' | 'historico' | 'manual' | 'sugerido' | 'biblioteca' | null;
  const [fonteBadge, setFonteBadge] = useState<FonteBadge>(null);

  const { company } = useCompany();
  const { sinapiConfig } = useOrcamento();
  const {
    insumos: pendingInsumos,
    loadBiblioteca,
    loadSinapi,
    toggleAceito,
    aceitarTodos,
    rejeitarTodos,
    limpar: limparPending,
  } = useComposicaoInsumos();
  const qtdInputRef = useRef<HTMLInputElement>(null);


  // Sync localPreco quando composicao muda externamente
  useEffect(() => {
    setLocalPreco(composicao.precoUnitario != null ? String(composicao.precoUnitario) : '');
  }, [composicao.id, composicao.precoUnitario]);

  // Sync forceExpanded
  if (forceExpanded !== undefined && forceExpanded !== forceApplied) {
    setInsumosExpanded(forceExpanded);
    setForceApplied(forceExpanded);
  }

  useEffect(() => {
    setLocalQtd(composicao.quantidade != null ? String(composicao.quantidade) : '');
  }, [composicao.id, composicao.quantidade]);

  // Sugest├úo Autom├ítica
  const { suggestedPrice, clearSuggestion } = usePriceSuggestion(
    composicao.descricao,
    composicao.unidade || '',
    priceSuggestionEnabled,
    composicao.precoUnitario,
    company?.id
  );

  useEffect(() => {
    if (suggestedPrice != null && composicao.precoUnitario == null && priceSuggestionEnabled && composicao.usaInsumos === false) {
      setLocalPreco(String(suggestedPrice));
      const next = { ...composicao, precoUnitario: suggestedPrice } as OrcamentoComposicao;
      if (next.quantidade) next.precoTotal = next.quantidade * suggestedPrice;
      onChange(next);
      setFonteBadge('sugerido' as FonteBadge);
      onPriceBadge?.(composicao.id, 'sugerido');
      clearSuggestion();
    }
  }, [suggestedPrice, composicao, priceSuggestionEnabled, onChange, onPriceBadge, clearSuggestion]);

  // Verificar favorito
  useEffect(() => {
    if (!composicao.descricao || !company?.id) return;
    (supabase as any).from('catalogo_composicoes').select('id')
      .eq('nome', composicao.descricao).eq('company_id', company.id).maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setIsFavorite(!!data));
  }, [composicao.descricao, company?.id]);

  // ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

  const recalcFromInsumos = (comp: OrcamentoComposicao) => {
    if (comp.usaInsumos) {
      comp.precoTotal = comp.insumos.reduce((s, si) => s + (Number(si.precoTotal) || 0), 0);
      comp.quantidade = comp.insumos.reduce((s, si) => s + (Number(si.quantidade) || 0), 0) || null;
      comp.precoUnitario = comp.quantidade && comp.quantidade > 0
        ? comp.precoTotal / comp.quantidade : null;
    }
  };

  const update = useCallback((field: string, value: string | number | null | boolean) => {
    const next = { ...composicao } as OrcamentoComposicao;
    (next as unknown as Record<string, unknown>)[field] = value;
    if (!next.usaInsumos) {
      if (field === 'quantidade' || field === 'precoUnitario') {
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
      }
    } else {
      recalcFromInsumos(next);
    }
    onChange(next);
  }, [composicao, onChange]);

  const insertPrecoHistorico = useCallback(async (preco: number, origem: string) => {
    if (!obraId || !company?.id || preco <= 0) return;
    try {
      await (supabase as any).from('preco_historico').insert({
        obra_id: obraId,
        company_id: company.id,
        descricao_insumo: composicao.descricao,
        descricao_normalizada: normalizarDescricao(composicao.descricao),
        unidade: composicao.unidade,
        preco_unitario: preco,
        origem,
        data_referencia: new Date().toISOString().split('T')[0],
      });
    } catch (e) {
      console.warn('[ComposicaoRow] preco_historico:', e);
    }
  }, [obraId, company?.id, composicao.descricao, composicao.unidade]);

  // onBlur pre├ºo
  const handlePrecoBlur = () => {
    const preco = localPreco ? parseFloat(localPreco) : null;
    update('precoUnitario', preco);
    if (preco && preco > 0 && fonteBadge === 'sugerido') {
      setFonteBadge('manual');
      onPriceBadge?.(composicao.id, 'manual');
      insertPrecoHistorico(preco, 'manual');
    } else if (preco && preco > 0 && !fonteBadge) {
      setFonteBadge('manual');
      onPriceBadge?.(composicao.id, 'manual');
      insertPrecoHistorico(preco, 'manual');
    }
  };

  // onBlur quantidade
  const handleQtdBlur = () => {
    const qtd = localQtd ? parseFloat(localQtd) : null;
    update('quantidade', qtd);
  };

  // Navega├º├úo teclado Enter ÔåÆ linha abaixo / Shift+Enter ÔåÆ linha acima
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'preco' | 'qtd') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move foco para pr├│ximo input na planilha (usando tabIndex natural)
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-planilha]'));
      const idx = inputs.indexOf(e.currentTarget);
      if (e.shiftKey) {
        inputs[idx - 1]?.focus();
      } else {
        // Buscar mesmo campo (preco ou qtd) na linha abaixo
        const dataField = e.currentTarget.getAttribute('data-field');
        const rowId = e.currentTarget.getAttribute('data-rowid');
        const allSameField = inputs.filter(i => i.getAttribute('data-field') === dataField);
        const rowIdx = allSameField.indexOf(e.currentTarget);
        allSameField[rowIdx + 1]?.focus();
      }
    }
  };

  // Insumos
  const makeInsumo = (): OrcamentoInsumo => ({
    id: crypto.randomUUID(),
    codigo: generateInsumoCodigo(composicao.codigo, composicao.insumos.map(s => s.codigo)),
    descricao: '',
    unidade: composicao.unidade || '',
    quantidade: null,
    precoUnitario: null,
    precoTotal: 0,
  });

  const toggleInsumos = (val: boolean) => {
    const next = { ...composicao, usaInsumos: val };
    if (val && next.insumos.length === 0) next.insumos = [makeInsumo()];
    recalcFromInsumos(next);
    onChange(next);
    if (val) setInsumosExpanded(true);
  };

  const updateInsumo = (idx: number, si: OrcamentoInsumo) => {
    const next = { ...composicao, insumos: [...composicao.insumos] };
    next.insumos[idx] = si;
    recalcFromInsumos(next);
    onChange(next);
  };

  const removeInsumo = (idx: number) => {
    const next = { ...composicao, insumos: composicao.insumos.filter((_, i) => i !== idx) };
    recalcFromInsumos(next);
    onChange(next);
  };

  const handleToggleFavorita = async () => {
    if (!obraId || savingFavorite || !company?.id) return;
    setSavingFavorite(true);
    try {
      if (isFavorite) {
        await (supabase as any).from('catalogo_composicoes').delete()
          .eq('nome', composicao.descricao).eq('company_id', company.id).eq('obra_origem_id', obraId);
        setIsFavorite(false);
        toast({ title: 'Removida da biblioteca' });
      } else {
        await (supabase as any).from('catalogo_composicoes').insert({
          nome: composicao.descricao, unidade: composicao.unidade,
          preco_medio: composicao.precoUnitario, company_id: company.id,
          is_modelo: false, origem: 'favorito', obra_origem_id: obraId,
        });
        setIsFavorite(true);
        toast({ title: 'Ô¡É Salva na Biblioteca!' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setSavingFavorite(false);
    }
  };

  const hasInsumos = composicao.usaInsumos;
  const isComputed = !readOnly && hasInsumos && !isSinapi;
  const isFullReadOnly = readOnly;
  const displayDescricao = isSinapi ? toSinapiDisplayName(composicao.descricao) : composicao.descricao;

  const INSUMO_LIMIT = 5;
  const insumosVisiveis = showAllInsumos ? composicao.insumos : composicao.insumos.slice(0, INSUMO_LIMIT);
  const insumosOcultos = composicao.insumos.length - INSUMO_LIMIT;

  const fonteBadgeConfig: Record<string, { label: string; cls: string }> = {
    sinapi: { label: 'SINAPI', cls: 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400' },
    historico: { label: 'Hist.', cls: 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400' },
    manual: { label: 'Manual', cls: 'border-border text-muted-foreground' },
    sugerido: { label: 'Sugerido', cls: 'border-amber-300 text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors' },
    biblioteca: { label: 'Cat├ílogo', cls: 'border-amber-300 text-amber-700 bg-amber-50' },
  };

  const showFonteBadge = fonteBadge && composicao.precoUnitario != null && composicao.precoUnitario > 0;
  const lotesCount = lotesIds.length;
  const { visual } = getNivelLayout(depth);

  return (
    <div 
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        'group/row border-b border-border/30 transition-colors relative',
        isSelected ? 'bg-primary/8 dark:bg-indigo-950/20' : 'hover:bg-muted/10',
        isNew && 'animate-in slide-in-from-top-1 fade-in duration-300',
        'border-l-2 border-l-slate-200 dark:border-l-slate-800',
        isSinapi && 'border-l-blue-400 dark:border-l-blue-600',
      )}
      {...attributes}
    >
      {/* ── Linha principal ── */}
      <div
        className={cn(
          `items-stretch`,
          visual.bgClass,
          PLANILHA_FLEX_ROW,
          isSinapi && 'border-l-2 border-l-blue-300',
        )}
        style={{ minHeight: '32px', height: '32px' }}
      >
        {/* Coluna 1: Drag + Código + Chevron + Descrição */}
        <div className={cn(CELL_DESC, "gap-0 px-1")}>
          {/* Spacer de Indentação exata */}
          {depth > 1 && <div style={{ width: `${(depth - 1) * 16}px` }} className="shrink-0" />}

          {/* Checkbox bulk — hover only */}
          {!readOnly && (
            <div className={cn(
              'flex items-center justify-center h-6 w-6 shrink-0 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'
            )}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
            </div>
          )}
          <span 
            {...listeners}
            className="flex justify-center items-center opacity-0 group-hover/row:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing transition-opacity text-muted-foreground shrink-0 w-5 outline-none"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          <div className="flex justify-center shrink-0 w-5">
            {/* Chevron sempre visível */}
            <button
              tabIndex={-1}
              onClick={(e) => {
                if (e.detail === 1) {
                  clickTimerRef.current = setTimeout(() => {
                    setInsumosExpanded(v => !v);
                  }, 250);
                }
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
                const next = !insumosExpanded;
                setInsumosExpanded(next);
                onDoubleClickChevron?.(next, depth, 'composicao');
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ChevronRight className={cn('h-3 w-3 transition-transform', insumosExpanded && 'rotate-90')} />
            </button>
          </div>
          
          <span className="text-[10px] font-mono text-muted-foreground shrink-0 mr-1 tabular-nums" title={composicao.codigo}>
            {composicao.codigo}
          </span>

          {/* Descrição */}
          {isFullReadOnly ? (
            <div
              ref={descRef}
              onMouseEnter={handleDescMouseEnter}
              onMouseLeave={() => setDescTooltip(v => ({ ...v, visible: false }))}
              className="flex-1 flex items-center px-1 truncate text-foreground h-full min-w-0"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              {lotesCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="shrink-0 mr-1 mt-[2px]">
                      <List className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Composição com variantes em lista</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="truncate">{displayDescricao}</span>
            </div>
          ) : (
            <div
              ref={descRef}
              onMouseEnter={handleDescMouseEnter}
              onMouseLeave={() => setDescTooltip(v => ({ ...v, visible: false }))}
              className="flex-1 h-full w-full flex items-center min-w-0 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5"
            >
              {lotesCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="shrink-0 pl-1 mr-1 mt-[2px]">
                      <List className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Composição com variantes em lista</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <DescricaoAutocompleteCell
                value={composicao.descricao}
                onChange={v => update('descricao', v)}
                sinapiConfig={sinapiConfig}
                companyId={company?.id}
                onSelect={(item: SearchItem) => {
                  // Preenche campos básicos
                  if (item.tipo === 'sinapi_composicao') {
                    update('descricao', item.descricao);
                    update('unidade', item.unidade);
                    update('precoUnitario', item.custo);
                    setFonteBadge('sinapi');
                    // Carrega insumos SINAPI
                    if (sinapiConfig.referencia_id) {
                      loadSinapi(item.codigo, {
                        referencia_id: sinapiConfig.referencia_id,
                        uf: sinapiConfig.uf,
                        regime: sinapiConfig.regime,
                      });
                    }
                  } else if (item.tipo === 'sinapi_insumo') {
                    update('descricao', item.descricao);
                    update('unidade', item.unidade);
                    update('precoUnitario', item.preco);
                    setFonteBadge('sinapi');
                    // Insumo direto — sem expansão de sub-insumos
                    limparPending();
                  } else if (item.tipo === 'biblioteca') {
                    update('descricao', item.descricao);
                    update('unidade', item.unidade);
                    update('precoUnitario', item.preco_medio > 0 ? item.preco_medio : null);
                    setFonteBadge('biblioteca');
                    // Carrega insumos da Biblioteca
                    if (company?.id) {
                      loadBiblioteca(item.id, company.id);
                    }
                  } else if (item.tipo === 'historico') {
                    update('descricao', item.descricao);
                    update('unidade', item.unidade);
                    update('precoUnitario', item.preco);
                    setFonteBadge('historico');
                    limparPending();
                  }
                  // Foca a célula de quantidade após seleção
                  setTimeout(() => qtdInputRef.current?.focus(), 100);
                }}
                onTab={() => qtdInputRef.current?.focus()}
              />
            </div>
          )}
        </div>

        {/* Tipo */}
        <div className={CELL_TIPO}>
          {(() => {
            const TIPO_STYLES: Record<string, { label: string; cls: string }> = {
              composicao:  { label: 'C',   cls: 'bg-violet-100 text-violet-700 border-violet-300' },
              material:    { label: 'MAT', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
              mao_obra:    { label: 'MO',  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
              equipamento: { label: 'EQP', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
              servico:     { label: 'SRV', cls: 'bg-purple-100 text-purple-700 border-purple-300' },
            };

            const tipoAtual = isInsumodireto
              ? ((composicao as any).tipo_item || 'material')
              : 'composicao';
            const cfg = TIPO_STYLES[tipoAtual] || TIPO_STYLES.composicao;

            const handleChangeTipo = (key: string) => {
              if (key === 'composicao') {
                // Virar composição com insumos
                const next = { ...composicao, tipo: 'composicao', usaInsumos: true } as any;
                if (next.insumos.length === 0) next.insumos = [makeInsumo()];
                onChange(next);
                setInsumosExpanded(true);
              } else {
                // Virar insumo direto
                if (composicao.usaInsumos && composicao.insumos.length > 0) {
                  if (!window.confirm(`Esta composição tem ${composicao.insumos.length} insumo(s) detalhado(s). Ao mudar para insumo direto eles serão removidos. Confirmar?`)) return;
                }
                onChange({ ...composicao, tipo: 'insumo_direto', tipo_item: key, usaInsumos: false, insumos: [] } as any);
              }
            };

            if (isFullReadOnly) {
              return (
                <Badge variant="outline" className={cn('text-[9px] font-bold px-1 py-0 h-4 rounded pointer-events-none', cfg.cls)}>
                  {cfg.label}
                </Badge>
              );
            }

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="focus:outline-none">
                    <Badge variant="outline" className={cn('text-[9px] font-bold px-1 py-0 h-4 rounded cursor-pointer hover:opacity-80 transition-opacity', cfg.cls)}>
                      {cfg.label}
                    </Badge>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 text-[11px]">
                  <DropdownMenuItem onClick={() => handleChangeTipo('composicao')} className="text-[11px] gap-2">
                    <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4', TIPO_STYLES.composicao.cls)}>C</Badge>
                    Composição (com insumos)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {(['material', 'mao_obra', 'equipamento', 'servico'] as const).map(key => (
                    <DropdownMenuItem key={key} onClick={() => handleChangeTipo(key)} className="text-[11px] gap-2">
                      <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4', TIPO_STYLES[key].cls)}>{TIPO_STYLES[key].label}</Badge>
                      {key === 'material' ? 'Material' : key === 'mao_obra' ? 'Mão de Obra' : key === 'equipamento' ? 'Equipamento' : 'Serviço'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>

        {/* Unidade */}
        {isFullReadOnly || isSinapi ? (
          <div className={cn(CELL_UN, "text-[10px] uppercase text-muted-foreground")}>{composicao.unidade}</div>
        ) : (
          <div className={cn(CELL_UN, "focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
            <Input
              value={composicao.unidade}
              onChange={e => update('unidade', e.target.value)}
              onFocus={e => e.target.select()}
              className="h-full text-[10px] uppercase px-1 text-center bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
              placeholder="Un"
            />
          </div>
        )}
        {/* Quantidade */}
        {isFullReadOnly || isComputed ? (
          <div className={cn(CELL_QTD, "text-muted-foreground tabular-nums px-1", "text-[13px]")}>{composicao.quantidade ?? '—'}</div>
        ) : (
          <div className={cn(CELL_QTD, "focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
            <input
              type="number"
              value={localQtd}
              onChange={e => setLocalQtd(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={handleQtdBlur}
              onKeyDown={e => handleKeyDown(e, 'qtd')}
              data-planilha="1"
              data-field="qtd"
              data-rowid={composicao.id}
              placeholder="Qtd"
              className="h-full w-full tabular-nums px-1.5 text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: '13px' }}
            />
          </div>
        )}

        {/* Preço unitário */}
        {isFullReadOnly || isComputed || isSinapi ? (
          <div className={cn(CELL_PUNIT, "gap-1 tabular-nums px-1 text-muted-foreground", "text-[13px]")}>
            {isSinapi && <Lock className="h-2.5 w-2.5 shrink-0 opacity-50" />}
            {composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '—'}
          </div>
        ) : (
          <div className={cn(CELL_PUNIT, "relative focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
            <input
              type="number"
              value={localPreco}
              onChange={e => setLocalPreco(e.target.value)}
              onFocus={e => e.target.select()}
              onBlur={handlePrecoBlur}
              onKeyDown={e => handleKeyDown(e, 'preco')}
              data-planilha="1"
              data-field="preco"
              data-rowid={composicao.id}
              placeholder="0,00"
              className="h-full w-full tabular-nums pl-5 pr-1 text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: '13px' }}
            />
          </div>
        )}

        {/* Preço total */}
        <div className={cn(
          CELL_TOTAL,
          'px-1 tabular-nums overflow-hidden',
          composicao.precoTotal > 0 ? 'text-foreground' : 'text-muted-foreground',
          'text-[13px]'
        )}>
          {bdiConfig?.enabled && composicao.precoTotal > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help decoration-dashed underline decoration-muted-foreground/50 underline-offset-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">
                  {composicao.precoTotal * (1 + bdiConfig.rate / 100) > 999999 ? formatCurrencyShort(composicao.precoTotal * (1 + bdiConfig.rate / 100)) : formatCurrency(composicao.precoTotal * (1 + bdiConfig.rate / 100))}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Preço Base: {formatCurrency(composicao.precoTotal)}<br/>
                  BDI ({bdiConfig.rate}%): {formatCurrency(composicao.precoTotal * (bdiConfig.rate / 100))}<br/>
                  Total c/ BDI: {formatCurrency(composicao.precoTotal * (1 + bdiConfig.rate / 100))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : composicao.precoTotal > 999999 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help underline decoration-dashed decoration-muted-foreground/50 underline-offset-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">
                  {formatCurrencyShort(composicao.precoTotal)}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {formatCurrency(composicao.precoTotal)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">{formatCurrency(composicao.precoTotal)}</span>
          )}
        </div>

        {/* Coluna 6: Ações — botões diretos */}
        <div className={cn(CELL_ACOES, "gap-0.5")}>
          {(!bulkActive && showFonteBadge && fonteBadge && !isSelected) && (
            <Badge
              variant="outline"
              className={cn('text-[9px] px-1 py-0 h-4 shrink-0 opacity-100 group-hover/row:opacity-0 transition-opacity pointer-events-none', fonteBadgeConfig[fonteBadge]?.cls)}
            >
              {fonteBadgeConfig[fonteBadge]?.label}
            </Badge>
          )}

          {!readOnly && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <button
                onClick={handleToggleFavorita}
                disabled={savingFavorite}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors disabled:opacity-30"
                title={isFavorite ? 'Remover Favorito' : 'Favoritar'}
              >
                <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-amber-500 text-amber-500')} />
              </button>

              <ListaCotacaoPopover
                composicaoId={composicao.id}
                insumoId={null}
                descricao={composicao.descricao}
                unidade={composicao.unidade}
                qtd={composicao.quantidade}
                precoTotal={composicao.precoTotal}
                obraId={obraId}
                onListasChange={() => {}}
                addedLotesIds={lotesIds}
              >
                <button
                  className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  title="Adicionar à lista de cotação"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                </button>
              </ListaCotacaoPopover>

              <button
                onClick={() => { /* TODO: duplicar */ }}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                title="Duplicar"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={onRemove}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Elementos fora do grid */}
      <datalist id={`un-comp-${composicao.id}`}>
        {unidades.map(u => <option key={u} value={u} />)}
      </datalist>

      {/* ── Painel de revisão de insumos (após seleção do autocomplete) ── */}
      {pendingInsumos !== null && !isFullReadOnly && (
        <div className="bg-muted/8 border-t border-border/30">
          {/* Barra de controle */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 bg-muted/20">
            <span className="text-[11px] font-medium text-foreground flex-1">
              {pendingInsumos === 'loading'
                ? 'Carregando insumos…'
                : `${pendingInsumos.length} insumo${pendingInsumos.length !== 1 ? 's' : ''} disponível${pendingInsumos.length !== 1 ? 'is' : ''}`
              }
            </span>
            {pendingInsumos !== 'loading' && (
              <>
                {pendingInsumos[0]?.origem === 'biblioteca' && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => {
                      const aceitos = pendingInsumos.filter(i => i.aceito);
                      const insumosConvertidos: OrcamentoInsumo[] = aceitos.map(i => ({
                        id: crypto.randomUUID(),
                        codigo: i.codigo ?? '',
                        descricao: i.descricao,
                        unidade: i.unidade ?? '',
                        quantidade: i.quantidade,
                        precoUnitario: i.preco_unitario,
                        precoTotal: (i.quantidade ?? 0) * (i.preco_unitario ?? 0),
                        tipo: 'insumo_direto' as const,
                        tipo_item: (i.tipo_item as any) ?? 'material',
                        insumos: [],
                        fonteReferencia: 'BIBLIOTECA',
                        usaInsumos: false,
                      }));
                      const next = { ...composicao, usaInsumos: insumosConvertidos.length > 0, insumos: insumosConvertidos };
                      onChange(next);
                      limparPending();
                      setInsumosExpanded(true);
                    }}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Confirmar Seleção
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => {
                    const insumosConvertidos: OrcamentoInsumo[] = pendingInsumos.map(i => ({
                      id: crypto.randomUUID(),
                      codigo: i.codigo ?? '',
                      descricao: i.descricao,
                      unidade: i.unidade ?? '',
                      quantidade: i.quantidade,
                      precoUnitario: i.preco_unitario,
                      precoTotal: (i.quantidade ?? 0) * (i.preco_unitario ?? 0),
                      tipo: 'insumo_direto' as const,
                      tipo_item: (i.tipo_item as any) ?? 'material',
                      insumos: [],
                      fonteReferencia: pendingInsumos[0]?.origem === 'sinapi' ? 'SINAPI' : 'BIBLIOTECA',
                      usaInsumos: false,
                    }));
                    const next = { ...composicao, usaInsumos: insumosConvertidos.length > 0, insumos: insumosConvertidos };
                    onChange(next);
                    limparPending();
                    setInsumosExpanded(true);
                  }}
                >
                  <CheckCheck className="h-3 w-3" />
                  Aceitar Todos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-destructive"
                  onClick={rejeitarTodos}
                >
                  <X className="h-3 w-3" />
                  Rejeitar
                </Button>
              </>
            )}
          </div>

          {/* Skeleton ou lista */}
          {pendingInsumos === 'loading' ? (
            <InsumoSkeletonRow count={4} />
          ) : (
            <div className="divide-y divide-border/10">
              {pendingInsumos.map((ins, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors',
                    ins.aceito ? 'opacity-100' : 'opacity-40 line-through',
                    ins.origem === 'biblioteca' && 'hover:bg-muted/10 cursor-pointer'
                  )}
                  onClick={() => ins.origem === 'biblioteca' && toggleAceito(idx)}
                >
                  {ins.origem === 'biblioteca' && (
                    <Checkbox
                      checked={ins.aceito}
                      onCheckedChange={() => toggleAceito(idx)}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                  )}
                  <span className="flex-1 truncate text-foreground">{ins.descricao}</span>
                  <span className="text-muted-foreground shrink-0">{ins.unidade}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0 w-16 text-right">
                    {ins.quantidade != null ? ins.quantidade : '—'}
                  </span>
                  <span className="tabular-nums text-foreground shrink-0 w-20 text-right">
                    {ins.preco_unitario != null ? formatCurrency(ins.preco_unitario) : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Insumos confirmados (sub-linhas) ── */}
      {insumosExpanded && !isInsumodireto && (
        <div className="bg-muted/5 border-t border-border/20">
          {insumosVisiveis.map((si, idx) => (
            <InsumoRowDense
              key={si.id}
              insumo={si}
              unidades={unidades}
              onChange={s => updateInsumo(idx, s)}
              onRemove={() => removeInsumo(idx)}
              obraId={obraId}
              readOnly={readOnly || isSinapi}
              priceSuggestionEnabled={priceSuggestionEnabled}
              onPriceBadge={onPriceBadge}
              depth={depth + 1}
              onOpenCatalogo={onOpenCatalogo}
              isSelected={globalSelectedIds?.has(si.id)}
              onToggleSelect={() => onToggleSelectGlobal?.(si.id)}
              bulkActive={bulkActive}
            />
          ))}
          {composicao.insumos.length === 0 && !readOnly && !isSinapi && (
            <InsumoRowDense
              placeholder
              insumo={makeInsumo()}
              unidades={unidades}
              onChange={s => { const next = { ...composicao, insumos: [s] }; onChange(next); }}
              onRemove={() => {}}
              readOnly={false}
            />
          )}
          {insumosOcultos > 0 && !showAllInsumos && (
            <button
              tabIndex={-1}
              onClick={() => setShowAllInsumos(true)}
              className="w-full text-center py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ver mais ({insumosOcultos}) ↓
            </button>
          )}
          {!readOnly && !isSinapi && composicao.insumos.length > 0 && (
            <button
              tabIndex={-1}
              onClick={() => { const next = { ...composicao, insumos: [...composicao.insumos, makeInsumo()] }; onChange(next); }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/row:opacity-100"
            >
              <Plus className="h-3 w-3" />
              Adicionar insumo
            </button>
          )}
        </div>
      )}

    </div>
  );
}
