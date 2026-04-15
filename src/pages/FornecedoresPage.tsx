import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Pencil, Trash2, Store, Search, Package,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';

interface Fornecedor {
  id: string; obra_id: string; nome: string; cnpj: string | null;
  email: string | null; telefone: string | null; cidade: string | null;
  observacoes: string | null; created_at: string;
}

const emptyFornecedor = { nome: '', cnpj: '', email: '', telefone: '', cidade: '', observacoes: '' };

export default function FornecedoresPage() {
  const { obras } = useObras();
  const navigate = useNavigate();

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  const [fDialogOpen, setFDialogOpen] = useState(false);
  const [fEditingId, setFEditingId] = useState<string | null>(null);
  const [fForm, setFForm] = useState(emptyFornecedor);
  const [fDeleteId, setFDeleteId] = useState<string | null>(null);
  const [fSearch, setFSearch] = usePersistentPageState<string>('fornecedores:search', '');
  const [fObraId, setFObraId] = usePersistentPageState<string>('fornecedores:obraId', obras[0]?.id || '');
  const [savingF, setSavingF] = useState(false);

  const fetchData = useCallback(async () => {
    if (obras.length === 0) { setFornecedores([]); setLoading(false); return; }
    setLoading(true);
    const obraIds = obras.map(o => o.id);
    const { data } = await supabase.from('fornecedores').select('*').in('obra_id', obraIds).order('nome');
    setFornecedores((data || []) as Fornecedor[]);
    setLoading(false);
  }, [obras.map(o => o.id).join(',')]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getObraNome = (obraId: string) => {
    const o = obras.find(ob => ob.id === obraId);
    return o ? (o.codigo ? `${o.codigo}` : o.nome) : '';
  };

  const openCreateF = () => {
    setFEditingId(null);
    setFForm(emptyFornecedor);
    setFObraId(obras[0]?.id || '');
    setFDialogOpen(true);
  };
  const openEditF = (f: Fornecedor) => {
    setFEditingId(f.id);
    setFObraId(f.obra_id);
    setFForm({ nome: f.nome, cnpj: f.cnpj || '', email: f.email || '', telefone: f.telefone || '', cidade: f.cidade || '', observacoes: f.observacoes || '' });
    setFDialogOpen(true);
  };
  const saveF = async () => {
    if (!fForm.nome || savingF) return;
    setSavingF(true);
    try {
      const payload = { nome: fForm.nome, cnpj: fForm.cnpj || null, email: fForm.email || null, telefone: fForm.telefone || null, cidade: fForm.cidade || null, observacoes: fForm.observacoes || null };
      if (fEditingId) {
        const { error } = await supabase.from('fornecedores').update(payload).eq('id', fEditingId);
        if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Fornecedor atualizado!' });
      } else {
        if (!fObraId) { toast({ title: 'Selecione uma obra.', variant: 'destructive' }); return; }
        const { error } = await supabase.from('fornecedores').insert({ ...payload, obra_id: fObraId });
        if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Fornecedor cadastrado!' });
      }
      setFDialogOpen(false); fetchData();
    } finally { setSavingF(false); }
  };
  const deleteF = async () => {
    if (!fDeleteId) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', fDeleteId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Fornecedor excluído.' }); setFDeleteId(null); fetchData();
  };

  const filteredFornecedores = fornecedores.filter(f =>
    !fSearch || f.nome.toLowerCase().includes(fSearch.toLowerCase()) ||
    (f.cnpj || '').includes(fSearch) ||
    (f.cidade || '').toLowerCase().includes(fSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro e gestão de fornecedores"
        icon={<Store className="h-5 w-5 text-primary" />}
        showObraSelector={false}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={fSearch}
            onChange={e => setFSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/insumos')} className="gap-1">
            <Package className="h-4 w-4" /> Ver Banco de Preços
          </Button>
          <Button onClick={openCreateF} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Fornecedor
          </Button>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-muted-foreground">Carregando...</div> :
       filteredFornecedores.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          <Store className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum fornecedor cadastrado.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredFornecedores.map(f => (
            <Card key={f.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{f.nome}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{getObraNome(f.obra_id)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                    {f.cnpj && <span>CNPJ: {f.cnpj}</span>}
                    {f.telefone && <span>Tel: {f.telefone}</span>}
                    {f.email && <span>{f.email}</span>}
                    {f.cidade && <span>{f.cidade}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => navigate(`/insumos?fornecedor=${f.id}`)} className="p-1.5 rounded-md hover:bg-accent" title="Ver preços">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => openEditF(f)} className="p-1.5 rounded-md hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button onClick={() => setFDeleteId(f.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Fornecedor */}
      <Dialog open={fDialogOpen} onOpenChange={setFDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fEditingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>{fEditingId ? 'Atualize os dados.' : 'Cadastre um novo fornecedor.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {!fEditingId && (
              <div className="space-y-1.5">
                <Label>Obra *</Label>
                <Select value={fObraId} onValueChange={setFObraId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <Button onClick={saveF} disabled={savingF}>{savingF ? 'Salvando...' : fEditingId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!fDeleteId} onOpenChange={() => setFDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Excluir Fornecedor</DialogTitle><DialogDescription>Tem certeza? Preços vinculados também serão perdidos.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setFDeleteId(null)}>Cancelar</Button><Button variant="destructive" onClick={deleteF}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
