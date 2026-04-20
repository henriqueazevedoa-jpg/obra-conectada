/**
 * PagamentosTab — Aba de Pagamentos da Central Financeira (Sprint E2)
 *
 * Extraído de PagamentosPage.tsx com uma diferença:
 *  - Recebe `obraId` via prop (seletor de obra fica no shell FinanceiroCentral)
 *  - Todo o restante da lógica é idêntico ao original
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PageKPI } from '@/components/layout/PageShell';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, addDays, addMonths, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCustoReal } from '@/contexts/CustoRealContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { normalizeMaterialName } from '@/lib/normalizeText';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import {
  Plus, DollarSign, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2,
  CalendarIcon, Filter, ChevronDown, Paperclip, Upload, FileText, Image, X,
  Package, List, GitBranch, CalendarDays,
} from 'lucide-react';
import PagamentosTimelineView from '@/components/painel/PagamentosTimelineView';
import PagamentosCalendarView from '@/components/painel/PagamentosCalendarView';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { toast } from '@/hooks/use-toast';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Pagamento {
  id: string;
  obra_id: string;
  descricao: string;
  tipo_pagamento: string;
  valor_previsto: number;
  valor_parcela: number | null;
  /** Sprint 1: Valor efetivamente pago (quando diferente do previsto) */
  valor_pago: number | null;
  data_vencimento: string;
  status: string;
  forma_pagamento: string;
  fornecedor: string | null;
  /** Sprint 0: FK para tabela fornecedores (nullable para legado) */
  fornecedor_id: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  observacoes: string | null;
  etapa_orcamento: string | null;
  /** Sprint 1: FK para orcamento_categorias (vínculo forte) */
  etapa_id: string | null;
  /** Sprint 1: FK para orcamento_composicoes (opcional) */
  composicao_id: string | null;
  /** Sprint 1: UUID compartilhado entre parcelas do mesmo parcelamento */
  grupo_parcelas_id: string | null;
  /** Sprint 0: categoria de custo indireto (pagamentos sem etapa) */
  categoria_indireta: string | null;
  created_at: string;
}


interface Anexo {
  id: string;
  pagamento_id: string;
  nome: string;
  storage_path: string;
  tipo: string | null;
  created_at: string;
}

interface ItemCompra {
  tempId: string;
  nome_material: string;
  unidade: string;
  quantidade: string;
  preco_unitario: string;
  categoria: string;
}

interface PendingFile { id: string; file: File; tipo: string; preview?: string; }

// ── Constants ──────────────────────────────────────────────────────────────────

const tipoLabels: Record<string, string> = {
  material: 'Material',
  mao_de_obra: 'Mão de Obra',
  servico: 'Serviço',
  aluguel: 'Aluguel',
  outro: 'Outro',
};

const statusLabels: Record<string, string> = {
  previsto: 'Previsto',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
};

