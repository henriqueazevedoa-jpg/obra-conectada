import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Check,
  X,
  Brain,
  Info,
  SkipForward,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import type {
  SinapiVinculo,
  SinapiMatchResult,
  SinapiConfidence,
} from '@/hooks/useSinapiAssistente';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SinapiReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vinculos: SinapiVinculo[];
  saving: boolean;
  onConfirm: (updatePrices: boolean) => void;
  onToggleConfirmado: (itemKey: string, value: boolean) => void;
  onSetManualMatch: (itemKey: string, match: SinapiMatchResult | null) => void;
  onCancel: () => void;
}

// Dois "modos" do drawer:
// 'overview' → lista plana agrupada por confiança (vista padrão)
// 'step'     → foco em um item de cada vez (itens médios/baixos)
type DrawerMode = 'overview' | 'step';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: number | null | undefined) {
  if (!v) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function confidenceLabel(c: SinapiConfidence | undefined) {
  if (!c) return { label: 'Sem match', color: 'text-red-500', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900', ring: 'ring-red-200 dark:ring-red-900' };
  if (c === 'alto') return { label: '🟢 Alta', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900', ring: 'ring-emerald-200' };
  if (c === 'medio') return { label: '🟡 Média', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900', ring: 'ring-amber-200' };
  return { label: '🔴 Baixa', color: 'text-red-500', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900', ring: 'ring-red-200 dark:ring-red-900' };
}

// ── ManualSearchField ─────────────────────────────────────────────────────────

function ManualSearchField({
  descricao, unidade, uf, regime, onSelect,
}: {
  descricao: string;
  unidade: string;
  uf: string;
  regime: string;
  onSelect: (match: SinapiMatchResult | null) => void;
}) {
  const [query, setQuery] = useState(descricao);
  const [results, setResults] = useState<SinapiMatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(descricao);
    setResults([]);
  }, [descricao]);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await (supabase as any).rpc('match_sinapi_item', {
        p_descricao: query,
        p_unidade: unidade || '',
        p_uf: uf,
        p_regime: regime,
        p_limit: 5,
      });
      setResults((data || []).map((row: any) => ({
        fonte: row.fonte,
        codigo: Number(row.codigo),
        descricao: row.descricao,
        unidade: row.unidade,
        preco: Number(row.preco),
        score: Number(row.score),
        confidence: row.confidence as SinapiConfidence,
      })));
    } finally {
      setLoading(false);
    }
  }, [query, unidade, uf, regime]);

  return (
    <div className="space-y-2 mt-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        Busca manual no SINAPI
      </p>
      <div className="flex gap-1.5">
        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Digite termos de busca..."
          className="h-8 text-xs flex-1"
          autoFocus
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs px-2 gap-1"
          onClick={search}
          disabled={loading}
        >
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </div>
      {results.length > 0 && (
        <div className="rounded-lg border overflow-hidden divide-y">
          {results.map(r => {
            const { color } = confidenceLabel(r.confidence);
            return (
              <button
                key={r.codigo}
                onClick={() => { onSelect(r); setResults([]); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/50 text-xs transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{r.descricao}</div>
                  <div className="text-muted-foreground">#{r.codigo} · {r.unidade}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-primary">{formatCurrency(r.preco)}</div>
                  <div className={cn('text-[10px] font-medium', color)}>{r.confidence}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 self-center group-hover:text-primary transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── VinculoRowCompact (modo overview) ─────────────────────────────────────────

function VinculoRowCompact({
  vinculo, uf, regime, onToggle, onSetManual, showSearch,
}: {
  vinculo: SinapiVinculo;
  uf: string;
  regime: string;
  onToggle: (checked: boolean) => void;
  onSetManual: (match: SinapiMatchResult | null) => void;
  showSearch: boolean;
}) {
  const effectiveMatch = vinculo.manualMatch ?? vinculo.match;
  const { label, color, bg } = confidenceLabel(effectiveMatch?.confidence);

  return (
    <div className={cn('rounded-lg border p-3 space-y-2 transition-colors', bg)}>
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggle(!vinculo.confirmado)}
          className={cn(
            'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
            vinculo.confirmado
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-muted-foreground/40 hover:border-emerald-500'
          )}
        >
          {vinculo.confirmado && <Check className="h-2.5 w-2.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-foreground">{vinculo.itemDescricao}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0">
              {vinculo.itemType === 'composicao' ? 'Comp.' : 'Ins.'}
            </Badge>
          </div>
          <div className="text-[10px] text-muted-foreground">{vinculo.itemUnidade}</div>
        </div>
        <span className={cn('text-[10px] font-semibold shrink-0', color)}>{label}</span>
      </div>

      {effectiveMatch && (
        <div className="flex items-center gap-2 bg-background/60 rounded-md px-2 py-1.5 border border-border/50">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-foreground truncate">
              #{effectiveMatch.codigo} — {effectiveMatch.descricao}
            </div>
            <div className="text-[9px] text-muted-foreground">{effectiveMatch.unidade}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-bold text-primary">{formatCurrency(effectiveMatch.preco)}</div>
            {(!vinculo.itemPrecoAtual || vinculo.itemPrecoAtual === 0) && (
              <div className="text-[9px] text-emerald-600">→ aplicar</div>
            )}
          </div>
          {vinculo.manualMatch && (
            <button onClick={() => onSetManual(null)} className="text-muted-foreground hover:text-destructive" title="Remover escolha manual">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {showSearch && (
        <ManualSearchField
          descricao={vinculo.itemDescricao}
          unidade={vinculo.itemUnidade}
          uf={uf}
          regime={regime}
          onSelect={onSetManual}
        />
      )}
    </div>
  );
}

// ── VinculoCardFocus (modo step — cartão grande, foco total) ──────────────────

function VinculoCardFocus({
  vinculo, uf, regime,
  onToggle, onSetManual, onSkip, onPrev,
  idx, total,
}: {
  vinculo: SinapiVinculo;
  uf: string;
  regime: string;
  onToggle: (checked: boolean) => void;
  onSetManual: (match: SinapiMatchResult | null) => void;
  onSkip: () => void;
  onPrev: () => void;
  idx: number;
  total: number;
}) {
  const effectiveMatch = vinculo.manualMatch ?? vinculo.match;
  const { label, color, bg, ring } = confidenceLabel(effectiveMatch?.confidence);
  const [showSearch, setShowSearch] = useState(!effectiveMatch);

  // Sincroniza showSearch quando muda de item
  useEffect(() => {
    setShowSearch(!effectiveMatch);
  }, [vinculo.itemKey]);

  // Atalhos de teclado: Enter = confirmar, Esc = pular
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        if (effectiveMatch) { onToggle(true); onSkip(); }
      }
      if (e.key === 'ArrowRight') onSkip();
      if (e.key === 'ArrowLeft') onPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effectiveMatch, onToggle, onSkip, onPrev]);

  return (
    <div className="flex flex-col h-full">
      {/* Counter */}
      <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
        <span>Item {idx + 1} de {total}</span>
        <span className={cn('font-semibold', color)}>{label}</span>
      </div>

      {/* Item card */}
      <div className={cn('rounded-xl border-2 p-4 space-y-3 flex-1', bg, `ring-1 ${ring}`)}>
        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
            {vinculo.itemType === 'composicao' ? 'Composição' : 'Insumo'}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">{vinculo.itemDescricao}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{vinculo.itemUnidade}</p>
        </div>

        {/* Suggested match */}
        {effectiveMatch && (
          <div className="rounded-lg bg-background border border-border px-3 py-2.5 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Sugestão SINAPI
            </p>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  #{effectiveMatch.codigo} — {effectiveMatch.descricao}
                </p>
                <p className="text-[10px] text-muted-foreground">{effectiveMatch.unidade}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">{formatCurrency(effectiveMatch.preco)}</p>
                <p className="text-[10px] text-muted-foreground">ref. {uf}</p>
              </div>
            </div>
            {vinculo.manualMatch && (
              <button
                onClick={() => { onSetManual(null); setShowSearch(true); }}
                className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1"
              >
                <X className="h-3 w-3" /> Remover e buscar outro
              </button>
            )}
          </div>
        )}

        {/* Manual search toggle */}
        {!showSearch && (
          <button
            onClick={() => setShowSearch(true)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 underline underline-offset-2"
          >
            <Search className="h-3 w-3" /> Buscar outra referência
          </button>
        )}
        {showSearch && (
          <ManualSearchField
            descricao={vinculo.itemDescricao}
            unidade={vinculo.itemUnidade}
            uf={uf}
            regime={regime}
            onSelect={(match) => { onSetManual(match); setShowSearch(false); }}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={onPrev}
          disabled={idx === 0}
          title="Anterior (←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={onSkip}
          title="Pular (→)"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Pular
        </Button>

        <Button
          size="sm"
          className={cn(
            'flex-1 h-8 text-xs gap-1.5',
            effectiveMatch
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
          onClick={() => { if (effectiveMatch) { onToggle(true); onSkip(); } }}
          disabled={!effectiveMatch}
          title="Confirmar e avançar (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
          Confirmar e avançar
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
        Enter = confirmar · → = pular · ← = voltar
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SinapiReviewDrawer({
  open,
  onOpenChange,
  vinculos,
  saving,
  onConfirm,
  onToggleConfirmado,
  onSetManualMatch,
  onCancel,
}: SinapiReviewDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>('overview');
  const [stepIdx, setStepIdx] = useState(0);
  const [updatePrices, setUpdatePrices] = useState(true);
  const [highCollapsed, setHighCollapsed] = useState(true);

  const [uf] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('obraconectada:sinapi_config') || '{}').uf || 'SP';
    } catch { return 'SP'; }
  });
  const [regime] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('obraconectada:sinapi_config') || '{}').regime || 'SEM_DESONERACAO';
    } catch { return 'SEM_DESONERACAO'; }
  });

  // Reset mode when drawer opens/closes
  useEffect(() => {
    if (open) { setMode('overview'); setStepIdx(0); }
  }, [open]);

  // Group by confidence
  const high   = vinculos.filter(v => v.match?.confidence === 'alto');
  const medium = vinculos.filter(v => v.match?.confidence === 'medio');
  const low    = vinculos.filter(v => !v.match || v.match.confidence === 'baixo');

  // Items to review in step mode (medium + low, não confirmados primeiro)
  const stepItems = [
    ...medium.filter(v => !v.confirmado),
    ...low.filter(v => !v.confirmado),
    ...medium.filter(v => v.confirmado),
    ...low.filter(v => v.confirmado),
  ];

  const confirmedCount   = vinculos.filter(v => v.confirmado).length;
  const totalWithMatch   = vinculos.filter(v => v.match || v.manualMatch).length;
  const pricesWillUpdate = vinculos.filter(v =>
    v.confirmado && (!v.itemPrecoAtual || v.itemPrecoAtual === 0) && (v.manualMatch ?? v.match)?.preco
  ).length;

  const pct = vinculos.length > 0 ? Math.round((confirmedCount / vinculos.length) * 100) : 0;

  const currentStepItem = stepItems[stepIdx] ?? null;

  function nextStep() {
    if (stepIdx < stepItems.length - 1) setStepIdx(i => i + 1);
    else setMode('overview'); // volta ao overview quando termina
  }
  function prevStep() {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[680px] flex flex-col p-0 gap-0">

        {/* ── Header ────────────────────────────────────────────── */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Brain className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">Assistente SINAPI</SheetTitle>
              <SheetDescription className="text-xs">
                {vinculos.length} itens analisados · {totalWithMatch} correspondências
              </SheetDescription>
            </div>
            {/* Mode toggle */}
            {stepItems.length > 0 && (
              <Button
                variant={mode === 'step' ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs gap-1.5',
                  mode === 'step' && 'bg-violet-600 hover:bg-violet-700 text-white border-0'
                )}
                onClick={() => setMode(m => m === 'overview' ? 'step' : 'overview')}
              >
                {mode === 'step'
                  ? <><ListChecks className="h-3.5 w-3.5" /> Ver todos</>
                  : <><Sparkles className="h-3.5 w-3.5" /> Revisar {stepItems.length} item{stepItems.length !== 1 ? 'ns' : ''}</>}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{confirmedCount} de {vinculos.length} confirmados</span>
              <span className={cn('font-semibold', pct === 100 ? 'text-emerald-600' : '')}>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {high.length} alta
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              {medium.length} média
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
              <XCircle className="h-2.5 w-2.5" />
              {low.length} baixa/sem match
            </span>
          </div>
        </SheetHeader>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── MODO OVERVIEW ─────────────────────────────────── */}
          {mode === 'overview' && (
            <div className="space-y-5">

              {/* Alta confiança (collapsed + bulk confirm) */}
              {high.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setHighCollapsed(v => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:opacity-80 transition-opacity"
                    >
                      {highCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <CheckCircle2 className="h-4 w-4" />
                      Alta Confiança ({high.length})
                    </button>
                    <span className="text-[10px] text-muted-foreground ml-1">Auto-confirmados</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto h-6 text-[10px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => high.forEach(v => !v.confirmado && onToggleConfirmado(v.itemKey, true))}
                    >
                      <Check className="h-2.5 w-2.5" />
                      Confirmar todos
                    </Button>
                  </div>
                  {!highCollapsed && (
                    <div className="space-y-2">
                      {high.map(v => (
                        <VinculoRowCompact
                          key={v.itemKey}
                          vinculo={v}
                          uf={uf}
                          regime={regime}
                          onToggle={checked => onToggleConfirmado(v.itemKey, checked)}
                          onSetManual={match => onSetManualMatch(v.itemKey, match)}
                          showSearch={false}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Média confiança */}
              {medium.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Média Confiança ({medium.length})
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">Revise e confirme</span>
                  </div>
                  <div className="space-y-2">
                    {medium.map(v => (
                      <VinculoRowCompact
                        key={v.itemKey}
                        vinculo={v}
                        uf={uf}
                        regime={regime}
                        onToggle={checked => onToggleConfirmado(v.itemKey, checked)}
                        onSetManual={match => onSetManualMatch(v.itemKey, match)}
                        showSearch={false}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Baixa / Sem match */}
              {low.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                    <XCircle className="h-4 w-4" />
                    Baixa / Sem match ({low.length})
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">Vincule manualmente</span>
                  </div>
                  <div className="space-y-2">
                    {low.map(v => (
                      <VinculoRowCompact
                        key={v.itemKey}
                        vinculo={v}
                        uf={uf}
                        regime={regime}
                        onToggle={checked => onToggleConfirmado(v.itemKey, checked)}
                        onSetManual={match => onSetManualMatch(v.itemKey, match)}
                        showSearch={true}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── MODO STEP ─────────────────────────────────────── */}
          {mode === 'step' && currentStepItem && (
            <VinculoCardFocus
              vinculo={currentStepItem}
              uf={uf}
              regime={regime}
              onToggle={checked => onToggleConfirmado(currentStepItem.itemKey, checked)}
              onSetManual={match => onSetManualMatch(currentStepItem.itemKey, match)}
              onSkip={nextStep}
              onPrev={prevStep}
              idx={stepIdx}
              total={stepItems.length}
            />
          )}

          {/* Step mode acabou — todos revisados */}
          {mode === 'step' && !currentStepItem && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="h-14 w-14 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Todos revisados!</p>
                <p className="text-xs text-muted-foreground mt-1">{confirmedCount} vínculo{confirmedCount !== 1 ? 's' : ''} confirmado{confirmedCount !== 1 ? 's' : ''}.</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setMode('overview')}>
                <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                Ver resumo completo
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <SheetFooter className="border-t px-5 py-4 shrink-0 flex flex-col gap-3 sm:flex-col sm:items-stretch">
          {/* Toggle "aplicar preços" */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-muted/30">
            <button
              onClick={() => setUpdatePrices(v => !v)}
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                updatePrices ? 'bg-primary border-primary text-white' : 'border-muted-foreground/40'
              )}
            >
              {updatePrices && <Check className="h-2.5 w-2.5" />}
            </button>
            <div className="flex-1 text-xs">
              <span className="font-medium">Aplicar preços SINAPI</span>
              <span className="text-muted-foreground"> onde o item ainda não tem preço</span>
              {pricesWillUpdate > 0 && (
                <span className="ml-1 text-emerald-600 font-semibold">({pricesWillUpdate} itens)</span>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[220px]">
                  Preenche o preço unitário com o valor de referência SINAPI apenas em itens que ainda têm preço zero ou vazio.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="flex-1 text-xs"
              onClick={onCancel} disabled={saving}
            >
              Pular sem salvar
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs gap-1.5 bg-primary hover:bg-primary/90"
              onClick={() => onConfirm(updatePrices)}
              disabled={saving || confirmedCount === 0}
            >
              {saving
                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Salvando...</>
                : <><Sparkles className="h-3 w-3" /> Aplicar {confirmedCount} vínculo{confirmedCount !== 1 ? 's' : ''}</>}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
