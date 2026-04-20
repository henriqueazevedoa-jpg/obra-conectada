import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Package, AlertTriangle, CheckCircle2, Plus, Trash2,
  TrendingDown, TrendingUp, Minus, ExternalLink, Download, FileSpreadsheet,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';
import { exportarPlanilhaCotacao } from '@/lib/planilha/exportCotacao';
import ImportarCotacaoDialog from '@/components/insumos/ImportarCotacaoDialog';
import { useSuprimentos } from '@/contexts/SuprimentosContext';
import { Layers, FileText, CheckCircle, BarChart3 } from 'lucide-react';
import MatrizDecisao from '@/components/suprimentos/MatrizDecisao';
import { CotacaoLote } from '@/types/suprimentos';

interface PrecoFornecedor {
  id: string; fornecedor_id: string; obra_id: string | null;
  descricao_item_snapshot: string | null; preco_unitario: number;
  unidade: string | null; data_referencia: string; origem_preco: string;
  categoria: string | null; created_at: string;
}

interface Fornecedor {
  id: string; nome: string; obra_id: string;
}

interface InsumoPendente {
  id: string; obra_id: string; insumo_id: string | null;
  material_id: string | null; nome_insumo: string;
  unidade: string | null; categoria: string | null;
  status: string; observacoes: string | null;
  created_at: string; updated_at: string;
}

interface CotacaoEntry {
  fornecedorId: string;
  preco: number;
  data: string;
}

const statusLabels: Record<string, string> = {
  pendente: 'Sem Cotação', em_cotacao: 'Em Cotação', resolvido: 'Cotado', ignorado: 'Ignorado',
};
const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  em_cotacao: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  resolvido: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ignorado: 'bg-muted text-muted-foreground',
};

const categoriaLabels: Record<string, string> = {
  material: 'Material', mao_de_obra: 'Mão de Obra',
  equipamento: 'Equipamento', servico: 'Serviço', outro: 'Outro',
};

