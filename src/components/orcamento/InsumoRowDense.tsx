import { useState, useEffect, useRef } from 'react';
import { OrcamentoInsumo } from '@/contexts/OrcamentoContext';
import { cn } from '@/lib/utils';
import { Trash2, Box, Users, Truck, Wrench, X, List, Copy, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { formatCurrency, formatCurrencyShort } from '@/data/mockData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import ListaCotacaoPopover from './ListaCotacaoPopover';
import { usePriceSuggestion } from '@/hooks/usePriceSuggestion';
import { useCompany } from '@/contexts/CompanyContext';
import { HelpCircle } from 'lucide-react';
import { BdiConfig } from './BdiPopover';

interface Props {
  insumo: OrcamentoInsumo;
  unidades: string[];
  onChange: (updated: OrcamentoInsumo) => void;
  onRemove: () => void;
  onDiscard?: () => void;
  obraId?: string;
  readOnly?: boolean;
  priceSuggestionEnabled?: boolean;
  onPriceBadge?: (id: string, badge: string | null) => void;
  onOpenCatalogo?: (tab?: string, query?: string) => void;
  placeholder?: boolean;
  // Bulk selection
  isSelected?: boolean;
  onToggleSelect?: () => void;
  bulkActive?: boolean;
  bdiConfig?: BdiConfig;
}
import { 
  PLANILHA_FLEX_ROW, CELL_DESC, CELL_TIPO, CELL_UN, 
  CELL_QTD, CELL_PUNIT, CELL_TOTAL, CELL_ACOES, getNivelLayout 
} from './planilhaGrid';

const TIPO_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  material: { label: 'Material', icon: Box, color: 'text-blue-500' },
  mao_obra: { label: 'Mão de Obra', icon: Users, color: 'text-amber-500' },
  equipamento: { label: 'Equipamento', icon: Truck, color: 'text-emerald-500' },
  servico: { label: 'Serviço', icon: Wrench, color: 'text-purple-500' },
};

