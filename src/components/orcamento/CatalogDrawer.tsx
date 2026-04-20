import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useOrcamento, OrcamentoEtapa, EtapaTemplate } from '@/contexts/OrcamentoContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, X, Star, DatabaseZap, Loader2, Filter,
  ShoppingCart, Layers, Target, Check, BookOpen, LayoutTemplate, Sparkles, Zap, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  descricao: string;
  unidade: string;
  tipo: 'modelo' | 'historico' | 'sinapi' | 'favorita';
  codigoSinapi?: string;
  precoMedio?: number;
  grupo?: string;
  etapaOrigem?: string;
  isModelo?: boolean;
}

export interface CarrinhoItem extends CatalogItem {
  etapaId: string;
}

// Sprint 2: 3 abas em vez de 5
export type TabId = 'etapas' | 'biblioteca' | 'sinapi';
export type BibliotecaFilter = 'todos' | 'catalogo' | 'modelos' | 'historico';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapas: OrcamentoEtapa[];
  defaultEtapaId?: string;
  defaultTab?: TabId;
  onApply: (items: CarrinhoItem[]) => Promise<void>;
  onApplyEtapas?: (etapas: EtapaTemplate[]) => void;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CatalogDrawer({
  open, onOpenChange, etapas, defaultEtapaId, defaultTab, onApply, onApplyEtapas,
}: Props) {
  const { getTodasComposicoes, catalogoEtapas } = useOrcamento();
  const { company } = useCompany();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab ?? 'etapas');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Biblioteca: sub-filtro ────────────────────────────────────────────────
  const [bibliotecaFilter, setBibliotecaFilter] = useState<BibliotecaFilter>('todos');
  const [bibliotecaItems, setBibliotecaItems] = useState<CatalogItem[]>([]);
  const [bibliotecaLoading, setBibliotecaLoading] = useState(false);
  const bibliotecaLoadedRef = useRef(false);

  // ── SINAPI ────────────────────────────────────────────────────────────────
  const [sinapiResults, setSinapiResults] = useState<CatalogItem[]>([]);
  const [sinapiLoading, setSinapiLoading] = useState(false);
  const [sinapiGrupos, setSinapiGrupos] = useState<string[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState('todos');

  // ── Etapas — seleção de templates ────────────────────────────────────────
  const [selectedEtapaTemplates, setSelectedEtapaTemplates] = useState<Set<string>>(new Set());

  // ── Carrinho ──────────────────────────────────────────────────────────────
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [applying, setApplying] = useState(false);

  // ── Reset ao abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedGrupo('todos');
      setSinapiResults([]);
      setSelectedEtapaTemplates(new Set());
      bibliotecaLoadedRef.current = false;
      if (defaultTab) setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // ── Carregar grupos SINAPI ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    type SinapiGrupoRow = { grupo: string };
    (supabase as any)
      .from('sinapi_composicoes')
      .select('grupo')
      .not('grupo', 'is', null)
      .limit(500)
      .then(({ data }: { data: SinapiGrupoRow[] | null }) => {
        if (data) {
          const unique = Array.from(
            new Set<string>(data.map(r => r.grupo).filter(Boolean))
          ).sort();
          setSinapiGrupos(unique);
        }
      });
  }, [open]);

  // ── Carregar Biblioteca (catálogo + obras anteriores) ─────────────────────
  const loadBiblioteca = useCallback(async (filter: BibliotecaFilter = 'todos') => {
    if (!company?.id) return;
    setBibliotecaLoading(true);
    const results: CatalogItem[] = [];

    // ① Catálogo próprio (catalogo_composicoes)
    if (filter === 'todos' || filter === 'catalogo' || filter === 'modelos') {
      type CatRow = { id: string; nome: string; unidade: string | null; preco_medio: number | null; is_modelo: boolean | null; categoria: string | null };
      const { data } = await (supabase as any)
        .from('catalogo_composicoes')
        .select('id, nome, unidade, preco_medio, is_modelo, categoria')
        .eq('company_id', company.id)
        .order('nome') as { data: CatRow[] | null };

      if (data) {
        data.forEach(r => {
          const isModelo = r.is_modelo === true;
          if (filter === 'modelos' && !isModelo) return;
          if (filter === 'catalogo' && isModelo) return;
          results.push({
            id: `cat-${r.id}`,
            descricao: r.nome,
            unidade: r.unidade || '',
            tipo: isModelo ? 'modelo' : 'favorita',
            precoMedio: r.preco_medio ?? undefined,
            grupo: r.categoria ?? undefined,
            isModelo,
          });
        });
      }
    }

    // ② Obras anteriores (orcamento_composicoes da empresa, outras obras)
    if (filter === 'todos' || filter === 'historico') {
      type ObraRow = { id: string; nome: string };
      type CompRow = { id: string; descricao: string; unidade: string | null; preco_unitario: number | null; obra_id: string };

      // Obter todas as obras da empresa
      const { data: obrasData } = await (supabase as any)
        .from('obras')
        .select('id, nome')
        .eq('company_id', company.id) as { data: ObraRow[] | null };

      if (obrasData && obrasData.length > 0) {
        const obraMap = new Map(obrasData.map(o => [o.id, o.nome]));
        const obraIds = obrasData.map(o => o.id);

        const { data: compData } = await (supabase as any)
          .from('orcamento_composicoes')
          .select('id, descricao, unidade, preco_unitario, obra_id')
          .in('obra_id', obraIds)
          .not('descricao', 'is', null)
          .order('descricao') as { data: CompRow[] | null };

        if (compData) {
          const seen = new Set<string>();
          compData.forEach(r => {
            const key = normalize(r.descricao || '');
            if (seen.has(key)) return;
            seen.add(key);
            results.push({
              id: `hist-${r.id}`,
              descricao: r.descricao,
              unidade: r.unidade || '',
              tipo: 'historico',
              precoMedio: r.preco_unitario ?? undefined,
              etapaOrigem: obraMap.get(r.obra_id),
            });
          });
        }
      }
    }

    setBibliotecaItems(results);
    setBibliotecaLoading(false);
    bibliotecaLoadedRef.current = true;
  }, [company?.id]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'biblioteca') loadBiblioteca(bibliotecaFilter);
  }, [open, activeTab, bibliotecaFilter, loadBiblioteca]);

  // ── Busca SINAPI ──────────────────────────────────────────────────────────
  const searchSinapi = useCallback(async (query: string, grupo: string) => {
    if (query.length < 3) { setSinapiResults([]); return; }
    setSinapiLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('search_sinapi', {
        query,
        lim: 50,
      }) as { data: { codigo: number; descricao: string; unidade: string | null; grupo: string }[] | null; error: unknown };
      if (error) throw error;
      if (data) {
        let results = data.map(r => ({
          id: `sinapi-${r.codigo}`,
          descricao: r.descricao,
          unidade: r.unidade || '',
          tipo: 'sinapi' as const,
          codigoSinapi: String(r.codigo),
          grupo: r.grupo,
        }));
        if (grupo !== 'todos') {
          results = results.filter(r => r.grupo === grupo);
        }
        setSinapiResults(results);
      }
    } finally {
      setSinapiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'sinapi') return;
    const t = setTimeout(() => searchSinapi(searchQuery, selectedGrupo), 400);
    return () => clearTimeout(t);
  }, [searchQuery, selectedGrupo, activeTab, searchSinapi]);

  // ── Dados computados ──────────────────────────────────────────────────────
  const todasComposicoes = useMemo(() => getTodasComposicoes(), [getTodasComposicoes]);

  // Etapas filtradas
  const etapasFiltered = useMemo(() => {
    if (!searchQuery.trim()) return catalogoEtapas;
    const q = normalize(searchQuery.trim());
    return catalogoEtapas.filter(e =>
      normalize(e.nome).includes(q) || normalize(e.codigo).includes(q)
    );
  }, [catalogoEtapas, searchQuery]);

  const etapasJaAdicionadas = useMemo(
    () => new Set(etapas.map(e => e.nome)),
    [etapas]
  );

  // Biblioteca filtrada por busca
  const bibliotecaFiltered = useMemo((): CatalogItem[] => {
    if (!searchQuery.trim()) return bibliotecaItems;
    const q = normalize(searchQuery.trim());
    return bibliotecaItems.filter(i => normalize(i.descricao).includes(q));
  }, [bibliotecaItems, searchQuery]);

  // ── Carrinho ──────────────────────────────────────────────────────────────
  const defaultEtapa = etapas.find(e => e.id === defaultEtapaId) || etapas[0];

  const addToCart = (item: CatalogItem) => {
    if (carrinho.some(c => c.id === item.id)) {
      toast({ title: `"${item.descricao}" já está no carrinho.` });
      return;
    }
    setCarrinho(prev => [...prev, { ...item, etapaId: defaultEtapa?.id || '' }]);
  };

  const removeFromCart = (id: string) =>
    setCarrinho(prev => prev.filter(c => c.id !== id));

  const updateCartEtapa = (itemId: string, etapaId: string) =>
    setCarrinho(prev => prev.map(c => c.id === itemId ? { ...c, etapaId } : c));

  const handleApply = async () => {
    if (carrinho.length === 0) return;
    const valid = carrinho.filter(c => c.etapaId);
    if (valid.length === 0) {
      toast({ title: 'Selecione uma etapa para cada item', variant: 'destructive' });
      return;
    }
    setApplying(true);
    try {
      await onApply(valid);
      setCarrinho([]);
      onOpenChange(false);
      toast({ title: `✅ ${valid.length} composição${valid.length !== 1 ? 'ões' : ''} adicionada${valid.length !== 1 ? 's' : ''}!` });
    } finally {
      setApplying(false);
    }
  };

  // ── Etapas: toggle + aplicar ──────────────────────────────────────────────
  const toggleEtapaTemplate = (codigo: string) => {
    setSelectedEtapaTemplates(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) { next.delete(codigo); } else { next.add(codigo); }
      return next;
    });
  };

  const handleApplyEtapas = () => {
    if (selectedEtapaTemplates.size === 0) return;
    const toAdd = catalogoEtapas.filter(e => selectedEtapaTemplates.has(e.codigo));
    if (onApplyEtapas) {
      onApplyEtapas(toAdd);
      setSelectedEtapaTemplates(new Set());
      onOpenChange(false);
      toast({
        title: `✅ ${toAdd.length} etapa${toAdd.length !== 1 ? 's' : ''} criada${toAdd.length !== 1 ? 's' : ''} com sucesso!`,
      });
    }
  };

  // ── Helpers visuais ───────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'etapas',    label: 'Etapas',     icon: <LayoutTemplate className="h-3.5 w-3.5" /> },
    { id: 'biblioteca', label: 'Biblioteca', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'sinapi',    label: 'SINAPI',     icon: <DatabaseZap className="h-3.5 w-3.5" /> },
  ];

  const BIBLIOTECA_FILTERS: { id: BibliotecaFilter; label: string }[] = [
    { id: 'todos',    label: 'Todos' },
    { id: 'catalogo', label: 'Meu Catálogo' },
    { id: 'modelos',  label: 'Modelos' },
    { id: 'historico', label: 'Obras anteriores' },
  ];

  const badgeForTipo = (tipo: CatalogItem['tipo'], isModelo?: boolean) => {
    if (isModelo) return <Badge variant="outline" className="text-[9px] h-4 border-violet-300 text-violet-600 bg-violet-50">Modelo</Badge>;
    switch (tipo) {
      case 'sinapi':   return <Badge variant="outline" className="text-[9px] h-4 border-blue-300 text-blue-600 bg-blue-50">SINAPI</Badge>;
      case 'favorita': return <Badge variant="outline" className="text-[9px] h-4 border-amber-300 text-amber-600 bg-amber-50">⭐ Catálogo</Badge>;
      case 'historico': return <Badge variant="outline" className="text-[9px] h-4 border-slate-300 text-slate-500">Obras</Badge>;
      default:         return <Badge variant="outline" className="text-[9px] h-4 border-slate-300 text-slate-500">Catálogo</Badge>;
    }
  };

  const inCart = (id: string) => carrinho.some(c => c.id === id);
  const isEtapas = activeTab === 'etapas';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col overflow-hidden"
        style={{ width: '72vw', maxWidth: 'none' }}
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-gradient-to-r from-card to-primary/8/30 dark:to-indigo-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                {isEtapas
                  ? <LayoutTemplate className="h-4 w-4 text-white" />
                  : <Zap className="h-4 w-4 text-white" />}
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold leading-tight">
                  {isEtapas ? 'Etapas do Orçamento' : activeTab === 'biblioteca' ? 'Biblioteca de Composições' : 'Busca SINAPI'}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {isEtapas
                    ? 'Selecione etapas pré-definidas para montar rapidamente seu orçamento'
                    : activeTab === 'biblioteca'
                    ? 'Catálogo da empresa, modelos e composições de obras anteriores'
                    : 'Busque composições e insumos na base SINAPI oficial'}
                </p>
              </div>
            </div>

            {/* Badge do carrinho / etapas selecionadas */}
            {!isEtapas && carrinho.length > 0 && (
              <Badge className="gap-1 bg-primary text-white">
                <ShoppingCart className="h-3 w-3" />
                {carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}
              </Badge>
            )}
            {isEtapas && selectedEtapaTemplates.size > 0 && (
              <Badge className="gap-1 bg-violet-600 text-white">
                <LayoutTemplate className="h-3 w-3" />
                {selectedEtapaTemplates.size} selecionada{selectedEtapaTemplates.size !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── PAINEL ESQUERDO ────────────────────────────────────────────── */}
          <div className="flex flex-col flex-1 min-w-0 border-r">

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="flex items-center border-b px-1 shrink-0 bg-muted/20">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors shrink-0',
                    activeTab === tab.id
                      ? tab.id === 'etapas'
                        ? 'border-violet-500 text-violet-700 dark:text-violet-400'
                        : tab.id === 'sinapi'
                        ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                        : 'border-primary text-primary dark:text-primary/80'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── Chips de filtro (aba Biblioteca) ─────────────────────────── */}
            {activeTab === 'biblioteca' && (
              <div className="flex items-center gap-1 px-3 py-2 border-b shrink-0 bg-muted/10 overflow-x-auto">
                {BIBLIOTECA_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setBibliotecaFilter(f.id)}
                    className={cn(
                      'shrink-0 px-2.5 py-1 text-[11px] rounded-full border transition-colors',
                      bibliotecaFilter === f.id
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                {/* Link para /biblioteca */}
                <button
                  onClick={() => { onOpenChange(false); navigate('/biblioteca'); }}
                  className="shrink-0 ml-auto flex items-center gap-1 px-2 py-1 text-[11px] text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gerenciar
                </button>
              </div>
            )}

            {/* ── Busca específica da aba ───────────────────────────────────── */}
            <div className="px-3 py-2 border-b shrink-0 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'sinapi'    ? 'Buscar no SINAPI (mín. 3 caracteres)...' :
                    activeTab === 'etapas'    ? 'Filtrar etapas...' :
                    'Buscar na Biblioteca...'
                  }
                  className="h-8 pl-8 text-sm pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {activeTab === 'sinapi' && sinapiGrupos.length > 0 && (
                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                  <SelectTrigger className="h-7 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Filtrar por grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">Todos os grupos</SelectItem>
                    {sinapiGrupos.map(g => (
                      <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ════════════════════════════════════════════════════════════
                CONTEÚDO PRINCIPAL
            ════════════════════════════════════════════════════════════ */}

            {activeTab === 'etapas' ? (
              /* ── ABA ETAPAS ───────────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto">
                {etapasFiltered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center text-muted-foreground px-4">
                    <LayoutTemplate className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Nenhuma etapa encontrada.</p>
                  </div>
                ) : (
                  <>
                    {/* Hint */}
                    <div className="px-4 py-2.5 bg-violet-50/60 dark:bg-violet-950/20 border-b flex items-start gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-violet-700 dark:text-violet-400 leading-snug">
                        Selecione as etapas desta obra. A estrutura vazia será criada para você preencher com composições.
                      </p>
                    </div>

                    {/* Selecionar todas / limpar */}
                    <div className="px-4 py-1.5 border-b flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {selectedEtapaTemplates.size > 0
                          ? `${selectedEtapaTemplates.size} selecionada(s)`
                          : `${etapasFiltered.length} disponíveis`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedEtapaTemplates(new Set(
                            etapasFiltered
                              .filter(e => !etapasJaAdicionadas.has(e.nome))
                              .map(e => e.codigo)
                          ))}
                          className="text-[10px] text-primary hover:underline"
                        >
                          Selecionar todas
                        </button>
                        {selectedEtapaTemplates.size > 0 && (
                          <button
                            onClick={() => setSelectedEtapaTemplates(new Set())}
                            className="text-[10px] text-muted-foreground hover:underline"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista de etapas */}
                    <div className="divide-y divide-border/30">
                      {etapasFiltered.map(etapa => {
                        const jaAdicionada = etapasJaAdicionadas.has(etapa.nome);
                        const selected = selectedEtapaTemplates.has(etapa.codigo);
                        return (
                          <button
                            key={etapa.codigo}
                            onClick={() => !jaAdicionada && toggleEtapaTemplate(etapa.codigo)}
                            disabled={jaAdicionada}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                              jaAdicionada
                                ? 'opacity-50 cursor-not-allowed bg-muted/20'
                                : selected
                                ? 'bg-violet-50/70 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/25 cursor-pointer'
                                : 'hover:bg-muted/30 cursor-pointer'
                            )}
                          >
                            <div className={cn(
                              'shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all',
                              jaAdicionada
                                ? 'border-muted bg-muted'
                                : selected
                                ? 'border-violet-500 bg-violet-500 text-white'
                                : 'border-border'
                            )}>
                              {(jaAdicionada || selected) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 w-8 text-center">
                              {etapa.codigo}
                            </span>
                            <span className={cn(
                              'text-sm flex-1 truncate',
                              jaAdicionada
                                ? 'text-muted-foreground'
                                : selected
                                ? 'font-semibold text-violet-800 dark:text-violet-300'
                                : 'text-foreground'
                            )}>
                              {etapa.nome}
                            </span>
                            {jaAdicionada && (
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0 text-muted-foreground border-muted">
                                Adicionada
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

            ) : activeTab === 'biblioteca' ? (
              /* ── ABA BIBLIOTECA ───────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto">
                {bibliotecaLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando biblioteca...</span>
                  </div>
                ) : bibliotecaFiltered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center text-muted-foreground px-6">
                    <BookOpen className="h-10 w-10 opacity-20" />
                    <div>
                      <p className="text-sm font-medium">
                        {bibliotecaFilter === 'catalogo' ? 'Nenhuma composição no catálogo' :
                         bibliotecaFilter === 'modelos'  ? 'Nenhum modelo cadastrado' :
                         bibliotecaFilter === 'historico' ? 'Nenhuma composição em obras anteriores' :
                         'Biblioteca vazia'}
                      </p>
                      <p className="text-xs mt-1 text-muted-foreground/70">
                        {bibliotecaFilter !== 'historico'
                          ? 'Use o ⭐ na planilha para salvar composições, ou gerencie pelo menu Biblioteca.'
                          : 'Composições das suas obras aparecerão aqui automaticamente.'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs mt-1"
                      onClick={() => { onOpenChange(false); navigate('/biblioteca'); }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir Biblioteca
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {bibliotecaFiltered.map(item => {
                      const added = inCart(item.id);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group',
                            added && 'bg-primary/5 dark:bg-indigo-950/20'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              {badgeForTipo(item.tipo, item.isModelo)}
                              {item.grupo && (
                                <span className="text-[9px] text-muted-foreground">{item.grupo}</span>
                              )}
                            </div>
                            <p className="text-xs text-foreground leading-snug">{item.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.unidade || '—'}</span>
                              {item.precoMedio && item.precoMedio > 0 && (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  {item.precoMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                              {item.etapaOrigem && (
                                <span className="text-[9px] text-muted-foreground/60 italic">↳ {item.etapaOrigem}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => added ? removeFromCart(item.id) : addToCart(item)}
                            className={cn(
                              'shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all border',
                              added
                                ? 'bg-primary border-primary text-white'
                                : 'border-border text-muted-foreground hover:border-primary/80 hover:text-primary hover:bg-primary/5'
                            )}
                            title={added ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
                          >
                            {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            ) : (
              /* ── ABA SINAPI ───────────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto">
                {sinapiLoading && (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                )}
                {!sinapiLoading && sinapiResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center text-muted-foreground px-4">
                    <DatabaseZap className="h-8 w-8 opacity-30" />
                    <p className="text-sm">
                      {searchQuery.length < 3
                        ? 'Digite ao menos 3 caracteres para buscar no SINAPI'
                        : 'Nenhum resultado encontrado.'}
                    </p>
                  </div>
                )}
                {!sinapiLoading && sinapiResults.map(item => {
                  const added = inCart(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 border-b border-border/30 hover:bg-muted/30 transition-colors group',
                        added && 'bg-primary/5 dark:bg-indigo-950/20'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px] h-4 border-blue-300 text-blue-600 bg-blue-50">SINAPI</Badge>
                          <span className="text-[9px] text-muted-foreground font-mono">{item.codigoSinapi}</span>
                          {item.grupo && <span className="text-[9px] text-muted-foreground">{item.grupo}</span>}
                        </div>
                        <p className="text-xs text-foreground leading-snug">{item.descricao}</p>
                        <span className="text-[10px] text-muted-foreground">{item.unidade || '—'}</span>
                      </div>
                      <button
                        onClick={() => added ? removeFromCart(item.id) : addToCart(item)}
                        className={cn(
                          'shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all border',
                          added
                            ? 'bg-primary border-primary text-white'
                            : 'border-border text-muted-foreground hover:border-primary/80 hover:text-primary hover:bg-primary/5'
                        )}
                        title={added ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
                      >
                        {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── PAINEL DIREITO ─────────────────────────────────────────────── */}
          {isEtapas ? (
            /* Resumo das etapas selecionadas */
            <div className="w-72 shrink-0 flex flex-col bg-muted/10">
              <div className="px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4 text-violet-600" />
                  <span className="text-sm font-semibold">Selecionadas</span>
                  {selectedEtapaTemplates.size > 0 && (
                    <Badge className="ml-auto bg-violet-100 text-violet-700 text-[10px]">
                      {selectedEtapaTemplates.size}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedEtapaTemplates.size === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground px-4 py-8">
                    <LayoutTemplate className="h-8 w-8 opacity-20" />
                    <p className="text-xs">Clique nas etapas ao lado para selecioná-las</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-1.5">
                    {catalogoEtapas
                      .filter(e => selectedEtapaTemplates.has(e.codigo))
                      .map(etapa => (
                        <div
                          key={etapa.codigo}
                          className="flex items-center gap-2 bg-card rounded-lg border border-violet-100 dark:border-violet-900/40 px-2.5 py-2"
                        >
                          <span className="text-[10px] font-mono font-semibold text-muted-foreground shrink-0 bg-muted px-1.5 rounded">
                            {etapa.codigo}
                          </span>
                          <span className="text-xs text-foreground flex-1 truncate">{etapa.nome}</span>
                          <button
                            onClick={() => toggleEtapaTemplate(etapa.codigo)}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t shrink-0">
                {selectedEtapaTemplates.size > 0 && onApplyEtapas ? (
                  <Button
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={handleApplyEtapas}
                  >
                    <LayoutTemplate className="h-4 w-4" />
                    Criar {selectedEtapaTemplates.size} etapa{selectedEtapaTemplates.size !== 1 ? 's' : ''}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    Selecione etapas ao lado
                  </p>
                )}
              </div>
            </div>

          ) : (
            /* Carrinho de composições */
            <div className="w-72 shrink-0 flex flex-col bg-muted/10">
              <div className="px-4 py-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Carrinho</span>
                  {carrinho.length > 0 && (
                    <Badge className="ml-auto bg-primary/12 text-primary text-[10px]">{carrinho.length}</Badge>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {carrinho.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground px-4 py-8">
                    <ShoppingCart className="h-8 w-8 opacity-20" />
                    <p className="text-xs">Clique em + para adicionar composições</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {carrinho.map(item => (
                      <div
                        key={item.id}
                        className="bg-card rounded-lg border p-2.5 space-y-2 animate-in slide-in-from-right-2 duration-200"
                      >
                        <div className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug text-foreground truncate" title={item.descricao}>
                              {item.descricao}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.unidade || '—'}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Select value={item.etapaId} onValueChange={v => updateCartEtapa(item.id, v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <Target className="h-3 w-3 mr-1 text-primary shrink-0" />
                            <SelectValue placeholder="Selecionar etapa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {etapas.map(etapa => (
                              <SelectItem key={etapa.id} value={etapa.id} className="text-xs">
                                {etapa.nome || `Etapa ${etapa.codigo}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t shrink-0">
                {carrinho.length > 0 ? (
                  <Button
                    className="w-full gap-2 bg-primary hover:bg-primary text-white"
                    onClick={handleApply}
                    disabled={applying || carrinho.some(c => !c.etapaId)}
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {applying ? 'Adicionando...' : `Adicionar ${carrinho.length} item${carrinho.length !== 1 ? 's' : ''}`}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-2">
                    Selecione itens no catálogo ao lado
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
