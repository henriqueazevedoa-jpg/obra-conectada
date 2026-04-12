import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, Pencil, Trash2, Store, DollarSign,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NoObraState from '@/components/obras/NoObraState';

interface Fornecedor {
  id: string; obra_id: string; nome: string; cnpj: string | null;
  email: string | null; telefone: string | null; cidade: string | null;
  observacoes: string | null; created_at: string;
}

interface PrecoFornecedor {
  id: string; fornecedor_id: string; obra_id: string | null;
  material_id: string | null; descricao_item_snapshot: string | null;
  preco_unitario: number; unidade: string | null;
  data_referencia: string; origem_preco: string;
  observacoes: string | null; created_at: string;
}

const origemLabels: Record<string, string> = {
  compra_real: 'Compra Real', cotacao: 'Cotação', tabela: 'Tabela', outro: 'Outro',
};

const emptyFornecedor = { nome: '', cnpj: '', email: '', telefone: '', cidade: '', observacoes: '' };
type OrigemPreco = 'compra_real' | 'cotacao' | 'tabela' | 'outro';

const emptyPreco = {
  fornecedor_id: '', descricao_item_snapshot: '', preco_unitario: '',
  unidade: '', data_referencia: new Date().toISOString().slice(0, 10),
  origem_preco: 'cotacao' as OrigemPreco, observacoes: '',
};