export default function InsumosPage() {
  const { obras } = useObras();
  const { lotes, fetchLotes, criarLote, excluirLote } = useSuprimentos();
  const [precos, setPrecos] = useState<PrecoFornecedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pendentes, setPendentes] = useState<InsumoPendente[]>([]);
  const [selectedPendentes, setSelectedPendentes] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loteTitle, setLoteTitle] = useState('');
  const [activeLote, setActiveLote] = useState<CotacaoLote | null>(null);
  const [searchParams] = useSearchParams();

  // Filters - banco de preços
  const [filterObra, setFilterObra] = usePersistentPageState<string>('insumos:filterObra', 'todos');
  const [filterCategoria, setFilterCategoria] = usePersistentPageState<string>('insumos:filterCategoria', 'todos');
  const [filterFornecedor, setFilterFornecedor] = usePersistentPageState<string>('insumos:filterFornecedor', searchParams.get('fornecedor') || 'todos');
  const [filterItem, setFilterItem] = usePersistentPageState<string>('insumos:filterItem', '');

  // Filters - sem cotação
  const [filterObraPend, setFilterObraPend] = usePersistentPageState<string>('insumos:filterObraPend', 'todos');
  const [filterCategoriaPend, setFilterCategoriaPend] = usePersistentPageState<string>('insumos:filterCategoriaPend', 'todos');
  const [filterStatusPend, setFilterStatusPend] = usePersistentPageState<string>('insumos:filterStatusPend', 'todos');

  // Cotação sheet
  const [cotacaoInsumo, setCotacaoInsumo] = useState<InsumoPendente | null>(null);
  const [cotacaoEntries, setCotacaoEntries] = useState<CotacaoEntry[]>([{ fornecedorId: '', preco: 0, data: new Date().toISOString().slice(0, 10) }]);
  const [savingCotacao, setSavingCotacao] = useState(false);

  // Fase 4 — Import de planilha
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (obras.length === 0) { setPrecos([]); setFornecedores([]); setPendentes([]); setLoading(false); return; }
    setLoading(true);
    const obraIds = obras.map(o => o.id);
    
    // Fetch lotes as well
    if (obraIds.length > 0) {
      await fetchLotes(obraIds[0]); // Pega para a primeira obra ou selecionada
    }

    const [pRes, fRes, pendRes] = await Promise.all([
      supabase.from('precos_fornecedores').select('*').in('obra_id', obraIds).order('data_referencia', { ascending: false }),
      supabase.from('fornecedores').select('id, nome, obra_id').in('obra_id', obraIds).order('nome'),
      supabase.from('insumos_pendentes_cotacao').select('*, insumo_id:subitem_id').in('obra_id', obraIds).order('created_at', { ascending: false }),
    ]);
    setPrecos((pRes.data || []) as PrecoFornecedor[]);
    setFornecedores((fRes.data || []) as Fornecedor[]);
    setPendentes((pendRes.data || []) as InsumoPendente[]);
    setLoading(false);
  }, [obras.map(o => o.id).join(','), fetchLotes]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFornecedorNome = (id: string) => fornecedores.find(f => f.id === id)?.nome || '—';
  const getObraNome = (obraId: string) => {
    const o = obras.find(ob => ob.id === obraId);
    return o ? (o.codigo ? `${o.codigo}` : o.nome) : '';
  };

  // Filtered preços
  const filteredPrecos = precos
    .filter(p => filterObra === 'todos' || p.obra_id === filterObra)
    .filter(p => filterFornecedor === 'todos' || p.fornecedor_id === filterFornecedor)
    .filter(p => filterCategoria === 'todos' || p.categoria === filterCategoria)
    .filter(p => !filterItem || (p.descricao_item_snapshot || '').toLowerCase().includes(filterItem.toLowerCase()));

  // Price summary grouped by item
  const resumos = useMemo(() => {
    const itemMap = new Map<string, PrecoFornecedor[]>();
    filteredPrecos.forEach(p => {
      const key = (p.descricao_item_snapshot || '').toLowerCase();
      if (!itemMap.has(key)) itemMap.set(key, []);
      itemMap.get(key)!.push(p);
    });
    return Array.from(itemMap.entries()).map(([, list]) => {
      const sorted = [...list].sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
      const menor = list.reduce((m, p) => p.preco_unitario < m.preco_unitario ? p : m, list[0]);
      const media = list.reduce((s, p) => s + p.preco_unitario, 0) / list.length;
      return {
        item: list[0].descricao_item_snapshot || '',
        categoria: list[0].categoria || 'material',
        unidade: list[0].unidade || '—',
        menorPreco: menor.preco_unitario,
        precoMedio: media,
        ultimoPreco: sorted[0].preco_unitario,
        fornecedorMenor: getFornecedorNome(menor.fornecedor_id),
        dataUltimo: sorted[0].data_referencia,
        registros: list.length,
      };
    });
  }, [filteredPrecos, fornecedores]);

  // Filtered pendentes
  const filteredPendentes = pendentes
    .filter(p => filterObraPend === 'todos' || p.obra_id === filterObraPend)
    .filter(p => filterCategoriaPend === 'todos' || p.categoria === filterCategoriaPend)
    .filter(p => filterStatusPend === 'todos' || p.status === filterStatusPend);

  // Stats
  const totalInsumos = resumos.length;
  const totalPendentes = pendentes.filter(p => p.status === 'pendente').length;
  const ultimaAtualizacao = precos.length > 0 ? precos[0].data_referencia : null;

  const catPendencias = useMemo(() => {
    const map = new Map<string, number>();
    pendentes.filter(p => p.status === 'pendente').forEach(p => {
      const cat = p.categoria || 'outro';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    let top = '—'; let topCount = 0;
    map.forEach((count, cat) => { if (count > topCount) { topCount = count; top = categoriaLabels[cat] || cat; } });
    return top;
  }, [pendentes]);

  const updatePendenteStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('insumos_pendentes_cotacao').update({ status }).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Status atualizado para "${statusLabels[status] || status}"` });
    fetchData();
  };

  // ── COTAÇÃO FLOW ──
  const openCotacao = (insumo: InsumoPendente) => {
    setCotacaoInsumo(insumo);
    setCotacaoEntries([{ fornecedorId: '', preco: 0, data: new Date().toISOString().slice(0, 10) }]);
    // Marca como em cotação automaticamente
    if (insumo.status === 'pendente') {
      void supabase.from('insumos_pendentes_cotacao').update({ status: 'em_cotacao' }).eq('id', insumo.id);
    }
  };

  const addCotacaoEntry = () => {
    setCotacaoEntries(prev => [...prev, { fornecedorId: '', preco: 0, data: new Date().toISOString().slice(0, 10) }]);
  };

  const removeCotacaoEntry = (idx: number) => {
    setCotacaoEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEntry = (idx: number, field: keyof CotacaoEntry, value: string | number) => {
    setCotacaoEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  // Preço mínimo das entradas digitadas
  const cotacaoMin = cotacaoEntries.filter(e => e.preco > 0).reduce((m, e) => Math.min(m, e.preco), Infinity);
  const cotacaoMedia = cotacaoEntries.filter(e => e.preco > 0).reduce((s, e, _, a) => s + e.preco / a.length, 0);

  const salvarCotacao = async (precoEscolhido: number, fornecedorId: string) => {
    if (!cotacaoInsumo) return;
    setSavingCotacao(true);
    try {
      // 1) Grava preço no banco de preços
      const { error: precoErr } = await supabase.from('precos_fornecedores').insert({
        obra_id: cotacaoInsumo.obra_id,
        fornecedor_id: fornecedorId || null,
        descricao_item_snapshot: cotacaoInsumo.nome_insumo,
        preco_unitario: precoEscolhido,
        unidade: cotacaoInsumo.unidade || null,
        data_referencia: new Date().toISOString().slice(0, 10),
        origem_preco: 'cotacao_manual',
        categoria: cotacaoInsumo.categoria || null,
      });
      if (precoErr) throw precoErr;

      // 2) Se tiver insumo_id, atualiza diretamente o insumo no orçamento
      if (cotacaoInsumo.insumo_id) {
        const qtd = await supabase.from('orcamento_subitens').select('quantidade').eq('id', cotacaoInsumo.insumo_id).single();
        const quantidade = (qtd.data as Record<string, unknown> | null)?.quantidade as number | null ?? 1;
        await supabase.from('orcamento_subitens').update({
          preco_unitario: precoEscolhido,
          preco_total: precoEscolhido * (quantidade || 1),
        }).eq('id', cotacaoInsumo.insumo_id);
      }

      // 3) Remove da fila de cotação (ou marca como resolvido)
      await supabase.from('insumos_pendentes_cotacao').delete().eq('id', cotacaoInsumo.id);

      toast({ title: '✅ Preço salvo!', description: `R$ ${precoEscolhido.toFixed(2)} registrado para "${cotacaoInsumo.nome_insumo}".` });
      setCotacaoInsumo(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar cotação', variant: 'destructive' });
    } finally {
      setSavingCotacao(false);
    }
  };

  const handleSalvarMenorPreco = () => {
    const menorEntry = cotacaoEntries.filter(e => e.preco > 0).reduce((m, e) => e.preco < m.preco ? e : m, cotacaoEntries[0]);
    if (!menorEntry || !menorEntry.preco) { toast({ title: 'Informe pelo menos um preço', variant: 'destructive' }); return; }
    salvarCotacao(menorEntry.preco, menorEntry.fornecedorId);
  };

  const handleExportarPlanilha = () => {
    const obraFiltro = filterObraPend !== 'todos' ? filterObraPend : null;
    const insumosFiltrados = filteredPendentes
      .filter(p => p.status === 'pendente' || p.status === 'em_cotacao');

    if (insumosFiltrados.length === 0) {
      toast({ title: 'Nenhum insumo para exportar', description: 'Não há itens pendentes com os filtros aplicados.', variant: 'destructive' });
      return;
    }

    const obra = obraFiltro ? obras.find(o => o.id === obraFiltro) : null;
    exportarPlanilhaCotacao(insumosFiltrados, obra?.nome || 'Todas as Obras');
    toast({ title: `📋 Planilha gerada com ${insumosFiltrados.length} itens!` });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Insumos"
        subtitle="Banco de preços e cotações"
        icon={<Package className="h-5 w-5 text-primary" />}
        showObraSelector={false}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Insumos Cadastrados</p>
            <p className="text-xl font-bold text-foreground">{totalInsumos}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Sem Cotação</p>
            <p className="text-xl font-bold text-destructive">{totalPendentes}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Maior Pendência</p>
            <p className="text-sm font-semibold text-foreground truncate">{catPendencias}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Última Atualização</p>
            <p className="text-sm font-semibold text-foreground">
              {ultimaAtualizacao ? format(parseISO(ultimaAtualizacao), 'dd/MM/yyyy') : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="banco">
        <TabsList>
          <TabsTrigger value="banco"><Package className="h-4 w-4 mr-1" /> Banco de Preços</TabsTrigger>
          <TabsTrigger value="pendentes">
            <AlertTriangle className="h-4 w-4 mr-1" /> Sem Cotação
            {totalPendentes > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] h-5 px-1.5">{totalPendentes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lotes"><Layers className="h-4 w-4 mr-1" /> Lotes de Cotação</TabsTrigger>
        </TabsList>

        {/* TAB BANCO DE PREÇOS */}
        <TabsContent value="banco" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Select value={filterObra} onValueChange={setFilterObra}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Obra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Obras</SelectItem>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo || o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar insumo..." value={filterItem} onChange={e => setFilterItem(e.target.value)} className="h-9 text-sm w-[200px] pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : resumos.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum preço registrado ainda.</p>
              <p className="text-xs mt-1">Registre preços na aba "Sem Cotação" ou na página de Fornecedores.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Insumo</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs">Un</TableHead>
                        <TableHead className="text-xs text-right">Menor Preço</TableHead>
                        <TableHead className="text-xs text-right">Preço Médio</TableHead>
                        <TableHead className="text-xs text-right">Último Preço</TableHead>
                        <TableHead className="text-xs">Fornecedor (menor)</TableHead>
                        <TableHead className="text-xs text-center">Registros</TableHead>
                        <TableHead className="text-xs">Última Atualização</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumos.map((r, i) => {
                        const variacao = r.ultimoPreco > r.menorPreco ? 'up' : r.ultimoPreco < r.menorPreco ? 'down' : 'eq';
                        return (
                          <TableRow key={i} className="even:bg-muted/5">
                            <TableCell className="text-sm font-medium">{r.item}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {categoriaLabels[r.categoria] || r.categoria}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{r.unidade}</TableCell>
                            <TableCell className="text-sm text-right font-semibold text-green-600 dark:text-green-400">
                              R$ {r.menorPreco.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-right text-muted-foreground">
                              R$ {r.precoMedio.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              <span className="flex items-center justify-end gap-1">
                                {variacao === 'up' && <TrendingUp className="h-3 w-3 text-destructive" />}
                                {variacao === 'down' && <TrendingDown className="h-3 w-3 text-green-600" />}
                                {variacao === 'eq' && <Minus className="h-3 w-3 text-muted-foreground" />}
                                R$ {r.ultimoPreco.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.fornecedorMenor}</TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge variant="secondary" className="text-[10px]">{r.registros}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(parseISO(r.dataUltimo), 'dd/MM/yy')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB SEM COTAÇÃO */}
        <TabsContent value="pendentes" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Select value={filterObraPend} onValueChange={setFilterObraPend}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Obras</SelectItem>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo || o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategoriaPend} onValueChange={setFilterCategoriaPend}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              {!isSelectionMode ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsSelectionMode(true)}
                  className="h-8 gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Selecionar para Lote
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border animate-in fade-in slide-in-from-right-4">
                  <Input 
                    placeholder="Nome do lote (ex: Materiais Brutos)" 
                    value={loteTitle}
                    onChange={e => setLoteTitle(e.target.value)}
                    className="h-7 text-xs w-48"
                  />
                  <Button 
                    size="sm" 
                    disabled={selectedPendentes.length === 0 || !loteTitle}
                    onClick={async () => {
                      const id = await criarLote(loteTitle, selectedPendentes, 'planejamento', filterObraPend !== 'todos' ? filterObraPend : (obras[0]?.id || ''));
                      if (id) {
                        setIsSelectionMode(false);
                        setSelectedPendentes([]);
                        setLoteTitle('');
                        fetchData();
                      }
                    }}
                    className="h-7 text-xs px-3"
                  >
                    Criar Lote ({selectedPendentes.length})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setIsSelectionMode(false); setSelectedPendentes([]); }} className="h-7 text-xs px-2">
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={handleExportarPlanilha}
            >
              <Download className="h-3.5 w-3.5" />
              Gerar Planilha para Fornecedor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Importar Planilha Preenchida
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : filteredPendentes.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-70" />
                <p className="text-sm font-medium">Todos os insumos estão cotados!</p>
                <p className="text-xs mt-1">Insumos sem preço no orçamento aparecem automaticamente aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPendentes.map(p => (
                <Card 
                  key={p.id} 
                  className={`border-l-4 transition-all ${selectedPendentes.includes(p.id) ? 'bg-primary/5 ring-1 ring-primary/20' : ''} ${p.status === 'pendente' ? 'border-l-yellow-400' : p.status === 'em_cotacao' ? 'border-l-blue-400' : p.status === 'resolvido' ? 'border-l-green-400' : 'border-l-border'}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      setSelectedPendentes(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 items-start flex-1 min-w-0">
                        {isSelectionMode && (
                          <div className={`mt-1 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selectedPendentes.includes(p.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30 bg-background'}`}>
                            {selectedPendentes.includes(p.id) && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{p.nome_insumo}</p>
                            <Badge className={`text-[10px] ${statusColors[p.status]}`}>
                              {statusLabels[p.status]}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                            <span>Obra: {getObraNome(p.obra_id)}</span>
                            {p.categoria && <span>{categoriaLabels[p.categoria] || p.categoria}</span>}
                            {p.unidade && <span>Un: {p.unidade}</span>}
                            <span>{format(parseISO(p.created_at), 'dd/MM/yy')}</span>
                            {p.insumo_id && (
                              <span className="flex items-center gap-0.5 text-primary">
                                <ExternalLink className="h-3 w-3" /> Vinculado ao orçamento
                              </span>
                            )}
                          </div>
                          {p.observacoes && (
                            <p className="text-xs text-muted-foreground mt-1">{p.observacoes}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5 shrink-0 flex-wrap justify-end items-center">
                        {(p.status === 'pendente' || p.status === 'em_cotacao') && (
                          <Button
                            size="sm"
                            className="text-xs h-8 gap-1.5 shadow-sm"
                            onClick={(e) => { e.stopPropagation(); openCotacao(p); }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Registrar Cotação
                          </Button>
                        )}
                        {p.status === 'pendente' && (
                          <Button variant="outline" size="sm" className="text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); updatePendenteStatus(p.id, 'ignorado'); }}>
                            Ignorar
                          </Button>
                        )}
                        {p.status === 'em_cotacao' && (
                          <Button variant="outline" size="sm" className="text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); updatePendenteStatus(p.id, 'resolvido'); }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Cotado
                          </Button>
                        )}
                        {(p.status === 'resolvido' || p.status === 'ignorado') && (
                          <Button variant="ghost" size="sm" className="text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); updatePendenteStatus(p.id, 'pendente'); }}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>


        {/* TAB LOTES DE COTAÇÃO */}
        <TabsContent value="lotes" className="space-y-4">
          {lotes.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum lote de cotação criado.</p>
              <p className="text-xs mt-1">Selecione itens na aba "Sem Cotação" para iniciar um processo de suprimentos.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lotes.map(lote => (
                <Card key={lote.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-bold truncate">{lote.titulo}</CardTitle>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{lote.fase}</p>
                    </div>
                    <Badge variant={lote.status === 'finalizado' ? 'secondary' : 'default'} className="text-[10px]">
                      {lote.status === 'aberto' ? 'Aberto' : lote.status === 'em_cotacao' ? 'Em Cotação' : 'Finalizado'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-4">
                      <span>Criado em: {format(parseISO(lote.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs gap-1.5" variant="default" onClick={() => {
                        setActiveLote(lote);
                      }}>
                        <BarChart3 className="h-3.5 w-3.5" /> Matriz de Decisão
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => excluirLote(lote.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Matriz de Decisao Modal */}
      <MatrizDecisao 
        lote={activeLote} 
        onClose={() => setActiveLote(null)} 
        onImport={() => {
          setActiveLote(null);
          setImportDialogOpen(true);
        }}
      />

      {/* ── Sheet de Cotação Multi-Fornecedor ── */}
      <Sheet open={!!cotacaoInsumo} onOpenChange={open => !open && setCotacaoInsumo(null)}>
        <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
          {cotacaoInsumo && (
            <>
              <div className="p-6 pb-4 border-b">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5 text-primary" />
                    Registrar Cotação
                  </SheetTitle>
                  <SheetDescription asChild>
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-sm">{cotacaoInsumo.nome_insumo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Obra: {getObraNome(cotacaoInsumo.obra_id)}
                        {cotacaoInsumo.unidade && ` · Un: ${cotacaoInsumo.unidade}`}
                      </p>
                    </div>
                  </SheetDescription>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Resumo comparativo */}
                {cotacaoEntries.filter(e => e.preco > 0).length > 0 && (
                  <div className="rounded-md border border-border/40 bg-muted/20 p-3 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comparativo</p>
                    <div className="flex gap-6 text-sm">
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground">Menor</p>
                        <p className="font-bold text-green-600 dark:text-green-400">R$ {isFinite(cotacaoMin) ? cotacaoMin.toFixed(2) : '—'}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground">Média</p>
                        <p className="font-semibold">R$ {cotacaoMedia > 0 ? cotacaoMedia.toFixed(2) : '—'}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground">Fornecedores</p>
                        <p className="font-semibold">{cotacaoEntries.filter(e => e.preco > 0).length}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entradas de cotação */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preços por Fornecedor</Label>
                    <Button variant="ghost" size="sm" onClick={addCotacaoEntry} className="h-7 text-xs gap-1 text-primary hover:bg-primary/10">
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>

                  {cotacaoEntries.map((entry, idx) => (
                    <div key={idx} className="rounded-md border border-border/50 bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Fornecedor {idx + 1}</span>
                        {cotacaoEntries.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCotacaoEntry(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Fornecedor</Label>
                          <Select value={entry.fornecedorId} onValueChange={v => updateEntry(idx, 'fornecedorId', v)}>
                            <SelectTrigger className="h-8 text-xs mt-0.5">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__sem__">Sem fornecedor</SelectItem>
                              {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Preço Unitário</Label>
                          <div className="relative mt-0.5">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              value={entry.preco || ''}
                              onChange={e => updateEntry(idx, 'preco', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs pl-7"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Data</Label>
                        <Input
                          type="date"
                          value={entry.data}
                          onChange={e => updateEntry(idx, 'data', e.target.value)}
                          className="h-8 text-xs mt-0.5"
                        />
                      </div>

                      {/* Aplicar preço deste fornecedor */}
                      {entry.preco > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                          onClick={() => salvarCotacao(entry.preco, entry.fornecedorId === '__sem__' ? '' : entry.fornecedorId)}
                          disabled={savingCotacao}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Usar R$ {entry.preco.toFixed(2)} {entry.fornecedorId && entry.fornecedorId !== '__sem__' ? `(${getFornecedorNome(entry.fornecedorId)})` : ''}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 pt-4 border-t bg-muted/10 space-y-2">
                {isFinite(cotacaoMin) && cotacaoMin > 0 && (
                  <Button
                    className="w-full gap-2 shadow-md font-semibold"
                    onClick={handleSalvarMenorPreco}
                    disabled={savingCotacao}
                  >
                    <TrendingDown className="h-4 w-4" />
                    Usar Menor Preço — R$ {cotacaoMin.toFixed(2)}
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => setCotacaoInsumo(null)}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Fase 4: Dialog de Importação de Planilha ── */}
      <ImportarCotacaoDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        pendentes={pendentes.filter(p => p.status === 'pendente' || p.status === 'em_cotacao')}
        fornecedores={fornecedores}
        obraId={filterObraPend !== 'todos' ? filterObraPend : null}
        onSuccess={fetchData}
      />
    </div>
  );
}
