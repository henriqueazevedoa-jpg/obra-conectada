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
import {
  Trash2, Plus, ChevronRight, Star, Search, ClipboardList,
  MoreHorizontal, GripVertical, Lock,
} from 'lucide-react';
import InsumoRowDense from './InsumoRowDense';
import { formatCurrency } from '@/data/mockData';
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

  // onBlur local state
  const [localPreco, setLocalPreco] = useState<string>(
    composicao.precoUnitario != null ? String(composicao.precoUnitario) : ''
  );
  const [localQtd, setLocalQtd] = useState<string>(
    composicao.quantidade != null ? String(composicao.quantidade) : ''
  );

  // Fonte badge
  type FonteBadge = 'sinapi' | 'historico' | 'manual' | null;
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

  // Quando SinapiPricePopover "Usar" é clicado
  const handleUsarPreco = (preco: number, fonte: 'sinapi' | 'historico' | 'biblioteca') => {
    setLocalPreco(String(preco));
    update('precoUnitario', preco);
    setFonteBadge(fonte as FonteBadge);
    onPriceBadge?.(composicao.id, fonte);
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
      isSinapi && 'border-l-2 border-l-blue-200 dark:border-l-blue-800',
    )}>
      {/* ── Linha principal ── */}
      <div
        className={cn(
          `grid ${PLANILHA_GRID} items-center gap-0 bg-background`,
          isSinapi && 'bg-blue-50/20 dark:bg-blue-950/10',
        )}
        style={{ minHeight: '32px', height: '32px' }}
      >
        {/* Coluna 1: Drag + Código + Chevron + Descrição */}
        <div className="flex items-center gap-1 h-full px-1 border-r border-border/60 min-w-0">
          {/* Drag handle */}
          <span className="flex items-center justify-center opacity-0 group-hover/row:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing transition-opacity text-muted-foreground shrink-0 w-[20px]">
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          {/* Chevron se tem insumos */}
          <div className="flex items-center shrink-0">
            {hasInsumos && !isInsumodireto && (
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
          {isFullReadOnly || isSinapi ? (
            <div className="flex-1 flex items-center px-1 truncate text-foreground h-full" style={{ fontSize: '12px', fontWeight: 500 }} title={displayDescricao}>
              {displayDescricao}
            </div>
          ) : (
            <div className="flex-1 h-full flex items-center min-w-0 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
              <Input
                value={composicao.descricao}
                onChange={e => update('descricao', e.target.value)}
                className="h-full w-full px-1.5 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
                style={{ fontSize: '12px', fontWeight: 500 }}
                placeholder="Descrição"
              />
            </div>
          )}
        </div>

        {/* Unidade */}
        {isFullReadOnly || isSinapi ? (
          <div className="h-full flex items-center justify-center text-[10px] uppercase px-1 text-center text-muted-foreground border-r border-border/60">{composicao.unidade}</div>
        ) : (
          <div className="h-full flex items-center justify-center border-r border-border/60 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
            <Input
              value={composicao.unidade}
              onChange={e => update('unidade', e.target.value)}
              className="h-full text-[10px] uppercase px-1 text-center bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
              placeholder="Un"
              list={`un-comp-${composicao.id}`}
            />
          </div>
        )}
        {/* Quantidade */}
        {isFullReadOnly || isComputed ? (
          <div className="h-full flex items-center justify-end px-1 text-right text-muted-foreground tabular-nums border-r border-border/60" style={{ fontSize: '12px', fontWeight: 500 }}>{composicao.quantidade ?? '—'}</div>
        ) : (
          <div className="h-full flex items-center border-r border-border/60 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
            <input
              type="number"
              value={localQtd}
              onChange={e => setLocalQtd(e.target.value)}
              onBlur={handleQtdBlur}
              onKeyDown={e => handleKeyDown(e, 'qtd')}
              data-planilha="1"
              data-field="qtd"
              data-rowid={composicao.id}
              placeholder="Qtd"
              className="h-full w-full tabular-nums px-1.5 text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
          </div>
        )}

        {/* Preço unitário */}
        {isFullReadOnly || isComputed || isSinapi ? (
          <div className="h-full flex items-center justify-end gap-1 tabular-nums px-1 text-muted-foreground border-r border-border/60" style={{ fontSize: '12px', fontWeight: 500 }}>
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
              onBlur={handlePrecoBlur}
              onKeyDown={e => handleKeyDown(e, 'preco')}
              data-planilha="1"
              data-field="preco"
              data-rowid={composicao.id}
              placeholder="0,00"
              className="h-full w-full tabular-nums pl-5 pr-1 text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ fontSize: '12px', fontWeight: 500 }}
            />
          </div>
        )}

        {/* Preço total */}
        <div className={cn(
          'h-full flex items-center justify-end px-1 text-right tabular-nums border-r border-border/60',
          composicao.precoTotal > 0 ? 'text-foreground' : 'text-muted-foreground'
        )} style={{ fontSize: '12px', fontWeight: 500 }}>
          {bdiConfig?.enabled && composicao.precoTotal > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-help decoration-dashed underline decoration-muted-foreground/50 underline-offset-2">
                  {formatCurrency(composicao.precoTotal * (1 + bdiConfig.rate / 100))}
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Preço Base: {formatCurrency(composicao.precoTotal)}<br/>
                  BDI ({bdiConfig.rate}%): {formatCurrency(composicao.precoTotal * (bdiConfig.rate / 100))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            formatCurrency(composicao.precoTotal)
          )}
        </div>

        {/* Coluna 6: Ações (Badges + Favorito + SINAPI + Lista + Bulk + Menu) */}
        <div className="h-full flex items-center justify-end gap-0.5 px-1">
          {lotesCount > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[9px] px-1 py-0.5 rounded border border-primary/30 text-primary bg-primary/5 font-medium cursor-default truncate max-w-full">
                    📋 {lotesCount > 1 ? `${lotesCount} listas` : 'lista'}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Em {lotesCount} lista{lotesCount > 1 ? 's' : ''} de cotação</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : showFonteBadge && fonteBadge ? (
            <Badge 
              variant="outline" 
              className={cn('text-[9px] px-1 py-0 h-4 shrink-0', fonteBadgeConfig[fonteBadge]?.cls)}
              onClick={fonteBadge === 'sugerido' ? handlePrecoBlur : undefined}
            >
              {fonteBadgeConfig[fonteBadge]?.label}
            </Badge>
          ) : null}

          {/* Bulk Checkbox */}
          {bulkActive && (
            <div className="flex items-center justify-center h-6 w-6 shrink-0">
              <Checkbox 
                checked={isSelected} 
                onCheckedChange={onToggleSelect}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
            </div>
          )}

          {/* Botão ⭐ Favorito */}
          {!readOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  tabIndex={-1}
                  onClick={handleToggleFavorita}
                  disabled={savingFavorite}
                  className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors opacity-0 group-hover/row:opacity-100 disabled:opacity-50"
                >
                  <Star className={cn('h-3 w-3', isFavorite && 'fill-amber-500 text-amber-500')} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">
                {isFavorite ? 'Remover da biblioteca' : 'Salvar na biblioteca'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Botão 🔍 SINAPI */}
        {!readOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  tabIndex={-1}
                  onClick={() => onOpenCatalogo?.('sinapi', composicao.descricao)}
                  className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors opacity-0 group-hover/row:opacity-100"
                >
                  <Search className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">Buscar preço no SINAPI ou histórico</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Botão 📋 Lista */}
        {!readOnly && (
          <TooltipProvider>
            <Tooltip>
              <ListaCotacaoPopover
                composicaoId={composicao.id}
                descricao={composicao.descricao}
                unidade={composicao.unidade}
                qtd={composicao.quantidade}
                precoTotal={composicao.precoTotal}
                obraId={obraId}
                onListasChange={setLotesIds}
                addedLotesIds={lotesIds}
              >
                <TooltipTrigger asChild>
                  <button tabIndex={-1} className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors opacity-0 group-hover/row:opacity-100">
                    <ClipboardList className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
              </ListaCotacaoPopover>
              <TooltipContent side="top" className="text-[11px]">Adicionar a lista de cotação</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Menu ⋯ */}
        {!readOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button tabIndex={-1} className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover/row:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-[11px]">
              {!isInsumodireto && (
                <DropdownMenuItem className="text-[11px] gap-2" onClick={() => toggleInsumos(!hasInsumos)}>
                  {hasInsumos ? 'Remover insumos' : 'Detalhar em insumos'}
                </DropdownMenuItem>
              )}
              {onGoCotacao && (
                <DropdownMenuItem className="text-[11px] gap-2" onClick={() => onGoCotacao(composicao.descricao)}>
                  Ir para Cotação
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[11px] gap-2 text-destructive focus:text-destructive" onClick={onRemove}>
                <Trash2 className="h-3 w-3" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : <div className="w-6 shrink-0" />}
      </div>
      {/* Fecha grid container */}
      </div>
      
      {/* Elementos fora do grid */}
      <datalist id={`un-comp-${composicao.id}`}>
        {unidades.map(u => <option key={u} value={u} />)}
      </datalist>

      {/* ── Insumos (sub-linhas com indent 24px) ── */}
      {hasInsumos && insumosExpanded && !isInsumodireto && (
        <div className="pl-6 bg-muted/5 border-t border-border/20">
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
          {insumosOcultos > 0 && !showAllInsumos && (
            <button
              tabIndex={-1}
              onClick={() => setShowAllInsumos(true)}
              className="w-full text-center py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ver mais ({insumosOcultos}) ↓
            </button>
          )}
          {!readOnly && !isSinapi && (
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
