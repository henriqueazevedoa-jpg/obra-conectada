import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Database,
  Loader2,
  ChevronsUpDown,
  Check,
  LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { listarReferenciasSinapi } from '@/lib/sinapi/listarReferencias';
import {
  listarComposicoesPorGrupo,
  type SinapiComposicaoResumo,
} from '@/lib/sinapi/buscarComposicoes';
import { listarGruposSinapi } from '@/lib/sinapi/listarGrupos';
import {
  expandirComposicaoSinapi,
  type SinapiRegime,
  type SinapiComposicaoExpandida,
} from '@/lib/sinapi/expandComposicao';

import type { OrcamentoCategoria } from '@/contexts/OrcamentoContext';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportarSinapiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: OrcamentoCategoria[];
  defaultCompetencia?: string;
  onConfirm: (params: {
    categoriaId: string;
    referenciaId: string;
    competencia: string;
    codigoComposicao: number;
    uf: string;
    regime: SinapiRegime;
    resultadoBase?: SinapiComposicaoExpandida;
    onProgress?: (progress: number, message: string) => void;
  }) => Promise<void>;
};

type PreviewData = {
  custoUnitario: number;
  totalInsumosDetalhados: number;
  totalInsumosConsolidados: number;
  totalOrigens: number;
  origens: { nome: string; quantidade: number; subtotal: number }[];
  itensFinais: {
    codigo: number;
    descricao: string;
    unidade: string | null;
    quantidade: number;
    precoUnitario: number | null;
    custoTotal: number | null;
  }[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const REGIMES: { value: SinapiRegime; label: string }[] = [
  { value: 'SEM_DESONERACAO', label: 'Sem desoneração' },
  { value: 'COM_DESONERACAO', label: 'Com desoneração' },
  { value: 'SEM_ENCARGOS', label: 'Sem encargos sociais' },
];

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildPreview(base: SinapiComposicaoExpandida): PreviewData {
  const itensFinais = base.consolidado
    .map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: Number(item.quantidade) || 0,
      precoUnitario: item.precoUnitario,
      custoTotal: item.precoUnitario != null
        ? (Number(item.quantidade) || 0) * Number(item.precoUnitario)
        : null,
    }))
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));

  const origemMap = new Map<string, { quantidade: number; subtotal: number }>();
  for (const item of base.consolidado) {
    for (const origem of item.origens) {
      const nome = origem.grupoOrigemDescricao || 'Composição principal';
      const q = Number(origem.quantidade) || 0;
      const sub = item.precoUnitario != null ? q * Number(item.precoUnitario) : 0;
      const cur = origemMap.get(nome) || { quantidade: 0, subtotal: 0 };
      cur.quantidade += q;
      cur.subtotal += sub;
      origemMap.set(nome, cur);
    }
  }
  const origens = Array.from(origemMap.entries())
    .map(([nome, d]) => ({ nome, ...d }))
    .sort((a, b) => b.subtotal - a.subtotal);

  return {
    custoUnitario: Number(base.custoTotal) || 0,
    totalInsumosDetalhados: base.detalhado.length,
    totalInsumosConsolidados: base.consolidado.length,
    totalOrigens: origens.length,
    origens,
    itensFinais,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportarSinapiDialog({
  open,
  onOpenChange,
  categorias,
  defaultCompetencia = '',
  onConfirm,
}: ImportarSinapiDialogProps) {

  // Filtros
  const [referenciaId, setReferenciaId] = useState('');
  const [uf, setUf]                     = useState('SP');
  const [regime, setRegime]             = useState<SinapiRegime>('SEM_DESONERACAO');
  const [categoriaId, setCategoriaId]   = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [competencia, setCompetencia]   = useState(defaultCompetencia);

  // Dados carregados do banco
  const [referencias, setReferencias]   = useState<{ id: string; label: string; competencia: string }[]>([]);
  const [grupos, setGrupos]             = useState<string[]>([]);
  const [todasComposicoes, setTodasComposicoes] = useState<SinapiComposicaoResumo[]>([]);

  // Loading states
  const [loadingGrupos, setLoadingGrupos]           = useState(false);
  const [loadingComposicoes, setLoadingComposicoes] = useState(false);

  // Combobox grupo
  const [grupoPopoverOpen, setGrupoPopoverOpen] = useState(false);

  // Busca local (filtra todasComposicoes)
  const [buscaLocal, setBuscaLocal] = useState('');

  // Composição selecionada e preview
  const [composicaoSelecionada, setComposicaoSelecionada] = useState<SinapiComposicaoResumo | null>(null);
  const [summaryLoading, setSummaryLoading]               = useState(false);
  const [previewData, setPreviewData]                     = useState<PreviewData | null>(null);
  const [activePreviewTab, setActivePreviewTab]           = useState('resumo');

  // Importação em curso
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [logs, setLogs]           = useState<string[]>([]);

  const previewCacheRef = useRef<Map<string, SinapiComposicaoExpandida>>(new Map());

  // Lista filtrada pelo campo de busca (client-side)
  const composicoesFiltradas = useMemo(() => {
    const termo = buscaLocal.trim().toLowerCase();
    if (!termo) return todasComposicoes;
    return todasComposicoes.filter((c) =>
      c.descricao.toLowerCase().includes(termo) ||
      String(c.codigo).includes(termo)
    );
  }, [todasComposicoes, buscaLocal]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function appendLog(msg: string, val?: number) {
    setLogs((p) => [...p, msg]);
    if (typeof val === 'number') setProgress(val);
  }

  function getCacheKey(sel?: SinapiComposicaoResumo | null) {
    const c = sel ?? composicaoSelecionada;
    if (!referenciaId || !c) return '';
    return [referenciaId, c.codigo, uf, regime].join('|');
  }

  async function loadPreview(sel: SinapiComposicaoResumo) {
    if (!referenciaId) return;
    const key = getCacheKey(sel);
    if (!key) return;
    const cached = previewCacheRef.current.get(key);
    if (cached) { setPreviewData(buildPreview(cached)); return; }
    try {
      setSummaryLoading(true);
      const res = await expandirComposicaoSinapi({
        referenciaId,
        codigoComposicao: sel.codigo,
        uf,
        regime,
      });
      previewCacheRef.current.set(key, res);
      setPreviewData(buildPreview(res));
    } catch (err) {
      console.error(err);
      setPreviewData(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  function resetComposicoes() {
    setTodasComposicoes([]);
    setBuscaLocal('');
    setComposicaoSelecionada(null);
    setPreviewData(null);
    setActivePreviewTab('resumo');
  }

  // ─── Effects ─────────────────────────────────────────────────────────────

  // Carrega referências ao abrir (1x)
  useEffect(() => {
    if (!open) return;
    listarReferenciasSinapi()
      .then((data) => {
        setReferencias(data);
        setReferenciaId((prev) => (!prev && data.length > 0 ? data[0].id : prev));
        setCompetencia((prev) => (!prev && data.length > 0 ? defaultCompetencia || data[0].competencia || '' : prev));
      })
      .catch((err: unknown) => toast({
        title: 'Erro ao carregar referências SINAPI',
        description: err instanceof Error ? err.message : 'Falha inesperada',
        variant: 'destructive',
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Carrega grupos quando referência muda
  useEffect(() => {
    if (!referenciaId || referencias.length === 0) return;
    const ref = referencias.find((r) => r.id === referenciaId);
    if (ref) setCompetencia(ref.competencia || '');
    setLoadingGrupos(true);
    listarGruposSinapi(referenciaId)
      .then((data) => {
        setGrupos(data);
        setGrupoSelecionado('');
        resetComposicoes();
      })
      .catch((err: unknown) => toast({
        title: 'Erro ao carregar grupos',
        description: err instanceof Error ? err.message : 'Falha inesperada',
        variant: 'destructive',
      }))
      .finally(() => setLoadingGrupos(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenciaId, referencias]);

  // Quando grupo muda: carrega TODAS as composições do grupo
  useEffect(() => {
    if (!referenciaId || !grupoSelecionado) {
      resetComposicoes();
      return;
    }
    setLoadingComposicoes(true);
    resetComposicoes();
    listarComposicoesPorGrupo({ referenciaId, grupo: grupoSelecionado })
      .then((data) => setTodasComposicoes(data))
      .catch((err: unknown) => toast({
        title: 'Erro ao carregar composições',
        description: err instanceof Error ? err.message : 'Falha inesperada',
        variant: 'destructive',
      }))
      .finally(() => setLoadingComposicoes(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoSelecionado, referenciaId]);

  // Preview automático ao selecionar composição
  useEffect(() => {
    if (!composicaoSelecionada) {
      setPreviewData(null);
      setActivePreviewTab('resumo');
      return;
    }
    void loadPreview(composicaoSelecionada);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composicaoSelecionada, referenciaId, uf, regime]);

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!categoriaId) { toast({ title: 'Selecione a etapa destino', variant: 'destructive' }); return; }
    if (!referenciaId) { toast({ title: 'Selecione a referência SINAPI', variant: 'destructive' }); return; }
    if (!composicaoSelecionada) { toast({ title: 'Selecione uma composição', variant: 'destructive' }); return; }

    const key = getCacheKey();
    const resultadoBase = key ? previewCacheRef.current.get(key) : undefined;

    setIsLoading(true); setLogs([]); setProgress(10);
    try {
      appendLog(resultadoBase ? 'Usando composição já carregada...' : 'Carregando composição...', 20);
      await onConfirm({
        categoriaId, referenciaId, competencia,
        codigoComposicao: composicaoSelecionada.codigo,
        uf, regime, resultadoBase,
        onProgress: (p, m) => appendLog(m, p),
      });
      appendLog('Importação concluída.', 100);
      toast({ title: 'Composição importada com sucesso!' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Erro ao importar composição', description: err instanceof Error ? err.message : 'Erro inesperado', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  const regimeLabel = REGIMES.find((r) => r.value === regime)?.label ?? regime;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="w-[95vw] max-w-5xl h-[88vh] p-0 overflow-hidden flex flex-col gap-0">

        {/* ════ HEADER ════ */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary" />
            Importar da SINAPI
            {competencia && (
              <Badge variant="secondary" className="ml-1 text-xs font-normal">{competencia}</Badge>
            )}
          </DialogTitle>

          {/* ── LINHA 1: Referência | UF | Regime ── */}
          {/* items-end alinha todos os inputs pelo fundo, independente da altura do label */}
          <div className="grid grid-cols-[1fr_80px_1fr] gap-3 mb-3 items-end">

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground h-4 flex items-center">Referência SINAPI</Label>
              <Select value={referenciaId} onValueChange={setReferenciaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a referência" />
                </SelectTrigger>
                <SelectContent>
                  {referencias.map((ref) => (
                    <SelectItem key={ref.id} value={ref.id}>{ref.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground h-4 flex items-center">UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground h-4 flex items-center">Regime de contratação</Label>
              <Select value={regime} onValueChange={(v) => setRegime(v as SinapiRegime)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── LINHA 2: Etapa destino | Grupo de serviço ── */}
          <div className="grid grid-cols-2 gap-3 mb-4 items-end">

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground h-4 flex items-center">Etapa destino</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.filter((c) => !!c.id).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.codigo} — {cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground h-4 flex items-center">Grupo de serviço</Label>
              <Popover open={grupoPopoverOpen} onOpenChange={setGrupoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={!referenciaId || loadingGrupos}
                    className="h-9 w-full justify-between font-normal px-3"
                  >
                    {loadingGrupos ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />Carregando grupos...
                      </span>
                    ) : (
                      <span className={cn('truncate text-sm', !grupoSelecionado && 'text-muted-foreground')}>
                        {grupoSelecionado || 'Selecione um grupo'}
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar grupo de serviço..." />
                    <CommandList>
                      <CommandEmpty>Nenhum grupo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {grupos.map((g) => (
                          <CommandItem
                            key={g}
                            value={g}
                            onSelect={() => {
                              setGrupoSelecionado(g);
                              setGrupoPopoverOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4 shrink-0', grupoSelecionado === g ? 'opacity-100' : 'opacity-0')} />
                            {g}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />
        </DialogHeader>

        {/* ════ BODY: 2 colunas ════ */}
        <div className="flex-1 min-h-0 grid grid-cols-2 divide-x overflow-hidden">

          {/* ── Esquerda: Campo de busca + Lista ── */}
          <div className="flex flex-col min-h-0 p-4 gap-3">

            {/* Campo de busca (filtro client-side) */}
            <div className="shrink-0 space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" />
                {grupoSelecionado ? 'Filtrar composições' : 'Buscar composição'}
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={buscaLocal}
                  onChange={(e) => setBuscaLocal(e.target.value)}
                  placeholder={
                    !grupoSelecionado
                      ? 'Selecione um grupo para ver as composições'
                      : 'Filtrar por nome ou código...'
                  }
                  disabled={!grupoSelecionado || isLoading}
                  className="pl-8 h-9"
                />
              </div>

              {/* Contagem de resultados */}
              <p className="text-xs text-muted-foreground">
                {!grupoSelecionado
                  ? 'Selecione um grupo de serviço acima para carregar as composições'
                  : loadingComposicoes
                  ? 'Carregando composições do grupo...'
                  : composicoesFiltradas.length === 0 && buscaLocal
                  ? 'Nenhuma composição corresponde ao filtro'
                  : `${composicoesFiltradas.length} composição(ões) • ${todasComposicoes.length} no grupo`}
              </p>
            </div>

            {/* Lista de composições — ocupa o espaço restante */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded-md border">
              {!grupoSelecionado ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground p-8 gap-3">
                  <LayoutList className="w-10 h-10 opacity-20" />
                  <p>Selecione um grupo de serviço<br />para ver as composições disponíveis.</p>
                </div>
              ) : loadingComposicoes ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground p-8 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin opacity-50" />
                  <p>Carregando composições...</p>
                </div>
              ) : composicoesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground p-8 gap-2">
                  <Search className="w-8 h-8 opacity-20" />
                  <p>Nenhuma composição encontrada para este filtro.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {composicoesFiltradas.map((item) => (
                    <button
                      key={item.codigo}
                      type="button"
                      onClick={() => {
                        setComposicaoSelecionada(item);
                        setPreviewData(null);
                        setActivePreviewTab('resumo');
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-muted/60',
                        composicaoSelecionada?.codigo === item.codigo
                          ? 'bg-primary/10 border-l-2 border-l-primary'
                          : ''
                      )}
                    >
                      <div className="text-sm font-medium leading-snug">
                        {item.codigo} — {item.descricao}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.unidade || '-'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Direita: Preview ── */}
          <div className="flex flex-col min-h-0 p-4 overflow-y-auto">
            <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-3 shrink-0">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="origens" disabled={!previewData}>Origens</TabsTrigger>
                <TabsTrigger value="itens" disabled={!previewData}>Itens</TabsTrigger>
              </TabsList>

              {/* ── Resumo ── */}
              <TabsContent value="resumo" className="mt-4 flex-1">
                {!composicaoSelecionada ? (
                  <div className="flex flex-col items-center justify-center h-48 rounded-lg border border-dashed text-center text-sm text-muted-foreground gap-2">
                    <Database className="w-8 h-8 opacity-25" />
                    Selecione uma composição ao lado para ver o resumo.
                  </div>
                ) : summaryLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 rounded-lg border text-sm text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Calculando custos...
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Composição selecionada</div>
                      <div className="text-sm font-semibold leading-snug">
                        {composicaoSelecionada.codigo} — {composicaoSelecionada.descricao}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Unidade: {composicaoSelecionada.unidade || '-'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-xs">{uf}</Badge>
                        <Badge variant="outline" className="text-xs">{regimeLabel}</Badge>
                        {competencia && <Badge variant="secondary" className="text-xs">{competencia}</Badge>}
                      </div>
                    </div>

                    {previewData && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div className="rounded-md bg-background border p-3">
                          <div className="text-xs text-muted-foreground">Custo unitário</div>
                          <div className="text-base font-bold text-primary mt-0.5">{formatCurrency(previewData.custoUnitario)}</div>
                        </div>
                        <div className="rounded-md bg-background border p-3">
                          <div className="text-xs text-muted-foreground">Insumos finais</div>
                          <div className="text-base font-bold mt-0.5">{previewData.totalInsumosConsolidados}</div>
                        </div>
                        <div className="rounded-md bg-background border p-3">
                          <div className="text-xs text-muted-foreground">Itens detalhados</div>
                          <div className="text-base font-bold mt-0.5">{previewData.totalInsumosDetalhados}</div>
                        </div>
                        <div className="rounded-md bg-background border p-3">
                          <div className="text-xs text-muted-foreground">Grupos de origem</div>
                          <div className="text-base font-bold mt-0.5">{previewData.totalOrigens}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Origens ── */}
              <TabsContent value="origens" className="mt-4">
                {previewData ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Origem dos insumos
                    </div>
                    <div className="divide-y">
                      {previewData.origens.map((o) => (
                        <div key={o.nome} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div className="min-w-0 pr-3">{o.nome}</div>
                          <div className="text-right shrink-0">
                            <div className="font-medium">{formatCurrency(o.subtotal)}</div>
                            <div className="text-xs text-muted-foreground">{o.quantidade.toFixed(2)} un.</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Selecione uma composição para ver as origens.
                  </div>
                )}
              </TabsContent>

              {/* ── Itens ── */}
              <TabsContent value="itens" className="mt-4">
                {previewData ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Itens que serão importados
                    </div>
                    <div className="divide-y">
                      {previewData.itensFinais.map((item) => (
                        <div key={`${item.codigo}-${item.descricao}`} className="grid grid-cols-[1fr_48px_76px_96px] gap-2 items-start px-4 py-2 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium leading-snug">{item.descricao}</div>
                            <div className="text-xs text-muted-foreground">{item.codigo}</div>
                          </div>
                          <div className="text-xs text-muted-foreground pt-0.5">{item.unidade || '-'}</div>
                          <div className="text-right text-xs pt-0.5">{item.quantidade.toFixed(4)}</div>
                          <div className="text-right font-medium">
                            {item.custoTotal != null
                              ? formatCurrency(item.custoTotal)
                              : <span className="text-muted-foreground text-xs">Sem preço</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Selecione uma composição para ver os itens.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* ════ FOOTER ════ */}
        <div className="border-t bg-background shrink-0 px-6 py-3 space-y-2">
          {isLoading && (
            <div className="border p-3 rounded-md space-y-2 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="text-xs max-h-12 overflow-auto space-y-0.5 text-muted-foreground">
                {logs.map((log, i) => <div key={`${i}-${log}`}>{log}</div>)}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !composicaoSelecionada || !categoriaId}
              className="gap-2"
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Importando...</>
                : <><Database className="w-4 h-4" />Importar composição</>}
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
}
