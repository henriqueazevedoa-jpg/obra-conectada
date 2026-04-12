import { useState, useEffect, useCallback, useRef } from 'react';
import { format, parseISO, addDays, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
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
import {
  Plus, DollarSign, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2,
  CalendarIcon, Filter, ChevronDown, Paperclip, Upload, FileText, Image, X,
  Package,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NoObraState from '@/components/obras/NoObraState';

interface Pagamento {
  id: string;
  obra_id: string;
  descricao: string;
  tipo_pagamento: string;
  valor_previsto: number;
  data_vencimento: string;
  status: string;
  forma_pagamento: string;
  fornecedor: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  observacoes: string | null;
  etapa_orcamento: string | null;
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

const statusColors: Record<string, string> = {
  previsto: 'bg-blue-100 text-blue-700',
  pago: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
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

export default function PagamentosPage() {
  const { user, hasPermission } = useAuth();
  const { obras } = useObras();
  const { selectedObraId: obraId, setSelectedObraId: setObraId } = useObraSelection();
  const { getOrcamento, saveOrcamento } = useOrcamento();
  const { saveItem: saveCustoItem } = useCustoReal();
  const { company } = useCompany();
  const { refreshEstoque } = useEstoque();
  const obra = obras.find(o => o.id === obraId) || obras[0];

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Anexos
  const [anexos, setAnexos] = useState<Map<string, Anexo[]>>(new Map());
  const [viewAnexosId, setViewAnexosId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New etapa
  const [showNewEtapa, setShowNewEtapa] = useState(false);
  const [newEtapaNome, setNewEtapaNome] = useState('');
  const [creatingEtapa, setCreatingEtapa] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('_all');
  const [filterTipo, setFilterTipo] = useState('_all');
  const [filterPeriodo, setFilterPeriodo] = useState('_all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form
  const [form, setForm] = useState({
    descricao: '',
    tipo_pagamento: 'outro',
    valor_previsto: '',
    data_vencimento: null as Date | null,
    forma_pagamento: 'outro',
    fornecedor: '',
    numero_parcela: '',
    total_parcelas: '',
    observacoes: '',
    etapa_orcamento: '_none',
  });

  // Material purchase items
  const [isCompraMaterial, setIsCompraMaterial] = useState(false);
  const [itensCompra, setItensCompra] = useState<ItemCompra[]>([makeEmptyItem()]);

  const resetForm = () => {
    setForm({
      descricao: '', tipo_pagamento: 'outro', valor_previsto: '',
      data_vencimento: null, forma_pagamento: 'outro', fornecedor: '',
      numero_parcela: '', total_parcelas: '', observacoes: '', etapa_orcamento: '_none',
    });
    setEditingId(null);
    setShowNewEtapa(false);
    setNewEtapaNome('');
    setIsCompraMaterial(false);
    setItensCompra([makeEmptyItem()]);
  };

  // Get orcamento categories for the selected obra
  const orcamento = obra ? getOrcamento(obra.id) : undefined;
  const categorias = orcamento?.categorias || [];

  const fetchPagamentos = useCallback(async () => {
    if (!obra) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('obra_id', obra.id)
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
      setPagamentos(data as unknown as Pagamento[]);
      const ids = data.map((p: any) => p.id);
      if (ids.length > 0) {
        const { data: anexoData } = await (supabase as any)
          .from('pagamento_anexos')
          .select('*')
          .in('pagamento_id', ids);
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
  }, [obra?.id]);

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

  // Calculate total from items
  const totalItens = itensCompra.reduce((sum, item) => {
    const qty = parseFloat(item.quantidade) || 0;
    const price = parseFloat(item.preco_unitario) || 0;
    return sum + qty * price;
  }, 0);

  // Auto-sync total value from items
  useEffect(() => {
    if (isCompraMaterial && totalItens > 0) {
      setForm(prev => ({ ...prev, valor_previsto: totalItens.toFixed(2) }));
    }
  }, [totalItens, isCompraMaterial]);

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra cadastrada"
        description="Cadastre uma obra para gerenciar pagamentos."
      />
    );
  }

  // Computed values
  const hoje = startOfDay(new Date());
  const em7dias = addDays(hoje, 7);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const totalPrevistoMes = pagamentos
    .filter(p => {
      const d = parseISO(p.data_vencimento);
      return d >= inicioMes && d <= fimMes && p.status !== 'cancelado';
    })
    .reduce((s, p) => s + Number(p.valor_previsto), 0);

  const totalVencido = pagamentos
    .filter(p => p.status === 'atrasado')
    .reduce((s, p) => s + Number(p.valor_previsto), 0);

  const totalPago = pagamentos
    .filter(p => p.status === 'pago')
    .reduce((s, p) => s + Number(p.valor_previsto), 0);

  const totalProx7 = pagamentos
    .filter(p => {
      if (p.status === 'pago' || p.status === 'cancelado') return false;
      const d = parseISO(p.data_vencimento);
      return d >= hoje && d <= em7dias;
    })
    .reduce((s, p) => s + Number(p.valor_previsto), 0);

  // Filtered list
  const hasActiveFilters = filterStatus !== '_all' || filterTipo !== '_all' || filterPeriodo !== '_all';

  const filteredPagamentos = pagamentos.filter(p => {
    if (filterStatus !== '_all' && p.status !== filterStatus) return false;
    if (filterTipo !== '_all' && p.tipo_pagamento !== filterTipo) return false;
    if (filterPeriodo !== '_all') {
      const d = parseISO(p.data_vencimento);
      if (filterPeriodo === '7dias' && !(d >= hoje && d <= em7dias)) return false;
      if (filterPeriodo === '30dias' && !(d >= hoje && d <= addDays(hoje, 30))) return false;
      if (filterPeriodo === 'atrasados' && p.status !== 'atrasado') return false;
    }
    return true;
  });

  const handleCreateEtapa = async () => {
    if (!newEtapaNome.trim() || !obra || creatingEtapa) return;
    setCreatingEtapa(true);
    try {
      const currentOrc = getOrcamento(obra.id);
      const existingCats = currentOrc?.categorias || [];
      const existingNums = existingCats
        .map(c => { const m = c.codigo.match(/(\d+)/); return m ? parseInt(m[1]) : 0; })
        .filter(n => n > 0);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      const newCode = String(nextNum).padStart(2, '0');

      if (existingCats.some(c => c.nome === newEtapaNome.trim())) {
        toast({ title: 'Etapa já existe com esse nome', variant: 'destructive' });
        setCreatingEtapa(false);
        return;
      }

      const newCat = {
        id: crypto.randomUUID(),
        codigo: newCode,
        nome: newEtapaNome.trim(),
        composicoes: [],
        precoTotal: 0,
        usaComposicoes: false,
      };
      const updatedOrc = {
        ...(currentOrc || { id: crypto.randomUUID(), obraId: obra.id, categorias: [] }),
        categorias: [...existingCats, newCat],
      };
      await saveOrcamento(updatedOrc as any);
      setForm(prev => ({ ...prev, etapa_orcamento: newEtapaNome.trim() }));
      setShowNewEtapa(false);
      setNewEtapaNome('');
      toast({ title: 'Etapa criada com sucesso!' });
    } catch {
      toast({ title: 'Erro ao criar etapa', variant: 'destructive' });
    } finally {
      setCreatingEtapa(false);
    }
  };

  // Calculate total from items
  const totalItens = itensCompra.reduce((sum, item) => {
    const qty = parseFloat(item.quantidade) || 0;
    const price = parseFloat(item.preco_unitario) || 0;
    return sum + qty * price;
  }, 0);

  // --- Material integration logic ---
  const findOrCreateMaterial = async (item: ItemCompra, obraId: string): Promise<string | null> => {
    const nomeNorm = normalizeMaterialName(item.nome_material);
    if (!nomeNorm) return null;

    // Try to find existing material by normalized name + unidade + obra
    const { data: existing } = await supabase
      .from('materiais')
      .select('id, nome')
      .eq('obra_id', obraId)
      .eq('unidade', item.unidade);

    const match = (existing || []).find((m: any) =>
      normalizeMaterialName(m.nome) === nomeNorm
    );

    if (match) return match.id;

    // Create new material
    const { data: created, error } = await (supabase.from('materiais') as any).insert({
      obra_id: obraId,
      nome: item.nome_material.trim(),
      categoria: item.categoria || 'Outros',
      unidade: item.unidade,
      estoque_atual: 0,
      estoque_minimo: 0,
    }).select('id').single();

    if (error || !created) return null;
    return created.id;
  };

  const createStockEntry = async (materialId: string, item: ItemCompra, obraId: string, pagamentoDescricao: string, fornecedor: string) => {
    const qty = parseFloat(item.quantidade) || 0;
    if (qty <= 0) return;

    await (supabase.from('movimentacoes') as any).insert({
      obra_id: obraId,
      material_id: materialId,
      material_nome: item.nome_material.trim(),
      tipo: 'entrada',
      data: new Date().toISOString().split('T')[0],
      quantidade: qty,
      origem_destino: fornecedor || 'Compra',
      responsavel: user?.name || '',
      observacoes: `Compra: ${pagamentoDescricao}`,
    });
  };

  const createPriceRecord = async (materialId: string | null, item: ItemCompra, obraId: string, fornecedor: string, dataRef: string) => {
    const price = parseFloat(item.preco_unitario) || 0;
    if (price <= 0) return;

    // Find fornecedor_id if exists
    let fornecedorId: string | null = null;
    if (fornecedor) {
      const { data: fList } = await supabase
        .from('fornecedores')
        .select('id')
        .ilike('nome', fornecedor.trim());
      if (fList && fList.length > 0) {
        fornecedorId = fList[0].id;
      }
    }

    if (!fornecedorId) return; // Can't create price without a valid fornecedor

    await supabase.from('precos_fornecedores').insert({
      fornecedor_id: fornecedorId,
      obra_id: obraId,
      material_id: materialId,
      descricao_item_snapshot: item.nome_material.trim(),
      preco_unitario: price,
      unidade: item.unidade,
      data_referencia: dataRef,
      origem_preco: 'compra_real',
    });
  };

  const handleSubmit = async () => {
    if (!form.descricao || !form.data_vencimento || !form.valor_previsto || saving) return;
    setSaving(true);

    try {
      const etapa = form.etapa_orcamento === '_none' ? null : form.etapa_orcamento;

      const payload = {
        obra_id: obra.id,
        descricao: form.descricao,
        tipo_pagamento: isCompraMaterial ? 'material' : form.tipo_pagamento,
        valor_previsto: parseFloat(form.valor_previsto) || 0,
        data_vencimento: format(form.data_vencimento, 'yyyy-MM-dd'),
        forma_pagamento: form.forma_pagamento,
        fornecedor: form.fornecedor || null,
        numero_parcela: form.numero_parcela ? parseInt(form.numero_parcela) : null,
        total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
        observacoes: form.observacoes || null,
        etapa_orcamento: etapa,
      };

      let pagamentoId: string | null = null;

      if (editingId) {
        const { error } = await supabase.from('pagamentos').update(payload as any).eq('id', editingId);
        if (error) {
          toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
          return;
        }
        pagamentoId = editingId;
        toast({ title: 'Pagamento atualizado!' });
      } else {
        const { data: inserted, error } = await (supabase.from('pagamentos') as any).insert(payload).select('id').single();
        if (error) {
          toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
          return;
        }
        pagamentoId = inserted?.id;
        toast({ title: 'Pagamento registrado!' });
      }

      // Process material items if this is a material purchase
      if (isCompraMaterial && pagamentoId) {
        const validItems = itensCompra.filter(i => i.nome_material.trim());
        const dataRef = format(form.data_vencimento, 'yyyy-MM-dd');

        for (const item of validItems) {
          const nomeNorm = normalizeMaterialName(item.nome_material);
          const qty = parseFloat(item.quantidade) || 0;
          const price = parseFloat(item.preco_unitario) || 0;

          // 1. Find or create material
          const materialId = await findOrCreateMaterial(item, obra.id);

          // 2. Save pagamento_itens
          await (supabase as any).from('pagamento_itens').insert({
            pagamento_id: pagamentoId,
            obra_id: obra.id,
            material_id: materialId,
            nome_material_informado: item.nome_material.trim(),
            nome_material_normalizado: nomeNorm,
            unidade: item.unidade,
            quantidade: qty,
            preco_unitario: price,
            valor_total: qty * price,
            categoria: item.categoria || null,
          });

          // 3. Create stock entry
          if (materialId) {
            await createStockEntry(materialId, item, obra.id, form.descricao, form.fornecedor);
          }

          // 4. Feed price history
          await createPriceRecord(materialId, item, obra.id, form.fornecedor, dataRef);
        }

        // Refresh stock data
        await refreshEstoque();
      }

      setDialogOpen(false);
      resetForm();
      fetchPagamentos();
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarPago = async (id: string) => {
    const pag = pagamentos.find(p => p.id === id);
    const { error } = await supabase.from('pagamentos').update({ status: 'pago' as any }).eq('id', id);
    if (!error) {
      setPagamentos(prev => prev.map(p => p.id === id ? { ...p, status: 'pago' } : p));
      toast({ title: 'Pagamento marcado como pago!' });

      // Sync to Custo Real if linked to an etapa
      if (pag?.etapa_orcamento && company) {
        try {
          await saveCustoItem({
            id: crypto.randomUUID(),
            obraId: pag.obra_id,
            companyId: company.id,
            categoria: pag.etapa_orcamento,
            descricao: pag.descricao,
            fornecedor: pag.fornecedor || '',
            valor: Number(pag.valor_previsto),
            data: pag.data_vencimento,
            observacoes: `Pagamento #${pag.id.slice(0, 8)} - ${formaLabels[pag.forma_pagamento] || pag.forma_pagamento}`,
          });
        } catch {
          // Silent - custo real sync is best-effort
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('pagamentos').delete().eq('id', deleteId);
    if (!error) {
      setPagamentos(prev => prev.filter(p => p.id !== deleteId));
      toast({ title: 'Pagamento excluído.' });
    }
    setDeleteId(null);
  };

  const openEdit = (p: Pagamento) => {
    setEditingId(p.id);
    setForm({
      descricao: p.descricao,
      tipo_pagamento: p.tipo_pagamento,
      valor_previsto: String(p.valor_previsto),
      data_vencimento: parseISO(p.data_vencimento),
      forma_pagamento: p.forma_pagamento,
      fornecedor: p.fornecedor || '',
      numero_parcela: p.numero_parcela ? String(p.numero_parcela) : '',
      total_parcelas: p.total_parcelas ? String(p.total_parcelas) : '',
      observacoes: p.observacoes || '',
      etapa_orcamento: p.etapa_orcamento || '_none',
    });
    setIsCompraMaterial(p.tipo_pagamento === 'material');
    setDialogOpen(true);
  };

  // --- File upload ---
  const handleFileUpload = async (pagamentoId: string, files: FileList, tipo: string) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${obra.id}/${pagamentoId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('pagamento-anexos')
          .upload(path, file);
        if (uploadError) {
          toast({ title: `Erro ao enviar ${file.name}`, description: uploadError.message, variant: 'destructive' });
          continue;
        }
        await (supabase as any).from('pagamento_anexos').insert({
          pagamento_id: pagamentoId,
          nome: file.name,
          storage_path: path,
          tipo,
        });
      }
      toast({ title: 'Arquivo(s) anexado(s) com sucesso!' });
      fetchPagamentos();
    } catch {
      toast({ title: 'Erro ao anexar arquivo', variant: 'destructive' });
    }
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

  // --- Item handlers ---
  const updateItem = (tempId: string, field: keyof ItemCompra, value: string) => {
    setItensCompra(prev => prev.map(i => i.tempId === tempId ? { ...i, [field]: value } : i));
  };

  const addItem = () => {
    setItensCompra(prev => [...prev, makeEmptyItem()]);
  };

  const removeItem = (tempId: string) => {
    setItensCompra(prev => prev.length <= 1 ? prev : prev.filter(i => i.tempId !== tempId));
  };


  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Pagamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão de pagamentos vinculados às etapas da obra</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={obra.id} onValueChange={setObraId}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Novo Pagamento
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <DollarSign className="h-5 w-5 text-primary/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Previsto (mês)</p>
            <p className="text-sm sm:text-lg font-bold">{formatCurrency(totalPrevistoMes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Vencido</p>
            <p className={cn("text-sm sm:text-lg font-bold", totalVencido > 0 && "text-destructive")}>
              {formatCurrency(totalVencido)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pago</p>
            <p className="text-sm sm:text-lg font-bold">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <Clock className="h-5 w-5 text-warning/30 mx-auto mb-1" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Próx. 7 dias</p>
            <p className="text-sm sm:text-lg font-bold">{formatCurrency(totalProx7)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(hasActiveFilters && "border-primary text-primary")}
        >
          <Filter className="h-4 w-4 mr-1" />Filtros
          <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", filtersOpen && "rotate-180")} />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('_all'); setFilterTipo('_all'); setFilterPeriodo('_all'); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos status</SelectItem>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos tipos</SelectItem>
              {Object.entries(tipoLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              <SelectItem value="7dias">Próximos 7 dias</SelectItem>
              <SelectItem value="30dias">Próximos 30 dias</SelectItem>
              <SelectItem value="atrasados">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : filteredPagamentos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'Nenhum pagamento encontrado com esses filtros.' : 'Nenhum pagamento registrado para esta obra.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Descrição</th>
                  <th className="text-left p-2">Etapa</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Valor</th>
                  <th className="text-center p-2">Vencimento</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Forma</th>
                  <th className="text-right p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagamentos.map(p => {
                  const pAnexos = anexos.get(p.id) || [];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-medium">{p.descricao}</div>
                        {p.fornecedor && <div className="text-xs text-muted-foreground">{p.fornecedor}</div>}
                        {p.numero_parcela && p.total_parcelas && (
                          <div className="text-xs text-muted-foreground">Parcela {p.numero_parcela}/{p.total_parcelas}</div>
                        )}
                        {pAnexos.length > 0 && (
                          <button onClick={() => setViewAnexosId(p.id)} className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline">
                            <Paperclip className="h-3 w-3" />{pAnexos.length} anexo(s)
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{p.etapa_orcamento || '—'}</td>
                      <td className="p-2">{tipoLabels[p.tipo_pagamento] || p.tipo_pagamento}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(Number(p.valor_previsto))}</td>
                      <td className="p-2 text-center">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</td>
                      <td className="p-2 text-center">
                        <Badge className={cn('text-xs', statusColors[p.status])}>{statusLabels[p.status]}</Badge>
                      </td>
                      <td className="p-2 text-center text-xs">{formaLabels[p.forma_pagamento] || p.forma_pagamento}</td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => { setViewAnexosId(p.id); }}>
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          )}
                          {p.status !== 'pago' && p.status !== 'cancelado' && canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarcarPago(p.id)}>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filteredPagamentos.map(p => {
              const pAnexos = anexos.get(p.id) || [];
              return (
                <Card key={p.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.descricao}</p>
                        {p.fornecedor && <p className="text-xs text-muted-foreground">{p.fornecedor}</p>}
                        {p.etapa_orcamento && <p className="text-xs text-primary">{p.etapa_orcamento}</p>}
                      </div>
                      <Badge className={cn('text-xs', statusColors[p.status])}>{statusLabels[p.status]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">{formatCurrency(Number(p.valor_previsto))}</span>
                      <span className="text-muted-foreground">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{tipoLabels[p.tipo_pagamento]}</span>
                      <span>{formaLabels[p.forma_pagamento]}</span>
                    </div>
                    {pAnexos.length > 0 && (
                      <button onClick={() => setViewAnexosId(p.id)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                        <Paperclip className="h-3 w-3" />{pAnexos.length} anexo(s)
                      </button>
                    )}
                    {canEdit && (
                      <div className="flex gap-1 pt-1">
                        {p.status !== 'pago' && p.status !== 'cancelado' && (
                          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleMarcarPago(p.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Pago
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setViewAnexosId(p.id)}>
                          <Paperclip className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setDeleteId(p.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
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

            {/* Etapa da Obra */}
            <div>
              <label className="text-sm font-medium">Etapa da Obra</label>
              {!showNewEtapa ? (
                <div className="flex gap-2">
                  <Select value={form.etapa_orcamento} onValueChange={v => setForm({ ...form, etapa_orcamento: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Vincular a uma etapa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem etapa</SelectItem>
                      {categorias.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.codigo} — {c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowNewEtapa(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newEtapaNome}
                    onChange={e => setNewEtapaNome(e.target.value)}
                    placeholder="Nome da nova etapa"
                    className="flex-1"
                  />
                   <Button size="sm" onClick={handleCreateEtapa} disabled={!newEtapaNome.trim() || creatingEtapa}>
                     {creatingEtapa ? 'Criando...' : 'Criar'}
                   </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowNewEtapa(false); setNewEtapaNome(''); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Ao marcar como pago, o valor será registrado no Custo Real desta etapa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={isCompraMaterial ? 'material' : form.tipo_pagamento} onValueChange={v => {
                  if (v === 'material') {
                    setIsCompraMaterial(true);
                  } else {
                    setIsCompraMaterial(false);
                  }
                  setForm({ ...form, tipo_pagamento: v });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Forma</label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(formaLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggle for material purchase - show when type is material */}
            {form.tipo_pagamento === 'material' && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <Switch
                  id="compra-material"
                  checked={isCompraMaterial}
                  onCheckedChange={setIsCompraMaterial}
                />
                <Label htmlFor="compra-material" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Package className="h-4 w-4 text-primary" />
                  Gerar entrada no estoque
                </Label>
              </div>
            )}

            {/* Material items section */}
            {isCompraMaterial && (
              <div className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-primary" />
                    Itens da Compra
                  </p>
                  <Button variant="outline" size="sm" type="button" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Item
                  </Button>
                </div>

                {itensCompra.map((item, idx) => (
                  <div key={item.tempId} className="space-y-2 p-2.5 bg-muted/50 rounded-md relative">
                    {itensCompra.length > 1 && (
                      <button
                        type="button"
                        className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-destructive/10"
                        onClick={() => removeItem(item.tempId)}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Material *</label>
                        <Input
                          value={item.nome_material}
                          onChange={e => updateItem(item.tempId, 'nome_material', e.target.value)}
                          placeholder="Nome do material"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-muted-foreground">Unidade</label>
                        <Select value={item.unidade} onValueChange={v => updateItem(item.tempId, 'unidade', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <label className="text-xs text-muted-foreground">Qtd</label>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={e => updateItem(item.tempId, 'quantidade', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-xs text-muted-foreground">Preço Unit.</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={e => updateItem(item.tempId, 'preco_unitario', e.target.value)}
                          className="h-8 text-sm"
                        />
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
                          <SelectContent>
                            {categoriasEstoque.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
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
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_previsto}
                  onChange={e => setForm({ ...form, valor_previsto: e.target.value })}
                  className={cn(isCompraMaterial && totalItens > 0 && "bg-muted")}
                  readOnly={isCompraMaterial && totalItens > 0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Vencimento *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.data_vencimento && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.data_vencimento ? format(form.data_vencimento, 'dd/MM/yyyy') : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.data_vencimento || undefined} onSelect={d => setForm({ ...form, data_vencimento: d || null })} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Fornecedor</label>
              <Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
              {isCompraMaterial && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  💡 Se o fornecedor estiver cadastrado, o preço será registrado automaticamente no banco de preços.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Nº Parcela</label>
                <Input type="number" value={form.numero_parcela} onChange={e => setForm({ ...form, numero_parcela: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Total Parcelas</label>
                <Input type="number" value={form.total_parcelas} onChange={e => setForm({ ...form, total_parcelas: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>

            {/* Attachment hint for new / upload for existing */}
            {editingId ? (
              <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> Documentos e Fotos</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(anexoTipoLabels).map(([tipo, label]) => (
                    <Button
                      key={tipo}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={uploading}
                      onClick={() => {
                        const input = fileInputRef.current;
                        if (input) {
                          input.setAttribute('data-tipo', tipo);
                          input.setAttribute('data-pagamento-id', editingId);
                          input.click();
                        }
                      }}
                    >
                      {tipo === 'foto' ? <Image className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                      {label}
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
              <p className="text-xs text-muted-foreground italic">💡 Após salvar, você poderá anexar boletos, contratos, recibos e fotos.</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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

      {/* Anexos Dialog */}
      <Dialog open={!!viewAnexosId} onOpenChange={() => setViewAnexosId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Documentos e Fotos
            </DialogTitle>
          </DialogHeader>
          {viewAnexosId && (
            <div className="space-y-4">
              {/* Upload area */}
              {canEdit && (
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center space-y-2">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Anexar boleto, contrato, recibo ou foto</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(anexoTipoLabels).map(([tipo, label]) => (
                      <Button
                        key={tipo}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={uploading}
                        onClick={() => {
                          const input = fileInputRef.current;
                          if (input) {
                            input.setAttribute('data-tipo', tipo);
                            input.click();
                          }
                        }}
                      >
                        {tipo === 'foto' ? <Image className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                        {label}
                      </Button>
                    ))}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
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

              {/* Existing anexos */}
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
                      <a
                        href={getAnexoUrl(a.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        Ver
                      </a>
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pagamento?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
