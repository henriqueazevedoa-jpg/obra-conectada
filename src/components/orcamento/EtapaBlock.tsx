import { useState, useCallback, useRef } from 'react';
import { OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Trash2,
  Plus,
  ChevronDown,
  CalendarIcon,
  Search,
  Settings,
  GripVertical,
  Link2,
  X,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ComposicaoRow, { COMPOSICAO_GRID } from './ComposicaoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useEtapaDependencias, EtapaDepTipo } from '@/hooks/useEtapaDependencias';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DEP_TIPOS: { value: EtapaDepTipo; label: string; desc: string }[] = [
  { value: 'FS', label: 'Fim → Início', desc: 'Começa quando a predecessora terminar (padrão)' },
  { value: 'SS', label: 'Início → Início', desc: 'Começa junto com a predecessora' },
  { value: 'FF', label: 'Fim → Fim', desc: 'Termina junto com a predecessora' },
  { value: 'SF', label: 'Início → Fim', desc: 'Termina quando a predecessora começa' },
];

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
  /** Lista de todas as etapas (para seleção de predecessoras) */
  allEtapas?: OrcamentoEtapa[];
  /** Drag handle listeners (injetado pelo dnd-kit) */
  dragListeners?: React.HTMLAttributes<HTMLElement>;
  /** Callback para abrir o Drawer de catálogo global com esta etapa pré-selecionada */
  onOpenCatalogo?: () => void;
  /** Modo compacto: reduz padding das linhas de composição */
  compactMode?: boolean;
  /** Modo de densidade geral: detalhado | padrao | compacto */
  densityMode?: 'detalhado' | 'padrao' | 'compacto';
  /** Density level: normal | compact | ultra */
  densityLevel?: 'normal' | 'compact' | 'ultra';
  /** Posição visual da etapa na lista (1-based) */
  posicao?: number;
  /** 3C: Ir para a aba cotação com item pré-filtrado */
  onGoCotacao?: (descricao: string) => void;
  /** Sprint 3: sugestão de preços habilitada */
  priceSuggestionEnabled?: boolean;
  /** Sprint 3: callback de badge por composição */
  onPriceBadge?: (composicaoId: string, badge: string | null) => void;
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
  compactMode = false,
  densityMode = 'padrao',
  densityLevel = 'normal',
  posicao,
  onGoCotacao,
  priceSuggestionEnabled = false,
  onPriceBadge,
}: Props) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [forceApplied, setForceApplied] = useState<boolean | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newDepOrigem, setNewDepOrigem] = useState('');
  const [newDepTipo, setNewDepTipo] = useState<EtapaDepTipo>('FS');
  const [newDepLag, setNewDepLag] = useState(0);

  // Rastrear IDs de composições reciém-adicionadas para animação
  const prevComposicaoIdsRef = useRef<Set<string>>(new Set(etapa.composicoes.map(c => c.id)));
  const newComposicaoIds = useRef<Set<string>>(new Set());

  // Detectar novas composições adicionadas
  const currentIds = new Set(etapa.composicoes.map(c => c.id));
  for (const id of Array.from(currentIds)) {
    if (!prevComposicaoIdsRef.current.has(id)) {
      newComposicaoIds.current.add(id);
      // Remover do set de "novas" após animação
      setTimeout(() => { newComposicaoIds.current.delete(id); }, 1500);
    }
  }
  prevComposicaoIdsRef.current = currentIds;

  // Dependências desta etapa como destino (quem veio antes desta)
  const { dependencias, addDependencia, removeDependencia, getDepsDeDestino } =
    useEtapaDependencias(obraId);

  const depsDestino = getDepsDeDestino(etapa.id);

  // Sync forceExpanded
  if (forceExpanded !== undefined && forceExpanded !== forceApplied) {
    setLocalExpanded(forceExpanded);
    setForceApplied(forceExpanded);
  }

  const existingDescricoes = etapa.composicoes.map(c => c.descricao);

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

  const update = useCallback((field: string, value: unknown) => {
    if (readOnly) return;
    const next = { ...etapa, [field]: value };
    if (field === 'usaComposicoes' && value && next.composicoes.length === 0) {
      next.composicoes = [makeComposicao()];
    }
    if (!next.usaComposicoes && field === 'precoTotal') {
      next.precoTotal = parseFloat(String(value)) || 0;
    }
    onChange(next);
  }, [readOnly, etapa, onChange, makeComposicao]);

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
    // Auto-ativar composições ao adicionar manualmente
    const comps = [...etapa.composicoes, makeComposicao('', '', tipo)];
    onChange({ ...etapa, usaComposicoes: true, composicoes: comps });
  };

  const handleAddSugestoes = (items: { descricao: string; unidade: string }[]) => {
    const comps = items.map(insumo => makeComposicao(insumo.descricao, insumo.unidade));
    onChange({ ...etapa, usaComposicoes: true, composicoes: [...etapa.composicoes, ...comps] });
  };

  const handleAddDependencia = async () => {
    if (!newDepOrigem || !obraId) return;
    const ok = await addDependencia(newDepOrigem, etapa.id, newDepTipo, newDepLag);
    if (ok) {
      setNewDepOrigem('');
      setNewDepLag(0);
    }
  };

  // Etapas que podem ser predecessoras (excluindo a própria)
  const etapasPossiveisOrigem = allEtapas.filter(e =>
    e.id !== etapa.id &&
    !depsDestino.some(d => d.etapa_origem_id === e.id)
  );

  const nomeEtapaPorId = (id: string) =>
    allEtapas.find(e => e.id === id)?.nome || id.slice(0, 8);

  // ── Cálculos de cotação (usados no header colapsado e na barra de progresso) ──
  const totalComps = etapa.composicoes.length;
  const cotadasComps = etapa.composicoes.filter(
    c => (c.precoUnitario != null && c.precoUnitario > 0) || c.usaInsumos
  ).length;
  const pctCotado = totalComps > 0 ? Math.round((cotadasComps / totalComps) * 100) : 0;

  // Dot de status: vermelho (0%), azul (parcial), verde (100%)
  const statusDot =
    totalComps === 0 ? 'bg-muted-foreground/40' :
    pctCotado === 0 ? 'bg-red-500' :
    pctCotado === 100 ? 'bg-emerald-500' :
    'bg-blue-500';

  // Cor da barra de progresso: cinza (0%) → azul (parcial) → verde (100%)
  const barColor =
    pctCotado === 0 ? 'bg-muted-foreground/30' :
    pctCotado === 100 ? 'bg-emerald-500' :
    'bg-blue-500';

  const textColor =
    pctCotado === 0 ? 'text-muted-foreground' :
    pctCotado === 100 ? 'text-emerald-600' :
    'text-blue-600';

  return (
    <Card className={`shadow-sm border-l-4 transition-colors ${readOnly ? 'border-l-muted-foreground/30' : 'border-l-primary'}`}>
      <CardContent className="p-4 space-y-3">

        {/* ── Cabeçalho ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* Drag handle — com listeners reais do dnd-kit */}
          {!readOnly && (
            <span
              {...(dragListeners ?? {})}
              className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-70 transition-opacity shrink-0 -ml-1 text-muted-foreground touch-none"
              title="Arrastar para reordenar"
            >
              <GripVertical className="h-4 w-4" />
            </span>
          )}

          {/* Chevron colapso */}
          <button
            onClick={() => setLocalExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            aria-label={localExpanded ? 'Recolher etapa' : 'Expandir etapa'}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', localExpanded ? 'rotate-0' : '-rotate-90')} />
          </button>

          {/* 1E — Dot de status colorido (visível apenas no estado colapsado) */}
          {!localExpanded && etapa.usaComposicoes && totalComps > 0 && (
            <span
              className={cn('h-2.5 w-2.5 rounded-full shrink-0 transition-colors', statusDot)}
              title={pctCotado === 100 ? 'Totalmente cotado' : pctCotado === 0 ? 'Sem preços' : `${pctCotado}% cotado`}
            />
          )}

          {/* Pill de posição visual #N — código interno no tooltip */}
          {posicao != null && (
            <span
              className="text-[10px] font-bold text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded shrink-0 tabular-nums leading-none font-mono select-none cursor-default"
              title={`Etapa ${posicao} · ID interno: ${etapa.codigo}`}
            >
              #{posicao}
            </span>
          )}

          {/* Nome */}
          {readOnly ? (
            <span className="text-sm font-semibold flex-1 min-w-0 pr-2 overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
              {etapa.nome}
            </span>
          ) : (
            <Input
              value={etapa.nome}
              onChange={e => update('nome', e.target.value)}
              className="h-7 text-sm font-semibold bg-transparent border-transparent hover:border-input focus:border-input px-1 flex-1 min-w-0"
              placeholder="Nome da etapa…"
              aria-label="Nome da etapa"
            />
          )}

          {/* 1B — Infobar colapsada: badge N comp. + mini barra + % */}
          {!localExpanded && etapa.usaComposicoes && totalComps > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                {totalComps} comp.
              </span>
              {/* Badge SINAPI — visível apenas quando colapsado */}
              {etapa.composicoes.some(c => c.fonteReferencia === 'SINAPI') && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400 shrink-0"
                  title={`${etapa.composicoes.filter(c => c.fonteReferencia === 'SINAPI').length} composição(ões) SINAPI`}
                >
                  SINAPI
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', barColor)}
                    style={{ width: `${pctCotado}%` }}
                  />
                </div>
                <span className={cn('text-[10px] font-semibold tabular-nums', textColor)}>
                  {pctCotado}%
                </span>
              </div>
            </div>
          )}

          {/* Total + Sprint4 delta */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-sm font-bold text-foreground border border-border/40 bg-muted/20 px-2 py-0.5 rounded-md">
              {formatCurrency(etapa.precoTotal)}
            </span>
            {etapa.estimadoValor != null && etapa.estimadoValor > 0 && (() => {
              const delta = etapa.precoTotal - etapa.estimadoValor;
              const pct = Math.round((delta / etapa.estimadoValor) * 100);
              const color = delta <= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : pct <= 10
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-destructive';
              const icon = delta <= 0 ? '✓' : pct <= 10 ? '↑' : '⚠';
              return (
                <span className={cn('text-[10px] font-medium tabular-nums', color)} title={`Estimado: ${formatCurrency(etapa.estimadoValor)}`}>
                  {icon} {delta <= 0 ? 'Dentro' : `+${pct}%`} do est.
                </span>
              );
            })()}
          </div>

          {/* Ícone de dependências (quando houver) */}
          {depsDestino.length > 0 && (
            <span title={`${depsDestino.length} dependência${depsDestino.length > 1 ? 's' : ''} configurada${depsDestino.length > 1 ? 's' : ''}`} className="text-primary/80">
              <Link2 className="h-3.5 w-3.5" />
            </span>
          )}

          {/* ⚙️ Settings popover — datas + dependências */}
          {!readOnly && (
            <>
              {/* Ícone catálogo: abre o Drawer com esta etapa pré-selecionada */}
              {onOpenCatalogo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary dark:hover:text-primary/80 transition-colors"
                  title="Buscar no catálogo de composições"
                  onClick={(e) => { e.stopPropagation(); onOpenCatalogo(); }}
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              )}
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" title="Configurações da etapa">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4">
                <p className="text-sm font-semibold text-foreground">Configurações da Etapa</p>

                {/* Datas */}
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Período Previsto</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Início */}
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Início</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('h-8 text-[11px] px-2 justify-start font-normal w-full', !etapa.dataInicioPrevista && 'text-muted-foreground')}>
                            <CalendarIcon className="h-3 w-3 mr-1.5" />
                            {etapa.dataInicioPrevista ? format(parseISO(etapa.dataInicioPrevista), 'dd/MM/yy') : 'Selecionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={etapa.dataInicioPrevista ? parseISO(etapa.dataInicioPrevista) : undefined}
                            onSelect={d => update('dataInicioPrevista', d ? format(d, 'yyyy-MM-dd') : undefined)}
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Fim */}
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Fim</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('h-8 text-[11px] px-2 justify-start font-normal w-full', !etapa.dataFimPrevista && 'text-muted-foreground')}>
                            <CalendarIcon className="h-3 w-3 mr-1.5" />
                            {etapa.dataFimPrevista ? format(parseISO(etapa.dataFimPrevista), 'dd/MM/yy') : 'Selecionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={etapa.dataFimPrevista ? parseISO(etapa.dataFimPrevista) : undefined}
                            onSelect={d => update('dataFimPrevista', d ? format(d, 'yyyy-MM-dd') : undefined)}
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Dependências */}
                {obraId && allEtapas.length > 1 && (
                  <div className="space-y-3 border-t border-border/40 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Dependências (predecessoras)</p>
                    </div>

                    {/* Dependências existentes */}
                    {depsDestino.length > 0 && (
                      <div className="space-y-1.5">
                        {depsDestino.map(dep => (
                          <div key={dep.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-md px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">{nomeEtapaPorId(dep.etapa_origem_id)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {DEP_TIPOS.find(t => t.value === dep.tipo)?.label}
                                {dep.lag_dias !== 0 && ` · Folga: ${dep.lag_dias > 0 ? '+' : ''}{dep.lag_dias}d`}
                              </p>
                            </div>
                            <button
                              onClick={() => removeDependencia(dep.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adicionar nova dependência */}
                    {etapasPossiveisOrigem.length > 0 && (
                      <div className="space-y-2 bg-muted/20 rounded-lg p-2">
                        <p className="text-[10px] text-muted-foreground font-medium">Adicionar predecessora:</p>
                        <Select value={newDepOrigem} onValueChange={setNewDepOrigem}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Selecionar etapa…" />
                          </SelectTrigger>
                          <SelectContent>
                            {etapasPossiveisOrigem.map(e => (
                              <SelectItem key={e.id} value={e.id} className="text-xs">
                                {e.codigo} — {e.nome || 'Sem nome'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {newDepOrigem && (
                          <>
                            <Select value={newDepTipo} onValueChange={v => setNewDepTipo(v as EtapaDepTipo)}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DEP_TIPOS.map(t => (
                                  <SelectItem key={t.value} value={t.value} className="text-xs">
                                    {t.label} — {t.desc}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground shrink-0">Folga (dias):</label>
                              <Input
                                type="number"
                                value={newDepLag}
                                onChange={e => setNewDepLag(parseInt(e.target.value) || 0)}
                                className="h-6 text-xs w-20"
                              />
                            </div>

                            <Button size="sm" className="h-7 text-xs w-full gap-1" onClick={handleAddDependencia}>
                              <Plus className="h-3 w-3" /> Adicionar dependência
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            </>
          )}

          {/* Sprint 3.5: Sugerir preços desta etapa */}
          {!readOnly && priceSuggestionEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0 opacity-70 hover:opacity-100"
                    onClick={() => {
                      etapa.composicoes
                        .filter(c => !c.precoUnitario)
                        .forEach(c => onPriceBadge?.(c.id, null));
                    }}
                    aria-label="Sugerir preços desta etapa"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">✨ Sugerir preços desta etapa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Excluir */}
          {!readOnly && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-60 hover:opacity-100"
              onClick={onRemove}
              aria-label="Remover etapa"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* ── Conteúdo expandido ────────────────────────────────────── */}
        <div className={cn('grid transition-all duration-300 ease-in-out', localExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 m-0')}>
          <div className="overflow-hidden space-y-4">

            {/* Valor direto (sem composições) */}
            {!etapa.usaComposicoes && !readOnly ? (
              <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-md border border-border/40">
                <label className="text-sm font-medium text-muted-foreground shrink-0">Orçamento estimado:</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                  <Input
                    type="number"
                    value={etapa.precoTotal || ''}
                    onChange={e => update('precoTotal', e.target.value)}
                    className="h-8 w-40 text-sm font-medium bg-background pl-8"
                    placeholder="0,00"
                  />
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground h-8 gap-1 ml-auto"
                    onClick={() => update('usaComposicoes', true)}
                  >
                    <Plus className="h-3 w-3" />
                    Detalhar em composições
                  </Button>
                )}
              </div>
            ) : null}

            {/* Valor direto (somente leitura, sem composições) */}
            {!etapa.usaComposicoes && readOnly && (
              <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-md border border-border/40">
                <label className="text-sm font-medium text-muted-foreground shrink-0">Orçamento estimado:</label>
                <span className="font-semibold">{formatCurrency(etapa.precoTotal)}</span>
              </div>
            )}

            {/* Lista de composições */}
            {etapa.usaComposicoes && (
              <div className="space-y-1 mt-2">
                {/* 1C — Barra de progresso de cotação: cinza→azul→verde */}
                {totalComps > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', barColor)}
                        style={{ width: `${pctCotado}%` }}
                      />
                    </div>
                    <span className={cn('text-[10px] font-medium shrink-0 tabular-nums', textColor)}>
                      {cotadasComps}/{totalComps} cotad{cotadasComps !== 1 ? 'as' : 'a'}
                    </span>
                  </div>
                )}

                {/* Cabeçalho colunas — oculto em modo padrão e compacto */}
                {densityMode === 'detalhado' && (
                <div className={`grid ${COMPOSICAO_GRID} gap-2 items-center text-[10px] font-bold text-primary dark:text-primary/80 uppercase tracking-wider px-2 pb-2 pl-3 bg-primary/8 dark:bg-indigo-950/20 rounded-t-md border border-b-0 border-primary/12 dark:border-indigo-900/40`}>
                  <span>Código</span>
                  <span>Descrição</span>
                  <span>Un</span>
                  <span className="text-right">Qtd</span>
                  <span className="text-right">P. Unit</span>
                  <span className="text-right">P. Total</span>
                  <span />
                  <span />
                </div>
                )}

                {/* Composições */}
                <div className="space-y-0.5 rounded-b-md border border-t-0 border-border/40 bg-muted/5 p-1">
                  {etapa.composicoes.map((comp, idx) => (
                    <div
                      key={comp.id}
                      className={cn(
                        'even:bg-transparent odd:bg-background/80 rounded-md',
                        newComposicaoIds.current.has(comp.id) && 'animate-in slide-in-from-top-2 fade-in duration-300'
                      )}
                    >
                      <ComposicaoRow
                        composicao={comp}
                        unidades={unidades}
                        onChange={c => updateComposicao(idx, c)}
                        onRemove={() => removeComposicao(idx)}
                        generateInsumoCodigo={generateInsumoCodigo}
                        readOnly={readOnly}
                        obraId={obraId}
                        compactMode={compactMode}
                        onGoCotacao={onGoCotacao}
                        priceSuggestionEnabled={priceSuggestionEnabled}
                        onPriceBadge={onPriceBadge}
                      />
                    </div>
                  ))}

                  {/* Estado vazio */}
                  {etapa.composicoes.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground">Nenhuma composição adicionada.</p>
                    </div>
                  )}
                </div>

                {/* Barra de adição */}
                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-2 pt-3 pl-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-8 shadow-sm gap-1.5"
                      onClick={() => onOpenCatalogo?.()}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Buscar no Catálogo
                    </Button>
                    {/* Dropdown: + Adicionar ▾ */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 gap-1.5 text-muted-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                          <ChevronDown className="h-3 w-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => addComposicao('composicao')}
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          <div>
                            <p className="font-medium">Composição (com insumos)</p>
                            <p className="text-muted-foreground text-[10px]">Decomposta em materiais e mão de obra</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 cursor-pointer"
                          onClick={() => addComposicao('insumo_direto')}
                        >
                          <Plus className="h-3.5 w-3.5 text-slate-500" />
                          <div>
                            <p className="font-medium">Insumo direto</p>
                            <p className="text-muted-foreground text-[10px]">Item simples sem decomposição</p>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

    </Card>
  );
}
