import { useState, useMemo, useRef, useCallback } from 'react';
import { OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, X, Check, Loader2, ShoppingCart,
  Send, PenLine, Link2, Users, Copy, CheckCircle2, Sparkles, BookMarked, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useCotacaoCategorias, itemPertenceAEspecialidade } from '@/hooks/useCotacaoCategorias';

interface CotacaoLista {
  id: string;
  nome: string;
  item_keys: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MapaItemSimple {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
  etapaNome: string;
  etapaId: string;
}

interface MapaFornecedorSimple {
  id: string;
  nome: string;
  especialidades?: string[];  // codigos de cotacao_categorias
}

type DrawerMode = 'enviar' | 'precos';
type StatusFilter = 'todos' | 'sem_preco' | 'cotado';

interface CarrinhoItemPreco extends MapaItemSimple {
  valor: string; // P.Unit digitado
}

interface LinkCriado {
  fornecedor: string;
  token: string;
  url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  obraId: string;
  obraNome: string;
  etapas: OrcamentoEtapa[];
  itens: MapaItemSimple[];
  fornecedoresExistentes: MapaFornecedorSimple[];
  onLinksCreated: () => void;        // reload de links após criação em lote
  onPrecosAdded: () => void;         // reload de manuais após inserção em lote
  defaultMode?: DrawerMode;          // modo inicial do drawer
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export default function CotacaoDrawer({
  open, onOpenChange, obraId, obraNome, etapas, itens,
  fornecedoresExistentes, onLinksCreated, onPrecosAdded,
  defaultMode = 'enviar',
}: Props) {
  const { company } = useCompany();
  const { user } = useAuth();
  const { categorias } = useCotacaoCategorias();

  // ── Modo — "enviar link" ou "inserir preços manualmente" ─────────────────
  const [mode, setMode] = useState<DrawerMode>(defaultMode);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  // ── Carrinho ──────────────────────────────────────────────────────────────
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // ── Modo ENVIAR: fornecedores do envio ────────────────────────────────────
  const [novoFornNome, setNovoFornNome] = useState('');
  const [fornecedoresEnvio, setFornecedoresEnvio] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [linksCriados, setLinksCriados] = useState<LinkCriado[] | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const novoFornRef = useRef<HTMLInputElement>(null);

  // ── Modo PREÇOS: fornecedor alvo + valores ────────────────────────────────
  const [fornPrecoId, setFornPrecoId] = useState('');
  const [fornPrecoNome, setFornPrecoNome] = useState('');
  const [novoFornPrecoNome, setNovoFornPrecoNome] = useState('');
  const [isNovoFornPreco, setIsNovoFornPreco] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Passo 6: especialidades do último fornecedor adicionado ───────────────
  const [lastAddedEsp, setLastAddedEsp] = useState<string[]>([]);
  const [lastAddedNome, setLastAddedNome] = useState('');

  // ── Passo 7: salvar / carregar listas ─────────────────────────────────────
  const [showSalvarLista, setShowSalvarLista] = useState(false);
  const [nomeLista, setNomeLista] = useState('');
  const [salvandoLista, setSalvandoLista] = useState(false);
  const [listas, setListas] = useState<CotacaoLista[]>([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [fornPrecoIdForListas, setFornPrecoIdForListas] = useState('');

  // ── Reset ao abrir ────────────────────────────────────────────────────────
  const resetState = useCallback(() => {
    setSelecionados(new Set());
    setSearch('');
    setEtapaFilter('todas');
    setStatusFilter('todos');
    setFornecedoresEnvio([]);
    setNovoFornNome('');
    setLinksCriados(null);
    setValores({});
    setFornPrecoId('');
    setFornPrecoNome('');
    setNovoFornPrecoNome('');
    setIsNovoFornPreco(false);
    setLastAddedEsp([]);
    setLastAddedNome('');
    setShowSalvarLista(false);
    setNomeLista('');
    setListas([]);
    setFornPrecoIdForListas('');
  }, []);

  // ── Carregar listas do fornecedor (passo 7B) ─────────────────────────────
  const carregarListasDoFornecedor = useCallback(async (fornId: string) => {
    if (!fornId || !company?.id) { setListas([]); return; }
    setLoadingListas(true);
    try {
      const { data } = await (supabase as any)
        .from('cotacao_fornecedor_listas')
        .select('lista_id, cotacao_listas(id, nome, item_keys)')
        .eq('fornecedor_id', fornId);
      const rows: CotacaoLista[] = (data || [])
        .map((r: any) => r.cotacao_listas)
        .filter(Boolean);
      setListas(rows);
    } catch {
      setListas([]);
    } finally {
      setLoadingListas(false);
    }
  }, [company?.id]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  // ── Itens filtrados ───────────────────────────────────────────────────────
  const itensFiltrados = useMemo(() => {
    let result = [...itens];
    if (search.trim()) {
      const q = normalize(search.trim());
      result = result.filter(i => normalize(i.descricao).includes(q));
    }
    if (etapaFilter !== 'todas') {
      result = result.filter(i => i.etapaId === etapaFilter);
    }
    if (statusFilter === 'sem_preco') {
      result = result.filter(i => !i.precoAtual || i.precoAtual === 0);
    } else if (statusFilter === 'cotado') {
      result = result.filter(i => i.precoAtual && i.precoAtual > 0);
    }
    return result;
  }, [itens, search, etapaFilter, statusFilter]);

  const etapasDistintas = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of itens) {
      if (!seen.has(it.etapaId)) seen.set(it.etapaId, it.etapaNome);
    }
    return Array.from(seen.entries()).map(([id, nome]) => ({ id, nome }));
  }, [itens]);

  // ── Toggle de seleção ─────────────────────────────────────────────────────
  const toggleItem = (key: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Limpa o valor ao desmarcar no modo preços
        setValores(v => { const nv = { ...v }; delete nv[key]; return nv; });
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => setSelecionados(new Set(itensFiltrados.map(i => i.key)));
  const clearAll = () => { setSelecionados(new Set()); setValores({}); };

  // ── Itens no carrinho ─────────────────────────────────────────────────────
  const itensNoCarrinho = useMemo(
    () => itens.filter(i => selecionados.has(i.key)),
    [itens, selecionados]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FLUXO 1: Enviar Cotação em Lote
  // ─────────────────────────────────────────────────────────────────────────

  const addFornecedorEnvio = () => {
    const nome = novoFornNome.trim();
    if (!nome) return;
    if (fornecedoresEnvio.includes(nome)) {
      toast({ title: `"${nome}" já foi adicionado.` });
      return;
    }
    setFornecedoresEnvio(prev => [...prev, nome]);
    setNovoFornNome('');
    novoFornRef.current?.focus();
  };

  /** Adiciona fornecedor existente (do mapa) e carrega suas especialidades */
  const addFornecedorExistente = (f: MapaFornecedorSimple) => {
    if (fornecedoresEnvio.includes(f.nome)) {
      toast({ title: `"${f.nome}" já foi adicionado.` });
      return;
    }
    setFornecedoresEnvio(prev => [...prev, f.nome]);
    // Passo 6: rastreia especialidades para botão "Sugerir itens"
    if (f.especialidades && f.especialidades.length > 0) {
      setLastAddedEsp(f.especialidades);
      setLastAddedNome(f.nome);
    }
    // Passo 7B: carrega listas salvas vinculadas ao fornecedor
    if (f.id) {
      setFornPrecoIdForListas(f.id);
      carregarListasDoFornecedor(f.id);
    }
  };

  /** Sugere itens compatíveis com as especialidades do fornecedor mais recente */
  const sugerirItens = () => {
    if (!lastAddedEsp.length || !categorias.length) return;
    const sugestoes = itens
      .filter(i => itemPertenceAEspecialidade(i.etapaNome, lastAddedEsp, categorias))
      .map(i => i.key);
    if (sugestoes.length === 0) {
      toast({ title: 'Nenhum item encontrado para as especialidades deste fornecedor.' });
      return;
    }
    setSelecionados(new Set(sugestoes));
    toast({ title: `⚡ ${sugestoes.length} iten${sugestoes.length !== 1 ? 's' : ''} sugerido${sugestoes.length !== 1 ? 's' : ''} por especialidade!` });
  };

  /** Salva a seleção atual como lista em cotacao_listas */
  const handleSalvarLista = async () => {
    const nome = nomeLista.trim();
    if (!nome || selecionados.size === 0 || !company?.id) return;
    setSalvandoLista(true);
    try {
      const keys = Array.from(selecionados);
      const { data: lista, error } = await (supabase as any)
        .from('cotacao_listas')
        .insert({
          company_id: company.id,
          obra_id: obraId,
          nome,
          tipo: 'manual',
          config: {},
          item_keys: keys,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Vincular ao fornecedor se encontrado na tabela fornecedores (por nome)
      if (lista?.id && lastAddedNome) {
        const { data: dbForn } = await (supabase as any)
          .from('fornecedores')
          .select('id')
          .eq('obra_id', obraId)
          .ilike('nome', lastAddedNome)
          .maybeSingle();
        if (dbForn?.id) {
          await (supabase as any)
            .from('cotacao_fornecedor_listas')
            .insert({ fornecedor_id: dbForn.id, lista_id: lista.id });
        }
      }

      toast({ title: `💾 Lista "${nome}" salva com ${keys.length} itens!` });
      setShowSalvarLista(false);
      setNomeLista('');
    } catch (err: unknown) {
      toast({ title: 'Erro ao salvar lista', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setSalvandoLista(false);
    }
  };

  const removeFornecedorEnvio = (nome: string) =>
    setFornecedoresEnvio(prev => prev.filter(f => f !== nome));

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/cotacao/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleEnviarLote = async () => {
    if (selecionados.size === 0 || fornecedoresEnvio.length === 0) return;
    setEnviando(true);
    const itensPayload = itensNoCarrinho;
    const createdLinks: LinkCriado[] = [];

    try {
      for (const fornNome of fornecedoresEnvio) {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        const { error } = await supabase.from('cotacao_links').insert({
          token,
          obra_id: obraId,
          company_id: company?.id,
          fornecedor_nome: fornNome,
          fornecedor_email: null,
          itens: itensPayload,
          respostas: {},
          status: 'pendente',
          created_by: user?.id,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (!error) {
          createdLinks.push({
            fornecedor: fornNome,
            token,
            url: `${window.location.origin}/cotacao/${token}`,
          });
        }
      }

      if (createdLinks.length > 0) {
        setLinksCriados(createdLinks);
        onLinksCreated();
        toast({ title: `✅ ${createdLinks.length} link${createdLinks.length !== 1 ? 's' : ''} criado${createdLinks.length !== 1 ? 's' : ''}!` });
      } else {
        toast({ title: 'Erro ao criar links', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FLUXO 2: Inserir Preços em Lote
  // ─────────────────────────────────────────────────────────────────────────

  const fornPrecoFinal = isNovoFornPreco ? novoFornPrecoNome.trim() : fornPrecoNome;

  const handleNextInput = (currentKey: string) => {
    const keys = itensNoCarrinho.map(i => i.key);
    const idx = keys.indexOf(currentKey);
    if (idx >= 0 && idx < keys.length - 1) {
      inputRefs.current[keys[idx + 1]]?.focus();
    }
  };

  const handleSalvarPrecos = async () => {
    if (!fornPrecoFinal) {
      toast({ title: 'Selecione ou informe o fornecedor.', variant: 'destructive' });
      return;
    }
    const itensComValor = itensNoCarrinho.filter(i => {
      const v = parseFloat(valores[i.key] ?? '');
      return !isNaN(v) && v > 0;
    });
    if (itensComValor.length === 0) {
      toast({ title: 'Preencha ao menos um preço.', variant: 'destructive' });
      return;
    }

    setSalvando(true);
    try {
      const rows = itensComValor.map(i => ({
        obra_id: obraId,
        company_id: company?.id,
        fornecedor_nome: fornPrecoFinal,
        item_key: i.key,
        preco_unitario: parseFloat(valores[i.key]),
        updated_at: new Date().toISOString(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('cotacao_precos_manuais')
        .upsert(rows, { onConflict: 'obra_id,fornecedor_nome,item_key' });

      if (error) {
        toast({ title: 'Erro ao salvar preços', description: error.message, variant: 'destructive' });
        return;
      }

      onPrecosAdded();
      toast({ title: `✅ ${itensComValor.length} preço${itensComValor.length !== 1 ? 's' : ''} salvo${itensComValor.length !== 1 ? 's' : ''} para "${fornPrecoFinal}"!` });
      // Reset apenas os valores, mantém o carrinho visível
      setValores({});
    } catch {
      toast({ title: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const canEnviar = selecionados.size > 0 && fornecedoresEnvio.length > 0;
  const canSalvar = selecionados.size > 0 && !!fornPrecoFinal &&
    itensNoCarrinho.some(i => {
      const v = parseFloat(valores[i.key] ?? '');
      return !isNaN(v) && v > 0;
    });

  const filledCount = itensNoCarrinho.filter(i => {
    const v = parseFloat(valores[i.key] ?? '');
    return !isNaN(v) && v > 0;
  }).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col overflow-hidden"
        style={{ width: '75vw', maxWidth: 'none' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <SheetHeader className="px-5 py-4 border-b shrink-0 bg-gradient-to-r from-card to-slate-50/50 dark:to-slate-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Toggle de modo */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  onClick={() => setMode('enviar')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    mode === 'enviar'
                      ? 'bg-emerald-600 text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar Cotação
                </button>
                <button
                  onClick={() => setMode('precos')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                    mode === 'precos'
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Inserir Preços
                </button>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {mode === 'enviar'
                  ? 'Selecione itens e fornecedores → gera links em lote'
                  : 'Selecione itens e preencha P.Unit → salva tudo de uma vez'}
              </p>
            </div>
            {selecionados.size > 0 && (
              <Badge className={cn('gap-1', mode === 'enviar' ? 'bg-emerald-600' : 'bg-primary', 'text-white')}>
                <ShoppingCart className="h-3 w-3" />
                {selecionados.size} {selecionados.size === 1 ? 'item' : 'itens'}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── PAINEL ESQUERDO: lista filtrada de itens ──────────────────── */}
          <div className="flex flex-col flex-1 min-w-0 border-r overflow-hidden">

            {/* Filtros */}
            <div className="px-3 py-2 border-b space-y-2 shrink-0 bg-muted/10">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar item..."
                    className="h-7 pl-8 text-xs"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Select value={etapaFilter} onValueChange={setEtapaFilter}>
                  <SelectTrigger className="h-7 text-xs w-36 shrink-0">
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">Todas as etapas</SelectItem>
                    {etapasDistintas.map(e => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome || '—'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-7 text-xs w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                    <SelectItem value="sem_preco" className="text-xs">🔴 Sem preço</SelectItem>
                    <SelectItem value="cotado" className="text-xs">🟢 Cotados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção rápida */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{itensFiltrados.length} de {itens.length}</span>
                <button
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Selecionar tudo
                </button>
                {selecionados.size > 0 && (
                  <button onClick={clearAll} className="hover:underline">
                    Limpar seleção
                  </button>
                )}
              </div>
            </div>

            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              {itensFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground py-12 px-4">
                  <Search className="h-8 w-8 opacity-20" />
                  <p className="text-sm">Nenhum item encontrado com esses filtros.</p>
                </div>
              ) : (
                itensFiltrados.map(item => {
                  const selected = selecionados.has(item.key);
                  const semPreco = !item.precoAtual || item.precoAtual === 0;
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/20 group cursor-pointer',
                        selected && 'bg-primary/8 dark:bg-indigo-950/20'
                      )}
                      onClick={() => toggleItem(item.key)}
                    >
                      {/* Checkbox visual */}
                      <div className={cn(
                        'shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-primary border-primary text-white'
                          : 'border-border group-hover:border-primary/80'
                      )}>
                        {selected && <Check className="h-2.5 w-2.5" />}
                      </div>

                      {/* Dot status */}
                      <span className={cn(
                        'shrink-0 h-2 w-2 rounded-full',
                        semPreco ? 'bg-red-400' : 'bg-emerald-500'
                      )} />

                      {/* Descrição */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug truncate">{item.descricao}</p>
                        <p className="text-[10px] text-muted-foreground">{item.etapaNome} · {item.unidade || '—'}</p>
                      </div>

                      {/* Preço atual */}
                      <div className="text-right shrink-0">
                        {item.precoAtual && item.precoAtual > 0 ? (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {item.precoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-400">sem preço</span>
                        )}
                        {item.quantidade && (
                          <p className="text-[9px] text-muted-foreground">Qtd: {item.quantidade}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── PAINEL DIREITO: Carrinho + ação ──────────────────────────── */}
          <div className="w-80 shrink-0 flex flex-col bg-muted/5 overflow-hidden">

            {/* ── MODO ENVIAR ──────────────────────────────────────────── */}
            {mode === 'enviar' && (
              <>
                {/* Resultado: links criados */}
                {linksCriados ? (
                  <div className="flex flex-col h-full">
                    <div className="px-4 py-3 border-b bg-emerald-50 dark:bg-emerald-950/20 shrink-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          {linksCriados.length} link{linksCriados.length !== 1 ? 's' : ''} criado{linksCriados.length !== 1 ? 's' : ''}!
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Compartilhe os links abaixo com cada fornecedor
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {linksCriados.map(lc => (
                        <div key={lc.token} className="bg-card border rounded-lg p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-foreground">{lc.fornecedor}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{lc.url}</p>
                          <button
                            onClick={() => copyLink(lc.token)}
                            className={cn(
                              'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                              copiedToken === lc.token
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {copiedToken === lc.token
                              ? <><Check className="h-3 w-3" /> Copiado!</>
                              : <><Copy className="h-3 w-3" /> Copiar link</>}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t shrink-0">
                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => {
                          setLinksCriados(null);
                          setSelecionados(new Set());
                          setFornecedoresEnvio([]);
                        }}
                      >
                        Nova cotação
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Cabeçalho carrinho de envio */}
                    <div className="px-4 py-3 border-b shrink-0">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold">Enviar Cotação</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {selecionados.size} item{selecionados.size !== 1 ? 'ns' : ''} · {fornecedoresEnvio.length} fornecedor{fornecedoresEnvio.length !== 1 ? 'es' : ''}
                      </p>
                    </div>

                    {/* Lista de itens selecionados (resumo) */}
                    {selecionados.size > 0 && (
                      <div className="px-3 py-2 border-b bg-muted/10 shrink-0 max-h-32 overflow-y-auto">
                        <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Itens</p>
                        {itensNoCarrinho.slice(0, 8).map(item => (
                          <div key={item.key} className="flex items-center gap-1.5 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[10px] text-foreground truncate">{item.descricao}</span>
                          </div>
                        ))}
                        {itensNoCarrinho.length > 8 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">+ {itensNoCarrinho.length - 8} itens</p>
                        )}
                      </div>
                    )}

                    {/* Fornecedores do envio */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {/* Passo 6: botão Sugerir itens por especialidade */}
                      {lastAddedEsp.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mb-1.5">
                            ⚡ {lastAddedNome} tem especialidades cadastradas
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                            onClick={sugerirItens}
                          >
                            <Sparkles className="h-3 w-3" />
                            Sugerir itens por especialidade
                          </Button>
                        </div>
                      )}

                      {/* Passo 7B: Carregar lista salva */}
                      {listas.length > 0 && (
                        <div className="mb-3 p-2.5 rounded-lg bg-primary/8 dark:bg-indigo-950/20 border border-primary/25 dark:border-indigo-800">
                          <p className="text-[10px] text-primary dark:text-primary/80 font-medium mb-1.5">
                            <FolderOpen className="h-3 w-3 inline mr-1" />
                            Listas salvas de {lastAddedNome || 'fornecedor'}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {listas.map(lista => (
                              <button
                                key={lista.id}
                                onClick={() => {
                                  setSelecionados(new Set(lista.item_keys));
                                  toast({ title: `📋 Lista "${lista.nome}" carregada — ${lista.item_keys.length} iten${lista.item_keys.length !== 1 ? 's' : ''} selecionado${lista.item_keys.length !== 1 ? 's' : ''}!` });
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full border border-primary/60 dark:border-primary text-primary dark:text-primary/60 hover:bg-primary/12 dark:hover:bg-indigo-950/40 transition-colors"
                              >
                                {lista.nome} ({lista.item_keys.length})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {loadingListas && (
                        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Buscando listas...
                        </div>
                      )}

                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Fornecedores</p>

                      {/* Sugestões de fornecedores existentes */}
                      {fornecedoresExistentes.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {fornecedoresExistentes
                            .filter(f => !fornecedoresEnvio.includes(f.nome))
                            .slice(0, 5)
                            .map(f => (
                              <button
                                key={f.id}
                                onClick={() => addFornecedorExistente(f)}
                                className="group text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border hover:border-emerald-400 hover:text-emerald-700 transition-colors text-muted-foreground"
                                title={f.especialidades?.length ? `Especialidades: ${f.especialidades.join(', ')}` : undefined}
                              >
                                + {f.nome}
                                {f.especialidades && f.especialidades.length > 0 && (
                                  <span className="ml-0.5 text-amber-500">⚡</span>
                                )}
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Fornecedores adicionados */}
                      <div className="space-y-1.5 mb-3">
                        {fornecedoresEnvio.map(nome => (
                          <div key={nome} className="flex items-center gap-2 bg-card border rounded-md px-2.5 py-1.5">
                            <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-xs text-foreground flex-1 truncate">{nome}</span>
                            <button
                              onClick={() => removeFornecedorEnvio(nome)}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Input novo fornecedor */}
                      <div className="flex gap-1.5">
                        <Input
                          ref={novoFornRef}
                          value={novoFornNome}
                          onChange={e => setNovoFornNome(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') addFornecedorEnvio();
                            if (e.key === 'Escape') setNovoFornNome('');
                          }}
                          placeholder="Nome do fornecedor..."
                          className="h-7 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700"
                          onClick={addFornecedorEnvio}
                          disabled={!novoFornNome.trim()}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Passo 7: Salvar como lista */}
                      {selecionados.size > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          {!showSalvarLista ? (
                            <button
                              onClick={() => setShowSalvarLista(true)}
                              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                            >
                              <BookMarked className="h-3 w-3" />
                              Salvar {selecionados.size} iten{selecionados.size !== 1 ? 's' : ''} como lista...
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium text-foreground">Nome da lista</p>
                              <div className="flex gap-1.5">
                                <Input
                                  value={nomeLista}
                                  onChange={e => setNomeLista(e.target.value)}
                                  placeholder="Ex: Kit Fundação"
                                  className="h-7 text-xs flex-1"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSalvarLista();
                                    if (e.key === 'Escape') setShowSalvarLista(false);
                                  }}
                                />
                                <Button
                                  size="sm"
                                  className="h-7 px-2 bg-primary hover:bg-primary text-white text-xs"
                                  onClick={handleSalvarLista}
                                  disabled={!nomeLista.trim() || salvandoLista}
                                >
                                  {salvandoLista ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => setShowSalvarLista(false)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Enviar */}
                    <div className="p-3 border-t shrink-0">
                      <Button
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleEnviarLote}
                        disabled={!canEnviar || enviando}
                      >
                        {enviando
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />}
                        {enviando
                          ? 'Criando links...'
                          : `Gerar ${fornecedoresEnvio.length > 0 ? fornecedoresEnvio.length : ''} link${fornecedoresEnvio.length !== 1 ? 's' : ''}`}
                      </Button>
                      {selecionados.size === 0 && (
                        <p className="text-center text-[10px] text-muted-foreground mt-2">
                          Selecione itens na lista ao lado
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── MODO INSERIR PREÇOS ───────────────────────────────── */}
            {mode === 'precos' && (
              <>
                {/* Cabeçalho */}
                <div className="px-4 py-3 border-b shrink-0">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Inserir Preços</span>
                    {filledCount > 0 && (
                      <Badge className="ml-auto bg-primary/12 text-primary text-[10px]">
                        {filledCount} preenchido{filledCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {selecionados.size} item{selecionados.size !== 1 ? 'ns' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Seletor de fornecedor */}
                <div className="px-3 py-2.5 border-b shrink-0 bg-muted/10 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fornecedor</p>
                  {!isNovoFornPreco ? (
                    <div className="flex gap-1.5">
                      <Select
                        value={fornPrecoId}
                        onValueChange={v => {
                          setFornPrecoId(v);
                          setFornPrecoNome(fornecedoresExistentes.find(f => f.id === v)?.nome ?? v);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Selecionar fornecedor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedoresExistentes.map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => setIsNovoFornPreco(true)}
                      >
                        <Plus className="h-3 w-3 mr-0.5" />Novo
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <Input
                        value={novoFornPrecoNome}
                        onChange={e => setNovoFornPrecoNome(e.target.value)}
                        placeholder="Nome do fornecedor..."
                        className="h-7 text-xs flex-1"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setIsNovoFornPreco(false); setNovoFornPrecoNome(''); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Campos P.Unit por item */}
                <div className="flex-1 overflow-y-auto">
                  {itensNoCarrinho.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground px-4 py-8">
                      <ShoppingCart className="h-8 w-8 opacity-20" />
                      <p className="text-xs">Selecione itens na lista ao lado</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-1.5">
                      {itensNoCarrinho.map((item, idx) => {
                        const hasValue = parseFloat(valores[item.key] ?? '') > 0;
                        return (
                          <div
                            key={item.key}
                            className={cn(
                              'bg-card border rounded-lg p-2.5 space-y-1.5 transition-colors',
                              hasValue && 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
                            )}
                          >
                            <div className="flex items-start gap-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium text-foreground leading-snug truncate">
                                  {item.descricao}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  {item.unidade || '—'} {item.quantidade ? `· Qtd: ${item.quantidade}` : ''}
                                </p>
                              </div>
                              {hasValue && <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground shrink-0">R$</span>
                              <Input
                                ref={el => inputRefs.current[item.key] = el}
                                type="number"
                                step="0.01"
                                min="0"
                                value={valores[item.key] ?? ''}
                                onChange={e => setValores(prev => ({ ...prev, [item.key]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); handleNextInput(item.key); } }}
                                placeholder="0,00"
                                className="h-7 text-xs flex-1"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Botão Salvar */}
                <div className="p-3 border-t shrink-0">
                  <Button
                    className="w-full gap-2 bg-primary hover:bg-primary text-white"
                    onClick={handleSalvarPrecos}
                    disabled={!canSalvar || salvando}
                  >
                    {salvando
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Check className="h-4 w-4" />}
                    {salvando
                      ? 'Salvando...'
                      : `Salvar ${filledCount > 0 ? filledCount : ''} preço${filledCount !== 1 ? 's' : ''}`}
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground mt-1.5">
                    Tab ou Enter → próximo campo
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
