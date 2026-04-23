import { useState, useEffect, useRef } from 'react';
import { OrcamentoInsumo } from '@/contexts/OrcamentoContext';
import { cn } from '@/lib/utils';
import { Search, ClipboardList, Trash2, Settings2, Box, Users, Truck, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { formatCurrency, formatCurrencyShort } from '@/data/mockData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import SinapiPricePopover from './SinapiPricePopover';
import ListaCotacaoPopover from './ListaCotacaoPopover';
import { usePriceSuggestion } from '@/hooks/usePriceSuggestion';
import { useCompany } from '@/contexts/CompanyContext';

interface Props {
  insumo: OrcamentoInsumo;
  unidades: string[];
  onChange: (updated: OrcamentoInsumo) => void;
  onRemove: () => void;
  obraId?: string;
  readOnly?: boolean;
  priceSuggestionEnabled?: boolean;
  onPriceBadge?: (id: string, badge: string | null) => void;
  onOpenCatalogo?: (tab?: string, query?: string) => void;
}

import { PLANILHA_GRID } from './planilhaGrid';

export const INSUMO_DENSE_GRID = PLANILHA_GRID;

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  material: { label: 'Material', icon: Box, color: 'text-blue-500' },
  mao_obra: { label: 'Mão de Obra', icon: Users, color: 'text-amber-500' },
  equipamento: { label: 'Equipamento', icon: Truck, color: 'text-emerald-500' },
  servico: { label: 'Serviço', icon: Wrench, color: 'text-purple-500' },
};