export default function InsumoRowDense({
  insumo, unidades, onChange, onRemove, onDiscard, obraId, readOnly,
  priceSuggestionEnabled = false, onPriceBadge, onOpenCatalogo, placeholder,
  isSelected = false, onToggleSelect, bulkActive = false,
  depth = 3,
}: Props) {
  const [suggestions, setSuggestions] = useState<{ label: string; value: string }[]>([]);
  const [localQtd, setLocalQtd] = useState(insumo.quantidade != null ? String(insumo.quantidade) : '');
  const [localPreco, setLocalPreco] = useState(insumo.precoUnitario != null ? insumo.precoUnitario.toFixed(2) : '');

  const qInputRef = useRef<HTMLInputElement>(null);
  const pInputRef = useRef<HTMLInputElement>(null);

  // Auto-detecção de MO
  const [isMoDetected, setIsMoDetected] = useState(false);
  useEffect(() => {
    const MO_KEYWORDS = [
      'pedreiro', 'servente', 'ajudante', 'operário', 'operario',
      'mão de obra', 'mao de obra', 'oficial', 'encanador',
      'eletricista', 'pintor', 'carpinteiro', 'armador'
    ];
    const lower = insumo.descricao.toLowerCase();
    const isMO = MO_KEYWORDS.some(k => lower.includes(k));
    setIsMoDetected(isMO && insumo.tipo_item === 'material');
  }, [insumo.descricao, insumo.tipo_item]);

  const BADGE_STYLES: Record<string, string> = {
    mao_obra: 'bg-amber-100 text-amber-700 border-amber-300',
    material: 'bg-blue-100 text-blue-700 border-blue-300',
    equipamento: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    servico: 'bg-purple-100 text-purple-700 border-purple-300',
  };
  const BADGE_LABEL: Record<string, string> = {
    mao_obra: 'MO', material: 'MAT', equipamento: 'EQP', servico: 'SRV',
  };

  const badgeClass = BADGE_STYLES[insumo.tipo_item] || BADGE_STYLES.material;
  const badgeLabel = BADGE_LABEL[insumo.tipo_item] || 'MAT';

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
      setLocalPreco(suggestedPrice.toFixed(2));
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
    if (!localQtd) { update('quantidade', null); return; }
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
    // Formatar com 2 casas decimais no campo
    if (preco != null) setLocalPreco(preco.toFixed(2));
    if (preco && preco > 0 && fonteBadge === 'sugerido') {
      setFonteBadge('manual');
      onPriceBadge?.(insumo.id, 'manual');
    } else if (preco && preco > 0 && !fonteBadge) {
      setFonteBadge('manual');
      onPriceBadge?.(insumo.id, 'manual');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
    if (e.key === 'Escape') { e.currentTarget.blur(); return; }
    if (e.key === 'Enter') {
      if (field === 'qtd') commitQtd();
      if (field === 'preco') commitPreco();
    }
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-planilha]'));
    const idx = inputs.indexOf(e.currentTarget as HTMLInputElement);
    if (idx === -1) return;
    if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowUp') {
      const dataField = e.currentTarget.getAttribute('data-field');
      const sameColInputs = inputs.filter(inp => inp.getAttribute('data-field') === dataField);
      const colIdx = sameColInputs.indexOf(e.currentTarget as HTMLInputElement);
      if (colIdx > 0) sameColInputs[colIdx - 1].focus();
    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
      const dataField = e.currentTarget.getAttribute('data-field');
      const sameColInputs = inputs.filter(inp => inp.getAttribute('data-field') === dataField);
      const colIdx = sameColInputs.indexOf(e.currentTarget as HTMLInputElement);
      if (colIdx !== -1 && colIdx < sameColInputs.length - 1) sameColInputs[colIdx + 1].focus();
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
    setLocalPreco(preco.toFixed(2));
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
      if (data) setLotesIds(data.map(d => d.lote_id));
    };
    fetchListas();
  }, [obraId, insumo.id]);

  const tipo = insumo.tipo_item || 'material';
  const conf = TIPO_CONFIG[tipo] || TIPO_CONFIG.material;

  const temQtd = insumo.quantidade != null && insumo.quantidade > 0;
  const temPreco = insumo.precoUnitario != null && insumo.precoUnitario > 0;

  const { visual } = getNivelLayout(depth);

  return (
    <div className={cn(
      "group/row text-[11px] hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
      visual.bgClass,
      'items-stretch group transition-colors border-b border-border/10 last:border-b-0',
      'hover:bg-primary/5 focus-within:bg-primary/5 h-[28px]',
      isSelected && 'bg-primary/8 dark:bg-indigo-950/20',
      insumo.pending && 'opacity-60',
      insumo.pending && insumo.sinapiCodigo && 'bg-amber-50/40 dark:bg-amber-950/20 odd:bg-amber-50/40 even:bg-amber-50/30',
      insumo.pending && !insumo.sinapiCodigo && 'bg-violet-50/40 dark:bg-violet-950/20 odd:bg-violet-50/40 even:bg-violet-50/30',
      placeholder && 'opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity',
      PLANILHA_FLEX_ROW
    )}>

      {/* ── Coluna 1: Checkbox + Código + Descrição ── */}
      <div
        className={cn(CELL_DESC, "pr-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:z-10 focus-within:bg-primary/5")}
      >
        {/* Spacer de Indentação — depth base + 16px extra em relação à composição */}
        {depth > 1 && <div style={{ width: `${(depth - 1) * 16 + 16}px` }} className="shrink-0" />}
        {!readOnly && (
          <div
            className={cn(
              "flex items-center justify-center h-6 w-6 shrink-0 cursor-pointer transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
            )}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            <Checkbox
              checked={isSelected}
              className="h-3.5 w-3.5 rounded-[2px] pointer-events-none"
            />
          </div>
        )}
        
        {/* Spacer invisível substituto de Drag (w-5) e Chevron (w-5) = w-10 */}
        <div className="shrink-0 w-10" />

        {/* Código do insumo */}
        <span
          className={cn("text-[10px] font-mono text-muted-foreground/50 shrink-0 mr-1 tabular-nums select-none", readOnly && "ml-7")}
          title={insumo.codigo}
        >
          {insumo.codigo}
        </span>

        {/* Ícone de lista de cotação */}
        {lotesIds.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="shrink-0 mr-1">
                <List className="h-3 w-3 text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent className="text-xs">Insumo com variantes em lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Descrição */}
        {readOnly ? (
          <div
            className="flex-1 truncate"
            style={{ fontSize: '11px', fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}
          >
            {insumo.descricao}
          </div>
        ) : (
          <AutocompleteInput
            suggestions={suggestions}
            value={insumo.descricao}
            onChange={handleDescricaoChange}
            onFocus={e => e.target.select()}
            onKeyDown={e => handleKeyDown(e, 'descricao')}
            data-planilha="1"
            data-field="descricao"
            placeholder="Descrição do insumo"
            className="h-6 flex-1 px-1 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 rounded-none shadow-none placeholder:text-transparent focus:placeholder:text-muted-foreground/50"
            style={{ fontSize: '11px', fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}
          />
        )}
      </div>

      {/* ── Coluna 2: Tipo Badge ── */}
      <div className={CELL_TIPO}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none relative" disabled={readOnly}>
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] font-bold px-1 py-0 h-4 rounded transition-opacity',
                  badgeClass,
                  !readOnly && 'cursor-pointer hover:opacity-80',
                  insumo.pending && 'animate-pulse'
                )}
              >
                {insumo.pending ? <HelpCircle className="w-2.5 h-2.5" /> : badgeLabel}
              </Badge>
              {(insumo.needsTypeReview || isMoDetected) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive cursor-help animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[11px] max-w-[200px]">
                      {isMoDetected
                        ? 'Detectamos possível mão de obra. Clique no badge para corrigir.'
                        : 'Tipo não identificado. Clique no badge para corrigir.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </button>
          </DropdownMenuTrigger>
          {!readOnly && (
            <DropdownMenuContent align="start" className="w-40 text-[11px]">
              {Object.entries(TIPO_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onChange({ ...insumo, tipo_item: key as any, needsTypeReview: false })}
                    className="text-[11px] gap-2"
                  >
                    <Icon className={cn('h-3 w-3', config.color)} />
                    {config.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>

      {/* ── Coluna 3: Unidade ── */}
      <div className={cn(CELL_UN, "px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
        {readOnly ? (
          <div className="text-[10px] text-muted-foreground text-center uppercase w-full">
            {insumo.unidade}
          </div>
        ) : (
          <input
            value={insumo.unidade}
            onChange={(e) => update('unidade', e.target.value)}
            onFocus={e => e.target.select()}
            onKeyDown={e => handleKeyDown(e, 'unidade')}
            data-planilha="1"
            data-field="unidade"
            className="h-6 w-full text-[10px] uppercase text-center bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none"
            placeholder="UN"
            list={`un-ins-${insumo.id}`}
          />
        )}
        <datalist id={`un-ins-${insumo.id}`}>
          {unidades.map((u) => <option key={u} value={u} />)}
        </datalist>
      </div>

      {/* ── Coluna 4: Quantidade ── */}
      <div className={cn(CELL_QTD, "px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
        {readOnly ? (
          <div className="tabular-nums text-right w-full text-muted-foreground" style={{ fontSize: '11px' }}>
            {insumo.quantidade ?? '—'}
          </div>
        ) : (
          <input
            ref={qInputRef}
            type="number"
            value={localQtd}
            onChange={e => setLocalQtd(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={commitQtd}
            onKeyDown={e => handleKeyDown(e, 'qtd')}
            data-planilha="1"
            data-field="qtd"
            className="h-6 w-full tabular-nums text-right bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-muted-foreground focus:text-foreground"
            placeholder="Qtd"
            style={{ fontSize: '11px' }}
          />
        )}
      </div>

      {/* ── Coluna 5: Preço Unitário ── */}
      <div className={cn(CELL_PUNIT, "px-1 py-0.5 focus-within:outline focus-within:outline-[1.5px] focus-within:outline-primary focus-within:outline-offset-[-1px] focus-within:relative focus-within:z-10 focus-within:bg-primary/5")}>
        {readOnly ? (
          <div className="tabular-nums text-right text-muted-foreground w-full" style={{ fontSize: '11px' }}>
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
              onFocus={e => e.target.select()}
              onBlur={commitPreco}
              onKeyDown={e => handleKeyDown(e, 'preco')}
              className="h-6 w-full tabular-nums text-right pl-4 pr-1 bg-transparent border-transparent focus:border-transparent focus:outline-none focus:ring-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-muted-foreground focus:text-foreground"
              placeholder="0,00"
              style={{ fontSize: '11px' }}
            />
          </div>
        )}
      </div>

      {/* ── Coluna 6: Preço Total ── */}
      <div
        className={cn(
          CELL_TOTAL,
          'px-1 py-0.5 tabular-nums overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground',
          insumo.precoTotal === 0 && 'opacity-50'
        )}
        style={{ fontSize: '11px' }}
      >
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
          <span className="overflow-hidden text-ellipsis whitespace-nowrap max-w-full block">
            {formatCurrency(insumo.precoTotal)}
          </span>
        )}
      </div>

      {/* ── Coluna 7: Ações desaninHadas ── */}
      <div className={cn(CELL_ACOES, "gap-0.5")}>
        {insumo.pending && !readOnly && !placeholder ? (
          /* Insumo pendente — só botão de descartar */
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  tabIndex={-1}
                  onClick={onDiscard}
                  className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[11px] text-destructive font-medium">
                Descartar insumo sugerido
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : !readOnly && !placeholder ? (
          /* Ações diretas — desaninHadas do menu ⋯ */
          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">

            {/* Badge de fonte (SINAPI/Hist/Manual) */}
            {fonteBadge && fonteBadge !== 'sugerido' && (
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1 py-0 h-4 shrink-0 mr-0.5', fonteBadgeConfig[fonteBadge]?.cls)}
              >
                {fonteBadgeConfig[fonteBadge]?.label}
              </Badge>
            )}
            {!fonteBadge && insumo.sinapiConfirmado && (
              <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 shrink-0 mr-0.5', fonteBadgeConfig.sinapi?.cls)}>
                SINAPI
              </Badge>
            )}

            {/* Buscar preço — bloqueado por ora (TODO: integrar banco de preços + SINAPI) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    disabled
                    className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 cursor-not-allowed"
                  >
                    {/* Ícone de busca de preço */}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
                      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      <path d="M5 3.5v3M3.5 5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  Buscar preço (em breve)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Adicionar à cotação */}
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
              <button
                disabled={!temQtd}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Adicionar à cotação"
              >
                <ClipboardList className="h-3.5 w-3.5" />
              </button>
            </ListaCotacaoPopover>

            {/* Duplicar */}
            <button
              onClick={() => { /* TODO: implementar duplicar insumo */ }}
              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
              title="Duplicar insumo"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Excluir */}
            <button
              onClick={onRemove}
              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Excluir insumo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="w-6 shrink-0" />
        )}
      </div>
    </div>
  );
}
