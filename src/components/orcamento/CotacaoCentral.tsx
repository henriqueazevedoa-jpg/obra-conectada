import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOrcamento, OrcamentoEtapa, OrcamentoInsumo, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useCotacaoCategorias, itemPertenceAEspecialidade } from '@/hooks/useCotacaoCategorias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Link2, Plus, Copy, Check, Trash2, ExternalLink,
  AlertTriangle, RefreshCw, Download, ChevronRight, ChevronDown,
  DollarSign, Users, FileSpreadsheet, ArrowLeft,
  Search, X, ArrowUpDown, ArrowUp, ArrowDown,
  Sparkles, CheckSquare, Square, UserPlus, PenLine, Send,
  ClipboardPaste, ShoppingBag, TrendingUp, Package, CircleDot, BarChart2,
  MoreHorizontal, Brain, Tags, ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import CotacaoDrawer from '@/components/orcamento/CotacaoDrawer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSinapiAssistente } from '@/hooks/useSinapiAssistente';
import SinapiReviewDrawer from '@/components/orcamento/SinapiReviewDrawer';
import CotacaoListasView from '@/components/orcamento/CotacaoListasView';
import { usePrecoHistorico, ModoSugestao } from '@/hooks/usePrecoHistorico';
import { normalizeText } from '@/lib/normalizeText';
import { useCotacaoListas } from '@/hooks/useCotacaoListas';
import { PageKPI } from '@/components/layout/PageShell';

interface CotacaoCentralProps {
  obra: { id: string; nome: string };
  onBack: () => void;
  /** Contexto da cotação: 'orcamento' (padrão) ou 'compra' */
  contexto?: 'orcamento' | 'compra';
  onContextoChange?: (c: 'orcamento' | 'compra') => void;
  /** Itens externos (ex: lista de compra). Se fornecidos, substituem extrairItens(etapas) */
  itensExternos?: MapaItem[];
  /** 3C: busca inicial vinda do semáforo da Planilha Orçamentária */
  initialSearch?: string;
  onClearInitialSearch?: () => void;
  onKpisChange?: (kpis: PageKPI[]) => void;
}

/** Insumo consolidado para o mapa */
interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
  etapaNome: string;
  etapaId: string;
  /** 'SINAPI' quando o preço vem da tabela SINAPI importada */
  fonteReferencia?: string;
  /** true quando é uma composição sem detalhamento de insumos (não usa usaInsumos) */
  ehComposicaoSemInsumos?: boolean;
  /** Dados SINAPI gravados pelo assistente de IA (vêm do banco, sem RPC adicional) */
  sinapiPreco?: number | null;
  sinapiCodigo?: number | null;
  sinapiFonte?: string | null;
  sinapiConfidence?: string | null;
  sinapiConfirmado?: boolean;
}

interface CotacaoLink {
  id: string;
  token: string;
  fornecedor_nome: string;
  fornecedor_email: string | null;
  status: 'pendente' | 'respondido' | 'expirado';
  itens: MapaItem[];
  respostas: Record<string, number>;
  created_at: string;
  expires_at: string | null;
}

/** Fornecedor unificado: pode vir de link respondido ou de entrada manual */
interface MapaFornecedor {
  id: string;                           // link.id ou slug do nome para manuais
  nome: string;
  tipo: 'link' | 'manual';
  status?: 'pendente' | 'respondido' | 'expirado';   // só para links
  precos: Record<string, number>;       // item_key → preço unitário
  especialidades?: string[];            // codigos de cotacao_categorias
  // A2: origem por célula — cada item_key pode ter vindo de link ou manual
  // (na prática, toda célula do mesmo fornecedor tem a mesma fonte)
  fonte: 'link' | 'manual';
}

/** Preço adotado conscientemente pelo usuário para um item */
interface AdoptedPrice {
  fornId: string;
  fornNome: string;
  preco: number;
}

type SortField = 'descricao' | 'quantidade' | 'precoAtual' | null;
type SortDir = 'asc' | 'desc';
/**
 * sem_preco   — sem nenhum preço (nem SINAPI)
 * cotado      — tem preço de fornecedor real (fonte != SINAPI)
 * sinapi      — tem apenas preço de referência SINAPI
 * excluir_sinapi — tudo exceto itens SINAPI (default: oculta SINAPI da view)
 */