export default function FornecedoresPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [precos, setPrecos] = useState<PrecoFornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [fDialogOpen, setFDialogOpen] = useState(false);
  const [fEditingId, setFEditingId] = useState<string | null>(null);
  const [fForm, setFForm] = useState(emptyFornecedor);
  const [fDeleteId, setFDeleteId] = useState<string | null>(null);

  const [pDialogOpen, setPDialogOpen] = useState(false);
  const [pEditingId, setPEditingId] = useState<string | null>(null);
  const [pForm, setPForm] = useState(emptyPreco);
  const [pDeleteId, setPDeleteId] = useState<string | null>(null);

  const [filterFornecedor, setFilterFornecedor] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  const fetchData = useCallback(async () => {
    if (!obra) { setFornecedores([]); setPrecos([]); setLoading(false); return; }
    setLoading(true);
    const [fRes, pRes] = await Promise.all([
      supabase.from('fornecedores').select('*').eq('obra_id', obra.id).order('nome'),
      supabase.from('precos_fornecedores').select('*').eq('obra_id', obra.id).order('data_referencia', { ascending: false }),
    ]);
    setFornecedores((fRes.data || []) as Fornecedor[]);
    setPrecos((pRes.data || []) as PrecoFornecedor[]);
    setLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!obra) return <NoObraState title="Nenhuma obra selecionada" description="Selecione ou cadastre uma obra para gerenciar fornecedores." />;

  // -- Fornecedor CRUD --
  const openCreateF = () => { setFEditingId(null); setFForm(emptyFornecedor); setFDialogOpen(true); };
  const openEditF = (f: Fornecedor) => {
    setFEditingId(f.id);
    setFForm({ nome: f.nome, cnpj: f.cnpj || '', email: f.email || '', telefone: f.telefone || '', cidade: f.cidade || '', observacoes: f.observacoes || '' });
    setFDialogOpen(true);
  };
  const saveF = async () => {
    if (!fForm.nome) { toast({ title: 'Preencha o nome.', variant: 'destructive' }); return; }
    const payload = { nome: fForm.nome, cnpj: fForm.cnpj || null, email: fForm.email || null, telefone: fForm.telefone || null, cidade: fForm.cidade || null, observacoes: fForm.observacoes || null };
    if (fEditingId) {
      const { error } = await supabase.from('fornecedores').update(payload).eq('id', fEditingId);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Fornecedor atualizado!' });
    } else {
      const { error } = await supabase.from('fornecedores').insert({ ...payload, obra_id: obra.id });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Fornecedor cadastrado!' });
    }
    setFDialogOpen(false); fetchData();
  };
  const deleteF = async () => {
    if (!fDeleteId) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', fDeleteId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Fornecedor excluído.' }); setFDeleteId(null); fetchData();
  };

  // -- Preço CRUD --
  const openCreateP = () => {
    setPEditingId(null);
    setPForm({ ...emptyPreco, fornecedor_id: fornecedores[0]?.id || '' });
    setPDialogOpen(true);
  };
  const openEditP = (p: PrecoFornecedor) => {
    setPEditingId(p.id);
    setPForm({
      fornecedor_id: p.fornecedor_id, descricao_item_snapshot: p.descricao_item_snapshot || '',
      preco_unitario: String(p.preco_unitario), unidade: p.unidade || '',
      data_referencia: p.data_referencia, origem_preco: p.origem_preco as OrigemPreco,
      observacoes: p.observacoes || '',
    });
    setPDialogOpen(true);
  };
  const saveP = async () => {
    if (!pForm.descricao_item_snapshot || !pForm.preco_unitario || !pForm.fornecedor_id) {
      toast({ title: 'Preencha item, preço e fornecedor.', variant: 'destructive' }); return;
    }
    const payload = {
      fornecedor_id: pForm.fornecedor_id, descricao_item_snapshot: pForm.descricao_item_snapshot,
      preco_unitario: parseFloat(pForm.preco_unitario), unidade: pForm.unidade || null,
      data_referencia: pForm.data_referencia, origem_preco: pForm.origem_preco,
      observacoes: pForm.observacoes || null, obra_id: obra.id,
    };
    if (pEditingId) {
      const { error } = await supabase.from('precos_fornecedores').update(payload).eq('id', pEditingId);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Preço atualizado!' });
    } else {
      const { error } = await supabase.from('precos_fornecedores').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Preço registrado!' });
    }
    setPDialogOpen(false); fetchData();
  };
  const deleteP = async () => {
    if (!pDeleteId) return;
    const { error } = await supabase.from('precos_fornecedores').delete().eq('id', pDeleteId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Preço excluído.' }); setPDeleteId(null); fetchData();
  };

  const getFornecedorNome = (id: string) => fornecedores.find(f => f.id === id)?.nome || '—';

  // Preços filtrados
  const filteredPrecos = precos
    .filter(p => !filterFornecedor || p.fornecedor_id === filterFornecedor)
    .filter(p => !filterMaterial || (p.descricao_item_snapshot || '').toLowerCase().includes(filterMaterial.toLowerCase()));

  // Resumos: menor e último preço por item
  const itemMap = new Map<string, PrecoFornecedor[]>();
  precos.forEach(p => {
    const key = (p.descricao_item_snapshot || '').toLowerCase();
    if (!itemMap.has(key)) itemMap.set(key, []);
    itemMap.get(key)!.push(p);
  });
  const resumos = Array.from(itemMap.entries()).map(([item, list]) => {
    const sorted = [...list].sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
    const menor = list.reduce((m, p) => p.preco_unitario < m.preco_unitario ? p : m, list[0]);
    return { item: list[0].descricao_item_snapshot || item, menor, ultimo: sorted[0] };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fornecedores & Preços</h1>
          <p className="text-muted-foreground text-sm">{obra.codigo} — {obra.nome}</p>
        </div>
      </div>

      <Tabs defaultValue="fornecedores">
        <TabsList>
          <TabsTrigger value="fornecedores"><Store className="h-4 w-4 mr-1" /> Fornecedores</TabsTrigger>
          <TabsTrigger value="precos"><DollarSign className="h-4 w-4 mr-1" /> Banco de Preços</TabsTrigger>
        </TabsList>

        {/* === TAB FORNECEDORES === */}
        <TabsContent value="fornecedores" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateF}><Plus className="h-4 w-4 mr-1" /> Novo Fornecedor</Button>
          </div>
          {loading ? <div className="text-center py-10 text-muted-foreground">Carregando...</div> :
           fornecedores.length === 0 ? (
            <Card className="shadow-card"><CardContent className="p-10 text-center text-muted-foreground">
              <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhum fornecedor cadastrado.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {fornecedores.map(f => (
                <Card key={f.id} className="shadow-card">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{f.nome}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {f.cnpj && <span>CNPJ: {f.cnpj}</span>}
                        {f.telefone && <span>Tel: {f.telefone}</span>}
                        {f.email && <span>{f.email}</span>}
                        {f.cidade && <span>{f.cidade}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditF(f)} className="p-1.5 rounded-md hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => setFDeleteId(f.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === TAB PREÇOS === */}
        <TabsContent value="precos" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex gap-2 flex-wrap">
              <Select value={filterFornecedor} onValueChange={v => setFilterFornecedor(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Filtrar por material..." value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)} className="h-8 text-xs w-[180px]" />
            </div>
            <Button onClick={openCreateP} disabled={fornecedores.length === 0} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Preço</Button>
          </div>

          {/* Resumo de preços */}
          {resumos.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo de Preços</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Menor Preço</TableHead>
                    <TableHead className="text-xs">Fornecedor (menor)</TableHead>
                    <TableHead className="text-xs">Último Preço</TableHead>
                    <TableHead className="text-xs">Data Último</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {resumos.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.item}</TableCell>
                        <TableCell className="text-sm font-medium text-success">R$ {r.menor.preco_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{getFornecedorNome(r.menor.fornecedor_id)}</TableCell>
                        <TableCell className="text-sm">R$ {r.ultimo.preco_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(parseISO(r.ultimo.data_referencia), 'dd/MM/yy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Lista de preços */}
          {filteredPrecos.length === 0 ? (
            <Card className="shadow-card"><CardContent className="p-10 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhum registro de preço.</p>
            </CardContent></Card>
          ) : (
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Fornecedor</TableHead>
                    <TableHead className="text-xs">Preço Unit.</TableHead>
                    <TableHead className="text-xs">Unidade</TableHead>
                    <TableHead className="text-xs">Origem</TableHead>
                    <TableHead className="text-xs w-16"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredPrecos.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{format(parseISO(p.data_referencia), 'dd/MM/yy')}</TableCell>
                        <TableCell className="text-sm">{p.descricao_item_snapshot || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{getFornecedorNome(p.fornecedor_id)}</TableCell>
                        <TableCell className="text-sm font-medium">R$ {p.preco_unitario.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{p.unidade || '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{origemLabels[p.origem_preco] || p.origem_preco}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <button onClick={() => openEditP(p)} className="p-1 rounded hover:bg-accent"><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                            <button onClick={() => setPDeleteId(p.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive" /></button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Fornecedor */}
      <Dialog open={fDialogOpen} onOpenChange={setFDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fEditingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>{fEditingId ? 'Atualize os dados.' : 'Cadastre um novo fornecedor.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Nome *</Label><Input value={fForm.nome} onChange={e => setFForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>CNPJ</Label><Input value={fForm.cnpj} onChange={e => setFForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input value={fForm.telefone} onChange={e => setFForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={fForm.email} onChange={e => setFForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input value={fForm.cidade} onChange={e => setFForm(f => ({ ...f, cidade: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea value={fForm.observacoes} onChange={e => setFForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveF}>{fEditingId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preço */}
      <Dialog open={pDialogOpen} onOpenChange={setPDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pEditingId ? 'Editar Preço' : 'Novo Preço'}</DialogTitle>
            <DialogDescription>Registre o preço de um item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Fornecedor *</Label>
              <Select value={pForm.fornecedor_id} onValueChange={v => setPForm(f => ({ ...f, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Item / Material *</Label><Input value={pForm.descricao_item_snapshot} onChange={e => setPForm(f => ({ ...f, descricao_item_snapshot: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Preço Unitário *</Label><Input type="number" step="0.01" value={pForm.preco_unitario} onChange={e => setPForm(f => ({ ...f, preco_unitario: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Unidade</Label><Input value={pForm.unidade} onChange={e => setPForm(f => ({ ...f, unidade: e.target.value }))} placeholder="kg, m², un..." /></div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={pForm.origem_preco} onValueChange={v => setPForm(f => ({ ...f, origem_preco: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(origemLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Data de Referência</Label><Input type="date" value={pForm.data_referencia} onChange={e => setPForm(f => ({ ...f, data_referencia: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea value={pForm.observacoes} onChange={e => setPForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveP}>{pEditingId ? 'Salvar' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Deletes */}
      <Dialog open={!!fDeleteId} onOpenChange={() => setFDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Fornecedor</DialogTitle><DialogDescription>Tem certeza? Preços vinculados também serão perdidos.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setFDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={deleteF}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pDeleteId} onOpenChange={() => setPDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Preço</DialogTitle><DialogDescription>Tem certeza?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setPDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={deleteP}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
