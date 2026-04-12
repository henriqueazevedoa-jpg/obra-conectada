import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, addDays, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Plus, DollarSign, AlertTriangle, CheckCircle2, Clock, Pencil, Trash2, CalendarIcon, Filter, ChevronDown,
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
  created_at: string;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function PagamentosPage() {
  const { user, hasPermission } = useAuth();
  const { obras } = useObras();
  const { selectedObraId: obraId, setSelectedObraId: setObraId } = useObraSelection();
  const obra = obras.find(o => o.id === obraId) || obras[0];

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  });

  const resetForm = () => {
    setForm({
      descricao: '', tipo_pagamento: 'outro', valor_previsto: '',
      data_vencimento: null, forma_pagamento: 'outro', fornecedor: '',
      numero_parcela: '', total_parcelas: '', observacoes: '',
    });
    setEditingId(null);
  };

  const fetchPagamentos = useCallback(async () => {
    if (!obra) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('obra_id', obra.id)
      .order('data_vencimento', { ascending: true });

    if (!error && data) {
      setPagamentos(data as Pagamento[]);
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
      // Update locally for display, and in DB
      overdue.forEach(async (p) => {
        await supabase.from('pagamentos').update({ status: 'atrasado' as any }).eq('id', p.id);
      });
      setPagamentos(prev => prev.map(p =>
        overdue.find(o => o.id === p.id) ? { ...p, status: 'atrasado' } : p
      ));
    }
  }, [pagamentos.length]);

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

  const handleSubmit = async () => {
    if (!form.descricao || !form.data_vencimento || !form.valor_previsto) return;

    const payload = {
      obra_id: obra.id,
      descricao: form.descricao,
      tipo_pagamento: form.tipo_pagamento,
      valor_previsto: parseFloat(form.valor_previsto) || 0,
      data_vencimento: format(form.data_vencimento, 'yyyy-MM-dd'),
      forma_pagamento: form.forma_pagamento,
      fornecedor: form.fornecedor || null,
      numero_parcela: form.numero_parcela ? parseInt(form.numero_parcela) : null,
      total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
      observacoes: form.observacoes || null,
    };

    if (editingId) {
      const { error } = await supabase.from('pagamentos').update(payload as any).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Pagamento atualizado!' });
    } else {
      const { error } = await supabase.from('pagamentos').insert(payload as any);
      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Pagamento registrado!' });
    }

    setDialogOpen(false);
    resetForm();
    fetchPagamentos();
  };

  const handleMarcarPago = async (id: string) => {
    const { error } = await supabase.from('pagamentos').update({ status: 'pago' as any }).eq('id', id);
    if (!error) {
      setPagamentos(prev => prev.map(p => p.id === id ? { ...p, status: 'pago' } : p));
      toast({ title: 'Pagamento marcado como pago!' });
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
    });
    setDialogOpen(true);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'gestor';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">Gestão de pagamentos e compromissos financeiros</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={obra.id} onValueChange={setObraId}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Pagamento
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
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Valor</th>
                  <th className="text-center p-2">Vencimento</th>
                  <th className="text-center p-2">Status</th>
                  <th className="text-center p-2">Forma</th>
                  <th className="text-right p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPagamentos.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-2">
                      <div className="font-medium">{p.descricao}</div>
                      {p.fornecedor && <div className="text-xs text-muted-foreground">{p.fornecedor}</div>}
                      {p.numero_parcela && p.total_parcelas && (
                        <div className="text-xs text-muted-foreground">Parcela {p.numero_parcela}/{p.total_parcelas}</div>
                      )}
                    </td>
                    <td className="p-2">{tipoLabels[p.tipo_pagamento] || p.tipo_pagamento}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(Number(p.valor_previsto))}</td>
                    <td className="p-2 text-center">{format(parseISO(p.data_vencimento), 'dd/MM/yyyy')}</td>
                    <td className="p-2 text-center">
                      <Badge className={cn('text-xs', statusColors[p.status])}>{statusLabels[p.status]}</Badge>
                    </td>
                    <td className="p-2 text-center text-xs">{formaLabels[p.forma_pagamento] || p.forma_pagamento}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filteredPagamentos.map(p => (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.descricao}</p>
                      {p.fornecedor && <p className="text-xs text-muted-foreground">{p.fornecedor}</p>}
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
                  {canEdit && (
                    <div className="flex gap-1 pt-1">
                      {p.status !== 'pago' && p.status !== 'cancelado' && (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleMarcarPago(p.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Pago
                        </Button>
                      )}
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
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Pagamento' : 'Novo Pagamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Descrição *</label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={form.tipo_pagamento} onValueChange={v => setForm({ ...form, tipo_pagamento: v })}>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input type="number" step="0.01" value={form.valor_previsto} onChange={e => setForm({ ...form, valor_previsto: e.target.value })} />
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

            <Button onClick={handleSubmit} className="w-full" disabled={!form.descricao || !form.data_vencimento || !form.valor_previsto}>
              {editingId ? 'Salvar Alterações' : 'Registrar Pagamento'}
            </Button>
          </div>
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