type StatusFilter = 'todos' | 'sem_preco' | 'cotado' | 'sinapi' | 'excluir_sinapi';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatCurrency(v: number | null) {
  if (v == null || v === 0) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();


/** Extrai todos os insumos / composições simples do orçamento (inclui campos SINAPI já salvos no banco) */
function extrairItens(etapas: OrcamentoEtapa[]): MapaItem[] {
  const items: MapaItem[] = [];
  for (const etapa of etapas) {
    for (const comp of etapa.composicoes || []) {
      if (comp.usaInsumos && comp.insumos?.length) {
        for (const ins of comp.insumos) {
          items.push({
            key: `${comp.id}::${ins.id}`,
            descricao: ins.descricao || `Insumo ${ins.codigo}`,
            unidade: ins.unidade,
            quantidade: ins.quantidade,
            precoAtual: ins.precoUnitario,
            etapaNome: etapa.nome,
            etapaId: etapa.id,
            fonteReferencia: comp.fonteReferencia,
            // Campos SINAPI do insumo (gravados pelo assistente de IA)
            sinapiPreco: ins.sinapiPreco,
            sinapiCodigo: ins.sinapiCodigo,
            sinapiFonte: ins.sinapiFonte,
            sinapiConfidence: ins.sinapiConfidence,
            sinapiConfirmado: ins.sinapiConfirmado,
          });
        }
      } else {
        items.push({
          key: comp.id,
          descricao: comp.descricao || `Composição ${comp.codigo}`,
          unidade: comp.unidade,
          quantidade: comp.quantidade,
          precoAtual: comp.precoUnitario,
          etapaNome: etapa.nome,
          etapaId: etapa.id,
          fonteReferencia: comp.fonteReferencia,
          ehComposicaoSemInsumos: true, // sem detalhamento
          // Campos SINAPI da composição (gravados pelo assistente de IA)
          sinapiPreco: comp.sinapiPreco,
          sinapiCodigo: comp.sinapiCodigo,
          sinapiFonte: comp.sinapiFonte,
          sinapiConfidence: comp.sinapiConfidence,
          sinapiConfirmado: comp.sinapiConfirmado,
        });
      }
    }
  }
  return items;
}


// ────────────────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────────────────

// 'listas' = Listas | 'comparativo' = Comparativo (mapa de preços) | 'links' = Histórico de Links
// 'mapa' e 'cotar' são mantidos como alias para evitar regressões em chamadas internas
type ActiveView = 'listas' | 'comparativo' | 'links' | 'mapa' | 'cotar';

export default function CotacaoCentral({
  obra, onBack,
  contexto = 'orcamento',
  onContextoChange,
  itensExternos,
  initialSearch = '',
  onClearInitialSearch,
  onKpisChange,
}: CotacaoCentralProps) {
  const { getOrcamento, saveOrcamento } = useOrcamento();
  const { user } = useAuth();
  const { company } = useCompany();
  const {
    registrarPrecoEmLote,
    carregarHistorico,
    getSugestao,
    getFornecedoresHistorico,
  } = usePrecoHistorico();
  const etapas = useMemo(() => getOrcamento(obra.id)?.etapas ?? [], [getOrcamento, obra.id]);
  const itens = useMemo(
    () => itensExternos && itensExternos.length > 0 ? itensExternos : extrairItens(etapas),
    [itensExternos, etapas]
  );

  const [view, setView] = useState<ActiveView>('listas');
  const [links, setLinks] = useState<CotacaoLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  // ── SINAPI Assistente IA ─────────────────────────────────────────────────
  const sinapiAssistente = useSinapiAssistente();
  const [sinapiReviewOpen, setSinapiReviewOpen] = useState(false);

  const handleRunSinapiAssistente = async () => {
    const uf = (company as any)?.uf ?? 'SP';
    const regime = (company as any)?.sinapi_regime ?? 'SEM_DESONERACAO';
    const vinculos = await sinapiAssistente.runAssistente(etapas, uf, regime);
    if (vinculos.length > 0) setSinapiReviewOpen(true);
    else toast({ title: 'Nenhum item encontrado para vincular.', variant: 'destructive' });
  };

  const handleSinapiConfirm = async (updatePrices: boolean) => {
    const { saved, pricesUpdated } = await sinapiAssistente.saveVinculos(sinapiAssistente.vinculos, updatePrices);
    setSinapiReviewOpen(false);
    sinapiAssistente.reset();
    toast({
      title: `${saved} vínculos SINAPI confirmados!`,
      description: pricesUpdated > 0 ? `${pricesUpdated} preços de referência aplicados.` : undefined,
    });
  };

  // ── Cotação Drawer ─────────────────────────────────────────────────────────
  const [cotacaoDrawerOpen, setCotacaoDrawerOpen] = useState(false);
  const [cotacaoDrawerMode, setCotacaoDrawerMode] = useState<'enviar' | 'precos'>('enviar');

  // ── Preço Adotado — escolha consciente do usuário por item ──────────────
  const [adoptedPrices, setAdoptedPrices] = useState<Record<string, AdoptedPrice>>({});

  // ── Fornecedores manuais ──────────────────────────────────────────────────
  const [fornecedoresManuais, setFornecedoresManuais] = useState<MapaFornecedor[]>([]);
  const [loadingManuais, setLoadingManuais] = useState(false);
  const [showAddFornecedor, setShowAddFornecedor] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  // item_key → fornecedor_id → { editando, valor }
  const [editingManualCell, setEditingManualCell] = useState<{ itemKey: string; fornId: string } | null>(null);
  const [editingManualValue, setEditingManualValue] = useState('');
  const [savingManualCell, setSavingManualCell] = useState<string | null>(null); // "itemKey::fornId"
  const addFornecedorInputRef = useRef<HTMLInputElement>(null);
  // A2b: Fornecedores cadastrados no sistema (para autocomplete)
  const [fornecedoresDB, setFornecedoresDB] = useState<{ id: string; nome: string; cnpj?: string | null; email?: string | null; especialidades?: string[] }[]>([]);
  const [fornSugestoes, setFornSugestoes] = useState<typeof fornecedoresDB>([]);

  // ── Categorias de especialidade ──────────────────────────────────────────
  const { categorias, getCategoriaByCode, pertenceAEspecialidade } = useCotacaoCategorias();

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState(initialSearch);
  const [etapaFilter, setEtapaFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('excluir_sinapi');
  // Prompt 2 — 3 toggles opt-in (por padrão oculta SINAPI, itens com preço e composições sem detalhe)
  const [incluirSinapi, setIncluirSinapi] = useState(false);
  const [incluirComPreco, setIncluirComPreco] = useState(false);
  const [incluirSemDetalhe, setIncluirSemDetalhe] = useState(false);
  // Filtro por especialidade de um fornecedor específico do mapa
  const [filtroRelevante, setFiltroRelevante] = useState<string | null>(null);

  // 3C: Sincroniza busca quando initialSearch muda (semáforo clicado na planilha)
  useEffect(() => {
    if (initialSearch && contexto === 'orcamento') {
      setSearch(initialSearch);
      setView('comparativo');
      onClearInitialSearch?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch, contexto]);

  // A2b: Carrega fornecedores cadastrados para autocomplete
  useEffect(() => {
    if (!obra.id) return;
    (supabase as any)
      .from('fornecedores')
      .select('id, nome, cnpj, email, especialidades')
      .eq('obra_id', obra.id)
      .then(({ data }: any) => { if (data) setFornecedoresDB(data); });
  }, [obra.id]);



  // ── Ordenação ────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Seleção em lote ─────────────────────────────────────────────────────────
  const [selectedMapaKeys, setSelectedMapaKeys] = useState<Set<string>>(new Set());

  // ── Edição inline de preços (coluna P.Unit do orçamento) ────────────────────
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // ── Aplicando melhores preços ───────────────────────────────────────────────
  const [applyingBest, setApplyingBest] = useState(false);

  // ── Novo link ───────────────────────────────────────────────────────────────
  const [showNewLink, setShowNewLink] = useState(false);
  const [newFornecedor, setNewFornecedor] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // ── Colar Preços ────────────────────────────────────────────────────────────
  const [pastePrecoOpen, setPastePrecoOpen] = useState(false);
  const [pastePrecoFornNome, setPastePrecoFornNome] = useState('');
  const [pastePrecoText, setPastePrecoText] = useState('');
  const [pastePrecoSaving, setPastePrecoSaving] = useState(false);

  // ── Carregar links e dados manuais ──────────────────────────────────────────
  const loadLinks = useCallback(async () => {
    setLoadingLinks(true);
    try {
      let query = supabase
        .from('cotacao_links')
        .select('*')
        .eq('obra_id', obra.id)
        .order('created_at', { ascending: false });
        
      if (contexto === 'orcamento') {
        // Links antigos podiam não ter o contexto explícito no banco
        query = query.or('contexto.eq.orcamento,contexto.is.null');
      } else {
        query = query.eq('contexto', contexto);
      }
      
      const { data } = await query;
      if (data) setLinks(data as unknown as CotacaoLink[]);
    } finally {
      setLoadingLinks(false);
    }
  }, [obra.id, contexto]);

  const loadFornecedoresManuais = useCallback(async () => {
    setLoadingManuais(true);
    try {
      const { data } = await (supabase as any)
        .from('cotacao_precos_manuais')
        .select('*')
        .eq('obra_id', obra.id);

      if (data && data.length > 0) {
        // Agrupar por fornecedor_nome
        const grouped: Record<string, MapaFornecedor> = {};
        for (const row of data as any[]) {
          const slug = row.fornecedor_nome;
          if (!grouped[slug]) {
            grouped[slug] = {
              id: `manual-${slug}`,
              nome: row.fornecedor_nome,
              tipo: 'manual',
              fonte: 'manual',
              precos: {},
              especialidades: [],
            };
          }
          grouped[slug].precos[row.item_key] = Number(row.preco_unitario);
        }

        // Enriquecer com especialidades da tabela fornecedores (match por nome)
        const nomes = Object.keys(grouped);
        if (nomes.length > 0) {
          const { data: dbForns } = await (supabase as any)
            .from('fornecedores')
            .select('nome, especialidades')
            .eq('obra_id', obra.id)
            .in('nome', nomes);
          if (dbForns) {
            for (const dbF of dbForns as { nome: string; especialidades: string[] | null }[]) {
              if (grouped[dbF.nome] && dbF.especialidades?.length) {
                grouped[dbF.nome].especialidades = dbF.especialidades;
              }
            }
          }
        }

        setFornecedoresManuais(Object.values(grouped));
      }
    } finally {
      setLoadingManuais(false);
    }
  }, [obra.id]);

  useEffect(() => { loadLinks(); }, [loadLinks]);
  useEffect(() => { loadFornecedoresManuais(); }, [loadFornecedoresManuais]);

  // ── Visibilidade da coluna Ref. SINAPI (toggle simples, dados já no contexto) ──
  const [showSinapiCol, setShowSinapiCol] = useState(false);
  const [showHistoricoCol, setShowHistoricoCol] = useState(false);
  const [historicoPrecos, setHistoricoPrecos] = useState<Record<string, { preco: number; ocorrencias: number }>>({});
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [gerandoPedido, setGerandoPedido] = useState(false);

  // ── Todos os fornecedores unificados (links + manuais) ─────────────────────
  const todosFornecedores = useMemo((): MapaFornecedor[] => {
    const fromLinks: MapaFornecedor[] = links.map((l) => ({
      id: l.id,
      nome: l.fornecedor_nome,
      tipo: 'link',
      fonte: 'link',
      status: l.status,
      precos: l.respostas ?? {},
    }));
    return [...fromLinks, ...fornecedoresManuais];
  }, [links, fornecedoresManuais]);

  // ── Etapas distintas (para o select de filtro) ──────────────────────────────
  const etapasDistintas = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of itens) {
      if (!seen.has(item.etapaId)) seen.set(item.etapaId, item.etapaNome);
    }
    return Array.from(seen.entries()).map(([id, nome]) => ({ id, nome }));
  }, [itens]);

  // ── Itens filtrados e ordenados ─────────────────────────────────────────────
  const itensFiltrados = useMemo(() => {
    let result = [...itens];

    // Filtro por texto
    if (search.trim()) {
      const q = normalize(search.trim());
      result = result.filter(i => normalize(i.descricao).includes(q));
    }

    // Filtro por etapa
    if (etapaFilter !== 'todas') {
      result = result.filter(i => i.etapaId === etapaFilter);
    }

    // Prompt 2 — Filtros opt-in com comportamento padrão restritivo:
    // Por padrão: apenas próprios sem preço
    result = result.filter(i => {
      const ehSinapi = i.fonteReferencia === 'SINAPI';
      const temPreco = !!i.precoAtual && i.precoAtual > 0;
      const ehSemDetalhe = !!i.ehComposicaoSemInsumos;

      // Regras de exclusão por padrão (cada toggle libera uma regra)
      if (ehSinapi && !incluirSinapi) return false;
      if (temPreco && !incluirComPreco) return false;
      if (ehSemDetalhe && !incluirSemDetalhe) return false;
      return true;
    });

    // Filtro por especialidade do fornecedor (Passo 5)
    if (filtroRelevante) {
      const forn = todosFornecedores.find(f => f.id === filtroRelevante);
      if (forn?.especialidades && forn.especialidades.length > 0) {
        result = result.filter(i =>
          itemPertenceAEspecialidade(i.etapaNome, forn.especialidades!, categorias)
        );
      }
    }

    // Ordenação
    if (sortField) {
      result.sort((a, b) => {
        let va: string | number = '';
        let vb: string | number = '';
        if (sortField === 'descricao') { va = a.descricao; vb = b.descricao; }
        else if (sortField === 'quantidade') { va = a.quantidade ?? 0; vb = b.quantidade ?? 0; }
        else if (sortField === 'precoAtual') { va = a.precoAtual ?? 0; vb = b.precoAtual ?? 0; }

        if (typeof va === 'string' && typeof vb === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortDir === 'asc'
          ? (va as number) - (vb as number)
          : (vb as number) - (va as number);
      });
    }

    return result;
  }, [itens, search, etapaFilter, incluirSinapi, incluirComPreco, incluirSemDetalhe, filtroRelevante, sortField, sortDir, todosFornecedores, categorias]);

  // ── Toggle de ordenação ─────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  // ── Seleção de itens no mapa ─────────────────────────────────────────────────
  const toggleMapaKey = (key: string) => {
    setSelectedMapaKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedMapaKeys(new Set(itensFiltrados.map(i => i.key)));
  };

  const clearMapaSelection = () => setSelectedMapaKeys(new Set());

  // ── Edição inline de preço do orçamento (P.Unit) ────────────────────────────
  const startEdit = (item: MapaItem) => {
    setEditingKey(item.key);
    setEditingValue(item.precoAtual ? String(item.precoAtual) : '');
  };

  const commitEdit = async (item: MapaItem) => {
    const value = parseFloat(editingValue);
    if (isNaN(value) || value < 0) {
      setEditingKey(null);
      return;
    }
    setSavingKey(item.key);
    try {
      const orcamento = getOrcamento(obra.id);
      if (!orcamento) return;
      const [compId, insId] = item.key.split('::');

      const updatedEtapas = orcamento.etapas.map(etapa => ({
        ...etapa,
        composicoes: etapa.composicoes.map(comp => {
          if (comp.id !== compId) return comp;
          if (insId) {
            const updatedInsumos = comp.insumos.map(ins => {
              if (ins.id !== insId) return ins;
              const upd = { ...ins, precoUnitario: value };
              if (upd.quantidade) upd.precoTotal = upd.quantidade * value;
              return upd;
            });
            const newPrecoTotal = updatedInsumos.reduce((s, i) => s + (i.precoTotal ?? 0), 0);
            return { ...comp, insumos: updatedInsumos, precoTotal: newPrecoTotal };
          } else {
            const upd = { ...comp, precoUnitario: value };
            if (upd.quantidade) upd.precoTotal = upd.quantidade * value;
            return upd;
          }
        }),
      })).map(etapa => ({
        ...etapa,
        precoTotal: etapa.composicoes.reduce((s, c) => s + c.precoTotal, 0),
      }));

      await saveOrcamento({ obraId: obra.id, etapas: updatedEtapas });
    } finally {
      setSavingKey(null);
      setEditingKey(null);
    }
  };

  // ── Edição de célula de fornecedor manual ────────────────────────────────────
  const startManualEdit = (itemKey: string, fornId: string, currentValue?: number) => {
    setEditingManualCell({ itemKey, fornId });
    setEditingManualValue(currentValue ? String(currentValue) : '');
  };

  const commitManualEdit = async (itemKey: string, fornId: string, fornNome: string) => {
    const value = parseFloat(editingManualValue);
    setEditingManualCell(null);
    if (isNaN(value) || value < 0) return;

    const cellKey = `${itemKey}::${fornId}`;
    setSavingManualCell(cellKey);
    try {
      const { error } = await (supabase as any)
        .from('cotacao_precos_manuais')
        .upsert({
          obra_id: obra.id,
          company_id: company?.id,
          fornecedor_nome: fornNome,
          item_key: itemKey,
          preco_unitario: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'obra_id,fornecedor_nome,item_key' });

      if (!error) {
        // Alimentar banco de preços históricos (best-effort)
        const item = itens.find(i => i.key === itemKey);
        (supabase as any).from('preco_historico').insert({
          company_id: company?.id,
          obra_id: obra.id,
          descricao_insumo: item?.descricao ?? itemKey,
          descricao_normalizada: normalizeText(item?.descricao ?? itemKey),
          unidade: item?.unidade ?? null,
          fornecedor_nome: fornNome,
          preco_unitario: value,
          origem: 'cotacao',
          data_referencia: new Date().toISOString().split('T')[0],
        });
      }

      // Atualizar estado local sem reload completo
      setFornecedoresManuais(prev => prev.map(f =>
        f.id === fornId
          ? { ...f, precos: { ...f.precos, [itemKey]: value } }
          : f
      ));
    } catch {
      toast({ title: 'Erro ao salvar preço', variant: 'destructive' });
    } finally {
      setSavingManualCell(null);
    }
  };

  // ── Adicionar fornecedor manual ─────────────────────────────────────────────
  const handleAddFornecedorManual = async () => {
    const nome = novoFornecedorNome.trim();
    if (!nome) return;

    // Evitar duplicatas no mapa
    const existing = fornecedoresManuais.find(f => f.nome.toLowerCase() === nome.toLowerCase());
    if (existing) {
      toast({ title: `Fornecedor "${nome}" já está no mapa.`, variant: 'destructive' });
      return;
    }

    // Verifica se já existe na tabela de fornecedores
    const dbMatch = fornecedoresDB.find(f => f.nome.toLowerCase() === nome.toLowerCase());

    // Se não existe, cria registro incompleto em `fornecedores` para acompanhamento futuro
    if (!dbMatch && company?.id) {
      const { data: novo } = await (supabase as any).from('fornecedores').insert({
        obra_id: obra.id,
        company_id: company.id,
        nome,
        observacoes: '⚠️ Cadastro iniciado pela Cotação. Complete os dados (CNPJ, telefone, e-mail, vendedor).',
      }).select('id, nome').single();
      if (novo) setFornecedoresDB(prev => [...prev, novo]);
      toast({
        title: `✅ Fornecedor "${nome}" adicionado ao mapa!`,
        description: 'Acesse a página de Fornecedores para completar o cadastro.',
      });
    } else {
      toast({ title: `✅ Fornecedor "${nome}" adicionado ao mapa!` });
    }

    const newForn: MapaFornecedor = {
      id: `manual-${nome}`,
      nome,
      tipo: 'manual',
      fonte: 'manual',
      precos: {},
      especialidades: dbMatch?.especialidades ?? [],
    };
    setFornecedoresManuais(prev => [...prev, newForn]);
    setNovoFornecedorNome('');
    setFornSugestoes([]);
    setShowAddFornecedor(false);
  };

  // ── Remover fornecedor manual ─────────────────────────────────────────────
  const handleRemoveFornecedorManual = async (fornId: string, fornNome: string) => {
    if (!confirm(`Remover fornecedor "${fornNome}" e todos os seus preços do mapa?`)) return;
    try {
      await (supabase as any)
        .from('cotacao_precos_manuais')
        .delete()
        .eq('obra_id', obra.id)
        .eq('fornecedor_nome', fornNome);
      setFornecedoresManuais(prev => prev.filter(f => f.id !== fornId));
      toast({ title: `Fornecedor "${fornNome}" removido.` });
    } catch {
      toast({ title: 'Erro ao remover fornecedor', variant: 'destructive' });
    }
  };

  // ── Melhor preço por item (inclui links E manuais) ────────────────────────
  const getMelhorPreco = useCallback((key: string): { preco: number; fornecedor: string } | null => {
    let best: { preco: number; fornecedor: string } | null = null;
    for (const forn of todosFornecedores) {
      const p = forn.precos?.[key];
      if (p && p > 0 && (!best || p < best.preco)) {
        best = { preco: p, fornecedor: forn.nome };
      }
    }
    return best;
  }, [todosFornecedores]);

  // ── Auto-popula adoptedPrices com o melhor preço quando mudam os fornecedores ──
  // (sugestão inicial — usuário pode sobrescrever clicando em outra célula)
  useEffect(() => {
    if (todosFornecedores.length === 0) return;
    setAdoptedPrices(prev => {
      const next = { ...prev };
      for (const item of itens) {
        // Só auto-adota se o item ainda não tem adoção consciente
        if (!next[item.key]) {
          const best = getMelhorPreco(item.key);
          if (best) {
            const forn = todosFornecedores.find(f => f.nome === best.fornecedor);
            if (forn) next[item.key] = { fornId: forn.id, fornNome: forn.nome, preco: best.preco };
          }
        }
      }
      return next;
    });
  }, [todosFornecedores, itens, getMelhorPreco]);

  /** Adota o preço de um fornecedor para um item */
  const adoptPrice = useCallback((itemKey: string, forn: MapaFornecedor, preco: number) => {
    setAdoptedPrices(prev => ({
      ...prev,
      [itemKey]: { fornId: forn.id, fornNome: forn.nome, preco },
    }));
  }, []);

  /** Remove a adoção de um item */
  const clearAdopt = useCallback((itemKey: string) => {
    setAdoptedPrices(prev => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  }, []);

  /** Contadores para o botão de aplicação */
  const adoptedCount = useMemo(
    () => itens.filter(i => !!adoptedPrices[i.key]).length,
    [itens, adoptedPrices]
  );

  // ── Aplicar preços ADOTADOS ao orçamento (substitui applyBestPrecos) ─────
  const applyAdoptedPrecos = async () => {
    const keysToApply = selectedMapaKeys.size > 0
      ? Array.from(selectedMapaKeys).filter(k => !!adoptedPrices[k])
      : itens.filter(i => !!adoptedPrices[i.key]).map(i => i.key);

    if (keysToApply.length === 0) {
      toast({ title: 'Nenhum preço adotado para aplicar. Clique em um preço de fornecedor para adotá-lo.' });
      return;
    }

    setApplyingBest(true);
    try {
      const orcamento = getOrcamento(obra.id);
      if (!orcamento) return;

      const updatedEtapas = orcamento.etapas.map(etapa => ({
        ...etapa,
        composicoes: etapa.composicoes.map(comp => {
          // Composição direta (sem insumos)
          if (keysToApply.includes(comp.id) && !comp.usaInsumos) {
            const adopted = adoptedPrices[comp.id];
            if (adopted) {
              const upd = { ...comp, precoUnitario: adopted.preco };
              if (upd.quantidade) upd.precoTotal = upd.quantidade * adopted.preco;
              return upd;
            }
          }
          // Insumos da composição
          if (comp.usaInsumos) {
            const updatedInsumos = comp.insumos.map(ins => {
              const key = `${comp.id}::${ins.id}`;
              if (keysToApply.includes(key)) {
                const adopted = adoptedPrices[key];
                if (adopted) {
                  const upd = { ...ins, precoUnitario: adopted.preco };
                  if (upd.quantidade) upd.precoTotal = upd.quantidade * adopted.preco;
                  return upd;
                }
              }
              return ins;
            });
            const newPrecoTotal = updatedInsumos.reduce((s, i) => s + (i.precoTotal ?? 0), 0);
            return { ...comp, insumos: updatedInsumos, precoTotal: newPrecoTotal };
          }
          return comp;
        }),
      })).map(etapa => ({
        ...etapa,
        precoTotal: etapa.composicoes.reduce((s, c) => s + c.precoTotal, 0),
      }));

      await saveOrcamento({ obraId: obra.id, etapas: updatedEtapas });

      // Registrar preços adotados no histórico
      const historicoPayload = keysToApply.map(key => {
        // Encontrar descrição e unidade procurando em comp ou insumo
        let desc = '';
        let und = '';
        const itemMapa = itensFiltrados.find(i => i.key === key) || itens.find(i => i.key === key);
        if (itemMapa) {
          desc = itemMapa.descricao;
          und = itemMapa.unidade;
        }

        const adopted = adoptedPrices[key];
        if (!desc || !adopted) return null;

        return {
          obra_id: obra.id,
          nome_material: desc,
          unidade: und,
          fornecedor_nome: todosFornecedores.find(f => f.id === adopted.fornId)?.nome || null,
          preco_unitario: adopted.preco,
          origem: 'cotacao'
        };
      }).filter(x => x !== null) as any;

      if (historicoPayload.length > 0) {
        await registrarPrecoEmLote(historicoPayload);
      }

      toast({ title: `✅ ${keysToApply.length} preço${keysToApply.length !== 1 ? 's' : ''} adotado${keysToApply.length !== 1 ? 's' : ''} aplicado${keysToApply.length !== 1 ? 's' : ''} ao orçamento!` });
      clearMapaSelection();
    } finally {
      setApplyingBest(false);
    }
  };

  // ── Aplicar melhores preços em lote ─────────────────────────────────────────
  const applyBestPrecos = async () => {
    const keysToApply = selectedMapaKeys.size > 0
      ? Array.from(selectedMapaKeys)
      : itensFiltrados.map(i => i.key);

    const withBest = keysToApply.filter(k => getMelhorPreco(k) !== null);
    if (withBest.length === 0) {
      toast({ title: 'Nenhum item com cotação respondida para aplicar.' });
      return;
    }

    setApplyingBest(true);
    try {
      const orcamento = getOrcamento(obra.id);
      if (!orcamento) return;

      const updatedEtapas = orcamento.etapas.map(etapa => ({
        ...etapa,
        composicoes: etapa.composicoes.map(comp => {
          if (withBest.includes(comp.id)) {
            const best = getMelhorPreco(comp.id);
            if (best) {
              const upd = { ...comp, precoUnitario: best.preco };
              if (upd.quantidade) upd.precoTotal = upd.quantidade * best.preco;
              return upd;
            }
          }
          if (comp.usaInsumos) {
            const updatedInsumos = comp.insumos.map(ins => {
              const key = `${comp.id}::${ins.id}`;
              if (withBest.includes(key)) {
                const best = getMelhorPreco(key);
                if (best) {
                  const upd = { ...ins, precoUnitario: best.preco };
                  if (upd.quantidade) upd.precoTotal = upd.quantidade * best.preco;
                  return upd;
                }
              }
              return ins;
            });
            const newPrecoTotal = updatedInsumos.reduce((s, i) => s + (i.precoTotal ?? 0), 0);
            return { ...comp, insumos: updatedInsumos, precoTotal: newPrecoTotal };
          }
          return comp;
        }),
      })).map(etapa => ({
        ...etapa,
        precoTotal: etapa.composicoes.reduce((s, c) => s + c.precoTotal, 0),
      }));

      await saveOrcamento({ obraId: obra.id, etapas: updatedEtapas });

      // Registrar melhores preços aplicados no histórico
      const historicoPayload = withBest.map(key => {
        let desc = '';
        let und = '';
        const itemMapa = itensFiltrados.find(i => i.key === key) || itens.find(i => i.key === key);
        if (itemMapa) {
          desc = itemMapa.descricao;
          und = itemMapa.unidade;
        }
        const best = getMelhorPreco(key);
        if (!desc || !best) return null;

        return {
          obra_id: obra.id,
          nome_material: desc,
          unidade: und,
          fornecedor_nome: best.fornecedorNome || null,
          preco_unitario: best.preco,
          origem: 'cotacao'
        };
      }).filter(x => x !== null) as any;

      if (historicoPayload.length > 0) {
        await registrarPrecoEmLote(historicoPayload);
      }

      toast({ title: `✅ ${withBest.length} preço${withBest.length !== 1 ? 's' : ''} aplicado${withBest.length !== 1 ? 's' : ''} ao orçamento!` });
      clearMapaSelection();
    } finally {
      setApplyingBest(false);
    }
  };

  // ── Criar link — FIX BUG-1: passa company_id ────────────────────────────────
  const handleCreateLink = async () => {
    if (!newFornecedor.trim() || selectedKeys.size === 0) return;
    setCreating(true);
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const itensSelected = itens.filter((i) => selectedKeys.has(i.key));
    try {
      const { error } = await supabase.from('cotacao_links').insert({
        token,
        obra_id: obra.id,
        company_id: company?.id,
        fornecedor_nome: newFornecedor.trim(),
        fornecedor_email: newEmail.trim() || null,
        itens: itensSelected,
        respostas: {},
        status: 'pendente',
        created_by: user?.id,
        contexto,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) {
        toast({ title: 'Erro ao criar link de cotação', description: error.message, variant: 'destructive' });
        return;
      }
      setNewFornecedor('');
      setNewEmail('');
      setSelectedKeys(new Set());
      setShowNewLink(false);
      await loadLinks();
      toast({ title: '🔗 Link de cotação criado com sucesso!' });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/cotacao/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const deleteLink = async (id: string) => {
    await supabase.from('cotacao_links').delete().eq('id', id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Exportar CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const keysToExport = selectedMapaKeys.size > 0
      ? itensFiltrados.filter(i => selectedMapaKeys.has(i.key))
      : itensFiltrados;
    const header = ['Etapa', 'Descrição', 'Un', 'Qtd', 'P.Unit', 'P.Total', ...todosFornecedores.map((f) => f.nome)];
    const rows = keysToExport.map((item) => [
      item.etapaNome,
      item.descricao,
      item.unidade,
      item.quantidade ?? '',
      item.precoAtual ?? '',
      (item.quantidade != null && item.precoAtual != null) ? item.quantidade * item.precoAtual : '',
      ...todosFornecedores.map((f) => f.precos?.[item.key] ?? ''),
    ]);
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cotacao_${obra.nome.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  // ── Colar Preços: parsear texto colado (TSV/CSV: descrição + preço) ──────────
  const handlePastePrecos = async () => {
    const nome = pastePrecoFornNome.trim();
    if (!nome) { toast({ title: 'Informe o nome do fornecedor', variant: 'destructive' }); return; }
    const lines = pastePrecoText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast({ title: 'Cole o conteúdo da planilha primeiro', variant: 'destructive' }); return; }

    const matched: { itemKey: string; preco: number }[] = [];
    for (const line of lines) {
      const parts = line.split(/\t|;/).map(p => p.trim());
      if (parts.length < 2) continue;
      const rawPreco = parts[parts.length - 1].replace(/[R$\s.]/g, '').replace(',', '.');
      const preco = parseFloat(rawPreco);
      if (isNaN(preco) || preco <= 0) continue;
      const desc = parts.slice(0, parts.length - 1).join(' ');
      const queryWords = normalize(desc).split(/\s+/).filter(w => w.length > 3);
      let bestItem: MapaItem | null = null;
      let bestScore = 0;
      for (const item of itens) {
        const itemNorm = normalize(item.descricao);
        const matchCount = queryWords.filter(w => itemNorm.includes(w)).length;
        if (matchCount > bestScore) { bestScore = matchCount; bestItem = item; }
      }
      if (bestItem && bestScore >= 1) matched.push({ itemKey: bestItem.key, preco });
    }

    if (matched.length === 0) {
      toast({ title: 'Nenhum item reconhecido. Formato esperado: Descrição [tab] Preço', variant: 'destructive' });
      return;
    }
    setPastePrecoSaving(true);
    try {
      const dbRows = matched.map(m => ({
        obra_id: obra.id,
        company_id: company?.id,
        fornecedor_nome: nome,
        item_key: m.itemKey,
        preco_unitario: m.preco,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await (supabase as any)
        .from('cotacao_precos_manuais')
        .upsert(dbRows, { onConflict: 'obra_id,fornecedor_nome,item_key' });
      if (error) throw error;

      // Alimentar banco de preços históricos (best-effort)
      const historicoRows = matched.map(m => {
        const item = itens.find(i => i.key === m.itemKey);
        return {
          company_id: company?.id,
          obra_id: obra.id,
          descricao_insumo: item?.descricao ?? m.itemKey,
          descricao_normalizada: normalizeText(item?.descricao ?? m.itemKey),
          unidade: item?.unidade ?? null,
          fornecedor_nome: nome,
          preco_unitario: m.preco,
          origem: 'cotacao',
          data_referencia: new Date().toISOString().split('T')[0],
        };
      });
      (supabase as any).from('preco_historico').insert(historicoRows);

      await loadFornecedoresManuais();
      setPastePrecoOpen(false);
      setPastePrecoText('');
      setPastePrecoFornNome('');
      toast({ title: `✅ ${matched.length} preço${matched.length !== 1 ? 's' : ''} importado${matched.length !== 1 ? 's' : ''} para "${nome}"!` });
    } catch (err: unknown) {
      toast({ title: 'Erro ao importar preços', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setPastePrecoSaving(false);
    }
  };

  // ── Gerar Pedido de Compra (HTML imprimível) ─────────────────────────────────
  const handleGerarPedidoCompra = () => {
    const keysToUse = selectedMapaKeys.size > 0
      ? itensFiltrados.filter(i => selectedMapaKeys.has(i.key))
      : itensFiltrados;
    const itensPedido = keysToUse.map(item => ({ item, best: getMelhorPreco(item.key) })).filter(({ best }) => best !== null);
    if (itensPedido.length === 0) {
      toast({ title: 'Nenhum item com melhor preço para gerar pedido.', variant: 'destructive' });
      return;
    }
    setGerandoPedido(true);
    const porFornecedor: Record<string, { item: MapaItem; preco: number }[]> = {};
    for (const { item, best } of itensPedido) {
      if (!best) continue;
      if (!porFornecedor[best.fornecedor]) porFornecedor[best.fornecedor] = [];
      porFornecedor[best.fornecedor].push({ item, preco: best.preco });
    }
    const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const totalGeral = itensPedido.reduce((s, { item, best }) => s + (best ? (item.quantidade ?? 1) * best.preco : 0), 0);
    const fornBlocks = Object.entries(porFornecedor).map(([forn, itensF]) => {
      const totalForn = itensF.reduce((s, { item, preco }) => s + (item.quantidade ?? 1) * preco, 0);
      const porEtapa: Record<string, { item: MapaItem; preco: number }[]> = {};
      for (const d of itensF) {
        if (!porEtapa[d.item.etapaNome]) porEtapa[d.item.etapaNome] = [];
        porEtapa[d.item.etapaNome].push(d);
      }
      const etapaRows = Object.entries(porEtapa).map(([etapa, rows]) =>
        `<tr class="etapa-row"><td colspan="5">${etapa}</td></tr>` +
        rows.map(({ item, preco }) =>
          `<tr><td>${item.descricao}</td><td class="num">${item.unidade || '—'}</td>` +
          `<td class="num">${item.quantidade ?? '—'}</td><td class="num">${fmtBRL(preco)}</td>` +
          `<td class="num">${fmtBRL((item.quantidade ?? 1) * preco)}</td></tr>`).join('')
      ).join('');
      return `<div class="fornecedor-block"><div class="fornecedor-name">🏪 ${forn}</div>
        <table><thead><tr><th>Descrição</th><th class="num" style="width:40px">Un</th><th class="num" style="width:55px">Qtd</th><th class="num" style="width:85px">P.Unit</th><th class="num" style="width:95px">P.Total</th></tr></thead>
        <tbody>${etapaRows}<tr class="total-row"><td colspan="4">Total — ${forn}</td><td class="num">${fmtBRL(totalForn)}</td></tr></tbody></table></div>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Comparativo de Preços — ${obra.nome}</title>
<style>*{box-sizing:border-box;font-family:'Segoe UI',sans-serif;margin:0;padding:0}body{padding:32px;color:#111;font-size:11px}h1{font-size:18px;font-weight:700;margin-bottom:2px}.subtitle{font-size:11px;color:#666;margin-bottom:24px}.fornecedor-block{margin-bottom:28px;page-break-inside:avoid}.fornecedor-name{font-size:13px;font-weight:700;color:#3730a3;border-bottom:2px solid #3730a3;padding-bottom:4px;margin-bottom:10px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569;border-bottom:1px solid #e2e8f0}td{padding:5px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}.etapa-row td{padding:3px 8px;background:#f8fafc;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8}.num{text-align:right}.total-row td{font-weight:700;border-top:2px solid #e2e8f0;padding-top:8px}.grand-total{margin-top:20px;border:2px solid #3730a3;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}.grand-total .label{font-size:12px;font-weight:600;color:#3730a3}.grand-total .value{font-size:16px;font-weight:800;color:#3730a3}.footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;color:#94a3b8;font-size:10px}@media print{body{padding:16px}}</style>
</head><body><h1>Comparativo de Preços — Referências de Orçamento</h1>
<p class="subtitle">Obra: <strong>${obra.nome}</strong> · Emitido em ${dataHoje} · ${itensPedido.length} itens</p>
${fornBlocks}
<div class="grand-total"><span class="label">Total Geral do Pedido</span><span class="value">${fmtBRL(totalGeral)}</span></div>
<div class="footer">Gerado automaticamente pelo Obra Conectada · ${window.location.hostname}</div>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 400); }
    setGerandoPedido(false);
  };

  // ── KPIs — A3: distingue cotações reais de referências SINAPI ──────────────────
  const itensSemPreco    = itens.filter(i => !i.precoAtual || i.precoAtual === 0);
  const itensSinapi = itens.filter(i =>
    (i.precoAtual && i.precoAtual > 0 && i.fonteReferencia === 'SINAPI') ||
    (i.sinapiConfirmado && i.sinapiPreco != null && i.sinapiPreco > 0)
  );
  // "Cotado" real = tem preço E a fonte NÃO é SINAPI
  const totalCotados     = itens.filter(i => i.precoAtual && i.precoAtual > 0 && i.fonteReferencia !== 'SINAPI').length;
  const pctCotado        = itens.length > 0 ? Math.round((totalCotados / itens.length) * 100) : 0;
  const totalOrcado      = itens.reduce((s, i) => s + ((i.quantidade ?? 0) * (i.precoAtual ?? 0)), 0);
  const respondidos      = links.filter(l => l.status === 'respondido').length;

  const kpiBarColor = pctCotado === 0 ? 'bg-muted-foreground/30' : pctCotado === 100 ? 'bg-emerald-500' : 'bg-blue-500';
  const kpiTextColor = pctCotado === 0 ? 'text-muted-foreground' : pctCotado === 100 ? 'text-emerald-600' : 'text-blue-600';

  const itensComMelhorPreco = itensFiltrados.filter(i => getMelhorPreco(i.key) !== null);


  // Número total de colunas para colSpan
  // +1 for "Adotado" column when there are suppliers, +1 SINAPI when enabled
  const totalCols = 6 + todosFornecedores.length + (todosFornecedores.length > 0 ? 1 : 0) + (showSinapiCol ? 1 : 0) + (showHistoricoCol ? 1 : 0);

  // Busca preços históricos quando a coluna é ativada
  useEffect(() => {
    if (!showHistoricoCol || itens.length === 0) return;
    const companyId = (company as any)?.id;
    if (!companyId) return;
    setLoadingHistorico(true);
    const descricoes = itens.map(i => i.descricao);
    (supabase as any)
      .rpc('buscar_precos_historicos', {
        p_company_id: companyId,
        p_obra_id:    obra.id,
        p_descricoes: descricoes,
      })
      .then(({ data, error }: any) => {
        if (error || !data) return;
        const map: Record<string, { preco: number; ocorrencias: number }> = {};
        for (const row of data) {
          map[row.descricao_norm] = { preco: Number(row.preco_medio), ocorrencias: row.ocorrencias };
        }
        setHistoricoPrecos(map);
      })
      .finally(() => setLoadingHistorico(false));
  }, [showHistoricoCol, itens, obra.id, company]);

  // ── Hook Banco de Preços Históricos ─────────────────────────────────────────────
  const [modoSugestao, setModoSugestao] = useState<ModoSugestao>('ultimo');
  const [fornecedorSugestao, setFornecedorSugestao] = useState<string>('');

  // Carregar histórico quando itens mudam
  useEffect(() => {
    if (itens.length > 0) {
      carregarHistorico(itens.map(i => i.descricao));
    }
  }, [itens, carregarHistorico]);

  // ── Listas para aba Listas ─────────────────────────────────────────────────
  const {
    listas: listasHook,
    criarLista: criarListaHook,
  } = useCotacaoListas(obra.id, (company as any)?.id);

  const [listaSelecionada, setListaSelecionada] = useState<string | null>(null);
  const [listasCompra, setListasCompra] = useState<any[]>([]);

  const [loadingListas, setLoadingListas] = useState(contexto === 'compra');
  useEffect(() => {
    if (contexto !== 'compra') return;
    setLoadingListas(true);
    (supabase as any)
      .from('lista_compra')
      .select('*, itens:lista_compra_itens(*)')
      .eq('obra_id', obra.id)
      .eq('status', 'em_cotacao')
      .then(({ data }: any) => { 
        if (data) {
          setListasCompra(data);
          // Se tiver busca inicial, tenta selecionar a lista pelo nome
          if (initialSearch) {
            const match = data.find((l: any) => l.nome.toLowerCase().includes(initialSearch.toLowerCase()));
            if (match) {
              setListaSelecionada(match.id);
            } else if (data.length > 0 && !listaSelecionada) {
              setListaSelecionada(data[0].id);
            }
            onClearInitialSearch?.();
          } else if (data.length > 0 && !listaSelecionada) {
            setListaSelecionada(data[0].id);
          }
        }
        setLoadingListas(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id, contexto, initialSearch]);

  // Itens sem lista (contexto orçamento)
  const itensSemLista = useMemo(() => {
    const keysEmLista = new Set(listasHook.flatMap(l => l.item_keys ?? []));
    return itens.filter(i =>
      !keysEmLista.has(i.key) &&
      (!i.precoAtual || i.precoAtual === 0) &&
      i.fonteReferencia !== 'SINAPI'
    );
  }, [itens, listasHook]);

  // Itens ativos da lista de compra selecionada
  const itensCompraAtivos = useMemo(() => {
    if (contexto !== 'compra' || !listaSelecionada) return [];
    const lista = listasCompra.find(l => l.id === listaSelecionada);
    if (!lista?.itens) return [];
    return lista.itens.map((i: any) => ({
      key: i.id,
      descricao: i.nome,
      unidade: i.unidade ?? 'un',
      quantidade: i.quantidade,
      precoAtual: i.preco_unitario,
      etapaNome: lista.nome,
      etapaId: '',
      fonteReferencia: undefined,
    })) as MapaItem[];
  }, [contexto, listaSelecionada, listasCompra]);

  // Itens da lista selecionada
  const itensListaSelecionada = useMemo(() => {
    if (!listaSelecionada) return [];
    if (listaSelecionada === '__sem_lista__') return itensSemLista;
    if (contexto === 'compra') return itensCompraAtivos;
    const lista = listasHook.find(l => l.id === listaSelecionada);
    if (!lista) return [];
    const keys = new Set(lista.item_keys ?? []);
    return itens.filter(i => keys.has(i.key));
  }, [listaSelecionada, itensSemLista, listasHook, itens, contexto, itensCompraAtivos]);

  // ── Fornecedores existentes para o CotacaoDrawer (inclui especialidades) ──
  const fornecedoresExistentesDrawer = useMemo(() =>
    todosFornecedores.map(f => ({ id: f.id, nome: f.nome, especialidades: f.especialidades ?? [] })),
    [todosFornecedores]
  );

  // ── Emite KPIs para o pai (se desejado) ──
  useEffect(() => {
    if (!onKpisChange) return;
    if (itens.length === 0) {
      onKpisChange([]);
      return;
    }
    onKpisChange([
      { id: 'sem_preco', label: 'Sem preço', value: String(itensSemPreco.length), tint: itensSemPreco.length > 0 ? '#FCEBEB' : '#F3F2FD', valueColor: itensSemPreco.length > 0 ? '#A32D2D' : '#3C3489' },
      { id: 'cotados', label: 'Cotados', value: `${pctCotado}%`, tint: '#F3F2FD', valueColor: '#3C3489' },
      { id: 'forns', label: 'Fornecedores', value: String(todosFornecedores.length), tint: '#F3F2FD', valueColor: '#3C3489' }
    ]);
  }, [itens.length, itensSemPreco.length, pctCotado, todosFornecedores.length, onKpisChange]);

  const isCompraEmptyState = !loadingListas && contexto === 'compra' && listasCompra.length === 0;

  if (isCompraEmptyState) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden relative">
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-foreground">Nenhuma lista de compra ativa</p>
          <p className="text-xs text-muted-foreground">
            Crie uma lista de compra na aba Compras para cotar os itens aqui.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/compras?tab=lista'}>
            Ir para Compras
          </Button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">

      {/* ════ ZONA 0 — Badge de contexto ═══════════════════════════════════ */}
      {onContextoChange && (
        <div className="px-4 md:px-6 pt-3 pb-1 shrink-0 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Contexto:</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:bg-muted/60 border-border text-foreground">
                {contexto === 'orcamento' ? '📋 Orçamento' : '🛒 Compras'}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              <button
                onClick={() => onContextoChange('orcamento')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted/60',
                  contexto === 'orcamento' && 'bg-muted font-medium'
                )}
              >
                {contexto === 'orcamento' && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                <span className={contexto !== 'orcamento' ? 'ml-5' : ''}>Orçamento</span>
              </button>
              <button
                onClick={() => onContextoChange('compra')}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted/60',
                  contexto === 'compra' && 'bg-muted font-medium'
                )}
              >
                {contexto === 'compra' && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                <span className={contexto !== 'orcamento' ? '' : 'ml-5'}>Compras</span>
              </button>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Empty state movido para o topo do componente como Early Return */}
      {/* ════════════════════════════════════════════════════════════════════
           ZONA 1 — KPIs compactos
          ════════════════════════════════════════════════════════════════════ */}
      {!onKpisChange && itens.length > 0 && (
        <div className="px-4 md:px-6 pt-3 pb-2 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Sem preço */}
            <div className={cn(
              'rounded-lg border px-3 py-2 flex flex-col gap-0.5',
              itensSemPreco.length > 0 ? 'bg-red-50/60 border-red-200' : 'bg-card border-border'
            )}>
              <span className={cn('text-lg font-bold tabular-nums leading-none', itensSemPreco.length > 0 ? 'text-red-600' : 'text-foreground')}>
                {itensSemPreco.length}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Sem preço</span>
            </div>
            {/* % Cotados */}
            <div className="rounded-lg border px-3 py-2 flex flex-col gap-0.5 bg-card border-border">
              <span className={cn('text-lg font-bold tabular-nums leading-none', kpiTextColor)}>{pctCotado}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Cotados</span>
            </div>
            {/* Fornecedores */}
            <div className="rounded-lg border px-3 py-2 flex flex-col gap-0.5 bg-card border-border">
              <span className="text-lg font-bold tabular-nums leading-none text-foreground">{todosFornecedores.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Fornecedores</span>
            </div>
            {/* Valor coberto */}
            <div className="rounded-lg border px-3 py-2 flex flex-col gap-0.5 bg-card border-border">
              <span className="text-base font-bold tabular-nums leading-none text-foreground truncate">
                {totalOrcado > 0 ? totalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor coberto</span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
           ZONA 2 — Toolbar: views + ações primárias + indicador + overflow
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-0 px-4 md:px-6 border-t border-b bg-background shrink-0" style={{ minHeight: '40px' }}>

        {/* ──────────────────────────────────────────────────
             Grupo A — Views (estilo aba, underline azul no ativo)
             Sem borda, sem fundo, sem shadow — apenas texto e sublinhado
           ────────────────────────────────────────────────── */}
        {/* ──────────────────────────────────────────────────
             Grupo A — Stepper de 3 etapas (substitui as tabs)
           ────────────────────────────────────────────────── */}
        <div className="flex items-stretch h-full">
          {([
            { id: 'listas'      as ActiveView, label: 'Listas' },
            { id: 'comparativo' as ActiveView, label: 'Comparativo' },
            { id: 'links'       as ActiveView, label: 'Links' },
          ]).map(aba => {
            const isActive = view === aba.id ||
              (aba.id === 'comparativo' && view === 'mapa');
            return (
              <button
                key={aba.id}
                onClick={() => setView(aba.id)}
                className={cn(
                  'relative flex items-center px-3 text-xs font-medium transition-colors whitespace-nowrap h-full',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {aba.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Divisor vertical */}
        <div className="w-px h-5 bg-border shrink-0 mx-3" />

        {/* ──────────────────────────────────────────────────
             Grupo B — Ações primárias e Contextuais
           ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5">

          {/* Botão contextual: Comparativo (+ Fornecedor) */}
          {view === 'comparativo' && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-primary/25 text-primary hover:bg-primary/8 dark:border-indigo-800 dark:text-primary/80 dark:hover:bg-indigo-950/30"
                onClick={() => { setShowAddFornecedor(v => !v); setTimeout(() => addFornecedorInputRef.current?.focus(), 50); }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                + Fornecedor
              </Button>
              {showAddFornecedor && (
                <div className="absolute right-0 top-full mt-1 z-20 w-72 rounded-lg border bg-card shadow-lg p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="text-xs font-medium text-foreground">Adicionar fornecedor ao mapa</p>
                  <div className="relative">
                    <Input
                      ref={addFornecedorInputRef}
                      value={novoFornecedorNome}
                      onChange={e => {
                        const v = e.target.value;
                        setNovoFornecedorNome(v);
                        if (v.trim().length >= 1) {
                          const q = normalize(v.trim());
                          setFornSugestoes(
                            fornecedoresDB.filter(f =>
                              normalize(f.nome).includes(q) &&
                              !fornecedoresManuais.some(m => m.nome.toLowerCase() === f.nome.toLowerCase())
                            ).slice(0, 5)
                          );
                        } else {
                          setFornSugestoes([]);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddFornecedorManual();
                        if (e.key === 'Escape') { setShowAddFornecedor(false); setFornSugestoes([]); }
                      }}
                      placeholder="Nome ou buscar cadastrado..."
                      className="h-8 text-sm"
                    />
                    {fornSugestoes.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-0.5 z-30 rounded-md border bg-popover shadow-md overflow-hidden">
                        {fornSugestoes.map(f => (
                          <button
                            key={f.id}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                            onClick={() => {
                              setNovoFornecedorNome(f.nome);
                              setFornSugestoes([]);
                              setTimeout(() => addFornecedorInputRef.current?.focus(), 50);
                            }}
                          >
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{f.nome}</span>
                            {f.cnpj && <span className="text-muted-foreground shrink-0">{f.cnpj}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddFornecedorManual} disabled={loadingManuais}>
                      {loadingManuais ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Adicionar'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddFornecedor(false); setFornSugestoes([]); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão contextual: Links (Novo Link) */}
          {view === 'links' && !showNewLink && (
            <Button
              onClick={() => setShowNewLink(true)}
              className="gap-1.5 h-7 text-xs"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Link
            </Button>
          )}

          {/* Botão primário: Inserir Preços (Oculto na view de Links) */}
          {view !== 'links' && (
            <Button
              onClick={() => { setCotacaoDrawerMode('precos'); setCotacaoDrawerOpen(true); }}
              size="sm"
              className="h-7 text-xs gap-1.5"
            >
              <PenLine className="h-3.5 w-3.5" />
              Inserir Preços
            </Button>
          )}

          {/* Dropdown secundário: demais ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => { setCotacaoDrawerMode('enviar'); setCotacaoDrawerOpen(true); }}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Enviar cotação por link
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => { setPastePrecoFornNome(''); setPastePrecoText(''); setPastePrecoOpen(true); }}
              >
                <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                Colar preços do Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {contexto === 'orcamento' && (
                <DropdownMenuItem
                  className="text-xs gap-2"
                  onClick={() => { if (!sinapiAssistente.running && itens.length > 0) handleRunSinapiAssistente(); }}
                  disabled={sinapiAssistente.running || itens.length === 0}
                >
                  <Brain className="h-3.5 w-3.5 mr-1 text-violet-600" />
                  Assistente SINAPI
                  {sinapiAssistente.running && (
                    <span className="ml-auto text-[10px] text-violet-600 tabular-nums">{sinapiAssistente.progress}%</span>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => setView('links')}
              >
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Histórico de links
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onClick={exportCSV}>
                <Download className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {selectedMapaKeys.size > 0 ? `Exportar seleção (${selectedMapaKeys.size})` : 'Exportar CSV'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>


        {/* ──────────────────────────────────────────────────
             Grupo C — Indicador SINAPI (sempre visível) + overflow
           ────────────────────────────────────────────────── */}
        <div className="ml-auto flex items-center gap-2">

          {/* Badge SINAPI — sempre visível, toggle instantâneo (dados já no contexto) */}
          <button
            onClick={() => setShowSinapiCol(v => !v)}
            title={showSinapiCol ? 'Ocultar coluna SINAPI' : 'Mostrar referências SINAPI'}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all',
              showSinapiCol
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                : 'text-muted-foreground hover:text-amber-700 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950/20'
            )}
          >
            <TrendingUp className="h-3 w-3" />
            <span>
              {itensSinapi.length > 0 ? `${itensSinapi.length}` : '0'} ref. SINAPI
            </span>
            {showSinapiCol && (
              <span className="text-[9px] opacity-60">▾</span>
            )}
          </button>

          {/* Histórico — toggle coluna de preço histórico */}
          <button
            onClick={() => setShowHistoricoCol(v => !v)}
            title={showHistoricoCol ? 'Ocultar coluna Histórico' : 'Mostrar preços históricos de obras anteriores'}
            className={cn(
              'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all',
              showHistoricoCol
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                : 'text-muted-foreground hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/20'
            )}
          >
            {loadingHistorico
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <TrendingUp className="h-3 w-3" />}
            <span>Histórico</span>
            {showHistoricoCol && (
              <span className="text-[9px] opacity-60">▾</span>
            )}
          </button>

          {/* Divisor vertical */}
          <div className="w-px h-5 bg-border shrink-0" />

          {/* Dropdown ··· — Hist e SINAPI ficam aqui, ação de colar e exportar também */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => setShowSinapiCol(v => !v)}
              >
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                {showSinapiCol ? 'Ocultar' : 'Mostrar'} ref. SINAPI
                {itensSinapi.length > 0 && <span className="ml-auto text-[10px] text-muted-foreground">{itensSinapi.length}</span>}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2"
                onClick={() => setShowHistoricoCol(v => !v)}
              >
                {loadingHistorico
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <TrendingUp className="h-3.5 w-3.5 text-blue-600" />}
                {showHistoricoCol ? 'Ocultar' : 'Mostrar'} histórico
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Views ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {/* ── ABA LISTAS ──────────────────────────────────────────────────── */}
        {view === 'listas' && (
          <div className="flex h-full overflow-hidden">
            {/* Painel esquerdo — seletor de listas */}
            <div className="w-64 shrink-0 border-r flex flex-col overflow-hidden bg-muted/5">
              <div className="px-3 py-2 border-b shrink-0">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Listas</p>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {/* Entrada "Sem lista" */}
                {contexto === 'orcamento' && (
                  <button
                    onClick={() => setListaSelecionada('__sem_lista__')}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30',
                      listaSelecionada === '__sem_lista__' && 'bg-primary/8 dark:bg-indigo-950/20'
                    )}
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">Sem lista</p>
                      <p className="text-[10px] text-muted-foreground">{itensSemLista.length} itens sem preço</p>
                    </div>
                  </button>
                )}
                {/* Listas de cotação (contexto orçamento) */}
                {contexto === 'orcamento' && listasHook.map(lista => (
                  <button
                    key={lista.id}
                    onClick={() => setListaSelecionada(lista.id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30',
                      listaSelecionada === lista.id && 'bg-primary/8 dark:bg-indigo-950/20'
                    )}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{lista.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{lista.item_keys?.length ?? 0} itens</p>
                    </div>
                  </button>
                ))}
                {/* Listas de compra ativas (contexto compra) */}
                {contexto === 'compra' && listasCompra.map((lista: any) => (
                  <button
                    key={lista.id}
                    onClick={() => setListaSelecionada(lista.id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/30',
                      listaSelecionada === lista.id && 'bg-primary/8 dark:bg-indigo-950/20'
                    )}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/60" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{lista.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{lista.itens?.length ?? 0} itens</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Painel direito — itens da lista selecionada + histórico */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!listaSelecionada ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8 text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Selecione uma lista à esquerda para ver os itens</p>
                </div>
              ) : (
                <>
                  {/* Header painel direito */}
                  <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {listaSelecionada === '__sem_lista__' ? 'Itens sem lista' :
                          listasHook.find(l => l.id === listaSelecionada)?.nome ??
                          listasCompra.find((l: any) => l.id === listaSelecionada)?.nome ?? ''}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{itensListaSelecionada.length} itens</p>
                    </div>
                    {/* Seletor modo sugestão */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-muted-foreground hidden sm:block">Sugestão:</span>
                      <Select value={modoSugestao} onValueChange={v => setModoSugestao(v as ModoSugestao)}>
                        <SelectTrigger className="h-6 text-[11px] w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ultimo" className="text-xs">Último preço</SelectItem>
                          <SelectItem value="menor" className="text-xs">Menor preço</SelectItem>
                          <SelectItem value="media" className="text-xs">Média</SelectItem>
                          <SelectItem value="fornecedor" className="text-xs">Por fornecedor</SelectItem>
                        </SelectContent>
                      </Select>
                      {modoSugestao === 'fornecedor' && (
                        <Select value={fornecedorSugestao} onValueChange={setFornecedorSugestao}>
                          <SelectTrigger className="h-6 text-[11px] w-32">
                            <SelectValue placeholder="Fornecedor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getFornecedoresHistorico().map(f => (
                              <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Lista de itens */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                    {itensListaSelecionada.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-12">
                        <Package className="h-8 w-8 opacity-20" />
                        <p className="text-sm">Nenhum item nesta lista.</p>
                      </div>
                    ) : itensListaSelecionada.map(item => {
                      const sugestao = getSugestao(item.descricao, modoSugestao, fornecedorSugestao || undefined);
                      const temPreco = !!(item.precoAtual && item.precoAtual > 0);
                      return (
                        <div key={item.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 group">
                          {/* Dot status */}
                          <span className={cn(
                            'shrink-0 h-2 w-2 rounded-full',
                            temPreco ? 'bg-emerald-500' : 'bg-red-400'
                          )} />
                          {/* Descrição + etapa */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground leading-snug truncate">{item.descricao}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.etapaNome} · {item.unidade || '—'}</span>
                              {/* Chip de sugestão histórica */}
                              {sugestao && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[10px] font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  <TrendingUp className="h-2.5 w-2.5 shrink-0" />
                                  {sugestao.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  {sugestao.fornecedor && <span className="opacity-70 hidden sm:inline"> · {sugestao.fornecedor}</span>}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Preço atual */}
                          <div className="text-right shrink-0">
                            {temPreco ? (
                              <span className="text-xs text-emerald-600 font-medium">
                                {item.precoAtual!.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── ABA COMPARATIVO (Mapa de Preços) ───────────────────────────── */}
        {(view === 'mapa' || view === 'comparativo') && (
          <div className="h-full overflow-auto">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum insumo ou composição no orçamento ainda.</p>
                <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">← Ir para Planilha Orçamentária</Button>
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-4">

                {/* ── ZONA 3: Filtros (imediatamente acima da tabela) ──── */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar item..."
                      className="h-8 pl-8 text-sm pr-8"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Select value={etapaFilter} onValueChange={setEtapaFilter}>
                    <SelectTrigger className="h-8 text-xs w-40">
                      <SelectValue placeholder="Todas as etapas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas" className="text-xs">Todas as etapas</SelectItem>
                      {etapasDistintas.map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-xs">{e.nome || 'Sem nome'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Prompt 2 — Toggles opt-in */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">Incluir:</span>
                    <button
                      onClick={() => setIncluirSinapi(v => !v)}
                      className={cn(
                        'flex items-center gap-1 px-2 h-7 rounded-md border text-[11px] font-medium transition-all',
                        incluirSinapi
                          ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      )}
                      title="Exibir itens de origem SINAPI (composições e insumos importados do SINAPI)"
                    >
                      📊 SINAPI
                    </button>
                    <button
                      onClick={() => setIncluirComPreco(v => !v)}
                      className={cn(
                        'flex items-center gap-1 px-2 h-7 rounded-md border text-[11px] font-medium transition-all',
                        incluirComPreco
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      )}
                      title="Exibir itens que já possuem preço cadastrado"
                    >
                      🟢 Com preço
                    </button>
                    <button
                      onClick={() => setIncluirSemDetalhe(v => !v)}
                      className={cn(
                        'flex items-center gap-1 px-2 h-7 rounded-md border text-[11px] font-medium transition-all',
                        incluirSemDetalhe
                          ? 'bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800/50 dark:border-slate-600 dark:text-slate-300'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      )}
                      title="Exibir composições sem detalhamento de insumos"
                    >
                      ⋯ Sem detalhe
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground shrink-0">
                    {itensFiltrados.length} de {itens.length}
                  </span>

                  {/* ── Filtro: Relevante para fornecedor (Passo 5) ── */}
                  {todosFornecedores.some(f => f.especialidades?.length) && (
                    <Select
                      value={filtroRelevante ?? 'todos'}
                      onValueChange={v => setFiltroRelevante(v === 'todos' ? null : v)}
                    >
                      <SelectTrigger className={cn('h-8 text-xs w-44',
                        filtroRelevante && 'border-primary/80 text-primary bg-primary/8 dark:border-primary dark:text-primary/60 dark:bg-indigo-950/20'
                      )}>
                        <SelectValue placeholder="⚡ Relevante para..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos" className="text-xs">Todos os itens</SelectItem>
                        {todosFornecedores
                          .filter(f => f.especialidades?.length)
                          .map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              ⚡ {f.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {(search || etapaFilter !== 'todas' || incluirSinapi || incluirComPreco || incluirSemDetalhe || filtroRelevante) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground gap-1"
                      onClick={() => { setSearch(''); setEtapaFilter('todas'); setIncluirSinapi(false); setIncluirComPreco(false); setIncluirSemDetalhe(false); setFiltroRelevante(null); }}
                    >
                      <X className="h-3 w-3" /> Limpar
                    </Button>
                  )}
                </div>



                {/* ── Barra de ações contextuais (seleção em lote) ── */}
                {selectedMapaKeys.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 dark:bg-indigo-950/30 border border-primary/25 dark:border-indigo-800 animate-in slide-in-from-top-1 duration-200">
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium text-primary dark:text-primary/60">
                      {selectedMapaKeys.size} item{selectedMapaKeys.size !== 1 ? 's' : ''} selecionado{selectedMapaKeys.size !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {adoptedCount > 0 && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                          onClick={applyAdoptedPrecos}
                          disabled={applyingBest}
                        >
                          {applyingBest
                            ? <RefreshCw className="h-3 w-3 animate-spin" />
                            : <Sparkles className="h-3 w-3" />}
                          Aplicar pre\u00e7os adotados
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/60"
                        onClick={() => {
                          setView('links');
                          setSelectedKeys(new Set(selectedMapaKeys));
                          setShowNewLink(true);
                        }}
                      >
                        <Link2 className="h-3 w-3" /> Gerar Link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={clearMapaSelection}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Banner "Aplicar preços adotados" ─────────────── */}
                {selectedMapaKeys.size === 0 && adoptedCount > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 flex-1">
                      <strong>{adoptedCount}/{itens.length} item{adoptedCount !== 1 ? 's' : ''}</strong> com preço adotado — clique nos preços dos fornecedores para escolher ou confirme para aplicar ao orçamento.
                    </p>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 shrink-0"
                      onClick={applyAdoptedPrecos}
                      disabled={applyingBest}
                    >
                      {applyingBest
                        ? <RefreshCw className="h-3 w-3 animate-spin" />
                        : <Check className="h-3 w-3" />}
                      Aplicar ao orçamento
                    </Button>
                  </div>
                )}

                {/* ── Tabela comparativa ─────────────────────────────── */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          {/* Checkbox selecionar todos */}
                          <th className="pl-3 pr-1 py-2.5 w-8">
                            <button
                              onClick={() => selectedMapaKeys.size === itensFiltrados.length ? clearMapaSelection() : selectAllFiltered()}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={selectedMapaKeys.size === itensFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                            >
                              {selectedMapaKeys.size === itensFiltrados.length && itensFiltrados.length > 0
                                ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                : <Square className="h-3.5 w-3.5" />}
                            </button>
                          </th>
                          {/* Descrição */}
                          <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">
                            <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort('descricao')}>
                              Insumo / Composição <SortIcon field="descricao" />
                            </button>
                          </th>
                          <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-14">Un</th>
                          <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-20">
                            <button className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors" onClick={() => toggleSort('quantidade')}>
                              Qtd <SortIcon field="quantidade" />
                            </button>
                          </th>
                          {/* P.Unit coluna (editável inline) */}
                          <th className="text-right px-2 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-28">
                            <button className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors" onClick={() => toggleSort('precoAtual')}>
                              P. Unit ✏ <SortIcon field="precoAtual" />
                            </button>
                          </th>
                          {/* P.Total coluna (calculada) */}
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wider w-28 border-r">
                            P. Total
                          </th>
                          {/* Coluna SINAPI Reference */}
                          {showSinapiCol && (
                            <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider w-32 bg-amber-50/60 dark:bg-amber-950/10 border-l border-amber-200 dark:border-amber-800">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-amber-700 dark:text-amber-400">Ref. SINAPI</span>
                                {sinapiAssistente.running && <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-500" />}
                              </div>
                            </th>
                          )}
                          {/* Coluna Histórico de Preços */}
                          {showHistoricoCol && (
                            <th className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider w-32 bg-blue-50/60 dark:bg-blue-950/10 border-l border-blue-200 dark:border-blue-800">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-blue-700 dark:text-blue-400">Histórico</span>
                                {loadingHistorico && <RefreshCw className="h-2.5 w-2.5 animate-spin text-blue-500" />}
                              </div>
                            </th>
                          )}
                          {/* Colunas de fornecedores unificados */}
                          {todosFornecedores.map((forn) => (
                            <th key={forn.id} className="text-right px-3 py-2.5 font-semibold uppercase tracking-wider w-28 max-w-[140px] group">
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-foreground truncate max-w-[100px]">{forn.nome}</span>
                                  {forn.tipo === 'manual' && (
                                    <button
                                      onClick={() => handleRemoveFornecedorManual(forn.id, forn.nome)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                      title={`Remover ${forn.nome}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[9px] px-1 py-0 h-4',
                                    forn.tipo === 'manual'
                                      ? 'border-primary/60 text-primary bg-primary/8 dark:bg-indigo-950/20'
                                      : forn.status === 'respondido'
                                        ? 'border-emerald-400 text-emerald-600'
                                        : 'border-amber-400 text-amber-600'
                                  )}
                                >
                                  {forn.tipo === 'manual' ? 'Manual' : forn.status === 'respondido' ? 'Respondido' : 'Aguardando'}
                                </Badge>
                                {/* Passo 4: chips de especialidade */}
                                {forn.especialidades && forn.especialidades.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5 justify-end">
                                    {forn.especialidades.slice(0, 3).map(cod => {
                                      const cat = getCategoriaByCode(cod);
                                      return cat ? (
                                        <span key={cod} title={cat.nome} className="text-[10px] leading-none">{cat.emoji}</span>
                                      ) : null;
                                    })}
                                    {forn.especialidades.length > 3 && (
                                      <span className="text-[9px] text-muted-foreground">+{forn.especialidades.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </th>
                          ))}
                          {todosFornecedores.length > 0 && (
                            <th className="text-right px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider w-36 bg-emerald-50/40 dark:bg-emerald-950/10 sticky right-0 border-l border-emerald-200/50">
                              <div className="flex flex-col items-end gap-0.5">
                                <span>Adotado</span>
                                <span className="text-[9px] font-normal normal-case text-emerald-600/70">clique p/ adotar</span>
                              </div>
                            </th>
                          )}
                          <th className="w-10"></th>
                        </tr>
                      </thead>

                      <tbody>
                        {itensFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={totalCols + 1} className="py-12 text-center text-sm text-muted-foreground">
                              Nenhum item encontrado com os filtros atuais.
                            </td>
                          </tr>
                        ) : (
                          (() => {
                            let lastEtapa = '';
                            return itensFiltrados.map((item) => {
                              const showEtapa = item.etapaNome !== lastEtapa && !sortField;
                              if (showEtapa) lastEtapa = item.etapaNome;
                              const best = getMelhorPreco(item.key);
                              const semPreco = !item.precoAtual || item.precoAtual === 0;
                              const isSelected = selectedMapaKeys.has(item.key);
                              const isEditing = editingKey === item.key;
                              const isSaving = savingKey === item.key;
                              const pTotal = (item.quantidade != null && item.precoAtual != null && item.precoAtual > 0)
                                ? item.quantidade * item.precoAtual
                                : null;

                              return [
                                showEtapa && (
                                  <tr key={`etapa-${item.etapaNome}`} className="bg-slate-50 dark:bg-slate-900/50">
                                    <td colSpan={totalCols + 1} className="px-3 py-1.5 pl-10">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {item.etapaNome}
                                      </span>
                                    </td>
                                  </tr>
                                ),
                                <tr
                                  key={item.key}
                                  className={cn(
                                    'group border-t border-border/30 hover:bg-muted/20 transition-colors',
                                    isSelected && 'bg-primary/8 dark:bg-indigo-950/20'
                                  )}
                                >
                                  {/* Checkbox */}
                                  <td className="pl-3 pr-1 py-1.5">
                                    <button
                                      onClick={() => toggleMapaKey(item.key)}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                    >
                                      {isSelected
                                        ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                        : <Square className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />}
                                    </button>
                                  </td>
                                  {/* Descrição */}
                                  <td className="px-3 py-1.5 text-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', semPreco ? 'bg-red-500' : 'bg-emerald-500')} />
                                      <span className="truncate max-w-[280px]">{item.descricao}</span>
                                    </div>
                                  </td>
                                  {/* Unidade */}
                                  <td className="px-2 py-1.5 text-center text-muted-foreground">{item.unidade || '—'}</td>
                                  {/* Qtd */}
                                  <td className="px-2 py-1.5 text-right text-muted-foreground">{item.quantidade ?? '—'}</td>

                                  {/* P.Unit — editável inline */}
                                  <td className={cn('px-2 py-1.5 text-right font-medium', semPreco ? 'text-red-500' : 'text-foreground')}>
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 justify-end">
                                        <div className="relative w-24">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
                                          <Input
                                            type="number"
                                            value={editingValue}
                                            onChange={e => setEditingValue(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') commitEdit(item);
                                              if (e.key === 'Escape') setEditingKey(null);
                                            }}
                                            onBlur={() => commitEdit(item)}
                                            className="h-6 text-xs pl-5 pr-1 text-right"
                                            autoFocus
                                          />
                                        </div>
                                        {isSaving && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                                      </div>
                                    ) : (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              className="hover:underline hover:text-primary transition-colors cursor-text w-full text-right flex items-center justify-end gap-1"
                                              onClick={() => startEdit(item)}
                                            >
                                              {formatCurrency(item.precoAtual)}
                                              <PenLine className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            Clique para editar preço unitário
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </td>

                                  {/* P.Total — calculado */}
                                  <td className="px-3 py-1.5 text-right text-muted-foreground border-r font-medium">
                                    {pTotal != null ? formatCurrency(pTotal) : <span className="text-[10px] italic">—</span>}
                                  </td>

                                  {/* Ref. SINAPI — lê dados já salvos no banco (sem RPC) */}
                                  {showSinapiCol && (() => {
                                    const sinapiPreco = item.sinapiPreco;
                                    if (!sinapiPreco || sinapiPreco <= 0) {
                                      return (
                                        <td className="px-3 py-1.5 text-right bg-amber-50/30 dark:bg-amber-950/10 border-l border-amber-100 dark:border-amber-900">
                                          <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                                        </td>
                                      );
                                    }
                                    const devPct = item.precoAtual && item.precoAtual > 0
                                      ? ((item.precoAtual - sinapiPreco) / sinapiPreco) * 100
                                      : null;
                                    const devColor = devPct === null ? '' :
                                      Math.abs(devPct) <= 10 ? 'text-emerald-600' :
                                      Math.abs(devPct) <= 25 ? 'text-amber-600' : 'text-red-500';
                                    const confidenceLabel = item.sinapiConfidence === 'alto' ? '🟢 Alta' :
                                      item.sinapiConfidence === 'medio' ? '🟡 Média' : '🔴 Baixa';
                                    return (
                                      <td className="px-3 py-1.5 text-right bg-amber-50/30 dark:bg-amber-950/10 border-l border-amber-100 dark:border-amber-900">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex flex-col items-end gap-0.5 cursor-help">
                                                <span className="text-amber-700 dark:text-amber-400 font-medium tabular-nums">
                                                  {formatCurrency(sinapiPreco)}
                                                </span>
                                                {devPct !== null && (
                                                  <span className={cn('text-[9px] font-semibold tabular-nums', devColor)}>
                                                    {devPct > 0 ? '+' : ''}{devPct.toFixed(0)}%
                                                  </span>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="text-xs max-w-[260px]">
                                              <p className="font-semibold mb-1">
                                                Ref. SINAPI {item.sinapiFonte === 'insumo' ? '(insumo)' : '(composição)'}
                                                {item.sinapiCodigo ? ` #${item.sinapiCodigo}` : ''}
                                              </p>
                                              <p className="text-muted-foreground">Confiança: {confidenceLabel}</p>
                                              {item.sinapiConfirmado && (
                                                <p className="mt-0.5 text-[10px] text-emerald-600">✓ Vínculo confirmado</p>
                                              )}
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </td>
                                    );
                                  })()}

                                  {/* Histórico de Preços */}
                                  {showHistoricoCol && (() => {
                                    const key = item.descricao.toLowerCase().trim();
                                    const hist = historicoPrecos[key];
                                    if (!hist) {
                                      return (
                                        <td className="px-3 py-1.5 text-right bg-blue-50/20 dark:bg-blue-950/10 border-l border-blue-100 dark:border-blue-900">
                                          <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                                        </td>
                                      );
                                    }
                                    const devPct = item.precoAtual && item.precoAtual > 0
                                      ? ((item.precoAtual - hist.preco) / hist.preco) * 100
                                      : null;
                                    const devColor = devPct === null ? '' :
                                      Math.abs(devPct) <= 10 ? 'text-emerald-600' :
                                      Math.abs(devPct) <= 25 ? 'text-amber-600' : 'text-red-500';
                                    return (
                                      <td className="px-3 py-1.5 text-right bg-blue-50/20 dark:bg-blue-950/10 border-l border-blue-100 dark:border-blue-900">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="flex flex-col items-end gap-0.5 cursor-help">
                                                <span className="text-blue-700 dark:text-blue-400 font-medium tabular-nums">
                                                  {formatCurrency(hist.preco)}
                                                </span>
                                                {devPct !== null && (
                                                  <span className={cn('text-[9px] font-semibold tabular-nums', devColor)}>
                                                    {devPct > 0 ? '+' : ''}{devPct.toFixed(0)}%
                                                  </span>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="text-xs max-w-[220px]">
                                              <p className="font-semibold mb-1">Preço histórico</p>
                                              <p className="text-muted-foreground">Média de {hist.ocorrencias} obra{hist.ocorrencias !== 1 ? 's' : ''} anteriores</p>
                                              <p className="text-[10px] text-muted-foreground mt-0.5">Últimos 24 meses</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </td>
                                    );
                                  })()}

                                  {/* Células de cada fornecedor */}
                                  {todosFornecedores.map((forn) => {
                                    const p = forn.precos?.[item.key];
                                    const isBest = best && p === best.preco && p > 0;
                                    const isEditingThis = editingManualCell?.itemKey === item.key && editingManualCell?.fornId === forn.id;
                                    const isSavingThis = savingManualCell === `${item.key}::${forn.id}`;

                                    if (forn.tipo === 'manual') {
                                      // Célula editável
                                      return (
                                        <td
                                          key={forn.id}
                                          className={cn('px-3 py-1.5 text-right', isBest ? 'text-emerald-600 font-semibold' : 'text-muted-foreground')}
                                        >
                                          {isEditingThis ? (
                                            <div className="flex items-center gap-1 justify-end">
                                              <div className="relative w-24">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
                                                <Input
                                                  type="number"
                                                  value={editingManualValue}
                                                  onChange={e => setEditingManualValue(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') commitManualEdit(item.key, forn.id, forn.nome);
                                                    if (e.key === 'Escape') setEditingManualCell(null);
                                                  }}
                                                  onBlur={() => commitManualEdit(item.key, forn.id, forn.nome)}
                                                  className="h-6 text-xs pl-5 pr-1 text-right"
                                                  autoFocus
                                                />
                                              </div>
                                              {isSavingThis && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-end gap-1 group/cell">
                                              {p && p > 0 && (
                                                <>
                                                  {/* A2: badge de origem manual */}
                                                  <span
                                                    className="text-[9px] text-primary/80 dark:text-primary opacity-60 leading-none select-none"
                                                    title="Preço inserido manualmente"
                                                  >✏</span>
                                                  <button
                                                    onClick={() => adoptPrice(item.key, forn, p)}
                                                    className={cn(
                                                      'opacity-0 group-hover/cell:opacity-100 transition-all p-0.5 rounded',
                                                      adoptedPrices[item.key]?.fornId === forn.id
                                                        ? 'opacity-100 text-emerald-600'
                                                        : 'text-muted-foreground hover:text-emerald-600'
                                                    )}
                                                    title="Adotar este preço"
                                                  >
                                                    <Check className="h-3 w-3" />
                                                  </button>
                                                </>
                                              )}
                                              <button
                                                className={cn(
                                                  'text-right transition-colors cursor-text flex-1',
                                                  adoptedPrices[item.key]?.fornId === forn.id
                                                    ? 'text-emerald-600 font-bold'
                                                    : !p ? 'text-muted-foreground/40 italic' : 'hover:text-primary'
                                                )}
                                                onClick={() => {
                                                  if (p && p > 0) adoptPrice(item.key, forn, p);
                                                  else startManualEdit(item.key, forn.id, p);
                                                }}
                                                title={p ? 'Clique para adotar · Duplo clique para editar' : 'Clique para inserir preço'}
                                                onDoubleClick={() => startManualEdit(item.key, forn.id, p)}
                                              >
                                                {p ? formatCurrency(p) : '—'}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      );
                                    }

                                    // Fornecedor via link — clicável para adotar
                                    return (
                                      <td
                                        key={forn.id}
                                        className={cn(
                                          'px-3 py-1.5 text-right transition-colors',
                                          adoptedPrices[item.key]?.fornId === forn.id
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                                            : ''
                                        )}
                                      >
                                        {p && p > 0 ? (
                                          <div className="flex items-center justify-end gap-1">
                                            {/* A2: badge de origem link */}
                                            <span
                                              className="text-[9px] text-blue-400 dark:text-blue-600 opacity-60 leading-none select-none"
                                              title="Preço respondido via link de cotação"
                                            >🔗</span>
                                            <button
                                              className={cn(
                                                'font-medium transition-colors',
                                                adoptedPrices[item.key]?.fornId === forn.id
                                                  ? 'text-emerald-600 font-bold'
                                                  : 'text-muted-foreground hover:text-emerald-600'
                                              )}
                                              onClick={() => adoptPrice(item.key, forn, p)}
                                              title="Clique para adotar este preço"
                                            >
                                              {formatCurrency(p)}
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] italic text-muted-foreground/40">—</span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {/* Célula Adotado — escolha consciente do usuário */}
                                  {todosFornecedores.length > 0 && (() => {
                                    const adopted = adoptedPrices[item.key];
                                    return (
                                      <td className="px-3 py-1.5 text-right bg-emerald-50/40 dark:bg-emerald-950/10 sticky right-0 border-l border-emerald-200/50">
                                        {adopted ? (
                                          <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                                              {formatCurrency(adopted.preco)}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <span className="text-[9px] text-emerald-600/70 truncate max-w-[80px]">
                                                {adopted.fornNome}
                                              </span>
                                              <button
                                                onClick={() => clearAdopt(item.key)}
                                                className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                                                title="Remover adoção"
                                              >
                                                <X className="h-2.5 w-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-amber-500/60 text-[10px] italic">sem adoção</span>
                                        )}
                                      </td>
                                    );
                                  })()}

                                  {/* Menu de ações por linha (hover) */}
                                  <td className="px-1 py-1.5 w-8">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted/60 transition-opacity">
                                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem
                                          className="text-xs gap-2"
                                          onClick={() => {
                                            setSelectedMapaKeys(new Set([item.key]));
                                            setCotacaoDrawerMode('precos');
                                            setCotacaoDrawerOpen(true);
                                          }}
                                        >
                                          <PenLine className="h-3.5 w-3.5 mr-1" />
                                          Inserir preço
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-xs gap-2"
                                          onClick={() => {
                                            setSelectedMapaKeys(new Set([item.key]));
                                            setCotacaoDrawerMode('enviar');
                                            setCotacaoDrawerOpen(true);
                                          }}
                                        >
                                          <Send className="h-3.5 w-3.5 mr-1" />
                                          Enviar cotação por link
                                        </DropdownMenuItem>
                                        {item.sinapiPreco && item.sinapiPreco > 0 && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              className="text-xs gap-2"
                                              onClick={() => startEdit(item)}
                                            >
                                              <Sparkles className="h-3.5 w-3.5 mr-1 text-violet-500" />
                                              Aplicar SINAPI ({formatCurrency(item.sinapiPreco)})
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>,
                              ];
                            });
                          })()
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Sticky Bottom Bar: Saving e Checkout ───────────── */}
                {todosFornecedores.length > 0 && adoptedCount > 0 && (() => {
                  let valorTotalAdotado = 0;
                  let valorTotalReferencia = 0;
                  
                  // Computar savings
                  Object.entries(adoptedPrices).forEach(([k, val]) => {
                    const item = itens.find(i => i.key === k);
                    if (item && item.quantidade) {
                      const refPreco = (item.precoAtual && item.precoAtual > 0) ? item.precoAtual : item.sinapiPreco;
                      if (refPreco && refPreco > 0) {
                        valorTotalReferencia += (refPreco * item.quantidade);
                        valorTotalAdotado += (val.preco * item.quantidade);
                      } else {
                        valorTotalAdotado += (val.preco * item.quantidade); // sem referência
                      }
                    }
                  });
                  
                  const saving = valorTotalReferencia - valorTotalAdotado;
                  const savingPct = valorTotalReferencia > 0 ? (saving / valorTotalReferencia) * 100 : 0;
                  const isGain = saving > 0;
                  const isLoss = saving < 0;

                  return (
                    <div className="sticky bottom-4 mx-auto w-full animate-in slide-in-from-bottom flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 mt-6 rounded-xl shadow-xl border bg-background/95 backdrop-blur-md z-40 relative overflow-hidden">
                      {isGain && <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10" />}
                      {isLoss && <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10" />}
                      
                      <div className="flex items-center gap-5 sm:gap-8 relative">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Total Adotado</span>
                          <span className="text-2xl font-bold leading-none tracking-tight">{formatCurrency(valorTotalAdotado)}</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {adoptedCount} {adoptedCount === 1 ? 'item adotado' : 'itens adotados'} de {itens.length}
                          </span>
                        </div>
                        
                        {(isGain || isLoss) && (
                          <div className={cn("flex flex-col pl-5 sm:pl-8 border-l", isGain ? "text-emerald-600 dark:text-emerald-500 border-emerald-500/20" : "text-red-600 dark:text-red-500 border-red-500/20")}>
                            <span className="text-[11px] uppercase font-bold tracking-wider mb-0.5">{isGain ? "Economia Gerada" : "Perda vs Orçamento"}</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold leading-none tracking-tight">{isGain ? "+" : ""}{formatCurrency(saving)}</span>
                              <Badge className={cn("h-5 px-1.5 border-0 font-bold", isGain ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400")}>
                                {isGain ? "+" : ""}{savingPct.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        size="lg"
                        className={cn(
                          "relative shadow-md gap-2 font-bold px-8 h-12 w-full sm:w-auto transition-all", 
                          isGain && !applyingBest ? "bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]" : ""
                        )}
                        onClick={applyAdoptedPrecos}
                        disabled={applyingBest}
                      >
                        {applyingBest ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                        {contexto === 'orcamento' ? 'Aplicar ao Orçamento' : 'Gerar Pedido de Compra'}
                      </Button>
                    </div>
                  );
                })()}

                {/* CTA para adicionar fornecedor se não há nenhum */}
                {todosFornecedores.length === 0 && (
                  <div className="mt-4 flex items-center gap-3 p-4 rounded-xl border border-dashed border-primary/25 bg-primary/8/50 dark:bg-indigo-950/20 dark:border-indigo-800">
                    <Users className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-primary dark:text-primary/60">
                      Adicione fornecedores ao mapa ou crie links de cotação para começar a comparar preços.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LINKS DE COTAÇÃO ─────────────────────────────────────────────── */}
        {view === 'links' && (
          <div className="h-full overflow-auto p-4 md:p-6 space-y-4">

            {/* Novo Link Form */}
            {showNewLink ? (
              <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold">Novo Link de Cotação</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nome do Fornecedor *</label>
                    <Input
                      value={newFornecedor}
                      onChange={(e) => setNewFornecedor(e.target.value)}
                      placeholder="Ex: Materiais Souza Ltda"
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">E-mail (opcional)</label>
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="fornecedor@email.com"
                      className="h-8 text-sm"
                      type="email"
                    />
                  </div>
                </div>

                {/* Seleção de itens */}
                {(() => {
                  const itensSelectContext = contexto === 'compra' ? itensListaSelecionada : itens;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-muted-foreground">Selecionar itens para cotação</label>
                        <div className="flex gap-2">
                          <button className="text-[11px] text-primary hover:underline" onClick={() => setSelectedKeys(new Set(itensSelectContext.map((i) => i.key)))}>
                            Todos
                          </button>
                          <button className="text-[11px] text-primary hover:underline" onClick={() => setSelectedKeys(new Set(itensSelectContext.filter((i) => !i.precoAtual).map((i) => i.key)))}>
                            Sem preço
                          </button>
                          <button className="text-[11px] text-muted-foreground hover:underline" onClick={() => setSelectedKeys(new Set())}>
                            Limpar
                          </button>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                        {itensSelectContext.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">Nenhum insumo encontrado.</div>
                        ) : (
                          itensSelectContext.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-center gap-2.5 px-3 py-2 border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(item.key)}
                                onChange={(e) => {
                                  setSelectedKeys((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(item.key);
                                    else next.delete(item.key);
                                    return next;
                                  });
                                }}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              <span className="text-xs flex-1 truncate">{item.descricao}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{item.unidade}</span>
                              {item.precoAtual ? (
                                <span className="text-[10px] text-emerald-600 shrink-0">{formatCurrency(item.precoAtual)}</span>
                              ) : (
                                <span className="text-[10px] text-red-400 shrink-0">sem preço</span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{selectedKeys.size} de {itensSelectContext.length} itens selecionados</p>
                    </div>
                  );
                })()}

                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setShowNewLink(false); setSelectedKeys(new Set()); }} className="text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateLink}
                    disabled={!newFornecedor.trim() || selectedKeys.size === 0 || creating}
                    className="text-xs"
                  >
                    <Link2 className="h-3 w-3 mr-1.5" />
                    {creating ? 'Gerando...' : `Gerar Link (${selectedKeys.size} itens)`}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => { setShowNewLink(true); setSelectedKeys(new Set(itens.filter((i) => !i.precoAtual).map((i) => i.key))); }}
                className="gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Novo Link de Cotação
              </Button>
            )}

            {/* Lista de links existentes */}
            {loadingLinks ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : links.length === 0 && !showNewLink ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border-2 border-dashed rounded-xl">
                <Link2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum link criado ainda</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Crie links para enviar aos fornecedores preencherem os preços pelo celular, sem precisar de login.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link) => {
                  const url = `${window.location.origin}/cotacao/${link.token}`;
                  const respondidoCount = Object.keys(link.respostas || {}).length;
                  return (
                    <div key={link.id} className="rounded-xl border bg-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{link.fornecedor_nome}</span>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] shrink-0', link.status === 'respondido' ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-amber-400 text-amber-600 bg-amber-50')}
                            >
                              {link.status === 'respondido' ? '✓ Respondido' : '⏳ Aguardando'}
                            </Badge>
                          </div>
                          {link.fornecedor_email && (
                            <p className="text-xs text-muted-foreground">{link.fornecedor_email}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Criado em {formatDate(link.created_at)} · {link.itens?.length ?? 0} itens
                            {respondidoCount > 0 && ` · ${respondidoCount} respondidos`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => deleteLink(link.id)}
                          title="Excluir link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                        <span className="text-xs text-muted-foreground font-mono truncate flex-1">{url}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(link.token)}>
                                  {copiedToken === link.token ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{copiedToken === link.token ? 'Copiado!' : 'Copiar link'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(url, '_blank')}>
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Abrir link</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COMPARATIVO DE PREÇOS ─────────────────────────────────────────── */}
        {view === 'comparativo' && (
          <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold text-foreground">Comparativo de Preços por Fornecedor</h2>
              <span className="text-xs text-muted-foreground ml-1">— cotações recebidas vs. referência SINAPI</span>
            </div>

            {todosFornecedores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum fornecedor adicionado ainda.</p>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setView('links')}>
                  Criar link de cotação <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                      <th className="px-2 py-2 text-center font-medium text-muted-foreground w-10">Un.</th>
                      {todosFornecedores.map(f => (
                        <th key={f.id} className="px-3 py-2 text-right font-medium text-muted-foreground min-w-[90px]">
                          <div className="flex items-center justify-end gap-1">
                            {f.tipo === 'link' && <span className="text-[9px] text-blue-400">🔗</span>}
                            <span className="truncate max-w-[80px]">{f.nome}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.slice(0, 50).map(item => {
                      const precos = todosFornecedores.map(f => f.precos[item.key] ?? null);
                      const minPreco = Math.min(...precos.filter(p => p !== null) as number[]);
                      return (
                        <tr key={item.key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-1.5 max-w-[200px]">
                            <span className="truncate text-foreground block">{item.descricao}</span>
                            <span className="text-[10px] text-muted-foreground">{item.etapaNome}</span>
                          </td>
                          <td className="px-2 py-1.5 text-center text-muted-foreground">{item.unidade || '—'}</td>
                          {todosFornecedores.map(f => {
                            const p = f.precos[item.key];
                            const isBest = p != null && p > 0 && p === minPreco;
                            const isAdopted = adoptedPrices[item.key]?.fornId === f.id;
                            return (
                              <td key={f.id} className={cn(
                                'px-3 py-1.5 text-right font-medium tabular-nums',
                                isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                                isAdopted && 'bg-emerald-50/60 dark:bg-emerald-950/20'
                              )}>
                                {p != null && p > 0 ? (
                                  <span className="flex items-center justify-end gap-1">
                                    {isBest && <span className="text-[9px] text-emerald-500">★</span>}
                                    {formatCurrency(p)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  {itens.length > 50 && (
                    <tfoot>
                      <tr>
                        <td colSpan={2 + todosFornecedores.length} className="px-3 py-2 text-xs text-muted-foreground text-center">
                          Exibindo 50 de {itens.length} itens. Use o filtro de etapa para ver grupos específicos.
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── CotacaoDrawer ─────────────────────────────────────────────────── */}
    <CotacaoDrawer
      defaultMode={cotacaoDrawerMode}
      open={cotacaoDrawerOpen}
      onOpenChange={setCotacaoDrawerOpen}
      obraId={obra.id}
      obraNome={obra.nome}
      etapas={etapas}
      itens={contexto === 'compra' ? itensListaSelecionada : itens}
      fornecedoresExistentes={fornecedoresExistentesDrawer}
      onLinksCreated={loadLinks}
      onPrecosAdded={loadFornecedoresManuais}
    />

    {/* ── Dialog: Colar Preços de Fornecedor ────────────────────────────── */}
    <Dialog open={pastePrecoOpen} onOpenChange={setPastePrecoOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-violet-600" />
            Colar Preços de Fornecedor
          </DialogTitle>
          <DialogDescription>
            Cole o conteúdo copiado de uma planilha. Formato: <strong>Descrição [tab] Preço</strong> por linha. O sistema identifica automaticamente os itens correspondentes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do Fornecedor *</label>
            <Input
              value={pastePrecoFornNome}
              onChange={e => setPastePrecoFornNome(e.target.value)}
              placeholder="Ex: Aços Silva Ltda"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Conteúdo da planilha * — Cole aqui (Ctrl+V)
            </label>
            <Textarea
              value={pastePrecoText}
              onChange={e => setPastePrecoText(e.target.value)}
              placeholder={"Concreto FCK 25 MPa\t185,00\nAço CA-50 10mm\t9,75"}
              className="font-mono text-xs min-h-[160px] resize-y"
            />
            {pastePrecoText && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {pastePrecoText.split('\n').filter(l => l.trim()).length} linhas detectadas
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPastePrecoOpen(false)} className="text-xs">Cancelar</Button>
          <Button
            onClick={handlePastePrecos}
            disabled={!pastePrecoFornNome.trim() || !pastePrecoText.trim() || pastePrecoSaving}
            className="text-xs gap-1.5 bg-violet-600 hover:bg-violet-700"
          >
            {pastePrecoSaving
              ? <><RefreshCw className="h-3 w-3 animate-spin" /> Importando...</>
              : <><ClipboardPaste className="h-3 w-3" /> Importar Preços</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* ── SINAPI Assistente: barra de progresso inline ────────────────── */}
    {sinapiAssistente.running && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 rounded-xl border bg-card shadow-xl px-4 py-3 space-y-2 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-600 shrink-0 animate-pulse" />
          <p className="text-xs font-medium text-foreground flex-1">{sinapiAssistente.progressLabel}</p>
          <span className="text-xs text-muted-foreground tabular-nums">{sinapiAssistente.progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-300"
            style={{ width: `${sinapiAssistente.progress}%` }}
          />
        </div>
      </div>
    )}

    {/* ── SINAPI Review Drawer ─────────────────────────────────────────── */}
    <SinapiReviewDrawer
      open={sinapiReviewOpen}
      onOpenChange={setSinapiReviewOpen}
      vinculos={sinapiAssistente.vinculos}
      saving={sinapiAssistente.saving}
      onConfirm={handleSinapiConfirm}
      onToggleConfirmado={sinapiAssistente.toggleConfirmado}
      onSetManualMatch={sinapiAssistente.setManualMatch}
      onCancel={() => { setSinapiReviewOpen(false); sinapiAssistente.reset(); }}
    />
  </>);
}
