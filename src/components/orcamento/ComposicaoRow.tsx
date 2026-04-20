import { useState, useEffect, useRef } from 'react';
import { OrcamentoComposicao, OrcamentoInsumo } from '@/contexts/OrcamentoContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Trash2,
  Plus,
  ChevronDown,
  Layers,
  Star,
  Lock,
  ListPlus,
  Eye,
  Sparkles,
  X,
  History,
} from 'lucide-react';
import InsumoRow from './InsumoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { usePriceSuggestion, PriceBadge, PriceSuggestion } from '@/hooks/usePriceSuggestion';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Semáforo de completude para composição simples (sem insumos) */
function getComposicaoStatus(c: OrcamentoComposicao): 'empty' | 'partial' | 'complete' {
  if (c.usaInsumos) return 'complete';
  const hasQtd = c.quantidade != null && c.quantidade > 0;
  const hasPrice = c.precoUnitario != null && c.precoUnitario > 0;
  if (hasQtd && hasPrice) return 'complete';
  if (hasQtd || hasPrice) return 'partial';
  return 'empty';
}

const STATUS_DOT: Record<string, string> = {
  empty: 'bg-red-500',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

const STATUS_LABEL: Record<string, string> = {
  empty: 'Sem quantidade e sem preço',
  partial: 'Falta preço ou quantidade',
  complete: 'Linha completa',
};

/**
 * Title case para nomes vindos do SINAPI (armazenados em CAIXA ALTA).
 * Aplica-se apenas na camada de apresentação — sem alterar o valor do campo.
 * Preposições e artigos comuns ficam em minúsculo.
 */
const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'ou']);

