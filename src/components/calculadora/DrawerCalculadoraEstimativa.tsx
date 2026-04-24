import { useState, useMemo, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight, ChevronLeft, Calculator, CheckCircle2,
  Lock, AlertTriangle, Loader2, Home, Building2, Factory,
  Wrench, Trees,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useCalculadora } from '@/hooks/useCalculadora';
import { useCalculadoraAcesso } from '@/hooks/useCalculadoraAcesso';
import {
  calcularEstimativa,
  formatarMoeda,
  ESTADOS_BRASIL,
  METODO_LABELS,
} from '@/lib/calculadora-engine';
import type {
  CalculadoraParams,
  CalculadoraResultado,
  TipoUso,
  PadraoAcabamento,
  TipoEstrutura,
  TipoFundacao,
  Topografia,
  TipoCobertura,
  MetodoCalculo,
} from '@/types/calculadora';

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obraId?: string;
  /** 'lastra' fecha o drawer após calcular. 'publico' apenas chama onResultado. */
  mode?: 'lastra' | 'publico';
  /** Quando true renderiza como div inline (sem Sheet). */
  inline?: boolean;
  onResultado?: (r: CalculadoraResultado, p: CalculadoraParams) => void;
}

// ── Defaults ──────────────────────────────────────────────────

const DEFAULTS: CalculadoraParams = {
  estado: 'SP',
  tipo_uso: 'residencial_unifamiliar',
  padrao_acabamento: 'normal',
  area_construida_m2: 0,
  tipo_estrutura: 'alvenaria_estrutural',
  num_pavimentos: 1,
  topografia: 'plano',
  tipo_fundacao: 'sapata',
  tipo_cobertura: 'aparente_ceramica',
  metodo: 'a_cub_simplificado',
  bdi_percentual: 20,
  contingencia_percentual: 5,
  fator_seguranca: 1.05,
};

// ── Stepper indicator ─────────────────────────────────────────

