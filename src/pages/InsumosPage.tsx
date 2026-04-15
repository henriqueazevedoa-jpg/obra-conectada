import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Package, AlertTriangle, CheckCircle2, Clock, Link2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';

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
  id: string; obra_id: string; subitem_id: string | null;
  material_id: string | null; nome_insumo: string;
  unidade: string | null; categoria: string | null;
  status: string; observacoes: string | null;
  created_at: string; updated_at: string;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente', em_cotacao: 'Em Cotação', resolvido: 'Resolvido', ignorado: 'Ignorado',
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
  const [precos, setPrecos] = useState<PrecoFornecedor[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [pendentes, setPendentes] = useState<InsumoPendente[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams] = useSearchParams();

  // Filters - banco de preços
  const [filterObra, setFilterObra] = usePersistentPageState<string>('insumos:filterObra', 'todos');
  const [filterCategoria, setFilterCategoria] = usePersistentPageState<string>('insumos:filterCategoria', 'todos');
  const [filterFornecedor, setFilterFornecedor] = usePersistentPageState<string>('insumos:filterFornecedor', searchParams.get('fornecedor') || 'todos');
  const [filterItem, setFilterItem] = usePersistentPageState<string>('insumos:filterItem', '');

  // Filters - não orçados
  const [filterObraPend, setFilterObraPend] = usePersistentPageState<string>('insumos:filterObraPend', 'todos');
  const [filterCategoriaPend, setFilterCategoriaPend] = usePersistentPageState<string>('insumos:filterCategoriaPend', 'todos');
  const [filterStatusPend, setFilterStatusPend] = usePersistentPageState<string>('insumos:filterStatusPend', 'todos');

  const fetchData = useCallback(async () => {
    if (obras.length === 0) { setPrecos([]); setFornecedores([]); setPendentes([]); setLoading(false); return; }
    setLoading(true);
    const obraIds = obras.map(o => o.id);
    const [pRes, fRes, pendRes] = await Promise.all([
      supabase.from('precos_fornecedores').select('*').in('obra_id', obraIds).order('data_referencia', { ascending: false }),
      supabase.from('fornecedores').select('id, nome, obra_id').in('obra_id', obraIds).order('nome'),
      supabase.from('insumos_pendentes_cotacao').select('*').in('obra_id', obraIds).order('created_at', { ascending: false }),
    ]);
    setPrecos((pRes.data || []) as PrecoFornecedor[]);
    setFornecedores((fRes.data || []) as Fornecedor[]);
    setPendentes((pendRes.data || []) as InsumoPendente[]);
    setLoading(false);
  }, [obras.map(o => o.id).join(',')]);

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

  // Categorias com mais pendências
  const catPendencias = useMemo(() => {
    const map = new Map<string, number>();
    pendentes.filter(p => p.status === 'pendente').forEach(p => {
      const cat = p.categoria || 'outro';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    let top = '—';
    let topCount = 0;
    map.forEach((count, cat) => { if (count > topCount) { topCount = count; top = categoriaLabels[cat] || cat; } });
    return top;
  }, [pendentes]);

  const updatePendenteStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('insumos_pendentes_cotacao').update({ status }).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Status atualizado para "${statusLabels[status]}"` });
    fetchData();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Insumos"
        subtitle="Banco de preços e insumos a orçar"
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
            <p className="text-xs text-muted-foreground font-medium">Não Orçados</p>
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
            <AlertTriangle className="h-4 w-4 mr-1" /> Não Orçados
            {totalPendentes > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] h-5 px-1.5">{totalPendentes}</Badge>
            )}
          </TabsTrigger>
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
              <p className="text-xs mt-1">Cadastre preços na página de Fornecedores.</p>
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
                        <TableHead className="text-xs">Última Atualização</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumos.map((r, i) => (
                        <TableRow key={i}>
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
                            R$ {r.ultimoPreco.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.fornecedorMenor}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(parseISO(r.dataUltimo), 'dd/MM/yy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB NÃO ORÇADOS */}
        <TabsContent value="pendentes" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Select value={filterObraPend} onValueChange={setFilterObraPend}>
              <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Obra" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Obras</SelectItem>
                {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo || o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategoriaPend} onValueChange={setFilterCategoriaPend}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatusPend} onValueChange={setFilterStatusPend}>
              <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Carregando...</div>
          ) : filteredPendentes.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum insumo pendente!</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredPendentes.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{p.nome_insumo}</p>
                          <Badge className={`text-[10px] ${statusColors[p.status]}`}>
                            {statusLabels[p.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                          <span>Obra: {getObraNome(p.obra_id)}</span>
                          {p.categoria && <span>{categoriaLabels[p.categoria] || p.categoria}</span>}
                          {p.unidade && <span>Un: {p.unidade}</span>}
                          <span>{format(parseISO(p.created_at), 'dd/MM/yy')}</span>
                        </div>
                        {p.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1">{p.observacoes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {p.status === 'pendente' && (
                          <>
                            <Button variant="outline" size="sm" className="text-xs h-7"
                              onClick={() => updatePendenteStatus(p.id, 'em_cotacao')}>
                              <Clock className="h-3 w-3 mr-1" /> Cotar
                            </Button>
                            <Button variant="outline" size="sm" className="text-xs h-7"
                              onClick={() => updatePendenteStatus(p.id, 'ignorado')}>
                              Ignorar
                            </Button>
                          </>
                        )}
                        {p.status === 'em_cotacao' && (
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => updatePendenteStatus(p.id, 'resolvido')}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolvido
                          </Button>
                        )}
                        {(p.status === 'resolvido' || p.status === 'ignorado') && (
                          <Button variant="ghost" size="sm" className="text-xs h-7"
                            onClick={() => updatePendenteStatus(p.id, 'pendente')}>
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
      </Tabs>
    </div>
  );
}
