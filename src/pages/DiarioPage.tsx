import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento, OrcamentoCategoria, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { useObras } from '@/contexts/ObrasContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { formatDate, statusDiarioLabels, climaLabels, DiarioRegistro, DiarioServico, DiarioMaterialUsado } from '@/data/mockData';
import { Plus, Users, CheckCircle2, Clock, XCircle, Trash2, Link2, Package, Pencil, CalendarIcon, Filter, ChevronDown, Printer, Square, CheckSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import VoiceInputButton from '@/components/voice/VoiceInputButton';

const statusIcons: Record<string, React.ReactNode> = {
  pendente: <Clock className="h-4 w-4 text-warning" />,
  aprovado: <CheckCircle2 className="h-4 w-4 text-success" />,
  rejeitado: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function DiarioPage() {
  const { user, hasPermission } = useAuth();
  const { obras } = useObras();
  const { orcamentos, getOrcamento, saveOrcamento } = useOrcamento();
  const { getMateriaisByObra, registrarMovimentacao } = useEstoque();
  const { selectedObraId: obraId, setSelectedObraId: setObraId } = useObraSelection();
  const obra = obras.find(o => o.id === obraId) || obras[0];
  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [dataRegistro, setDataRegistro] = useState<Date>(new Date());
  const [clima, setClima] = useState<DiarioRegistro['clima']>('sol');
  const [trabalhadores, setTrabalhadores] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [problemas, setProblemas] = useState('');
  const [servicos, setServicos] = useState<DiarioServico[]>([]);
  const [materiaisUsados, setMateriaisUsados] = useState<DiarioMaterialUsado[]>([]);

  const orcamento = obra ? getOrcamento(obra.id) : null;
  const categorias = orcamento?.categorias || [];
  const materiaisObra = obra ? getMateriaisByObra(obra.id) : [];

  // Fetch registros from Supabase
  const fetchRegistros = useCallback(async () => {
    if (!obra) return;
    setLoading(true);

    const { data: regs, error } = await supabase
      .from('diario_registros')
      .select('*')
      .eq('obra_id', obra.id)
      .order('data', { ascending: false });

    if (error || !regs) {
      setLoading(false);
      return;
    }

    // Fetch servicos and materiais for all registros
    const regIds = regs.map(r => r.id);
    const [{ data: svcs }, { data: mats }] = await Promise.all([
      supabase.from('diario_servicos').select('*').in('registro_id', regIds.length > 0 ? regIds : ['_none']),
      supabase.from('diario_materiais').select('*').in('registro_id', regIds.length > 0 ? regIds : ['_none']),
    ]);

    const mapped: DiarioRegistro[] = regs.map(r => ({
      id: r.id,
      obraId: r.obra_id,
      data: r.data,
      usuario: r.usuario_nome,
      usuarioId: r.user_id,
      clima: r.clima as DiarioRegistro['clima'],
      trabalhadores: r.trabalhadores,
      servicosExecutados: r.servicos_executados || '',
      servicos: (svcs || []).filter(s => s.registro_id === r.id).map(s => ({
        id: s.id,
        descricao: s.descricao,
        categoriaId: s.categoria_id || undefined,
        composicaoId: s.composicao_id || undefined,
        percentualAdicionado: s.percentual_adicionado ? Number(s.percentual_adicionado) : undefined,
      })),
      materiaisUtilizados: (mats || []).filter(m => m.registro_id === r.id).map(m => ({
        id: m.id,
        materialId: m.material_id || '',
        materialNome: m.material_nome,
        unidade: m.unidade || '',
        quantidade: Number(m.quantidade),
      })),
      observacoes: r.observacoes || '',
      problemas: r.problemas || '',
      fotos: r.fotos || [],
      status: r.status as DiarioRegistro['status'],
    }));

    setRegistros(mapped);
    setLoading(false);
  }, [obra?.id]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  // Filters
  const [filterEtapa, setFilterEtapa] = useState('_all');
  const [filterMaterial, setFilterMaterial] = useState('_all');
  const [filterStatus, setFilterStatus] = useState('_all');
  const [filterProblemas, setFilterProblemas] = useState('_all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasActiveFilters = filterEtapa !== '_all' || filterMaterial !== '_all' || filterStatus !== '_all' || filterProblemas !== '_all';

  const obraRegistros = registros;
  const visibleRegistros = user?.role === 'cliente'
    ? obraRegistros.filter(r => r.status === 'aprovado')
    : obraRegistros;

  const filteredRegistros = visibleRegistros.filter(r => {
    if (filterStatus !== '_all' && r.status !== filterStatus) return false;
    if (filterProblemas === 'com' && !r.problemas) return false;
    if (filterProblemas === 'sem' && r.problemas) return false;
    if (filterEtapa !== '_all') {
      const hasEtapa = r.servicos?.some(s => s.categoriaId === filterEtapa || s.composicaoId === filterEtapa);
      if (!hasEtapa) return false;
    }
    if (filterMaterial !== '_all') {
      const targetMat = materiaisObra.find(m => m.id === filterMaterial);
      const hasMat = r.materiaisUtilizados?.some(m => 
        m.materialId === filterMaterial || 
        (targetMat && m.materialNome === targetMat.nome)
      );
      if (!hasMat) return false;
    }
    return true;
  });

  const sortedRegistros = [...filteredRegistros].sort((a, b) => b.data.localeCompare(a.data));

  // --- Helpers for etapa progress ---
  const getAccumulatedPercent = (categoriaId: string, composicaoId?: string): number => {
    const cat = categorias.find(c => c.id === categoriaId);
    if (!cat) return 0;

    let baseline = 0;
    if (composicaoId) {
      const comp = cat.composicoes.find(c => c.id === composicaoId);
      if (comp?.concluida) return 100;
    } else {
      baseline = cat.percentualCronograma || 0;
    }

    let fromDiario = 0;
    for (const reg of registros) {
      for (const svc of reg.servicos) {
        if (composicaoId) {
          if (svc.composicaoId === composicaoId) fromDiario += (svc.percentualAdicionado || 0);
        } else {
          if (svc.categoriaId === categoriaId && !svc.composicaoId) fromDiario += (svc.percentualAdicionado || 0);
        }
      }
    }
    return Math.min(100, baseline + fromDiario);
  };

  // --- Servico handlers ---
  const addServico = () => {
    setServicos([...servicos, { id: `svc-${Date.now()}-${servicos.length}`, descricao: '' }]);
  };

  const updateServico = (idx: number, updates: Partial<DiarioServico>) => {
    setServicos(servicos.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const removeServico = (idx: number) => {
    setServicos(servicos.filter((_, i) => i !== idx));
  };

  // --- Material handlers ---
  const addMaterial = () => {
    setMateriaisUsados([...materiaisUsados, { id: `mat-${Date.now()}`, materialId: '', materialNome: '', unidade: '', quantidade: 0 }]);
  };

  const updateMaterial = (idx: number, materialId: string) => {
    const mat = materiaisObra.find(m => m.id === materialId);
    if (!mat) return;
    setMateriaisUsados(materiaisUsados.map((m, i) => i === idx ? { ...m, materialId: mat.id, materialNome: mat.nome, unidade: mat.unidade, quantidade: 0 } : m));
  };

  const updateMaterialQty = (idx: number, qty: number) => {
    setMateriaisUsados(materiaisUsados.map((m, i) => i === idx ? { ...m, quantidade: qty } : m));
  };

  const removeMaterial = (idx: number) => {
    setMateriaisUsados(materiaisUsados.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setDataRegistro(new Date());
    setClima('sol');
    setTrabalhadores('');
    setObservacoes('');
    setProblemas('');
    setServicos([]);
    setMateriaisUsados([]);
    setEditingId(null);
  };

  const loadRegistroForEdit = (registro: DiarioRegistro) => {
    setEditingId(registro.id);
    setDataRegistro(parseISO(registro.data));
    setClima(registro.clima);
    setTrabalhadores(String(registro.trabalhadores));
    setObservacoes(registro.observacoes);
    setProblemas(registro.problemas);
    setServicos(registro.servicos?.length ? [...registro.servicos] : [{ id: `svc-${Date.now()}`, descricao: registro.servicosExecutados }]);
    setMateriaisUsados(registro.materiaisUtilizados ? [...registro.materiaisUtilizados] : []);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!obra || !user) return;
    const hoje = format(dataRegistro, 'yyyy-MM-dd');
    const descGeral = servicos.map(s => s.descricao).filter(Boolean).join('. ') || 'Sem serviços detalhados';
    const filteredServicos = servicos.filter(s => s.descricao.trim());
    const filteredMateriais = materiaisUsados.filter(m => m.materialId && m.quantidade > 0);

    if (editingId) {
      // UPDATE existing registro
      const { error } = await supabase.from('diario_registros').update({
        data: hoje,
        clima,
        trabalhadores: parseInt(trabalhadores) || 0,
        servicos_executados: descGeral,
        observacoes,
        problemas,
      }).eq('id', editingId);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        return;
      }

      // Delete old servicos and materiais, re-insert
      await supabase.from('diario_servicos').delete().eq('registro_id', editingId);
      await supabase.from('diario_materiais').delete().eq('registro_id', editingId);

      if (filteredServicos.length > 0) {
        await supabase.from('diario_servicos').insert(
          filteredServicos.map(s => ({
            registro_id: editingId,
            descricao: s.descricao,
            categoria_id: s.categoriaId || null,
            composicao_id: s.composicaoId || null,
            percentual_adicionado: s.percentualAdicionado || 0,
          }))
        );
      }

      if (filteredMateriais.length > 0) {
        await supabase.from('diario_materiais').insert(
          filteredMateriais.map(m => ({
            registro_id: editingId,
            material_id: m.materialId || null,
            material_nome: m.materialNome,
            unidade: m.unidade,
            quantidade: m.quantidade,
          }))
        );
      }

      toast({ title: 'Registro atualizado!' });
    } else {
      // CREATE new registro
      const { data: newReg, error } = await supabase.from('diario_registros').insert({
        obra_id: obra.id,
        user_id: user.id,
        data: hoje,
        clima,
        trabalhadores: parseInt(trabalhadores) || 0,
        servicos_executados: descGeral,
        observacoes,
        problemas,
        usuario_nome: user.name,
        status: 'pendente',
      }).select().single();

      if (error || !newReg) {
        toast({ title: 'Erro ao criar registro', description: error?.message, variant: 'destructive' });
        return;
      }

      if (filteredServicos.length > 0) {
        await supabase.from('diario_servicos').insert(
          filteredServicos.map(s => ({
            registro_id: newReg.id,
            descricao: s.descricao,
            categoria_id: s.categoriaId || null,
            composicao_id: s.composicaoId || null,
            percentual_adicionado: s.percentualAdicionado || 0,
          }))
        );
      }

      if (filteredMateriais.length > 0) {
        await supabase.from('diario_materiais').insert(
          filteredMateriais.map(m => ({
            registro_id: newReg.id,
            material_id: m.materialId || null,
            material_nome: m.materialNome,
            unidade: m.unidade,
            quantidade: m.quantidade,
          }))
        );
      }

      // Register stock movements for new materials
      for (const matUsado of filteredMateriais) {
        registrarMovimentacao({
          id: crypto.randomUUID(),
          obraId: obra.id,
          materialId: matUsado.materialId,
          materialNome: matUsado.materialNome,
          tipo: 'saida',
          data: hoje,
          quantidade: matUsado.quantidade,
          origemDestino: `Diário de Obra - ${hoje}`,
          responsavel: user.name,
          observacoes: 'Registro automático via Diário de Obra',
        });
      }

      // Update cronograma based on service links
      if (orcamento) {
        const updatedCategorias = [...orcamento.categorias.map(c => ({ ...c, composicoes: c.composicoes.map(comp => ({ ...comp })) }))];

        for (const svc of filteredServicos) {
          if (svc.categoriaId && svc.percentualAdicionado) {
            const catIdx = updatedCategorias.findIndex(c => c.id === svc.categoriaId);
            if (catIdx >= 0) {
              const cat = updatedCategorias[catIdx];

              if (svc.composicaoId) {
                const compIdx = cat.composicoes.findIndex(c => c.id === svc.composicaoId);
                if (compIdx >= 0) {
                  const comp = cat.composicoes[compIdx];
                  const accum = getAccumulatedPercent(svc.categoriaId, svc.composicaoId) + svc.percentualAdicionado;
                  if (!comp.dataInicioReal) comp.dataInicioReal = hoje;
                  if (accum >= 100) { comp.concluida = true; comp.dataFimReal = hoje; }
                }
              }

              if (!cat.dataInicioReal) { cat.dataInicioReal = hoje; cat.statusCronograma = 'em_andamento'; }
              const catPercent = cat.composicoes.length > 0
                ? cat.composicoes.reduce((sum, comp) => {
                    const compAccum = getAccumulatedPercent(cat.id, comp.id) +
                      (filteredServicos.find(s => s.composicaoId === comp.id)?.percentualAdicionado || 0);
                    const weight = comp.pesoCronograma || (100 / cat.composicoes.length);
                    return sum + (Math.min(100, compAccum) / 100) * weight;
                  }, 0)
                : (cat.percentualCronograma || 0) + (svc.composicaoId ? 0 : svc.percentualAdicionado);

              cat.percentualCronograma = Math.min(100, catPercent);
              if (cat.percentualCronograma >= 100) { cat.statusCronograma = 'concluida'; cat.dataFimReal = hoje; }
            }
          }
        }
        saveOrcamento({ ...orcamento, categorias: updatedCategorias });
      }

      toast({ title: 'Registro criado com sucesso!' });
    }

    setDialogOpen(false);
    resetForm();
    fetchRegistros();
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('diario_registros').update({ status: 'aprovado' }).eq('id', id);
    if (!error) {
      setRegistros(registros.map(r => r.id === id ? { ...r, status: 'aprovado' as const } : r));
      toast({ title: 'Registro aprovado!' });
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('diario_registros').update({ status: 'rejeitado' }).eq('id', id);
    if (!error) {
      setRegistros(registros.map(r => r.id === id ? { ...r, status: 'rejeitado' as const } : r));
      toast({ title: 'Registro rejeitado.' });
    }
  };

  const canCreate = hasPermission('diario:create');
  const canApprove = hasPermission('diario:approve');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedRegistros.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRegistros.map(r => r.id)));
    }
  };

  const printRegistros = (ids: string[]) => {
    const toPrint = registros.filter(r => ids.includes(r.id));
    if (toPrint.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Diário de Obra</title>
<style>
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; margin: 2cm; font-size: 12px; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 18px; margin: 0; }
  .header p { margin: 2px 0; color: #666; font-size: 11px; }
  .registro { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; break-inside: avoid; }
  .registro-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .registro-header h3 { font-size: 14px; margin: 0; }
  .badge { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
  .badge-aprovado { background: #dcfce7; color: #16a34a; }
  .badge-pendente { background: #fef3c7; color: #d97706; }
  .badge-rejeitado { background: #fecaca; color: #dc2626; }
  .meta { display: flex; gap: 16px; color: #666; font-size: 11px; margin-bottom: 8px; }
  .section { margin-top: 8px; }
  .section-title { font-size: 10px; text-transform: uppercase; color: #999; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
  .problemas { background: #fef2f2; border-radius: 6px; padding: 8px; margin-top: 8px; }
  .problemas p { color: #dc2626; margin: 0; }
  .material-badge { display: inline-block; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 11px; }
  .fotos-placeholder { border: 1px dashed #d1d5db; border-radius: 6px; padding: 12px; text-align: center; color: #9ca3af; margin-top: 8px; }
  @media print { body { margin: 1cm; } }
</style>
</head><body>
<div class="header">
  <h1>Diário de Obra</h1>
  <p>${obra.codigo} — ${obra.nome}</p>
  <p>Emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
</div>
${toPrint.map(r => {
  const climaLabel = climaLabels[r.clima] || r.clima;
  const statusLabel = statusDiarioLabels[r.status] || r.status;
  const statusClass = r.status === 'aprovado' ? 'badge-aprovado' : r.status === 'pendente' ? 'badge-pendente' : 'badge-rejeitado';
  return `<div class="registro">
    <div class="registro-header">
      <h3>${formatDate(r.data)} · ${climaLabel}</h3>
      <span class="badge ${statusClass}">${statusLabel}</span>
    </div>
    <div class="meta">
      <span>👤 ${r.usuario}</span>
      <span>👷 ${r.trabalhadores} trabalhadores</span>
    </div>
    ${r.servicos && r.servicos.length > 0 ? `<div class="section"><div class="section-title">Serviços Executados</div><ul>${r.servicos.map(s => `<li>${s.descricao}${s.percentualAdicionado ? ` (+${s.percentualAdicionado}%)` : ''}</li>`).join('')}</ul></div>` : r.servicosExecutados ? `<div class="section"><div class="section-title">Serviços Executados</div><p>${r.servicosExecutados}</p></div>` : ''}
    ${r.materiaisUtilizados && r.materiaisUtilizados.length > 0 ? `<div class="section"><div class="section-title">Materiais Utilizados</div>${r.materiaisUtilizados.map(m => `<span class="material-badge">${m.materialNome}: ${m.quantidade} ${m.unidade}</span>`).join('')}</div>` : ''}
    ${r.observacoes ? `<div class="section"><div class="section-title">Observações</div><p>${r.observacoes}</p></div>` : ''}
    ${r.problemas ? `<div class="problemas"><div class="section-title">⚠ Problemas Ocorridos</div><p>${r.problemas}</p></div>` : ''}
    ${r.fotos && r.fotos.length > 0 ? `<div class="fotos-placeholder">📷 ${r.fotos.length} foto(s) anexada(s)</div>` : ''}
  </div>`;
}).join('')}
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  if (!obra) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Nenhuma obra cadastrada.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Diário de Obra</h1>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger className="w-full sm:w-[280px] h-8 text-xs sm:text-sm mt-1">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <div className="flex gap-1.5 shrink-0">
            <VoiceInputButton
              module="diario"
              obraId={obra?.id}
              onResult={(parsed) => {
                if (parsed.clima) setClima(parsed.clima);
                if (parsed.trabalhadores) setTrabalhadores(String(parsed.trabalhadores));
                if (parsed.observacoes) setObservacoes(parsed.observacoes);
                if (parsed.problemas) setProblemas(parsed.problemas);
                if (parsed.servicos) {
                  setServicos((parsed.servicos as string[]).map((s, i) => ({ id: `svc-v-${i}`, descricao: typeof s === 'string' ? s : (s as any).descricao || '' })));
                }
                setDialogOpen(true);
                toast({ title: 'Dados de voz aplicados. Revise antes de salvar.' });
              }}
            />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0 h-9 sm:h-10">
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Novo Registro</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">{editingId ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Basic info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-foreground">Data</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !dataRegistro && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dataRegistro, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dataRegistro} onSelect={(d) => d && setDataRegistro(d)} disabled={(date) => date > new Date()} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 sm:contents gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-foreground">Clima</label>
                      <Select value={clima} onValueChange={v => setClima(v as DiarioRegistro['clima'])}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sol">☀️ Sol</SelectItem>
                          <SelectItem value="nublado">⛅ Nublado</SelectItem>
                          <SelectItem value="chuva">🌧️ Chuva</SelectItem>
                          <SelectItem value="chuvoso_forte">⛈️ Forte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-foreground">Trabalhadores</label>
                      <Input type="number" placeholder="0" className="h-10" value={trabalhadores} onChange={e => setTrabalhadores(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Serviços */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Serviços Executados</label>
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={addServico}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {servicos.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum serviço adicionado.</p>}
                  {servicos.map((svc, idx) => {
                    const linkedCat = svc.categoriaId ? categorias.find(c => c.id === svc.categoriaId) : null;
                    const accum = svc.categoriaId ? getAccumulatedPercent(svc.categoriaId, svc.composicaoId) : 0;
                    return (
                      <div key={svc.id} className="border border-border rounded-lg p-3 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <Input placeholder="Descrição do serviço..." value={svc.descricao} onChange={e => updateServico(idx, { descricao: e.target.value })} className="h-10" />
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => removeServico(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Link2 className="h-3.5 w-3.5" /><span>Vincular a etapa (opcional)</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Select value={svc.categoriaId || '_none'} onValueChange={v => updateServico(idx, { categoriaId: v === '_none' ? undefined : v, composicaoId: undefined, percentualAdicionado: undefined })}>
                              <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Categoria..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">Sem vínculo</SelectItem>
                                {categorias.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>))}
                              </SelectContent>
                            </Select>
                            {svc.categoriaId && linkedCat && linkedCat.composicoes.length > 0 && (
                              <Select value={svc.composicaoId || '_cat_only'} onValueChange={v => updateServico(idx, { composicaoId: v === '_cat_only' ? undefined : v })}>
                                <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Composição..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_cat_only">Categoria geral</SelectItem>
                                  {linkedCat.composicoes.map(comp => (<SelectItem key={comp.id} value={comp.id}>{comp.descricao}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          {svc.categoriaId && (
                            <div className="bg-muted/50 rounded-md p-2 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progresso acumulado</span>
                                <span className="font-semibold text-foreground">{accum.toFixed(1)}%</span>
                              </div>
                              <Progress value={accum} className="h-2" />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">% a adicionar:</label>
                                <Input type="number" min={0} max={100 - accum} step={0.5} className="h-9 text-xs w-20" placeholder="0" value={svc.percentualAdicionado || ''} onChange={e => updateServico(idx, { percentualAdicionado: parseFloat(e.target.value) || 0 })} />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Materiais */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Package className="h-4 w-4" /> Materiais</label>
                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={addMaterial}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
                  </div>
                  {materiaisUsados.length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum material adicionado. (Opcional)</p>}
                  {materiaisUsados.map((matU, idx) => {
                    const matInfo = materiaisObra.find(m => m.id === matU.materialId);
                    return (
                      <div key={matU.id} className="border border-border rounded-lg p-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Select value={matU.materialId || '_none'} onValueChange={v => v !== '_none' && updateMaterial(idx, v)}>
                              <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Selecionar material..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none">Selecionar...</SelectItem>
                                {materiaisObra.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome} ({m.estoqueAtual} {m.unidade})</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeMaterial(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                        <div className="flex items-center gap-2 pl-1">
                          <label className="text-xs text-muted-foreground">Qtd:</label>
                          <Input type="number" min={0} max={matInfo?.estoqueAtual} className="h-9 text-xs w-24" placeholder="0" value={matU.quantidade || ''} onChange={e => updateMaterialQty(idx, parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">{matU.unidade}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Obs + Problems */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Observações</label>
                  <Textarea placeholder="Observações gerais..." rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Problemas Ocorridos</label>
                  <Textarea placeholder="Relate problemas, se houver..." rows={2} value={problemas} onChange={e => setProblemas(e.target.value)} />
                </div>

                <div className="border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">📷 Área para anexar fotos</p>
                  <p className="text-xs text-muted-foreground">(Upload será habilitado em breve)</p>
                </div>

                <Button onClick={handleSubmit} className="w-full h-11 text-sm" disabled={servicos.filter(s => s.descricao.trim()).length === 0}>
                  {editingId ? 'Salvar Alterações' : 'Salvar Registro'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <div>
        <Button variant="outline" size="sm" className="w-full sm:hidden h-9 justify-between" onClick={() => setFiltersOpen(!filtersOpen)}>
          <span className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" /> Filtros
            {hasActiveFilters && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Ativo</Badge>}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
        </Button>
        <Card className={cn("shadow-card mt-2 sm:mt-0", !filtersOpen && "hidden sm:block")}>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Filtros:</span>
              <Select value={filterEtapa} onValueChange={setFilterEtapa}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Etapa..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas etapas</SelectItem>
                  {categorias.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Material..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos materiais</SelectItem>
                  {materiaisObra.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos status</SelectItem>
                  <SelectItem value="aprovado">✅ Aprovado</SelectItem>
                  <SelectItem value="pendente">⏳ Pendente</SelectItem>
                  <SelectItem value="rejeitado">❌ Reprovado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProblemas} onValueChange={setFilterProblemas}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Problemas..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  <SelectItem value="com">Com problemas</SelectItem>
                  <SelectItem value="sem">Sem problemas</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-xs col-span-2 sm:col-span-1" onClick={() => { setFilterEtapa('_all'); setFilterMaterial('_all'); setFilterStatus('_all'); setFilterProblemas('_all'); }}>
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection & Print actions */}
      {sortedRegistros.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={toggleSelectAll}>
              {selectedIds.size === sortedRegistros.length ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : 'Selecionar'}
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => printRegistros(Array.from(selectedIds))}>
                <Printer className="h-3.5 w-3.5" /> Imprimir Selecionados
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando registros...</div>
      ) : sortedRegistros.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {hasActiveFilters ? 'Nenhum registro encontrado com os filtros aplicados.' : 'Nenhum registro de diário para esta obra.'}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRegistros.map(registro => (
            <Card key={registro.id} className={cn("shadow-card", selectedIds.has(registro.id) && "ring-2 ring-primary/30")}>
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(registro.id)}
                      onCheckedChange={() => toggleSelect(registro.id)}
                      className="mt-0.5 shrink-0"
                    />
                    {statusIcons[registro.status]}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{formatDate(registro.data)}</p>
                        <span className="text-sm">{climaLabels[registro.clima]}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">por {registro.usuario}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn(
                    "text-[10px] px-1.5 shrink-0",
                    registro.status === 'aprovado' ? 'bg-success/10 text-success border-0' :
                    registro.status === 'rejeitado' ? 'bg-destructive/10 text-destructive border-0' :
                    'bg-warning/10 text-warning border-0'
                  )}>
                    {statusDiarioLabels[registro.status]}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mr-auto">
                    <Users className="h-3 w-3" /> {registro.trabalhadores}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => printRegistros([registro.id])}>
                    <Printer className="h-3 w-3 mr-1" /> Imprimir
                  </Button>
                  {(user?.role === 'gestor' || (canCreate && registro.status !== 'aprovado')) && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => loadRegistroForEdit(registro)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  )}
                  {canApprove && registro.status === 'pendente' && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleApprove(registro.id)}>Aprovar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive" onClick={() => handleReject(registro.id)}>Rejeitar</Button>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {registro.servicos && registro.servicos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Serviços</p>
                      <div className="space-y-1">
                        {registro.servicos.map(svc => {
                          const linkedCat = svc.categoriaId ? categorias.find(c => c.id === svc.categoriaId) : null;
                          const linkedComp = svc.composicaoId && linkedCat ? linkedCat.composicoes.find(c => c.id === svc.composicaoId) : null;
                          return (
                            <div key={svc.id} className="flex flex-wrap items-center gap-1 text-sm">
                              <span className="text-foreground">• {svc.descricao}</span>
                              {linkedCat && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {linkedComp ? linkedComp.descricao : linkedCat.nome}
                                  {svc.percentualAdicionado ? ` +${svc.percentualAdicionado}%` : ''}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(!registro.servicos || registro.servicos.length === 0) && registro.servicosExecutados && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Serviços</p>
                      <p className="text-sm text-foreground">{registro.servicosExecutados}</p>
                    </div>
                  )}
                  {registro.materiaisUtilizados && registro.materiaisUtilizados.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Package className="h-3 w-3" /> Materiais
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {registro.materiaisUtilizados.map(mat => (
                          <Badge key={mat.id} variant="secondary" className="text-[10px]">
                            {mat.materialNome}: {mat.quantidade} {mat.unidade}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {registro.observacoes && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{registro.observacoes}</p>
                    </div>
                  )}
                  {registro.problemas && (
                    <div className="bg-destructive/5 rounded-md p-2">
                      <p className="text-[10px] font-medium text-destructive uppercase tracking-wider mb-1">⚠ Problemas</p>
                      <p className="text-xs sm:text-sm text-destructive">{registro.problemas}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
