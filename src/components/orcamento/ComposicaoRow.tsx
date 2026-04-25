import { useState, useEffect, useRef, useCallback } from 'react';
import { OrcamentoComposicao, OrcamentoInsumo } from '@/contexts/OrcamentoContext';
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
} from 'lucide-react';
import InsumoRowDense from './InsumoRowDense';
import { formatCurrency, formatCurrencyShort } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import SinapiPricePopover from './SinapiPricePopover';
import ListaCotacaoPopover from './ListaCotacaoPopover';
import { usePriceSuggestion } from '@/hooks/usePriceSuggestion';
import { Checkbox } from '@/components/ui/checkbox';
import { BdiConfig } from './BdiPopover';


// ── Exports mantidos para retrocompatibilidade com InsumoRow ──────────────────

import { PLANILHA_GRID } from './planilhaGrid';
export const COMPOSICAO_GRID = PLANILHA_GRID;

export function toSinapiDisplayName(descricao: string): string {
  if (!descricao) return descricao;
  const LOWER = new Set(['de','da','do','das','dos','e','a','o','as','os','em','no','na','nos','nas','por','para','com','ou']);
  return descricao.toLowerCase().split(' ').map((w, i) =>
    i === 0 || !LOWER.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

function normalizarDescricao(d: string) {
  return d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Props ─────────────────────────────────────────────────────────────────────

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ComposicaoRow({
  composicao, unidades, onChange, onRemove, generateInsumoCodigo,
  obraId, readOnly, onGoCotacao, priceSuggestionEnabled = false,
  onPriceBadge, isNew = false,
  isSelected = false, onToggleSelect, bulkActive = false,
  bdiConfig, onOpenCatalogo,
}: Props) {
  const isSinapi = composicao.fonteReferencia === 'SINAPI';
  const isInsumodireto = composicao.tipo === 'insumo_direto';
  const [insumosExpanded, setInsumosExpanded] = useState(!isSinapi);
  const [showAllInsumos, setShowAllInsumos] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [lotesIds, setLotesIds] = useState<string[]>([]);
  const [descTooltip, setDescTooltip] = useState({ visible: false, text: '' });
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

  // Sync localPreco quando composicao muda externamente
  useEffect(() => {
    setLocalPreco(composicao.precoUnitario != null ? String(composicao.precoUnitario) : '');
  }, [composicao.id, composicao.precoUnitario]);

  useEffect(() => {
    setLocalQtd(composicao.quantidade != null ? String(composicao.quantidade) : '');
  }, [composicao.id, composicao.quantidade]);

  // Sugestão Automática
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

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  // onBlur preço
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

  // Navegação teclado Enter → linha abaixo / Shift+Enter → linha acima
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'preco' | 'qtd') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move foco para próximo input na planilha (usando tabIndex natural)
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
        toast({ title: '⭐ Salva na Biblioteca!' });
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
    biblioteca: { label: 'Catálogo', cls: 'border-amber-300 text-amber-700 bg-amber-50' },
  };

  const showFonteBadge = fonteBadge && composicao.precoUnitario != null && composicao.precoUnitario > 0;
  const lotesCount = lotesIds.length;

  return (
    <div className={cn(
      'group/row border-b border-border/30 transition-colors',
      isSelected ? 'bg-primary/8 dark:bg-indigo-950/20' : 'hover:bg-muted/10',
      isNew && 'animate-in slide-in-from-top-1 fade-in duration-300',
      'border-l-2 border-l-slate-200 dark:border-l-slate-800',
      isSinapi && 'border-l-blue-400 dark:border-l-blue-600',
    )}>
      {/* ── Linha principal ── */}
      <div
        className={cn(
          `grid ${PLANILHA_GRID} items-center gap-0 bg-background pl-4`,
          isSinapi && 'bg-blue-50/20 dark:bg-blue-950/10',
        )}
        style={{ minHeight: '32px', height: '32px' }}
      >
        {/* Coluna 1: Drag + Código + Chevron + Descrição */}
        <div className="flex items-center gap-1 h-full px-1 border-r border-border/60 min-w-0">
          <span className="flex items-center justify-center opacity-0 group-hover/row:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing transition-opacity text-muted-foreground shrink-0 w-[20px]">
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          <div className="flex items-center shrink-0">
            {/* Bloco 5: Chevron sempre visível */}
            {!isInsumodireto && (
              <button
                tabIndex={-1}
                onClick={() => setInsumosExpanded(v => !v)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <ChevronRight className={cn('h-3 w-3 transition-transform', insumosExpanded && 'rotate-90')} />
              </button>
            )}
            <span className="text-[10px] font-mono text-muted-foreground truncate" title={composicao.codigo}>
              {composicao.codigo}
            </span>
          </div>

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
              <Input
                value={composicao.descricao}
                onChange={e => update('descricao', e.target.value)}
                placeholder="Descrição"
                className="h-full w-full px-1.5 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none"
                style={{ fontSize: '13px', fontWeight: 500 }}
              />
            </div>
          )}
        </div>

        {/* Tipo */}
        <div className="h-full border-r border-border/60" />

        {/* Unidade */}
        {isFullReadOnly || isSinapi ? (
          <div className="h-full flex items-center justify-center text-[10px] uppercase px-1 text-center text-muted-foreground border-r border-border/60">{composicao.unidade}</div>
        ) : (
          <div className="h-full flex items-center justify-center border-r border-border/60 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
            <Input
              value={composicao.unidade}
              onChange={e => update('unidade', e.target.value)}
              onFocus={e => e.target.select()}
              className="h-full text-[10px] uppercase px-1 text-center bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
              placeholder="Un"
              list={`un-comp-${composicao.id}`}
            />
          </div>
        )}
        {/* Quantidade */}
        {isFullReadOnly || isComputed ? (
          <div className="h-full flex items-center justify-end px-1 text-right text-muted-foreground tabular-nums border-r border-border/60" style={{ fontSize: '13px' }}>{composicao.quantidade ?? '—'}</div>
        ) : (
          <div className="h-full flex items-center border-r border-border/60 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
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
          <div className="h-full flex items-center justify-end gap-1 tabular-nums px-1 text-muted-foreground border-r border-border/60" style={{ fontSize: '13px' }}>
            {isSinapi && <Lock className="h-2.5 w-2.5 shrink-0 opacity-50" />}
            {composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '—'}
          </div>
        ) : (
          <div className="relative h-full flex items-center border-r border-border/60 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
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
          'h-full flex items-center justify-end px-1 text-right tabular-nums border-r border-border/60 overflow-hidden text-ellipsis whitespace-nowrap',
          composicao.precoTotal > 0 ? 'text-foreground' : 'text-muted-foreground'
        )} style={{ fontSize: '13px' }}>
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

        {/* Coluna 6: Ações */}
        <div className="h-full flex items-center justify-center px-1 shrink-0">
          {(!bulkActive && showFonteBadge && fonteBadge && !isSelected) ? (
            <Badge 
              variant="outline" 
              className={cn('text-[9px] px-1 py-0 h-4 shrink-0', fonteBadgeConfig[fonteBadge]?.cls)}
              onClick={fonteBadge === 'sugerido' ? handlePrecoBlur : undefined}
            >
              {fonteBadgeConfig[fonteBadge]?.label}
            </Badge>
          ) : bulkActive || isSelected ? (
            <div className="flex items-center justify-center h-6 w-6 opacity-100 transition-opacity">
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={onToggleSelect}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
            </div>
          ) : !readOnly ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="opacity-0 group-hover/row:opacity-100 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end" onClick={e => e.stopPropagation()}>
                <button 
                  onClick={handleToggleFavorita}
                  disabled={savingFavorite}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                >
                  <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-amber-500 text-amber-500')} /> {isFavorite ? 'Remover Favorito' : 'Favoritar'}
                </button>
                <button 
                  onClick={() => { /* duplicate not implemented yet */ }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </button>
                {onGoCotacao && (
                  <button 
                    onClick={() => onGoCotacao(composicao.descricao)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Ir para Cotação
                  </button>
                )}
                {(!composicao.precoUnitario || composicao.precoUnitario === 0) && (
                  <button 
                    onClick={() => onOpenCatalogo?.('sinapi', composicao.descricao)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                  >
                    <Search className="h-3.5 w-3.5" /> Buscar SINAPI
                  </button>
                )}
                {!isInsumodireto && (
                  <button 
                    onClick={() => toggleInsumos(!hasInsumos)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left"
                  >
                    <Layers className="h-3.5 w-3.5" /> {hasInsumos ? 'Remover insumos' : 'Detalhar em insumos'}
                  </button>
                )}
                <div className="h-px bg-border/50 my-1 mx-1" />
                <button 
                  onClick={onRemove}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </PopoverContent>
            </Popover>
          ) : <div className="w-6 shrink-0" />}
      </div>
      {/* Fecha grid container */}
      </div>
      
      {/* Elementos fora do grid */}
      <datalist id={`un-comp-${composicao.id}`}>
        {unidades.map(u => <option key={u} value={u} />)}
      </datalist>

      {/* ── Insumos (sub-linhas com indent pl-8) ── */}
      {insumosExpanded && !isInsumodireto && (
        <div className="pl-8 bg-muted/5 border-t border-border/20">
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
              onOpenCatalogo={onOpenCatalogo}
            />
          ))}
          {/* Bloco 5: Placeholder se vazio */}
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
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
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