export function toSinapiDisplayName(descricao: string): string {
  if (!descricao) return descricao;
  return descricao
    .toLowerCase()
    .split(' ')
    .map((word, idx) => {
      if (idx === 0 || !LOWERCASE_WORDS.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
}

export const COMPOSICAO_GRID = 'grid-cols-[90px_minmax(0,1fr)_64px_84px_100px_100px_34px_34px]';

// ── LockedField ────────────────────────────────────────────────────────────────

/** Campo bloqueado com indicador visual de cadeado e tooltip */
function LockedField({
  value,
  tooltip,
  align = 'right',
}: {
  value: React.ReactNode;
  tooltip: string;
  align?: 'left' | 'right';
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'h-8 text-xs px-2 flex items-center gap-1 text-muted-foreground cursor-not-allowed select-none bg-muted/30 rounded-md border border-dashed border-border/50',
              align === 'right' && 'justify-end'
            )}
          >
            <Lock className="h-2.5 w-2.5 shrink-0 opacity-60" />
            <span>{value}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-52">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  composicao: OrcamentoComposicao;
  unidades: string[];
  onChange: (updated: OrcamentoComposicao) => void;
  onRemove: () => void;
  generateInsumoCodigo: (compCode: string, existing: string[]) => string;
  obraId?: string;
  readOnly?: boolean;
  /** Modo compacto: reduz padding vertical das linhas */
  compactMode?: boolean;
  /** 3C: Callback para ir à aba Cotação filtrando este item */
  onGoCotacao?: (descricao: string) => void;
  /** Sprint 3: sugestão de preços habilitada globalmente */
  priceSuggestionEnabled?: boolean;
  /** Sprint 3: critério de preço histórico */
  priceCriterio?: string;
  /** Sprint 3: callback quando badge de preço é definido (para o banner de revisão) */
  onPriceBadge?: (composicaoId: string, badge: PriceBadge | null) => void;
}

// ── Badge de preço ─────────────────────────────────────────────────────────────

function PriceBadgeChip({ badge, score, fonte }: { badge: PriceBadge; score: number; fonte: string }) {
  const config: Record<PriceBadge, { label: string; className: string }> = {
    historico: { label: 'Histórico', className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' },
    sinapi: { label: 'SINAPI', className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' },
    sinapi_uncertain: { label: 'SINAPI ?', className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' },
    sem_match: { label: 'Sem match', className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = config[badge];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4 shrink-0 cursor-help', className)}>
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-52">
          <p className="font-medium">{fonte}</p>
          {badge !== 'sem_match' && <p className="text-muted-foreground">Confiança: {Math.round(score * 100)}%</p>}
          {badge === 'sinapi_uncertain' && <p className="text-amber-500 mt-1">Score médio — recomendamos revisar o vínculo SINAPI</p>}
          {badge === 'sem_match' && <p className="text-muted-foreground">Nenhum preço histórico ou SINAPI encontrado</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ComposicaoRow({
  composicao, unidades, onChange, onRemove, generateInsumoCodigo, obraId, readOnly,
  compactMode = false,
  onGoCotacao,
  priceSuggestionEnabled = false,
  priceCriterio = 'ultimo',
  onPriceBadge,
}: Props) {
  // SINAPI: começa fechado por padrão (usuário raramente precisa ver insumos SINAPI)
  const isSinapi = composicao.fonteReferencia === 'SINAPI';
  const isInsumodireto = composicao.tipo === 'insumo_direto';
  const [expanded, setExpanded] = useState(!isSinapi);
  const [showAllInsumos, setShowAllInsumos] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const { company } = useCompany();

  // ── Sprint 3.1: Sugestão de insumos via IA ───────────────────────────────
  interface InsumoSugerido { nome: string; unidade: string; coeficiente: number; checked: boolean; }
  const [insumosSugeridos, setInsumosSugeridos] = useState<InsumoSugerido[]>([]);
  const [loadingSugestao, setLoadingSugestao] = useState(false);
  const [showSugestao, setShowSugestao] = useState(false);
  const sugestaoFiredRef = useRef(false);

  // ── Sprint 3.3: Badge de preço ───────────────────────────────────────────
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const priceTriggeredRef = useRef(false);
  const { suggest } = usePriceSuggestion(company?.id);

  // Reset showAllInsumos quando a composição muda
  useEffect(() => { setShowAllInsumos(false); }, [composicao.id]);

  // ── Disparar sugestão de IA quando composição nova tem nome suficiente ──
  useEffect(() => {
    if (sugestaoFiredRef.current) return;
    if (readOnly || isSinapi || isInsumodireto) return;
    if (composicao.usaInsumos || composicao.insumos.length > 0) return;
    const words = composicao.descricao.trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) return;
    // Só para composições recem-criadas (sem preço e sem insumos)
    if (composicao.precoUnitario != null) return;
    sugestaoFiredRef.current = true;
    fetchInsumosugestao(composicao.descricao);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composicao.id]);

  // ── Disparar sugestão de preço ────────────────────────────────────────────
  useEffect(() => {
    if (priceTriggeredRef.current) return;
    if (!priceSuggestionEnabled) return;
    if (readOnly || isSinapi) return;
    if (composicao.precoUnitario != null && composicao.precoUnitario > 0) return;
    const words = composicao.descricao.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return;
    priceTriggeredRef.current = true;
    fetchPriceSuggestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceSuggestionEnabled, composicao.id]);

  const fetchInsumosugestao = async (nome: string) => {
    setLoadingSugestao(true);
    setShowSugestao(true);
    try {
      const { data: { session } } = await (supabase as any).auth.getSession();
      const token = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const resp = await fetch(`${supabaseUrl}/functions/v1/suggest-insumos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ nome }),
      });
      if (!resp.ok) throw new Error('Falha na API');
      const json = await resp.json();
      const items: InsumoSugerido[] = (json.insumos || []).map((i: any) => ({ ...i, checked: true }));
      setInsumosSugeridos(items);
    } catch (e) {
      console.warn('[suggest-insumos]', e);
      setShowSugestao(false);
    } finally {
      setLoadingSugestao(false);
    }
  };

  const fetchPriceSuggestion = async () => {
    if (!composicao.descricao.trim() || loadingPrice) return;
    setLoadingPrice(true);
    try {
      const result = await suggest(composicao.descricao, priceCriterio);
      setPriceSuggestion(result);
      if (result && result.preco > 0 && (result.badge === 'historico' || result.badge === 'sinapi')) {
        // Auto-fill preço
        update('precoUnitario', result.preco);
      }
      onPriceBadge?.(composicao.id, result?.badge ?? null);
    } catch (e) {
      console.warn('[fetchPriceSuggestion]', e);
    } finally {
      setLoadingPrice(false);
    }
  };

  const applyInsumosSugeridos = () => {
    const checked = insumosSugeridos.filter(i => i.checked);
    if (checked.length === 0) { setShowSugestao(false); return; }
    const existingCodes = composicao.insumos.map(s => s.codigo);
    const novosInsumos: OrcamentoInsumo[] = checked.map((item, idx) => ({
      id: crypto.randomUUID(),
      codigo: generateInsumoCodigo(composicao.codigo, [...existingCodes, ...checked.slice(0, idx).map((_, i) => `${composicao.codigo}.${i + 1}`)]),
      descricao: item.nome,
      unidade: item.unidade,
      quantidade: item.coeficiente,
      precoUnitario: null,
      precoTotal: 0,
    }));
    const next: OrcamentoComposicao = {
      ...composicao,
      usaInsumos: true,
      insumos: novosInsumos,
    };
    onChange(next);
    setExpanded(true);
    setShowSugestao(false);
    toast({ title: `✨ ${novosInsumos.length} insumos adicionados`, description: 'Preencha os preços para completar a composição.' });
  };

  // ── Verificar favoritos ────────────────────────────────────────────────────
  useEffect(() => {
    if (!composicao.descricao || !company?.id) return;
    (supabase as any)
      .from('catalogo_composicoes')
      .select('id')
      .eq('nome', composicao.descricao)
      .eq('company_id', company.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setIsFavorite(!!data));
  }, [composicao.descricao, company?.id]);

  // ── Toggle Favoritar ───────────────────────────────────────────────────────
  const handleToggleFavorita = async () => {
    if (!obraId || savingFavorite || !company?.id) return;
    setSavingFavorite(true);
    try {
      if (isFavorite) {
        const { error } = await (supabase as any)
          .from('catalogo_composicoes')
          .delete()
          .eq('nome', composicao.descricao)
          .eq('company_id', company.id)
          .eq('obra_origem_id', obraId);
        if (error) throw error;
        setIsFavorite(false);
        toast({ title: 'Removida da biblioteca' });
      } else {
        const { error } = await (supabase as any).from('catalogo_composicoes').insert({
          nome: composicao.descricao,
          unidade: composicao.unidade,
          preco_medio: composicao.precoUnitario,
          company_id: company.id,
          is_modelo: false,
          origem: 'favorito',
          obra_origem_id: obraId,
        });
        if (error) throw error;
        setIsFavorite(true);
        toast({ title: '⭐ Salva na Biblioteca!' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao atualizar biblioteca', description: msg, variant: 'destructive' });
    } finally {
      setSavingFavorite(false);
    }
  };


  // ── Insumo helpers ─────────────────────────────────────────────────────────
  const makeInsumo = (): OrcamentoInsumo => {
    const existingCodes = composicao.insumos.map(s => s.codigo);
    return {
      id: crypto.randomUUID(),
      codigo: generateInsumoCodigo(composicao.codigo, existingCodes),
      descricao: '',
      unidade: composicao.unidade || '',
      quantidade: null,
      precoUnitario: null,
      precoTotal: 0,
    };
  };

  const recalcFromInsumos = (comp: OrcamentoComposicao) => {
    if (comp.usaInsumos) {
      comp.precoTotal = comp.insumos.reduce((s, si) => s + (Number(si.precoTotal) || 0), 0);
      comp.quantidade = comp.insumos.reduce((s, si) => s + (Number(si.quantidade) || 0), 0) || null;
      comp.precoUnitario = comp.quantidade && comp.quantidade > 0
        ? comp.precoTotal / comp.quantidade
        : null;
    }
  };

  const update = (field: string, value: string | number | null | boolean) => {
    const next = { ...composicao };
    (next as unknown as Record<string, unknown>)[field] = value;
    if (!next.usaInsumos) {
      if (field === 'quantidade' || field === 'precoUnitario') {
        if (next.quantidade && next.precoUnitario) next.precoTotal = next.quantidade * next.precoUnitario;
      }
      if (field === 'precoTotal' && next.quantidade && next.quantidade > 0) {
        next.precoUnitario = next.precoTotal / next.quantidade;
      }
    } else {
      recalcFromInsumos(next);
    }
    onChange(next);
  };

  const toggleInsumos = (val: boolean) => {
    const next = { ...composicao, usaInsumos: val };
    if (val && next.insumos.length === 0) next.insumos = [makeInsumo()];
    recalcFromInsumos(next);
    onChange(next);
    if (val) setExpanded(true);
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

  const addInsumo = () => {
    const next = { ...composicao, insumos: [...composicao.insumos, makeInsumo()] };
    onChange(next);
  };

  // ── Display name (title case para SINAPI) ──────────────────────────────────
  const displayDescricao = isSinapi ? toSinapiDisplayName(composicao.descricao) : composicao.descricao;

  // ── Lock logic ─────────────────────────────────────────────────────────────
  const hasInsumos = composicao.usaInsumos;
  // Para SINAPI: todos os campos são read-only exceto quantidade
  // Para composição com insumos: qtd/preço são computados
  const sinapiFieldLocked = isSinapi;
  const isComputed = !readOnly && hasInsumos && !isSinapi; // bloqueia por cálculo, mas não por SINAPI
  const isFullReadOnly = readOnly;

  // ── Colapso de insumos > 5 ─────────────────────────────────────────────────
  const INSUMO_LIMIT = 5;
  const totalInsumos = composicao.insumos.length;
  const insumosVisiveis = showAllInsumos
    ? composicao.insumos
    : composicao.insumos.slice(0, INSUMO_LIMIT);
  const insumosOcultosValor = showAllInsumos
    ? 0
    : composicao.insumos.slice(INSUMO_LIMIT).reduce((s, i) => s + (Number(i.precoTotal) || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'rounded-md border bg-background transition-all',
      isSinapi
        ? 'border-l-2 border-l-blue-300 dark:border-l-blue-700'
        : composicao.usaInsumos
          ? 'border-l-2 border-l-purple-300 dark:border-l-purple-700'
          : 'border-l-2 border-l-transparent hover:border-l-primary/25 dark:hover:border-l-indigo-800'
    )}>
      {/* ── Linha principal ── */}
      <div className={cn(`grid ${COMPOSICAO_GRID} gap-2 items-center px-2`, compactMode ? 'py-0.5' : 'py-1.5')}>

        {/* Código + Badge SINAPI + Semáforo */}
        <div className="flex items-center gap-1 min-w-0">
          {!hasInsumos && (
            (() => {
              const status = getComposicaoStatus(composicao);
              const dot = (
                <span className={cn(
                  'h-2 w-2 rounded-full shrink-0 transition-colors',
                  STATUS_DOT[status]
                )} />
              );
              if (status !== 'complete' && onGoCotacao) {
                return (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onGoCotacao(composicao.descricao)}
                          className="shrink-0 focus:outline-none"
                          aria-label="Ir para Cotação"
                        >
                          {dot}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {STATUS_LABEL[status]} — <strong>clique para ir à Cotação</strong>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {dot}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {STATUS_LABEL[status]}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()
          )}
          <span className="text-xs font-mono text-muted-foreground truncate" title={composicao.codigo}>{composicao.codigo}</span>
          {isSinapi && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/30 shrink-0 cursor-help">
                    SINAPI
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-48">
                  <p className="font-medium">Importado da SINAPI</p>
                  {composicao.ufReferencia && <p className="text-muted-foreground">UF: {composicao.ufReferencia}</p>}
                  {composicao.regimeReferencia && <p className="text-muted-foreground">Regime: {composicao.regimeReferencia}</p>}
                  {composicao.referenciaCompetencia && <p className="text-muted-foreground">Competência: {composicao.referenciaCompetencia}</p>}
                  <p className="text-muted-foreground mt-1 italic">Apenas a quantidade é editável</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isInsumodireto && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-400 text-slate-600 bg-slate-50 dark:bg-slate-900/40 shrink-0 cursor-help">
                    I
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs max-w-40">
                  <p className="font-medium">Insumo direto</p>
                  <p className="text-muted-foreground">Item simples — sem decomposição em insumos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Descrição */}
        {isFullReadOnly || sinapiFieldLocked ? (
          <div className={cn(
            'h-8 text-sm px-2 flex items-center font-medium overflow-hidden text-ellipsis whitespace-nowrap',
            sinapiFieldLocked && 'text-foreground'
          )}>
            {displayDescricao}
          </div>
        ) : (
          <Input
            value={composicao.descricao}
            onChange={(e) => update('descricao', e.target.value)}
            className="h-8 text-sm px-2 font-medium"
            placeholder="Descrição"
          />
        )}

        {/* Unidade */}
        {isFullReadOnly || sinapiFieldLocked ? (
          <div className="h-8 text-sm px-2 flex items-center text-muted-foreground">{composicao.unidade}</div>
        ) : (
          <div>
            <Input
              value={composicao.unidade}
              onChange={(e) => update('unidade', e.target.value)}
              className="h-8 text-sm px-2"
              placeholder="Un"
              list={`un-comp-${composicao.id}`}
            />
            <datalist id={`un-comp-${composicao.id}`}>
              {unidades.map((u) => <option key={u} value={u} />)}
            </datalist>
          </div>
        )}

        {/* Quantidade — único campo editável para SINAPI */}
        {isFullReadOnly || isComputed ? (
          <LockedField
            value={composicao.quantidade ?? '—'}
            tooltip={isComputed ? 'Calculado como soma das quantidades dos insumos' : 'Campo somente leitura'}
          />
        ) : (
          <Input
            value={composicao.quantidade ?? ''}
            onChange={(e) => update('quantidade', e.target.value ? parseFloat(e.target.value) : null)}
            className="h-8 text-sm px-2 text-right"
            placeholder="Qtd"
            type="number"
          />
        )}

        {/* P. Unit + badge de preço + botão ✨ */}
        {isFullReadOnly || isComputed || sinapiFieldLocked ? (
          <LockedField
            value={composicao.precoUnitario != null ? formatCurrency(composicao.precoUnitario) : '—'}
            tooltip={
              isComputed
                ? 'Calculado: Preço Total ÷ Quantidade'
                : sinapiFieldLocked
                  ? 'Referência SINAPI — não editável'
                  : 'Campo somente leitura'
            }
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
              <Input
                value={composicao.precoUnitario ?? ''}
                onChange={(e) => update('precoUnitario', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-8 text-sm pl-6 pr-1 text-right"
                placeholder="0,00"
                type="number"
              />
            </div>
            {/* Badge de fonte de preço */}
            {priceSuggestion && priceSuggestion.badge && (
              <PriceBadgeChip badge={priceSuggestion.badge} score={priceSuggestion.score} fonte={priceSuggestion.fonte} />
            )}
            {/* Botão ✨ manual (sem preço, sem suggestion ativa) */}
            {!priceSuggestion && !loadingPrice && priceSuggestionEnabled && (composicao.precoUnitario == null || composicao.precoUnitario === 0) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => { priceTriggeredRef.current = false; fetchPriceSuggestion(); }}
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-amber-500 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Sugerir
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">Buscar preço no histórico ou SINAPI</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {loadingPrice && <span className="text-[10px] text-muted-foreground animate-pulse">buscando...</span>}
          </div>
        )}

        {/* P. Total */}
        {isFullReadOnly || isComputed || sinapiFieldLocked ? (
          <LockedField
            value={formatCurrency(composicao.precoTotal)}
            tooltip={
              isComputed
                ? 'Soma de todos os insumos'
                : sinapiFieldLocked
                  ? 'Referência SINAPI — editável via quantidade'
                  : 'Campo somente leitura'
            }
          />
        ) : (
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
            <Input
              value={composicao.precoTotal || ''}
              onChange={(e) => update('precoTotal', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm pl-6 pr-1 text-right font-medium"
              placeholder="0,00"
              type="number"
            />
          </div>
        )}

        {/* ⭐ Favoritar toggle */}
        {!readOnly ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavorita}
                  disabled={savingFavorite}
                  className={cn(
                    'h-8 w-8 transition-colors',
                    isFavorite
                      ? 'text-amber-500 hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  )}
                >
                  <Star className={cn('h-3.5 w-3.5 transition-all', isFavorite && 'fill-current')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isFavorite ? 'Remover do catálogo pessoal' : 'Salvar no catálogo pessoal'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <div />}

        {/* Excluir */}
        {!readOnly ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : <div />}
      </div>

      {/* ── Painel de sugestão de insumos via IA ── */}
      {showSugestao && (
        <div className="mx-2 mb-1 mt-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                {loadingSugestao ? 'Gerando sugestão de insumos...' : 'Insumos sugeridos — confirme ou ajuste:'}
              </span>
            </div>
            <button type="button" onClick={() => setShowSugestao(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loadingSugestao ? (
            <div className="space-y-1.5">
              {[1, 2, 3].map(i => <div key={i} className="h-5 rounded bg-amber-200/50 dark:bg-amber-800/30 animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-3">
                {insumosSugeridos.map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/20 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={e => setInsumosSugeridos(prev => prev.map((it, i) => i === idx ? { ...it, checked: e.target.checked } : it))}
                      className="rounded border-amber-400"
                    />
                    <span className="flex-1 font-medium text-foreground">{item.nome}</span>
                    <span className="text-muted-foreground tabular-nums">{item.unidade}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right">{item.coeficiente}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={applyInsumosSugeridos}
                  disabled={!insumosSugeridos.some(i => i.checked)}
                >
                  <Sparkles className="h-3 w-3" />
                  Usar esses insumos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setShowSugestao(false); if (!composicao.usaInsumos) toggleInsumos(true); }}
                >
                  Criar do zero
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Barra inferior: toggle insumos + expandir — oculta para insumo_direto ── */}
      {!isInsumodireto && (
      <div className="flex items-center gap-3 px-3 pb-1.5 pt-1 border-t border-border/20 bg-muted/5 rounded-b-md">

        {/* SINAPI: "Ver insumos (N)" em modo leitura */}
        {isSinapi && hasInsumos && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver insumos ({totalInsumos})
                  <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {expanded ? 'Recolher lista de insumos' : 'Visualizar insumos desta composição SINAPI (somente leitura)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Composição própria: "Detalhar em insumos" */}
        {!isSinapi && !readOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (!hasInsumos) {
                      toggleInsumos(true);
                    } else {
                      setExpanded(v => !v);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border',
                    hasInsumos
                      ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20'
                  )}
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  {hasInsumos ? (
                    <>
                      {totalInsumos} insumo{totalInsumos !== 1 ? 's' : ''}
                      <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                    </>
                  ) : (
                    'Detalhar em insumos'
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {hasInsumos
                  ? (expanded ? 'Recolher lista de insumos' : 'Ver e editar insumos desta composição')
                  : 'Ativar detalhamento por insumos (mão de obra, materiais, etc.)'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Remover detalhamento (composições próprias) */}
        {hasInsumos && expanded && !readOnly && !isSinapi && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleInsumos(false)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-auto"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover insumos
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Remover o detalhamento por insumos e editar o preço diretamente
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* ReadOnly: contador de insumos (composições próprias) */}
        {readOnly && hasInsumos && !isSinapi && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-primary hover:underline"
          >
            <Layers className="h-3 w-3" />
            {totalInsumos} insumo{totalInsumos !== 1 ? 's' : ''}
            <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
      )}

      {/* ── Painel de insumos ── */}
      {hasInsumos && expanded && (
        <div className={cn(
          'mx-2 mb-2 mt-1 rounded border border-border/50 bg-background animate-in fade-in slide-in-from-top-1 duration-200 shadow-inner',
          isSinapi && 'bg-muted/20'
        )}>
          <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center px-3 py-2 bg-muted/30 border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider`}>
            <span>Código</span>
            <span>Insumo / Descrição</span>
            <span>Un</span>
            <span className="text-right">Qtd</span>
            <span className="text-right">P. Unit</span>
            <span className="text-right">P. Total</span>
            <span />
            <span />
          </div>

          <div className="divide-y divide-border/30">
            {composicao.insumos.length === 0 ? (
              <div className="py-6 text-center bg-muted/10">
                <p className="text-xs text-muted-foreground mb-2">Nenhum insumo cadastrado.</p>
                {!readOnly && !isSinapi && (
                  <Button variant="outline" size="sm" onClick={addInsumo} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Primeiro Insumo
                  </Button>
                )}
              </div>
            ) : (
              // Colapso: mostra apenas os primeiros INSUMO_LIMIT
              insumosVisiveis.map((si, idx) => (
                <InsumoRow
                  key={si.id}
                  insumo={si}
                  unidades={unidades}
                  onChange={(s) => updateInsumo(idx, s)}
                  onRemove={() => removeInsumo(idx)}
                  obraId={obraId}
                  readOnly={readOnly || isSinapi}
                />
              ))
            )}
          </div>

          {/* "Ver mais N insumos · R$ X" */}
          {!showAllInsumos && totalInsumos > INSUMO_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllInsumos(true)}
              className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/40 flex items-center gap-1.5"
            >
              <Plus className="h-3 w-3" />
              + {totalInsumos - INSUMO_LIMIT} insumos
              {insumosOcultosValor > 0 && (
                <span className="ml-1 text-muted-foreground/70">· {formatCurrency(insumosOcultosValor)}</span>
              )}
              <ChevronDown className="h-3 w-3 ml-auto" />
            </button>
          )}
          {showAllInsumos && totalInsumos > INSUMO_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllInsumos(false)}
              className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/40 flex items-center gap-1.5"
            >
              <ChevronDown className="h-3 w-3 rotate-180" />
              Recolher insumos
            </button>
          )}

          {!readOnly && !isSinapi && composicao.insumos.length > 0 && (
            <div className="px-3 py-2 border-t border-border/40 bg-muted/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={addInsumo}
                className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar insumo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