// STEPS base; Método C insere 'Quantitativos' entre Sistemas e Método
const BASE_STEPS = ['Localização', 'Características', 'Terreno', 'Sistemas', 'Método'];
const STEPS_C = ['Localização', 'Características', 'Terreno', 'Sistemas', 'Quantitativos', 'Método'];

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="relative flex items-center justify-between mt-3 mb-1">
      <div className="absolute top-3 left-4 right-4 h-0.5 bg-muted" />
      <div
        className="absolute top-3 left-4 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `calc(${((current - 1) / (steps.length - 1)) * 100}% - 0px)` }}
      />
      {steps.map((label, idx) => {
        const n = idx + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex flex-col items-center gap-1 z-10" style={{ width: `${100 / steps.length}%`, maxWidth: 56 }}>
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
              done ? 'bg-primary border-primary text-white'
                : active ? 'bg-background border-primary text-primary'
                : 'bg-background border-muted text-muted-foreground',
            )}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
            </div>
            <span className={cn('text-[9px] font-medium text-center leading-tight',
              active ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Radio-card helper ─────────────────────────────────────────

function RadioCard({
  value, current, onSelect, label, sub, icon: Icon,
}: {
  value: string; current: string; onSelect: (v: string) => void;
  label: string; sub?: string; icon?: React.ElementType;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-medium',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span className="leading-tight">{label}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────

export default function DrawerCalculadoraEstimativa({ open, onOpenChange, obraId, mode = 'lastra', inline = false, onResultado }: Props) {
  const [step, setStep] = useState(1);
  const [params, setParams] = useState<CalculadoraParams>(DEFAULTS);
  const [resultado, setResultado] = useState<CalculadoraResultado | null>(null);
  const [calculando, setCalculando] = useState(false);

  const { cubList, eapList, loading: dadosLoading } = useCalculadora();
  const acesso = useCalculadoraAcesso();

  // STEPS dinâmico: Método C adiciona passo 4B
  const steps = params.metodo === 'c_sinapi_quantitativos' ? STEPS_C : BASE_STEPS;
  const totalSteps = steps.length;
  // Índice do passo final (Método) varia com metodo_c
  const stepMetodo = totalSteps;
  // Passo 4B só existe quando totalSteps === 6, e é o step 5
  const step4BIndex = 5;

  const set = useCallback(<K extends keyof CalculadoraParams>(k: K, v: CalculadoraParams[K]) =>
    setParams(p => ({ ...p, [k]: v })), []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setParams(DEFAULTS);
      setResultado(null);
    }
  }, [open]);

  // Debounced preview on last step (Método)
  useEffect(() => {
    if (step !== stepMetodo || dadosLoading || cubList.length === 0) return;
    if (params.area_construida_m2 <= 0) return;
    const t = setTimeout(() => {
      try {
        const r = calcularEstimativa({ params, cubList, eapList });
        setResultado(r);
      } catch { setResultado(null); }
    }, 350);
    return () => clearTimeout(t);
  }, [step, stepMetodo, params, cubList, eapList, dadosLoading]);

  const handleCalcular = () => {
    if (params.area_construida_m2 <= 0) {
      toast({ title: 'Área obrigatória', description: 'Informe a área construída.', variant: 'destructive' });
      return;
    }
    setCalculando(true);
    try {
      const r = calcularEstimativa({ params, cubList, eapList });
      setResultado(r);
      onResultado?.(r, params);
      // Ajuste 1: modo lastra fecha automaticamente; modo publico deixa o pai decidir
      if (mode === 'lastra') {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({ title: 'Erro no cálculo', description: e.message, variant: 'destructive' });
    } finally {
      setCalculando(false);
    }
  };

  const canNext = useMemo(() => {
    if (step === 1) return params.area_construida_m2 > 0;
    return true;
  }, [step, params]);

  // ── Sugestões automáticas para passo 4B ──────────────────────
  const sugestoesQuant = useMemo(() => {
    const a = params.area_construida_m2;
    const pav = params.num_pavimentos;
    const quartos = params.num_quartos ?? 3;
    const banheiros = params.num_banheiros ?? 2;
    const conc = Math.round(a * 0.15 * (1 + (pav - 1) * 0.05) * 10) / 10;
    return {
      volume_concreto_m3: conc,
      peso_aco_kg: Math.round(conc * 85),
      area_forma_m2: Math.round(conc * 7.5),
      area_alvenaria_m2: Math.round(a * 1.8),
      pontos_eletricos: quartos * 6 + banheiros * 4 + 26,
      pontos_hidraulicos: banheiros * 6 + 7,
    };
  }, [params.area_construida_m2, params.num_pavimentos, params.num_quartos, params.num_banheiros]);

  // ── Render steps ──────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Passo 1: Localização e tipo ─────────────────────────
      case 1: return (
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <Label>Estado (UF)</Label>
            <Select value={params.estado} onValueChange={v => set('estado', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {ESTADOS_BRASIL.map(e => (
                  <SelectItem key={e.uf} value={e.uf}>{e.uf} — {e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Uso</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['residencial_unifamiliar', 'Residencial', 'Unifamiliar', Home],
                ['residencial_multifamiliar', 'Residencial', 'Multifamiliar', Building2],
                ['comercial', 'Comercial', '', Building2],
                ['galpao_industrial', 'Industrial', 'Galpão', Factory],
                ['reforma_interiores', 'Reforma', 'Interiores', Wrench],
              ] as [TipoUso, string, string, React.ElementType][]).map(([v, l, s, I]) => (
                <RadioCard key={v} value={v} current={params.tipo_uso}
                  onSelect={v2 => set('tipo_uso', v2 as TipoUso)}
                  label={l} sub={s} icon={I} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Padrão de Acabamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['baixo', 'normal', 'alto'] as PadraoAcabamento[]).map(v => (
                <RadioCard key={v} value={v} current={params.padrao_acabamento}
                  onSelect={v2 => set('padrao_acabamento', v2 as PadraoAcabamento)}
                  label={v === 'baixo' ? 'Econômico' : v === 'normal' ? 'Padrão' : 'Alto Padrão'} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="area">Área Construída (m²) *</Label>
            <Input
              id="area"
              type="number"
              min={1}
              value={params.area_construida_m2 || ''}
              onChange={e => set('area_construida_m2', Number(e.target.value))}
              placeholder="Ex: 180"
            />
          </div>
        </div>
      );

      // ── Passo 2: Características físicas ────────────────────
      case 2: return (
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <Label>Tipo de Estrutura</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['alvenaria_estrutural', 'Alvenaria Estrutural'],
                ['concreto_armado', 'Concreto Armado'],
                ['estrutura_metalica', 'Estrutura Metálica'],
                ['wood_frame', 'Wood Frame'],
                ['steel_frame', 'Steel Frame'],
              ] as [TipoEstrutura, string][]).map(([v, l]) => (
                <RadioCard key={v} value={v} current={params.tipo_estrutura}
                  onSelect={v2 => set('tipo_estrutura', v2 as TipoEstrutura)} label={l} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pav">Número de Pavimentos</Label>
            <Input id="pav" type="number" min={1} max={50}
              value={params.num_pavimentos}
              onChange={e => set('num_pavimentos', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label>Topografia</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['plano', 'Plano'],
                ['aclive_leve', 'Aclive Leve'],
                ['aclive_forte', 'Aclive Forte'],
                ['declive_leve', 'Declive Leve'],
                ['declive_forte', 'Declive Forte'],
              ] as [Topografia, string][]).map(([v, l]) => (
                <RadioCard key={v} value={v} current={params.topografia}
                  onSelect={v2 => set('topografia', v2 as Topografia)} label={l} icon={Trees} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Fundação</Label>
            <div className="grid grid-cols-3 gap-2">
              {([['radier', 'Radier'], ['sapata', 'Sapata'], ['estaca', 'Estaca']] as [TipoFundacao, string][]).map(([v, l]) => (
                <RadioCard key={v} value={v} current={params.tipo_fundacao}
                  onSelect={v2 => set('tipo_fundacao', v2 as TipoFundacao)} label={l} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de Cobertura</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['aparente_ceramica', 'Cerâmica Aparente'],
                ['aparente_fibrocimento', 'Fibrocimento'],
                ['embutida_metalica', 'Metálica Embutida'],
                ['laje_impermeabilizada', 'Laje Impermeab.'],
              ] as [TipoCobertura, string][]).map(([v, l]) => (
                <RadioCard key={v} value={v} current={params.tipo_cobertura}
                  onSelect={v2 => set('tipo_cobertura', v2 as TipoCobertura)} label={l} />
              ))}
            </div>
          </div>
        </div>
      );

      // ── Passo 3: Terreno e demolição ────────────────────────
      case 3: return (
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="terreno">Área do Terreno (m²) — opcional</Label>
            <Input id="terreno" type="number" min={0}
              value={params.area_terreno_m2 || ''}
              onChange={e => set('area_terreno_m2', Number(e.target.value))}
              placeholder="Ex: 360" />
          </div>

          <div className="space-y-1.5">
            <Label>Construção Existente</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['nenhuma', 'Nenhuma'],
                ['parcial', 'Parcial'],
                ['total', 'Total'],
              ] as const).map(([v, l]) => (
                <RadioCard key={v} value={v} current={params.construcao_existente ?? 'nenhuma'}
                  onSelect={v2 => set('construcao_existente', v2 as any)} label={l} />
              ))}
            </div>
          </div>

          {params.construcao_existente && params.construcao_existente !== 'nenhuma' && (
            <div className="space-y-1.5">
              <Label htmlFor="areaEx">Área a demolir (m²)</Label>
              <Input id="areaEx" type="number" min={0}
                value={params.area_construcao_existente_m2 || ''}
                onChange={e => set('area_construcao_existente_m2', Number(e.target.value))} />
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Programa arquitetônico (opcional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {([
                ['num_quartos', 'Quartos'],
                ['num_banheiros', 'Banheiros'],
                ['num_vagas', 'Vagas'],
              ] as [keyof CalculadoraParams, string][]).map(([k, l]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{l}</Label>
                  <Input type="number" min={0}
                    value={(params[k] as number) || ''}
                    onChange={e => set(k, Number(e.target.value) as any)}
                    placeholder="0" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Acesso difícil ao terreno</p>
              <p className="text-xs text-muted-foreground">+8% no custo de logística</p>
            </div>
            <Switch checked={!!params.acesso_dificil}
              onCheckedChange={v => set('acesso_dificil', v)} />
          </div>
        </div>
      );

      // ── Passo 4: Sistemas especiais ─────────────────────────
      case 4: return (
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Cada sistema adiciona percentual ao custo base.</p>

          {([
            ['tem_area_lazer', 'Área de Lazer', '+2,5%'],
            ['tem_aquecimento_solar', 'Aquecimento Solar', '+1,5%'],
            ['tem_ar_condicionado', 'Ar Condicionado Central', '+3%'],
            ['tem_automacao', 'Automação Residencial', '+2%'],
            ['tem_energia_fotovoltaica', 'Energia Fotovoltaica', '+2,5%'],
            ['tem_elevador', 'Elevador', '+4,5%'],
          ] as [keyof CalculadoraParams, string, string][]).map(([k, label, pct]) => (
            <div key={k} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{pct} no custo</p>
              </div>
              <Switch
                checked={!!(params[k])}
                onCheckedChange={v => set(k, v as any)}
              />
            </div>
          ))}

          <div className="pt-2 border-t border-border/40 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Custos do empreendimento
            </p>
            {([
              ['incluir_projeto_arquitetonico', 'Projetos (arq. + estrutural + instalações)', '+4,5%'],
              ['incluir_art_rrt',               'ART/RRT do responsável técnico',             '+0,5%'],
              ['incluir_alvara_aprovacoes',      'Alvará de construção',                       '+1,0%'],
              ['incluir_habite_se',              'Habite-se e regularização',                  '+0,5%'],
              ['incluir_administracao',          'Administração/gestão da obra',               '+5,0%'],
              ['incluir_iss',                    'ISS sobre serviços',                         '+3,0%'],
              ['incluir_inss_obra',              'INSS da obra (CPP)',                         '+3,5%'],
            ] as [string, string, string][]).map(([k, label, pct]) => (
              <div key={k} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{pct} do custo</p>
                </div>
                <Switch
                  checked={!!(params.custos_adicionais as any)?.[k]}
                  onCheckedChange={v => set('custos_adicionais', {
                    ...params.custos_adicionais, [k]: v,
                  })}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Esses custos não estão incluídos no CUB.
            </p>
          </div>
        </div>
      );

      // ── Passo 5: Método e preview ────────────────────────────
      case 5: return (
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <Label>Método de Cálculo</Label>
            {(['a_cub_simplificado', 'b_hibrido', 'c_sinapi_quantitativos'] as MetodoCalculo[]).map(m => {
              const hasAccess = m === 'a_cub_simplificado' ? acesso.metodo_a
                : m === 'b_hibrido' ? acesso.metodo_b
                : acesso.metodo_c;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!hasAccess}
                  onClick={() => hasAccess && set('metodo', m)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all',
                    params.metodo === m
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/30',
                    !hasAccess && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="mt-0.5">
                    {hasAccess
                      ? <div className={cn('w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                          params.metodo === m ? 'border-primary' : 'border-muted-foreground')}>
                          {params.metodo === m && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                      : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{METODO_LABELS[m]}</p>
                    <p className="text-xs text-muted-foreground">
                      {m === 'a_cub_simplificado' && 'Estimativa rápida por CUB e fatores paramétricos.'}
                      {m === 'b_hibrido' && 'CUB refinado com composições SINAPI por etapa.'}
                      {m === 'c_sinapi_quantitativos' && 'Cálculo detalhado com quantitativos reais.'}
                    </p>
                  </div>
                  {!hasAccess && <Badge variant="secondary" className="ml-auto text-[10px]">Upgrade</Badge>}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bdi">BDI (%)</Label>
              <Input id="bdi" type="number" min={0} max={60}
                value={params.bdi_percentual ?? 20}
                onChange={e => set('bdi_percentual', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cont">Contingência (%)</Label>
              <Input id="cont" type="number" min={0} max={30}
                value={params.contingencia_percentual ?? 5}
                onChange={e => set('contingencia_percentual', Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fs">Fator de segurança</Label>
            <Input
              id="fs" type="number"
              min={1.00} max={1.50} step={0.01}
              value={params.fator_seguranca ?? 1.05}
              onChange={e => set('fator_seguranca', Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              1.00 = sem adicional · 1.10 = +10% sobre o custo base
            </p>
          </div>

          {/* Preview ao vivo */}
          {dadosLoading && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando tabelas CUB...
            </div>
          )}

          {!dadosLoading && resultado && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Estimativa Prévia
              </p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total estimado</p>
                  <p className="text-lg font-bold text-primary">{formatarMoeda(resultado.custo_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Por m²</p>
                  <p className="text-lg font-bold">{formatarMoeda(resultado.valor_m2_resultante)}</p>
                </div>
              </div>
              <div className="text-xs text-center text-muted-foreground space-y-0.5">
                <p>Faixa: {formatarMoeda(resultado.faixa_minima)} — {formatarMoeda(resultado.faixa_maxima)}</p>
                <p>Prazo estimado: {resultado.prazo_semanas} semanas</p>
              </div>
            </div>
          )}

          {!dadosLoading && !resultado && params.area_construida_m2 > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              CUB não encontrado para {params.estado}. Configure no painel admin.
            </div>
          )}
        </div>
      );

      // ── Passo 4B: Quantitativos (só Método C) ────────────────
      case step4BIndex: {
        if (totalSteps < 6) return null;
        const setQ = (k: string, v: number | undefined) =>
          set('quantitativos_reais', { ...params.quantitativos_reais, [k]: v || undefined });
        const qr = params.quantitativos_reais ?? {};
        const campos: [string, string, string, keyof typeof sugestoesQuant][] = [
          ['volume_concreto_m3', 'Volume de Concreto', 'm³', 'volume_concreto_m3'],
          ['peso_aco_kg', 'Peso de Aço', 'kg', 'peso_aco_kg'],
          ['area_forma_m2', 'Área de Forma', 'm²', 'area_forma_m2'],
          ['area_alvenaria_m2', 'Área de Paredes', 'm²', 'area_alvenaria_m2'],
          ['pontos_eletricos', 'Pontos Elétricos', 'pts', 'pontos_eletricos'],
          ['pontos_hidraulicos', 'Pontos Hidráulicos', 'pts', 'pontos_hidraulicos'],
        ];
        return (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted-foreground">Opcional — deixe vazio para usar estimativa automática.</p>
            {campos.map(([k, label, unit, sk]) => (
              <div key={k} className="space-y-1">
                <Label className="text-sm">{label}</Label>
                <p className="text-[11px] text-muted-foreground">
                  Sugestão: {sugestoesQuant[sk]} {unit}
                </p>
                <Input
                  type="number" min={0} step={0.1}
                  value={(qr as any)[k] ?? ''}
                  onChange={e => setQ(k, e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={String(sugestoesQuant[sk])}
                />
              </div>
            ))}
          </div>
        );
      }
    }
  };

  // ── Layout ────────────────────────────────────────────────────

  // Conteúdo interno reutilizado em ambos os modos
  const innerContent = (
    <>
      {/* Header */}
      <div className="p-5 pb-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Calculadora de Orçamento
          </span>
        </div>
        <p className="text-base font-semibold">
          Passo {step} — {steps[step - 1]}
        </p>
        <StepIndicator current={step} steps={steps} />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {renderStep()}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/60 bg-card px-5 py-4 flex gap-3">
        {step > 1 && (
          <Button variant="outline" size="icon" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {step < totalSteps ? (
          <Button
            className="flex-1 gap-2"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
          >
            Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="flex-1 gap-2"
            onClick={handleCalcular}
            disabled={calculando || dadosLoading || params.area_construida_m2 <= 0}
          >
            {calculando
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando...</>
              : <><Calculator className="h-4 w-4" /> Calcular Orçamento</>}
          </Button>
        )}
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full">
        {innerContent}
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-[560px] w-full p-0 overflow-hidden border-l border-border/60">
        {innerContent}
      </SheetContent>
    </Sheet>
  );
}