const getStatusStyle = (status: string): React.CSSProperties => {
  const styles: Record<string, React.CSSProperties> = {
    previsto:  { background: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC' },
    pago:      { background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' },
    atrasado:  { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' },
    cancelado: { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-secondary)' },
  };
  return styles[status] ?? styles.cancelado;
};

const formaLabels: Record<string, string> = {
  boleto: 'Boleto',
  pix: 'PIX',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

const anexoTipoLabels: Record<string, string> = {
  boleto: 'Boleto',
  contrato: 'Contrato',
  recibo: 'Recibo',
  foto: 'Foto',
  outro: 'Outro',
};

const categoriasEstoque = [
  'Cimento', 'Agregados', 'Aço', 'Alvenaria', 'Hidráulica',
  'Elétrica', 'Pintura', 'Madeira', 'Impermeabilização',
  'Ferragens', 'EPI', 'Outros',
];

const unidades = ['un', 'kg', 'm', 'm²', 'm³', 'saco', 'barra', 'rolo', 'lata', 'l', 't', 'pç', 'cx'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function makeEmptyItem(): ItemCompra {
  return { tempId: crypto.randomUUID(), nome_material: '', unidade: 'un', quantidade: '', preco_unitario: '', categoria: '' };
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  obraId: string;
  isActive?: boolean;
  onPagamentoChange?: () => void;
  onKpisReady?: (kpis: PageKPI[]) => void;
}

export default function PagamentosTab({ obraId, isActive = true, onPagamentoChange, onKpisReady }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { obras } = useObras();
  const { getOrcamento, saveOrcamento } = useOrcamento();
  const { saveItem: saveCustoItem } = useCustoReal();
  const { company } = useCompany();
  const { materiais: allMateriais, refreshEstoque } = useEstoque();

  const obra = obras.find(o => o.id === obraId);

  // All fornecedores for autocomplete
  const [allFornecedores, setAllFornecedores] = useState<{ id: string; nome: string }[]>([]);
  useEffect(() => {
    supabase.from('fornecedores').select('id, nome').then(({ data }) => {
      if (data) setAllFornecedores(data as any[]);
    });
  }, []);

  // Suggestions
  const materialSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return allMateriais
      .filter(m => { const k = `${m.nome}|${m.unidade}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .map(m => ({ label: m.nome, value: m.id, meta: m.unidade }));
  }, [allMateriais]);

  const fornecedorSuggestions = useMemo(() =>
    allFornecedores.map(f => ({ label: f.nome, value: f.id })),
  [allFornecedores]);

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = usePersistentPageState<boolean>('pagamentos:showAdvanced', false, obraId);

  // Inline fornecedor creation
  const [showNewFornecedor, setShowNewFornecedor] = useState(false);
  const [newFornecedorNome, setNewFornecedorNome] = useState('');
  const [newFornecedorCnpj, setNewFornecedorCnpj] = useState('');
  const [newFornecedorTel, setNewFornecedorTel] = useState('');
  const [creatingFornecedor, setCreatingFornecedor] = useState(false);

  // Read etapa filter from URL
  const [filterEtapa, setFilterEtapa] = usePersistentPageState<string>('pagamentos:filterEtapa', '_all', obraId);

  useEffect(() => {
    const etapaParam = searchParams.get('etapa');
    if (etapaParam) {
      setFilterEtapa(etapaParam);
      setSearchParams(prev => { prev.delete('etapa'); return prev; }, { replace: true });
    }
    if (searchParams.get('novo') === '1' && obra) {
      resetForm();
      setDialogOpen(true);
      setSearchParams(prev => { prev.delete('novo'); return prev; }, { replace: true });
    }
  }, [searchParams, obra?.id]);

  // Anexos
  const [anexos, setAnexos] = useState<Map<string, Anexo[]>>(new Map());
  const [viewAnexosId, setViewAnexosId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const pendingFileInputRef = useRef<HTMLInputElement>(null);

  // New etapa
  const [showNewEtapa, setShowNewEtapa] = useState(false);
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [creatingEtapa, setCreatingEtapa] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = usePersistentPageState<string>('pagamentos:filterStatus', '_all', obraId);
  const [filterTipo, setFilterTipo] = usePersistentPageState<string>('pagamentos:filterTipo', '_all', obraId);
  const [filterPeriodo, setFilterPeriodo] = usePersistentPageState<string>('pagamentos:filterPeriodo', '_all', obraId);
  const [filtersOpen, setFiltersOpen] = usePersistentPageState<boolean>('pagamentos:filtersOpen', false, obraId);
  const [viewMode, setViewMode] = usePersistentPageState<'lista' | 'timeline' | 'calendario'>('pagamentos:viewMode', 'lista', obraId);

  // Sprint 1: composições da etapa selecionada
  const [composicoesDaEtapa, setComposicoesDaEtapa] = useState<{ id: string; codigo: string; descricao: string }[]>([]);
  const [loadingComposicoes, setLoadingComposicoes] = useState(false);

  // Form
  const [form, setForm] = useState({
    descricao: '',
    tipo_pagamento: 'outro',
    valor_previsto: '',
    data_vencimento: null as Date | null,
    forma_pagamento: 'outro',
    fornecedor: '',
    /** Sprint 0: FK do fornecedor selecionado via autocomplete */
    fornecedor_id: null as string | null,
    numero_parcela: '',
    total_parcelas: '',
    observacoes: '',
    etapa_orcamento: '_none',
    /** Sprint 1: FK da etapa (UUID de orcamento_categorias) */
    etapa_id: null as string | null,
    /** Sprint 1: FK da composição (UUID de orcamento_composicoes) */
    composicao_id: null as string | null,
    /** Sprint 0: categoria de custo indireto quando sem etapa */
    categoria_indireta: '' as string,
    data_compra: new Date() as Date | null,
    data_pagamento: null as Date | null,
    /** Sprint 1: valor efetivamente pago */
    valor_pago: '' as string,
    /** Sprint 1: status pago ao criar */
    ja_pago: false,
  });

  const [parcelamentoAtivo, setParcelamentoAtivo] = useState(false);
  const [parcelamentoTipo, setParcelamentoTipo] = useState<'mensal' | 'custom'>('mensal');
  const [parcelas, setParcelas] = useState<{ numero: number; data: Date | null }[]>([]);
  const [isCompraMaterial, setIsCompraMaterial] = useState(false);
  const [itensCompra, setItensCompra] = useState<ItemCompra[]>([makeEmptyItem()]);

  // Sprint 1: carrega composições quando etapa_id muda
  const handleEtapaChange = async (etapaId: string, etapaNome: string) => {
    setForm(prev => ({ ...prev, etapa_id: etapaId || null, etapa_orcamento: etapaNome, composicao_id: null }));
    setComposicoesDaEtapa([]);
    if (!etapaId) return;
    setLoadingComposicoes(true);
    try {
      const { data } = await supabase
        .from('orcamento_composicoes')
        .select('id, codigo, descricao')
        .eq('etapa_id', etapaId)
        .order('codigo');
      if (data) setComposicoesDaEtapa(data as any[]);
    } finally {
      setLoadingComposicoes(false);
    }
  };

  const resetForm = () => {
    setForm({
      descricao: '', tipo_pagamento: 'outro', valor_previsto: '',
      data_vencimento: null, forma_pagamento: 'outro', fornecedor: '',
      fornecedor_id: null,
      numero_parcela: '', total_parcelas: '', observacoes: '', etapa_orcamento: '_none',
      etapa_id: null, composicao_id: null,
      categoria_indireta: '',
      data_compra: new Date(), data_pagamento: null,
      valor_pago: '', ja_pago: false,
    });
    setEditingId(null);
    setShowNewEtapa(false);
    setNewEtapaNome('');
    setIsCompraMaterial(false);
    setItensCompra([makeEmptyItem()]);
    setParcelamentoAtivo(false);
    setParcelas([]);
    setShowAdvanced(false);
    setShowNewFornecedor(false);
    setNewFornecedorNome('');
    setNewFornecedorCnpj('');
    setNewFornecedorTel('');
    setComposicoesDaEtapa([]);
    pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
    setPendingFiles([]);
  };

  const handleCreateFornecedor = async () => {
    if (!newFornecedorNome.trim() || !obra || creatingFornecedor) return;
    setCreatingFornecedor(true);
    try {
      const { data, error } = await (supabase.from('fornecedores') as any).insert({
        obra_id: obra.id,
        company_id: company?.id || null,
        nome: newFornecedorNome.trim(),
        cnpj: newFornecedorCnpj.trim() || null,
        telefone: newFornecedorTel.trim() || null,
      }).select('id, nome').single();
      if (error) { toast({ title: 'Erro ao criar fornecedor', description: error.message, variant: 'destructive' }); return; }
      setAllFornecedores(prev => [...prev, { id: data.id, nome: data.nome }]);
      // Sprint 0: salvar tanto o nome (texto) quanto o ID (FK)
      setForm(prev => ({ ...prev, fornecedor: data.nome, fornecedor_id: data.id }));
      setShowNewFornecedor(false);
      setNewFornecedorNome(''); setNewFornecedorCnpj(''); setNewFornecedorTel('');
      toast({ title: 'Fornecedor cadastrado!' });
    } catch { toast({ title: 'Erro ao criar fornecedor', variant: 'destructive' }); }
    finally { setCreatingFornecedor(false); }
  };

  const orcamento = obra ? getOrcamento(obra.id) : undefined;
  const categorias = orcamento?.etapas || [];

  const fetchPagamentos = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('obra_id', obraId)
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
      setPagamentos(data as unknown as Pagamento[]);
      const ids = data.map((p: any) => p.id);
      if (ids.length > 0) {
        const { data: anexoData } = await (supabase as any)
          .from('pagamento_anexos').select('*').in('pagamento_id', ids);
        if (anexoData) {
          const map = new Map<string, Anexo[]>();
          (anexoData as Anexo[]).forEach(a => {
            const existing = map.get(a.pagamento_id) || [];
            existing.push(a);
            map.set(a.pagamento_id, existing);
          });
          setAnexos(map);
        }
      }
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchPagamentos(); }, [fetchPagamentos]);

  // Auto-mark overdue
  useEffect(() => {
    const hoje = startOfDay(new Date());
    const overdue = pagamentos.filter(
      p => p.status === 'previsto' && isBefore(parseISO(p.data_vencimento), hoje)
    );
    if (overdue.length > 0) {
      overdue.forEach(async (p) => {
        await supabase.from('pagamentos').update({ status: 'atrasado' as any }).eq('id', p.id);
      });
      setPagamentos(prev => prev.map(p =>
        overdue.find(o => o.id === p.id) ? { ...p, status: 'atrasado' } : p
      ));
    }
  }, [pagamentos.length]);

  const totalItens = itensCompra.reduce((sum, item) => {
    return sum + (parseFloat(item.quantidade) || 0) * (parseFloat(item.preco_unitario) || 0);
  }, 0);

  useEffect(() => {
    if (isCompraMaterial && totalItens > 0) {
      setForm(prev => ({ ...prev, valor_previsto: totalItens.toFixed(2) }));
    }
  }, [totalItens, isCompraMaterial]);

  // Computed values
  // Computed KPIs para Camada 3
  const hoje = startOfDay(new Date());
  const em7dias = addDays(hoje, 7);
  const em30dias = addDays(hoje, 30);

  const totalDaObra = pagamentos.filter(p => p.status !== 'cancelado').reduce((s, p) => s + Number(p.valor_previsto), 0);
  const totalVencido = pagamentos.filter(p => p.status === 'atrasado').reduce((s, p) => s + Number(p.valor_previsto), 0);
  const totalPago = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.valor_previsto), 0);
  
  const totalProx30 = pagamentos
    .filter(p => {
      if (p.status === 'pago' || p.status === 'cancelado') return false;
      const d = parseISO(p.data_vencimento);
      return d >= hoje && d <= em30dias;
    })
    .reduce((s, p) => s + Number(p.valor_previsto), 0);

  const execucaoPct = totalDaObra > 0 ? Math.round((totalPago / totalDaObra) * 100) : 0;

  const [filterSearch, setFilterSearch] = useState('');
  const hasActiveFilters = filterStatus !== '_all' || filterTipo !== '_all' || filterPeriodo !== '_all' || filterEtapa !== '_all' || filterSearch !== '';

  const filteredPagamentos = pagamentos.filter(p => {
    if (filterStatus !== '_all' && p.status !== filterStatus) return false;
    if (filterTipo !== '_all' && p.tipo_pagamento !== filterTipo) return false;
    if (filterEtapa !== '_all' && p.etapa_orcamento !== filterEtapa) return false;
    if (filterPeriodo !== '_all') {
      const d = parseISO(p.data_vencimento);
      if (filterPeriodo === '7dias' && !(d >= hoje && d <= em7dias)) return false;
      if (filterPeriodo === '30dias' && !(d >= hoje && d <= em30dias)) return false;
      if (filterPeriodo === 'atrasados' && p.status !== 'atrasado') return false;
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      const match = p.descricao.toLowerCase().includes(q)
        || (p.fornecedor || '').toLowerCase().includes(q)
        || (p.etapa_orcamento || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCreateEtapa = async () => {
    if (!newEtapaNome.trim() || !obra || creatingEtapa) return;
    setCreatingEtapa(true);
    try {
      const currentOrc = getOrcamento(obra.id);
      const existingCats = currentOrc?.etapas || [];
      const existingNums = existingCats.map(c => { const m = c.codigo.match(/(\d+)/); return m ? parseInt(m[1]) : 0; }).filter(n => n > 0);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      const newCode = String(nextNum).padStart(2, '0');
      if (existingCats.some(c => c.nome === newEtapaNome.trim())) {
        toast({ title: 'Etapa já existe com esse nome', variant: 'destructive' });
        setCreatingEtapa(false); return;
      }
      const newCat = { id: crypto.randomUUID(), codigo: newCode, nome: newEtapaNome.trim(), composicoes: [], precoTotal: 0, usaComposicoes: false };
      const updatedOrc = { ...(currentOrc || { obraId: obra.id, etapas: [] }), etapas: [...existingCats, newCat] };
      await saveOrcamento(updatedOrc as any);
      setForm(prev => ({ ...prev, etapa_orcamento: newEtapaNome.trim() }));
      setShowNewEtapa(false); setNewEtapaNome('');
      toast({ title: 'Etapa criada com sucesso!' });
    } catch { toast({ title: 'Erro ao criar etapa', variant: 'destructive' }); }
    finally { setCreatingEtapa(false); }
  };

  const findOrCreateMaterial = async (item: ItemCompra, obraId: string): Promise<string | null> => {
    const nomeNorm = normalizeMaterialName(item.nome_material);
    if (!nomeNorm) return null;
    const { data: existing } = await supabase.from('materiais').select('id, nome').eq('obra_id', obraId).eq('unidade', item.unidade);
    const match = (existing || []).find((m: any) => normalizeMaterialName(m.nome) === nomeNorm);
    if (match) return match.id;
    const { data: created, error } = await (supabase.from('materiais') as any).insert({
      obra_id: obraId, nome: item.nome_material.trim(), categoria: item.categoria || 'Outros', unidade: item.unidade, estoque_atual: 0, estoque_minimo: 0,
    }).select('id').single();
    if (error || !created) return null;
    return created.id;
  };

  const createStockEntry = async (materialId: string, item: ItemCompra, obraId: string, pagamentoDescricao: string, fornecedor: string) => {
    const qty = parseFloat(item.quantidade) || 0;
    if (qty <= 0) return;
    await (supabase.from('movimentacoes') as any).insert({
      obra_id: obraId, material_id: materialId, material_nome: item.nome_material.trim(),
      tipo: 'entrada', data: new Date().toISOString().split('T')[0], quantidade: qty,
      origem_destino: fornecedor || 'Compra', responsavel: user?.name || '',
      observacoes: `Compra: ${pagamentoDescricao}`,
    });
  };

  const createPriceRecord = async (materialId: string | null, item: ItemCompra, obraId: string, fornecedor: string, dataRef: string) => {
    const price = parseFloat(item.preco_unitario) || 0;
    if (price <= 0) return;
    let fornecedorId: string | null = null;
    if (fornecedor) {
      const { data: fList } = await supabase.from('fornecedores').select('id').ilike('nome', fornecedor.trim());
      if (fList && fList.length > 0) fornecedorId = fList[0].id;
    }
    if (!fornecedorId) return;
    await supabase.from('precos_fornecedores').insert({
      fornecedor_id: fornecedorId, obra_id: obraId, material_id: materialId,
      descricao_item_snapshot: item.nome_material.trim(), preco_unitario: price,
      unidade: item.unidade, data_referencia: dataRef, origem_preco: 'compra_real',
    });
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.data_vencimento || !form.valor_previsto || saving || !obra) return;
    setSaving(true);
    try {
      const etapa = form.etapa_orcamento === '_none' ? null : form.etapa_orcamento;
      const valorTotal = parseFloat(form.valor_previsto) || 0;
      const totalParc = parcelamentoAtivo && form.total_parcelas ? parseInt(form.total_parcelas) : null;
      const valorParcela = totalParc && totalParc > 0 ? Math.round((valorTotal / totalParc) * 100) / 100 : null;

      // Sprint 0: resolver fornecedor_id pelo nome se não foi selecionado via autocomplete
      let resolvedFornecedorId = form.fornecedor_id;
      if (!resolvedFornecedorId && form.fornecedor.trim()) {
        const found = allFornecedores.find(f => f.nome.toLowerCase() === form.fornecedor.trim().toLowerCase());
        if (found) resolvedFornecedorId = found.id;
      }

      // Sprint 1: status e valor_pago
      const statusInicial = form.ja_pago ? 'pago' : 'previsto';
      const valorPagoFinal = form.ja_pago && form.valor_pago ? parseFloat(form.valor_pago) : null;
      const dataPagamentoFinal = form.ja_pago
        ? (form.data_pagamento ? format(form.data_pagamento, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
        : (form.data_pagamento ? format(form.data_pagamento, 'yyyy-MM-dd') : null);

      const basePayload = {
        obra_id: obra.id, descricao: form.descricao,
        tipo_pagamento: isCompraMaterial ? 'material' : form.tipo_pagamento,
        valor_previsto: valorTotal,
        forma_pagamento: form.forma_pagamento,
        fornecedor: form.fornecedor || null,
        fornecedor_id: resolvedFornecedorId || null,
        observacoes: form.observacoes || null,
        etapa_orcamento: etapa,
        // Sprint 1: vínculos FK
        etapa_id: form.etapa_id || null,
        composicao_id: form.composicao_id || null,
        // Sprint 0: categoria indireta
        categoria_indireta: !etapa && form.categoria_indireta.trim() ? form.categoria_indireta.trim() : null,
        data_compra: form.data_compra ? format(form.data_compra, 'yyyy-MM-dd') : null,
        // Sprint 1: valor pago
        valor_pago: valorPagoFinal,
        status: statusInicial,
        data_pagamento: dataPagamentoFinal,
      };

      let firstPagamentoId: string | null = null;

      if (editingId) {
        // Edição: atualiza registro existente
        const payload = {
          ...basePayload,
          valor_parcela: valorParcela,
          total_parcelas: totalParc,
          numero_parcela: form.numero_parcela ? parseInt(form.numero_parcela) : null,
          data_vencimento: format(form.data_vencimento!, 'yyyy-MM-dd'),
        };
        const { error } = await supabase.from('pagamentos').update(payload as any).eq('id', editingId);
        if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
        firstPagamentoId = editingId;
        toast({ title: 'Pagamento atualizado!' });
      } else if (parcelamentoAtivo && totalParc && totalParc > 1 && parcelas.length > 0) {
        // Sprint 1: PARCELAMENTO — criar N registros com grupo_parcelas_id compartilhado
        const grupoId = crypto.randomUUID();
        const insertedIds: string[] = [];
        for (const parcela of parcelas) {
          if (!parcela.data) continue;
          const parcelaPayload = {
            ...basePayload,
            descricao: `${form.descricao} (${parcela.numero}/${totalParc})`,
            data_vencimento: format(parcela.data, 'yyyy-MM-dd'),
            valor_parcela: valorParcela,
            valor_previsto: valorTotal,
            total_parcelas: totalParc,
            numero_parcela: parcela.numero,
            grupo_parcelas_id: grupoId,
          };
          const { data: ins, error } = await (supabase.from('pagamentos') as any).insert(parcelaPayload).select('id').single();
          if (error) { toast({ title: `Erro na parcela ${parcela.numero}`, description: error.message, variant: 'destructive' }); }
          else if (ins?.id) insertedIds.push(ins.id);
        }
        firstPagamentoId = insertedIds[0] || null;
        toast({ title: `${insertedIds.length} parcelas registradas!` });
      } else {
        // Pagamento único
        const payload = {
          ...basePayload,
          data_vencimento: format(form.data_vencimento!, 'yyyy-MM-dd'),
          valor_parcela: null,
          total_parcelas: null,
          numero_parcela: null,
          grupo_parcelas_id: null,
        };
        const { data: inserted, error } = await (supabase.from('pagamentos') as any).insert(payload).select('id').single();
        if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); return; }
        firstPagamentoId = inserted?.id;
        toast({ title: 'Pagamento registrado!' });
      }

      const pagamentoId = firstPagamentoId;

      if (isCompraMaterial && pagamentoId) {
        const validItems = itensCompra.filter(i => i.nome_material.trim());
        const dataRef = format(form.data_vencimento, 'yyyy-MM-dd');
        for (const item of validItems) {
          const nomeNorm = normalizeMaterialName(item.nome_material);
          const qty = parseFloat(item.quantidade) || 0;
          const price = parseFloat(item.preco_unitario) || 0;
          const materialId = await findOrCreateMaterial(item, obra.id);
          await (supabase as any).from('pagamento_itens').insert({
            pagamento_id: pagamentoId, obra_id: obra.id, material_id: materialId,
            nome_material_informado: item.nome_material.trim(), nome_material_normalizado: nomeNorm,
            unidade: item.unidade, quantidade: qty, preco_unitario: price, valor_total: qty * price, categoria: item.categoria || null,
          });
          if (materialId) await createStockEntry(materialId, item, obra.id, form.descricao, form.fornecedor);
          await createPriceRecord(materialId, item, obra.id, form.fornecedor, dataRef);
        }
        await refreshEstoque();
      }

      if (!editingId && pagamentoId && pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          const ext = pf.file.name.split('.').pop();
          const path = `${obra.id}/${pagamentoId}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from('pagamento-anexos').upload(path, pf.file);
          if (!uploadError) {
            await (supabase as any).from('pagamento_anexos').insert({ pagamento_id: pagamentoId, nome: pf.file.name, storage_path: path, tipo: pf.tipo });
          }
        }
      }

      setDialogOpen(false);
      resetForm();
      fetchPagamentos();
    } finally { setSaving(false); }
  };

  const handleMarcarPago = async (id: string) => {
    const pag = pagamentos.find(p => p.id === id);
    const hojeStr = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('pagamentos').update({ status: 'pago' as any, data_pagamento: hojeStr as any }).eq('id', id);
    if (!error) {
      setPagamentos(prev => prev.map(p => p.id === id ? { ...p, status: 'pago' } : p));
      toast({ title: 'Pagamento marcado como pago!' });
      onPagamentoChange?.();

      // Sprint 2: gerar custo_real_itens automaticamente quando há etapa_id vinculada
      if (pag && company) {
        try {
          const valorCusto = pag.valor_pago != null ? Number(pag.valor_pago) : Number(pag.valor_previsto);
          await (supabase.from('custo_real_itens') as any).insert({
            obra_id: pag.obra_id,
            company_id: company.id,
            descricao: pag.descricao,
            fornecedor: pag.fornecedor || null,
            valor: valorCusto,
            data: pag.data_vencimento,
            etapa_id: pag.etapa_id || null,
            etapa_nome: pag.etapa_orcamento || null,
            origem: 'pagamento_vinculado',
            pagamento_id: pag.id,
          });
        } catch { /* silent — custo_real_itens é derivado, falha silenciosa */ }
      }
    }
  };


  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('pagamentos').delete().eq('id', deleteId);
    if (!error) { setPagamentos(prev => prev.filter(p => p.id !== deleteId)); toast({ title: 'Pagamento excluído.' }); onPagamentoChange?.(); }
    setDeleteId(null);
  };

  const openEdit = (p: Pagamento) => {
    setEditingId(p.id);
    const etapaNome = p.etapa_orcamento || '_none';
    const etapaId = p.etapa_id || null;
    setForm({
      descricao: p.descricao, tipo_pagamento: p.tipo_pagamento,
      valor_previsto: String(p.valor_previsto), data_vencimento: parseISO(p.data_vencimento),
      forma_pagamento: p.forma_pagamento, fornecedor: p.fornecedor || '',
      // Sprint 0: carregar FK do fornecedor
      fornecedor_id: p.fornecedor_id || null,
      numero_parcela: p.numero_parcela ? String(p.numero_parcela) : '',
      total_parcelas: p.total_parcelas ? String(p.total_parcelas) : '',
      observacoes: p.observacoes || '', etapa_orcamento: etapaNome,
      // Sprint 1: vínculos FK
      etapa_id: etapaId,
      composicao_id: p.composicao_id || null,
      // Sprint 0: carregar categoria indireta
      categoria_indireta: p.categoria_indireta || '',
      data_compra: (p as any).data_compra ? parseISO((p as any).data_compra) : new Date(),
      data_pagamento: (p as any).data_pagamento ? parseISO((p as any).data_pagamento) : null,
      // Sprint 1: valor pago
      valor_pago: p.valor_pago ? String(p.valor_pago) : '',
      ja_pago: p.status === 'pago',
    });
    // Sprint 1: carregar composições da etapa
    if (etapaId) handleEtapaChange(etapaId, etapaNome !== '_none' ? etapaNome : '');
    setIsCompraMaterial(p.tipo_pagamento === 'material');
    if (p.tipo_pagamento === 'material') {
      (supabase as any).from('pagamento_itens').select('*').eq('pagamento_id', p.id).then(({ data }: any) => {
        if (data && data.length > 0) {
          setItensCompra(data.map((item: any) => ({
            tempId: item.id || crypto.randomUUID(),
            nome_material: item.nome_material_informado || '',
            unidade: item.unidade || 'un',
            quantidade: String(item.quantidade || ''),
            preco_unitario: String(item.preco_unitario || ''),
            categoria: item.categoria || '',
          })));
        } else { setItensCompra([makeEmptyItem()]); }
      });
    }
    setDialogOpen(true);
  };

  const handleFileUpload = async (pagamentoId: string, files: FileList, tipo: string) => {
    if (!obra) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${obra.id}/${pagamentoId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('pagamento-anexos').upload(path, file);
        if (uploadError) { toast({ title: `Erro ao enviar ${file.name}`, description: uploadError.message, variant: 'destructive' }); continue; }
        await (supabase as any).from('pagamento_anexos').insert({ pagamento_id: pagamentoId, nome: file.name, storage_path: path, tipo });
      }
      toast({ title: 'Arquivo(s) anexado(s) com sucesso!' });
      fetchPagamentos();
    } catch { toast({ title: 'Erro ao anexar arquivo', variant: 'destructive' }); }
    setUploading(false);
  };

  const handleDeleteAnexo = async (anexo: Anexo) => {
    await supabase.storage.from('pagamento-anexos').remove([anexo.storage_path]);
    await (supabase as any).from('pagamento_anexos').delete().eq('id', anexo.id);
    fetchPagamentos();
    toast({ title: 'Anexo removido.' });
  };

  const getAnexoUrl = (path: string) => {
    const { data } = supabase.storage.from('pagamento-anexos').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  const canEdit = user?.role === 'admin' || user?.role === 'gestor';

  const updateItem = (tempId: string, field: keyof ItemCompra, value: string) => {
    setItensCompra(prev => prev.map(i => i.tempId === tempId ? { ...i, [field]: value } : i));
  };
  const addItem = () => setItensCompra(prev => [...prev, makeEmptyItem()]);
  const removeItem = (tempId: string) => setItensCompra(prev => prev.length <= 1 ? prev : prev.filter(i => i.tempId !== tempId));

  // ── KPI lift-state-up ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !onKpisReady) return;
    onKpisReady([
      { id: 'total', label: 'Total da obra', value: formatCurrency(totalDaObra),
        icon: <DollarSign style={{ width: 14, height: 14, color: '#534AB7' }} />,
        tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7', main: true },
      { id: 'pago', label: 'Pago', value: formatCurrency(totalPago),
        icon: <CheckCircle2 style={{ width: 14, height: 14, color: totalPago > 0 ? '#3B6D11' : '#888' }} />,
        tint: totalPago > 0 ? '#EAF3DE' : undefined,
        valueColor: totalPago > 0 ? '#3B6D11' : undefined,
        labelColor: totalPago > 0 ? '#3B6D11' : undefined },
      { id: 'vencido', label: 'Vencido', value: formatCurrency(totalVencido),
        icon: <AlertTriangle style={{ width: 14, height: 14, color: totalVencido > 0 ? '#A32D2D' : '#888' }} />,
        tint: totalVencido > 0 ? '#FCEBEB' : undefined,
        valueColor: totalVencido > 0 ? '#A32D2D' : undefined,
        labelColor: totalVencido > 0 ? '#A32D2D' : undefined },
      { id: 'prox30', label: 'Próx. 30 dias', value: formatCurrency(totalProx30),
        icon: <Clock style={{ width: 14, height: 14, color: totalProx30 > 0 ? '#854F0B' : '#888' }} />,
        tint: totalProx30 > 0 ? '#FAEEDA' : undefined,
        valueColor: totalProx30 > 0 ? '#854F0B' : undefined,
        labelColor: totalProx30 > 0 ? '#854F0B' : undefined },
    ]);
  }, [isActive, totalDaObra, totalPago, totalVencido, totalProx30, onKpisReady]);

  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  return (
    <>
      <div className="flex flex-col h-full bg-[var(--color-background-secondary)] animate-in fade-in duration-300">
        
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filteredPagamentos.length === 0 && pagamentos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <div className="h-[48px] w-[48px] rounded-full bg-[var(--color-background-secondary)] flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-medium text-[var(--color-text-primary)]">Nenhum pagamento registrado</h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 mb-6 max-w-[260px]">
              Você ainda não tem lançamentos previstos ou realizados para esta obra.
            </p>
            {canEdit && (
              <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-[#534AB7] hover:bg-[#534AB7]/90 text-white h-9 px-4 rounded text-[13px] font-medium gap-1.5">
                <span className="text-lg leading-none mb-[2px]">+</span> Registrar primeiro pagamento
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full break-words min-h-0">
            {/* ── Filters bar ── */}
            <div style={{
              background: 'var(--color-background-secondary)',
              padding: '0 16px',
              height: 44,
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              display: 'flex', alignItems: 'center', gap: 10,
              flexShrink: 0,
            }}>
              {/* Busca — desktop */}
              <div className="hidden sm:block" style={{ position: 'relative', maxWidth: 200 }}>
                <Input
                  placeholder="Buscar pagamento..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="h-8 text-[12px] bg-[var(--color-background-primary)]"
                />
              </div>

              {/* Filtros — desktop */}
              <div className="hidden sm:flex items-center gap-1">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 border-transparent bg-transparent outline-none ring-0 min-w-[110px] text-[12px] text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] px-2">
                    Status
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                  <SelectTrigger className="h-8 border-transparent bg-transparent outline-none ring-0 min-w-[120px] text-[12px] text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] px-2">
                    Etapa
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {[...new Set(pagamentos.map(p => p.etapa_orcamento).filter(Boolean))].map(e => (
                      <SelectItem key={e!} value={e!}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                  <SelectTrigger className="h-8 border-transparent bg-transparent outline-none ring-0 min-w-[115px] text-[12px] text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] px-2">
                    Período
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    <SelectItem value="7dias">Próximos 7 dias</SelectItem>
                    <SelectItem value="30dias">Próximos 30 dias</SelectItem>
                    <SelectItem value="atrasados">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('_all'); setFilterTipo('_all'); setFilterPeriodo('_all'); setFilterEtapa('_all'); setFilterSearch(''); }} className="h-8 text-[11px] text-[var(--color-text-secondary)] hover:text-foreground">
                    Limpar
                  </Button>
                )}
              </div>

              {/* Filtros — mobile: botão que abre bottom sheet */}
              <div className="flex sm:hidden items-center gap-2 w-full">
                <Input
                  placeholder="Buscar..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="h-8 text-[12px] bg-[var(--color-background-primary)] flex-1"
                />
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 32, padding: '0 12px',
                    border: '0.5px solid var(--color-border-secondary)',
                    borderRadius: 6, background: hasActiveFilters ? '#EEEDFE' : 'var(--color-background-primary)',
                    color: hasActiveFilters ? '#534AB7' : 'var(--color-text-secondary)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <Filter style={{ width: 12, height: 12 }} />
                  Filtrar
                  {hasActiveFilters && <span style={{ fontSize: 9, background: '#534AB7', color: '#fff', borderRadius: 10, padding: '0 4px' }}>!</span>}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
          {/* ── Desktop table — premium ── */}
          <div className="hidden sm:block overflow-x-auto">
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {/* Cabeçalho */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.7fr 0.7fr 0.7fr 80px',
                padding: '8px 16px',
                background: 'var(--color-background-secondary)',
                borderBottom: '0.5px solid var(--color-border-tertiary)',
              }}>
                {['Descrição', 'Etapa', 'Tipo', 'Valor', 'Vencimento', 'Status', 'Forma', 'Ações'].map((h, i) => (
                  <span key={h} style={{
                    fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    textAlign: i >= 3 && i !== 7 ? 'right' : i === 7 ? 'right' : 'left',
                  }}>{h}</span>
                ))}
              </div>
              {/* Linhas */}
              {filteredPagamentos.map(p => {
                const pAnexos = anexos.get(p.id) || [];
                const displayValue = p.valor_parcela && p.total_parcelas && p.total_parcelas > 1
                  ? Number(p.valor_parcela) : Number(p.valor_previsto);
                return (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.7fr 0.7fr 0.7fr 80px',
                    padding: '11px 16px',
                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                    alignItems: 'center',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {/* Descrição */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.descricao}
                      </p>
                      {p.fornecedor && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.fornecedor}</p>}
                      {p.numero_parcela && p.total_parcelas && (
                        <p style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Parcela {p.numero_parcela}/{p.total_parcelas}</p>
                      )}
                      {pAnexos.length > 0 && (
                        <button onClick={() => setViewAnexosId(p.id)}
                          style={{ fontSize: 10, color: '#534AB7', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Paperclip style={{ width: 10, height: 10 }} />{pAnexos.length} anexo(s)
                        </button>
                      )}
                    </div>
                    {/* Etapa */}
                    <div style={{ paddingRight: 4 }}>
                      {p.etapa_orcamento ? (
                        <span style={{ fontSize: 11, color: '#3C3489', background: '#EEEDFE', border: '0.5px solid #AFA9EC', padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>
                          {p.etapa_orcamento.length > 16 ? p.etapa_orcamento.slice(0, 14) + '…' : p.etapa_orcamento}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: '#FAEEDA', color: '#854F0B', border: '0.5px solid #FAC775' }}>
                          ⬡ {p.categoria_indireta ? p.categoria_indireta.replace(/_/g, ' ') : 'Indireto'}
                        </span>
                      )}
                    </div>
                    {/* Tipo */}
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {tipoLabels[p.tipo_pagamento] || p.tipo_pagamento}
                    </span>
                    {/* Valor */}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(displayValue)}
                      </p>
                      {p.total_parcelas && p.total_parcelas > 1 && (
                        <p style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Total: {formatCurrency(Number(p.valor_previsto))}</p>
                      )}
                    </div>
                    {/* Vencimento */}
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {format(parseISO(p.data_vencimento), 'dd/MM/yy')}
                    </span>
                    {/* Status */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ ...getStatusStyle(p.status), fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {statusLabels[p.status]}
                      </span>
                    </div>
                    {/* Forma */}
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                      {formaLabels[p.forma_pagamento] || p.forma_pagamento}
                    </span>
                    {/* Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                      {canEdit && (
                        <button onClick={() => setViewAnexosId(p.id)}
                          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                          <Paperclip style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {p.status !== 'pago' && p.status !== 'cancelado' && canEdit && (
                        <button onClick={() => handleMarcarPago(p.id)}
                          style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#3B6D11' }}>
                          <CheckCircle2 style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(p)}
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                            <Pencil style={{ width: 13, height: 13 }} />
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#A32D2D' }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* ── Bottom Sheet: filtros mobile ── */}
          <BottomSheet
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            title="Filtros"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Etapa</label>
                <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {[...new Set(pagamentos.map(p => p.etapa_orcamento).filter(Boolean))].map(e => (
                      <SelectItem key={e!} value={e!}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Período</label>
                <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    <SelectItem value="7dias">Próximos 7 dias</SelectItem>
                    <SelectItem value="30dias">Próximos 30 dias</SelectItem>
                    <SelectItem value="atrasados">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterStatus('_all'); setFilterTipo('_all'); setFilterPeriodo('_all'); setFilterEtapa('_all'); setFilterSearch(''); setMobileFilterOpen(false); }}
                  style={{
                    width: '100%', height: 44, borderRadius: 8,
                    background: '#FCEBEB', color: '#A32D2D',
                    border: '0.5px solid #F7C1C1',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Limpar todos os filtros
                </button>
              )}
              <button
                onClick={() => setMobileFilterOpen(false)}
                style={{
                  width: '100%', height: 48, borderRadius: 10,
                  background: '#534AB7', color: '#fff',
                  border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Aplicar filtros
              </button>
            </div>
          </BottomSheet>
        </div>
        </div>
        </div>
      )}

      {/* ── Create/Edit Dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pagamento' : 'Novo Pagamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>

            <div>
              <label className="text-sm font-medium">Etapa da Obra</label>
              {!showNewEtapa ? (
                <div className="flex gap-2">
                  <Select
                    value={form.etapa_id || '_none'}
                    onValueChange={v => {
                      if (v === '_none') {
                        handleEtapaChange('', '_none');
                        setForm(prev => ({ ...prev, etapa_orcamento: '_none', etapa_id: null, composicao_id: null }));
                      } else {
                        const cat = categorias.find(c => c.id === v);
                        if (cat) handleEtapaChange(cat.id, cat.nome);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Vincular a uma etapa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem etapa</SelectItem>
                      {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowNewEtapa(true)}><Plus className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={newEtapaNome} onChange={e => setNewEtapaNome(e.target.value)} placeholder="Nome da nova etapa" className="flex-1" />
                  <Button size="sm" onClick={handleCreateEtapa} disabled={!newEtapaNome.trim() || creatingEtapa}>{creatingEtapa ? 'Criando...' : 'Criar'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowNewEtapa(false); setNewEtapaNome(''); }}><X className="h-4 w-4" /></Button>
                </div>
              )}
              {/* Sprint 1: Composição (visible when etapa_id selected and composições exist) */}
              {form.etapa_id && (
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground">Composição (opcional)</label>
                  <Select
                    value={form.composicao_id || '_none_comp'}
                    onValueChange={v => setForm(prev => ({ ...prev, composicao_id: v === '_none_comp' ? null : v }))}
                    disabled={loadingComposicoes}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={loadingComposicoes ? 'Carregando...' : 'Composição específica (opcional)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_comp">Sem composição específica</SelectItem>
                      {composicoesDaEtapa.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Ao marcar como pago, o valor será registrado no Custo Real desta etapa.</p>
            </div>

            {/* Sprint 0: Categoria Indireta — exibida quando sem etapa */}
            {form.etapa_orcamento === '_none' && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <label className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>⬡</span> Custo Indireto — Categoria
                </label>
                <Select
                  value={form.categoria_indireta || '_none_indir'}
                  onValueChange={v => setForm({ ...form, categoria_indireta: v === '_none_indir' ? '' : v })}
                >
                  <SelectTrigger className="mt-1.5 border-amber-300 dark:border-amber-700">
                    <SelectValue placeholder="Selecionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_indir">Sem categoria</SelectItem>
                    <SelectItem value="administracao">Administração</SelectItem>
                    <SelectItem value="seguro">Seguro</SelectItem>
                    <SelectItem value="aluguel_equipamento">Aluguel de Equipamento</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="epi">EPI / Segurança</SelectItem>
                    <SelectItem value="licenca">Licenças e Taxas</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="outro_indireto">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Pagamentos sem etapa são classificados como custos indiretos da obra.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={isCompraMaterial ? 'material' : form.tipo_pagamento} onValueChange={v => {
                  setIsCompraMaterial(v === 'material');
                  setForm({ ...form, tipo_pagamento: v });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Forma</label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(formaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo_pagamento === 'material' && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <Switch id="compra-material" checked={isCompraMaterial} onCheckedChange={setIsCompraMaterial} />
                <Label htmlFor="compra-material" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Package className="h-4 w-4 text-primary" />Gerar entrada no estoque
                </Label>
              </div>
            )}

            {isCompraMaterial && (
              <div className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5"><Package className="h-4 w-4 text-primary" />Itens da Compra</p>
                  <Button variant="outline" size="sm" type="button" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Item</Button>
                </div>
                {itensCompra.map((item) => (
                  <div key={item.tempId} className="space-y-2 p-2.5 bg-muted/50 rounded-md relative">
                    {itensCompra.length > 1 && (
                      <button type="button" className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-destructive/10" onClick={() => removeItem(item.tempId)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Material *</label>
                        <AutocompleteInput suggestions={materialSuggestions} value={item.nome_material}
                          onChange={v => updateItem(item.tempId, 'nome_material', v)}
                          onSuggestionSelect={s => { updateItem(item.tempId, 'nome_material', s.label); if (s.meta) updateItem(item.tempId, 'unidade', s.meta); }}
                          placeholder="Nome do material" className="h-8 text-sm" />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-muted-foreground">Unidade</label>
                        <Select value={item.unidade} onValueChange={v => updateItem(item.tempId, 'unidade', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <label className="text-xs text-muted-foreground">Qtd</label>
                        <Input type="number" value={item.quantidade} onChange={e => updateItem(item.tempId, 'quantidade', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="w-28">
                        <label className="text-xs text-muted-foreground">Preço Unit.</label>
                        <Input type="number" step="0.01" value={item.preco_unitario} onChange={e => updateItem(item.tempId, 'preco_unitario', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Subtotal</label>
                        <p className="h-8 flex items-center text-sm font-medium">
                          {formatCurrency((parseFloat(item.quantidade) || 0) * (parseFloat(item.preco_unitario) || 0))}
                        </p>
                      </div>
                      <div className="w-28">
                        <label className="text-xs text-muted-foreground">Categoria</label>
                        <Select value={item.categoria} onValueChange={v => updateItem(item.tempId, 'categoria', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{categoriasEstoque.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                {totalItens > 0 && (
                  <div className="flex justify-end text-sm font-medium pt-1 border-t border-border">
                    Total dos itens: {formatCurrency(totalItens)}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor Total *</label>
                <Input type="number" step="0.01" value={form.valor_previsto}
                  onChange={e => setForm({ ...form, valor_previsto: e.target.value })}
                  className={cn(isCompraMaterial && totalItens > 0 && 'bg-muted')}
                  readOnly={isCompraMaterial && totalItens > 0}
                />
                {parcelamentoAtivo && form.total_parcelas && parseInt(form.total_parcelas) > 1 && form.valor_previsto && (
                  <p className="text-[11px] text-primary mt-1 font-medium">
                    Valor por parcela: {formatCurrency(Math.round(((parseFloat(form.valor_previsto) || 0) / (parseInt(form.total_parcelas) || 1)) * 100) / 100)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Vencimento {!parcelamentoAtivo && '*'}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.data_vencimento && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.data_vencimento ? format(form.data_vencimento, 'dd/MM/yyyy') : parcelamentoAtivo ? 'Data da 1ª parcela' : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.data_vencimento || undefined} onSelect={d => setForm({ ...form, data_vencimento: d || null })} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Sprint 1: Já pago + Valor pago */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch id="ja-pago" checked={form.ja_pago} onCheckedChange={v => setForm(prev => ({ ...prev, ja_pago: v }))} />
              <Label htmlFor="ja-pago" className="text-sm cursor-pointer">Pagamento já realizado</Label>
            </div>
            {form.ja_pago && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <div>
                  <label className="text-sm font-medium">Valor Pago</label>
                  <Input
                    type="number" step="0.01"
                    value={form.valor_pago}
                    onChange={e => setForm(prev => ({ ...prev, valor_pago: e.target.value }))}
                    placeholder={form.valor_previsto || 'Mesmo que o valor total'}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Deixe em branco para usar o valor total como custo realizado.</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Fornecedor</label>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-6 px-2" type="button" onClick={() => setShowNewFornecedor(!showNewFornecedor)}>
                  {showNewFornecedor ? 'Cancelar' : '+ Novo Fornecedor'}
                </Button>
              </div>
              {!showNewFornecedor ? (
                <>
                  <AutocompleteInput suggestions={fornecedorSuggestions} value={form.fornecedor}
                    onChange={v => setForm({ ...form, fornecedor: v })} placeholder="Nome do fornecedor" />
                  {isCompraMaterial && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      💡 Se o fornecedor estiver cadastrado, o preço será registrado automaticamente no banco de preços.
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2 p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <Input value={newFornecedorNome} onChange={e => setNewFornecedorNome(e.target.value)} placeholder="Nome do fornecedor *" className="h-8 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newFornecedorCnpj} onChange={e => setNewFornecedorCnpj(e.target.value)} placeholder="CNPJ (opcional)" className="h-8 text-sm" />
                    <Input value={newFornecedorTel} onChange={e => setNewFornecedorTel(e.target.value)} placeholder="Telefone (opcional)" className="h-8 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleCreateFornecedor} disabled={!newFornecedorNome.trim() || creatingFornecedor} className="w-full">
                    {creatingFornecedor ? 'Cadastrando...' : 'Cadastrar e Selecionar'}
                  </Button>
                </div>
              )}
            </div>

            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm text-primary hover:underline w-full">
              <ChevronDown className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')} />
              {showAdvanced ? 'Menos opções' : 'Mais opções (datas, parcelamento, observações)'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Data da Compra</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.data_compra && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_compra ? format(form.data_compra, 'dd/MM/yyyy') : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.data_compra || undefined} onSelect={d => setForm({ ...form, data_compra: d || null })} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Data do Pagamento</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !form.data_pagamento && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.data_pagamento ? format(form.data_pagamento, 'dd/MM/yyyy') : '—'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={form.data_pagamento || undefined} onSelect={d => setForm({ ...form, data_pagamento: d || null })} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <p className="text-[11px] text-muted-foreground mt-1">Preenchida automaticamente ao marcar como pago.</p>
                  </div>
                </div>

                <div className="border border-border rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch id="parcelamento" checked={parcelamentoAtivo} onCheckedChange={setParcelamentoAtivo} />
                    <Label htmlFor="parcelamento" className="text-sm cursor-pointer">Parcelamento</Label>
                  </div>
                  {parcelamentoAtivo && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Total de Parcelas</label>
                          <Input type="number" min="1" value={form.total_parcelas} onChange={e => {
                            const total = parseInt(e.target.value) || 0;
                            setForm({ ...form, total_parcelas: e.target.value });
                            if (total > 0 && parcelamentoTipo === 'mensal' && form.data_vencimento) {
                              setParcelas(Array.from({ length: total }, (_, i) => ({ numero: i + 1, data: addMonths(form.data_vencimento!, i) })));
                            } else if (total > 0 && parcelamentoTipo === 'custom') {
                              setParcelas(prev => { const existing = [...prev]; while (existing.length < total) existing.push({ numero: existing.length + 1, data: null }); return existing.slice(0, total); });
                            }
                          }} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Modo</label>
                          <Select value={parcelamentoTipo} onValueChange={v => {
                            setParcelamentoTipo(v as 'mensal' | 'custom');
                            if (v === 'mensal' && form.data_vencimento && form.total_parcelas) {
                              const total = parseInt(form.total_parcelas) || 0;
                              setParcelas(Array.from({ length: total }, (_, i) => ({ numero: i + 1, data: addMonths(form.data_vencimento!, i) })));
                            }
                          }}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensal">Mensal (mesmo dia)</SelectItem>
                              <SelectItem value="custom">Datas personalizadas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {parcelas.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {parcelas.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="text-xs text-muted-foreground w-16 shrink-0">Parcela {p.numero}</span>
                              {parcelamentoTipo === 'custom' ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start text-left font-normal h-8', !p.data && 'text-muted-foreground')}>
                                      <CalendarIcon className="mr-1 h-3 w-3" />{p.data ? format(p.data, 'dd/MM/yyyy') : 'Selecione'}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={p.data || undefined} onSelect={d => { setParcelas(prev => prev.map((pp, i) => i === idx ? { ...pp, data: d || null } : pp)); }} initialFocus className="p-3 pointer-events-auto" />
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-sm">{p.data ? format(p.data, 'dd/MM/yyyy') : '—'}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">💡 Cada parcela será registrada como um pagamento separado com a mesma descrição.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>
            )}

            {/* Attachment section */}
            {editingId ? (
              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> Documentos e Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(anexoTipoLabels).map(([tipo, label]) => (
                    <Button key={tipo} variant="outline" size="sm" className="text-xs" disabled={uploading} onClick={() => {
                      const input = fileInputRef.current;
                      if (input) { input.setAttribute('data-tipo', tipo); input.setAttribute('data-pagamento-id', editingId); input.click(); }
                    }}>
                      {tipo === 'foto' ? <Image className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}{label}
                    </Button>
                  ))}
                </div>
                {(anexos.get(editingId) || []).length > 0 && (
                  <div className="space-y-1 mt-2">
                    {(anexos.get(editingId) || []).map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted rounded">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate flex-1">{a.nome}</span>
                        <span className="text-muted-foreground">{anexoTipoLabels[a.tipo || 'outro']}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> Documentos e Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(anexoTipoLabels).map(([tipo, label]) => (
                    <Button key={tipo} variant="outline" size="sm" className="text-xs" type="button" onClick={() => {
                      const input = pendingFileInputRef.current;
                      if (input) { input.setAttribute('data-tipo', tipo); input.click(); }
                    }}>
                      {tipo === 'foto' ? <Image className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}{label}
                    </Button>
                  ))}
                </div>
                <input ref={pendingFileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    if (e.target.files) {
                      const tipo = e.target.getAttribute('data-tipo') || 'outro';
                      const newFiles: PendingFile[] = Array.from(e.target.files).map(file => ({
                        id: crypto.randomUUID(), file, tipo,
                        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                      }));
                      setPendingFiles(prev => [...prev, ...newFiles]);
                      e.target.value = '';
                    }
                  }}
                />
                {pendingFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {pendingFiles.map(pf => (
                      <div key={pf.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted rounded">
                        {pf.preview ? <img src={pf.preview} alt="" className="h-8 w-8 rounded object-cover shrink-0" /> : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                        <span className="truncate flex-1">{pf.file.name}</span>
                        <span className="text-muted-foreground">{anexoTipoLabels[pf.tipo] || pf.tipo}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" type="button" onClick={() => {
                          if (pf.preview) URL.revokeObjectURL(pf.preview);
                          setPendingFiles(prev => prev.filter(f => f.id !== pf.id));
                        }}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const pagId = e.target.getAttribute('data-pagamento-id') || editingId;
                if (e.target.files && pagId) {
                  const tipo = e.target.getAttribute('data-tipo') || 'outro';
                  handleFileUpload(pagId, e.target.files, tipo);
                  e.target.value = '';
                }
              }}
            />

            <Button onClick={handleSubmit} className="w-full" disabled={!form.descricao || !form.data_vencimento || !form.valor_previsto || saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Registrar Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Anexos Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!viewAnexosId} onOpenChange={() => setViewAnexosId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> Documentos e Fotos</DialogTitle>
          </DialogHeader>
          {viewAnexosId && (
            <div className="space-y-4">
              {canEdit && (
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center space-y-2">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Anexar boleto, contrato, recibo ou foto</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(anexoTipoLabels).map(([tipo, label]) => (
                      <Button key={tipo} variant="outline" size="sm" className="text-xs" disabled={uploading} onClick={() => {
                        const input = fileInputRef.current;
                        if (input) { input.setAttribute('data-tipo', tipo); input.click(); }
                      }}>
                        {tipo === 'foto' ? <Image className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}{label}
                      </Button>
                    ))}
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && viewAnexosId) {
                        const tipo = e.target.getAttribute('data-tipo') || 'outro';
                        handleFileUpload(viewAnexosId, e.target.files, tipo);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              )}
              {(anexos.get(viewAnexosId) || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-2">
                  {(anexos.get(viewAnexosId) || []).map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2 border border-border rounded-lg">
                      {a.tipo === 'foto' ? <Image className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{anexoTipoLabels[a.tipo || 'outro'] || a.tipo}</p>
                      </div>
                      <a href={getAnexoUrl(a.storage_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Ver</a>
                      {canEdit && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0" onClick={() => handleDeleteAnexo(a)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir pagamento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