export default function InsumoRowDense({
  insumo, unidades, onChange, onRemove, obraId, readOnly,
  priceSuggestionEnabled = false, onPriceBadge, onOpenCatalogo,
}: Props) {
  const [suggestions, setSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [localQtd, setLocalQtd] = useState(insumo.quantidade != null ? String(insumo.quantidade) : '');
  const [localPreco, setLocalPreco] = useState(insumo.precoUnitario != null ? String(insumo.precoUnitario) : '');

  const qInputRef = useRef<HTMLInputElement>(null);
  const pInputRef = useRef<HTMLInputElement>(null);

  // Busca sugestões de materiais
  useEffect(() => {
    const fetchSuggestions = async () => {
      const { data } = await supabase
        .from('precos_fornecedores')
        .select('descricao_item_snapshot')
        .limit(200);
      if (data) {
        const unique = new Map<string, string>();
        data.forEach((d: { descricao_item_snapshot: string | null }) => {
          const desc = d.descricao_item_snapshot || '';
          if (desc && !unique.has(desc.toLowerCase())) unique.set(desc.toLowerCase(), desc);
        });
        setSuggestions(
          Array.from(unique.values()).map((label) => ({ label, value: label.toLowerCase() }))
        );
      }
    };
    fetchSuggestions();
  }, []);

  const { company } = useCompany();

  // Sugestão Automática
  const { suggestedPrice, clearSuggestion } = usePriceSuggestion(
    insumo.descricao,
    insumo.unidade || '',
    priceSuggestionEnabled,
    insumo.precoUnitario,
    company?.id
  );

  type FonteBadge = 'sinapi' | 'historico' | 'manual' | 'sugerido' | 'biblioteca' | null;
  const [fonteBadge, setFonteBadge] = useState<FonteBadge>(null);

  const fonteBadgeConfig: Record<string, { label: string; cls: string }> = {
    sinapi: { label: 'SINAPI', cls: 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400' },
    historico: { label: 'Hist.', cls: 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400' },
    manual: { label: 'Manual', cls: 'border-border text-muted-foreground' },
    sugerido: { label: 'Sugerido', cls: 'border-amber-300 text-amber-700 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors' },
    biblioteca: { label: 'Catálogo', cls: 'border-amber-300 text-amber-700 bg-amber-50' },
  };

  useEffect(() => {
    if (suggestedPrice != null && insumo.precoUnitario == null && priceSuggestionEnabled) {
      setLocalPreco(String(suggestedPrice));
      const next = { ...insumo, precoUnitario: suggestedPrice } as OrcamentoInsumo;
      if (next.quantidade) next.precoTotal = next.quantidade * suggestedPrice;
      onChange(next);
      setFonteBadge('sugerido');
      onPriceBadge?.(insumo.id, 'sugerido');
      clearSuggestion();
    }
  }, [suggestedPrice, insumo, priceSuggestionEnabled, onChange, onPriceBadge, clearSuggestion]);

  const update = (field: keyof OrcamentoInsumo, value: any) => {
    const next = { ...insumo, [field]: value };
    if (field === 'quantidade' || field === 'precoUnitario') {
      const q = next.quantidade ?? 0;
      const p = next.precoUnitario ?? 0;
      next.precoTotal = q * p;
    }
    onChange(next);
  };

  const handleDescricaoChange = (val: string) => update('descricao', val);

  const commitQtd = () => {
    if (!localQtd) {
      update('quantidade', null);
      return;
    }
    const val = parseFloat(localQtd.replace(',', '.'));
    if (!isNaN(val)) update('quantidade', val);
    else update('quantidade', null);
  };

  const commitPreco = () => {
    let preco: number | null = null;
    if (localPreco) {
      const val = parseFloat(localPreco.replace(',', '.'));
      if (!isNaN(val)) preco = val;
    }
    update('precoUnitario', preco);
    
    if (preco && preco > 0 && fonteBadge === 'sugerido') {
      setFonteBadge('manual');
      onPriceBadge?.(insumo.id, 'manual');
      // Historico insert omitido para insumo para simplificar ou pode ser adicionado
    } else if (preco && preco > 0 && !fonteBadge) {
      setFonteBadge('manual');
      onPriceBadge?.(insumo.id, 'manual');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: 'qtd' | 'preco') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'qtd') commitQtd();
      else {
        commitPreco();
        // T2: Jump to next preco input
        const inputs = Array.from(document.querySelectorAll('input[data-planilha="1"][data-field="preco"]')) as HTMLElement[];
        const index = inputs.indexOf(e.target as HTMLElement);
        if (index > -1 && index + 1 < inputs.length) {
          inputs[index + 1].focus();
        }
      }
    }
  };

  const handleUsarPreco = (preco: number, source: string, confidence?: string) => {
    const next = { ...insumo, precoUnitario: preco, precoTotal: preco * (insumo.quantidade || 0) };
    if (source === 'sinapi') {
      next.sinapiPreco = preco;
      next.sinapiConfirmado = true;
      next.sinapiConfidence = confidence;
      next.sinapiFonte = 'SINAPI IA';
    }
    onChange(next);
    setLocalPreco(String(preco));
    setFonteBadge(source as FonteBadge);
    onPriceBadge?.(insumo.id, source);
  };

  const [lotesIds, setLotesIds] = useState<string[]>([]);
  useEffect(() => {
    const fetchListas = async () => {
      if (!obraId || !insumo.id) return;
      const { data } = await supabase
        .from('cotacao_lote_itens')
        .select('lote_id')
        .eq('item_origem_id', insumo.id);
      if (data) {
        setLotesIds(data.map(d => d.lote_id));
      }
    };
    fetchListas();
  }, [obraId, insumo.id]);

  const tipo = insumo.tipo_item || 'material';
  const conf = TIPO_CONFIG[tipo] || TIPO_CONFIG.material;
  const TipoIcon = conf.icon;

  const temQtd = insumo.quantidade != null && insumo.quantidade > 0;
  const temPreco = insumo.precoUnitario != null && insumo.precoUnitario > 0;

  let dotColor = 'bg-[#ef4444]';
  let dotTooltip = `Sem quantidade e sem preço — ${conf.label}`;
  let dotClass = 'opacity-100';

  if (temQtd && temPreco) {
    dotColor = 'bg-[#10b981]';
    dotTooltip = `Preenchido — ${conf.label}`;
    dotClass = 'opacity-40 group-hover:opacity-100 transition-opacity duration-200';
  } else if (temQtd || temPreco) {
    dotColor = 'bg-[#f59e0b]';
    dotTooltip = `Falta ${temQtd ? 'preço' : 'quantidade'} — ${conf.label}`;
    dotClass = 'opacity-100';
  }

  return (
    <div className={cn(
      'grid items-center gap-0 group transition-colors border-b border-border/10 last:border-b-0',
      'odd:bg-[#f8f9fa] even:bg-[#f2f4f6] dark:odd:bg-slate-900/40 dark:even:bg-slate-900/60 hover:bg-primary/5 focus-within:bg-primary/5 min-h-[28px] h-[28px]',
      INSUMO_DENSE_GRID
    )}>
      {/* Coluna 1: Dot de Tipo + Descrição (1fr) */}
      <div className="h-full flex items-center border-r border-border/60 pl-[20px] pr-1 py-0.5 min-w-0 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
        <div className="flex items-center h-full py-0.5 shrink-0 mr-1.5 pl-1">
          {readOnly ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn('h-1.5 w-1.5 rounded-full mr-1.5', dotColor, dotClass)} />
                </TooltipTrigger>
                <TooltipContent side="right" className="text-[11px]">{dotTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button tabIndex={-1} className="flex items-center justify-center h-4 w-4 rounded-sm hover:bg-muted focus:outline-none mr-1">
                        <div className={cn('h-1.5 w-1.5 rounded-full', dotColor, dotClass)} />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-[11px]">{dotTooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="start" className="w-40 text-[11px]">
                {Object.entries(TIPO_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem key={key} onClick={() => update('tipo_item', key)} className="text-[11px] gap-2">
                      <Icon className={cn('h-3 w-3', config.color)} />
                      {config.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {readOnly ? (
          <div className="truncate w-full" style={{ fontSize: '11px', fontWeight: 400, color: 'hsl(var(--foreground) / 0.8)' }}>{insumo.descricao}</div>
        ) : (
          <AutocompleteInput
            suggestions={suggestions}
            value={insumo.descricao}
            onChange={handleDescricaoChange}
            placeholder="Descrição do insumo"
            className="h-6 w-full px-1 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
            style={{ fontSize: '11px', fontWeight: 400, color: 'hsl(var(--foreground) / 0.8)' }}
          />
        )}
      </div>

      {/* 3. Unidade (52px) */}
      <div className="h-full flex items-center justify-center border-r border-border/60 px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
        {readOnly ? (
          <div className="text-[10px] text-muted-foreground text-center uppercase w-full">{insumo.unidade}</div>
        ) : (
          <div className="w-full">
            <input
              value={insumo.unidade}
              onChange={(e) => update('unidade', e.target.value)}
              className="h-6 w-full text-[10px] uppercase text-center bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none"
              placeholder="UN"
              list={`un-ins-${insumo.id}`}
            />
            <datalist id={`un-ins-${insumo.id}`}>
              {unidades.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
        )}
      </div>

      {/* 4. Quantidade (72px) */}
      <div className="h-full flex items-center border-r border-border/60 px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
        {readOnly ? (
          <div className="tabular-nums text-right w-full" style={{ fontSize: '11px', fontWeight: 400 }}>{insumo.quantidade ?? '—'}</div>
        ) : (
          <input
            ref={qInputRef}
            type="number"
            value={localQtd}
            onChange={e => setLocalQtd(e.target.value)}
            onBlur={commitQtd}
            onKeyDown={e => handleKeyDown(e, 'qtd')}
            data-planilha="1"
            data-field="qtd"
            className="h-6 w-full tabular-nums text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Qtd"
            style={{ fontSize: '11px', fontWeight: 400 }}
          />
        )}
      </div>

      {/* 5. Preço Unit (88px) */}
      <div className="h-full flex items-center border-r border-border/60 px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5">
        {readOnly ? (
          <div className="tabular-nums text-right text-muted-foreground w-full" style={{ fontSize: '11px', fontWeight: 400 }}>
            {insumo.precoUnitario != null ? formatCurrency(insumo.precoUnitario) : '—'}
          </div>
        ) : (
          <div className="relative w-full">
            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none">R$</span>
            <input
              ref={pInputRef}
              data-planilha="1"
              data-field="preco"
              type="number"
              value={localPreco}
              onChange={e => setLocalPreco(e.target.value)}
              onBlur={commitPreco}
              onKeyDown={e => handleKeyDown(e, 'preco')}
              className="h-6 w-full tabular-nums text-right pl-4 pr-1 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0,00"
              style={{ fontSize: '11px', fontWeight: 400 }}
            />
          </div>
        )}
      </div>

      {/* 6. Preço Total (88px) */}
      <div className={cn('h-full flex items-center justify-end border-r border-border/60 px-1 py-0.5 tabular-nums overflow-hidden text-ellipsis whitespace-nowrap', insumo.precoTotal > 0 ? 'text-foreground' : 'text-muted-foreground/50')} style={{ fontSize: '11px', fontWeight: 400 }}>
        {insumo.precoTotal > 999999 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="cursor-help underline decoration-dashed decoration-muted-foreground/50 underline-offset-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">
                {formatCurrencyShort(insumo.precoTotal)}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {formatCurrency(insumo.precoTotal)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">{formatCurrency(insumo.precoTotal)}</span>
        )}
      </div>

      {/* Coluna 6: Ações (Badges + SINAPI + Lista + Remover) */}
      <div className="h-full flex items-center justify-end gap-0.5 px-1 py-0.5">
        {/* Badge */}
        {lotesIds.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[9px] px-1 py-0.5 rounded border border-primary/30 text-primary bg-primary/5 font-medium cursor-default truncate max-w-full">
                  📋 {lotesIds.length > 1 ? `${lotesIds.length} listas` : 'lista'}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">Em {lotesIds.length} lista{lotesIds.length > 1 ? 's' : ''} de cotação</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : fonteBadge ? (
          <Badge 
            variant="outline" 
            className={cn('text-[9px] px-1 py-0 h-4 shrink-0', fonteBadgeConfig[fonteBadge]?.cls)}
            onClick={fonteBadge === 'sugerido' ? commitPreco : undefined}
          >
            {fonteBadgeConfig[fonteBadge]?.label}
          </Badge>
        ) : insumo.sinapiConfirmado ? (
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 shrink-0', fonteBadgeConfig.sinapi?.cls)}>
            SINAPI
          </Badge>
        ) : null}

        {/* SINAPI */}
        {!readOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  tabIndex={-1}
                  onClick={() => onOpenCatalogo?.('sinapi', insumo.descricao)}
                  className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Search className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px]">Buscar preço</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Lista */}
        {!readOnly && (
          <TooltipProvider>
            <Tooltip>
              <ListaCotacaoPopover
                composicaoId={null}
                insumoId={insumo.id}
                descricao={insumo.descricao}
                unidade={insumo.unidade}
                qtd={insumo.quantidade}
                precoTotal={insumo.precoTotal}
                obraId={obraId}
                onListasChange={setLotesIds}
                addedLotesIds={lotesIds}
              >
                <TooltipTrigger asChild>
                  <button tabIndex={-1} className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                    <ClipboardList className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
              </ListaCotacaoPopover>
              <TooltipContent side="top" className="text-[11px]">Adicionar a cotação</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Remover */}
        {!readOnly && (
          <button tabIndex={-1} onClick={onRemove} className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
