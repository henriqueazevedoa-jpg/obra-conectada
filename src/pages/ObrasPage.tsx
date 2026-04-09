import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { statusObraLabels, formatDate, Obra } from '@/data/mockData';
import { Search, Plus, MapPin, Calendar, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  planejamento: 'bg-muted text-muted-foreground border-0',
  em_andamento: 'bg-success/10 text-success border-0',
  pausada: 'bg-warning/10 text-warning border-0',
  concluida: 'bg-primary/10 text-primary border-0',
};

const emptyForm = {
  nome: '',
  codigo: '',
  cliente: '',
  endereco: '',
  status: 'planejamento' as Obra['status'],
  dataInicio: '',
  dataPrevisaoTermino: '',
  responsavel: '',
  descricao: '',
};

export default function ObrasPage() {
  const { user, hasPermission } = useAuth();
  const { obras, addObra, updateObra, deleteObra, generateCodigo, getResponsaveis } = useObras();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showResponsavelList, setShowResponsavelList] = useState(false);
  const responsavelRef = useRef<HTMLDivElement>(null);

  const responsaveis = getResponsaveis();
  const filteredResponsaveis = responsaveis.filter(r =>
    r.toLowerCase().includes(form.responsavel.toLowerCase()) && r !== form.responsavel
  );

  const filtered = obras
    .filter(o => !search || o.nome.toLowerCase().includes(search.toLowerCase()) || o.codigo.toLowerCase().includes(search.toLowerCase()))
    .filter(o => !statusFilter || o.status === statusFilter);

  // Close responsavel dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (responsavelRef.current && !responsavelRef.current.contains(e.target as Node)) {
        setShowResponsavelList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm({ ...emptyForm, codigo: generateCodigo() });
    setDialogOpen(true);
  };

  const openEditDialog = (obra: Obra, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(obra.id);
    setForm({
      nome: obra.nome,
      codigo: obra.codigo,
      cliente: obra.cliente,
      endereco: obra.endereco,
      status: obra.status,
      dataInicio: obra.dataInicio,
      dataPrevisaoTermino: obra.dataPrevisaoTermino,
      responsavel: obra.responsavel,
      descricao: obra.descricao,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome) {
      toast({ title: 'Preencha ao menos o nome da obra.', variant: 'destructive' });
      return;
    }
    if (editingId) {
      updateObra(editingId, form);
      toast({ title: 'Obra atualizada com sucesso!' });
    } else {
      const newObra: Obra = {
        id: crypto.randomUUID(),
        ...form,
        percentualAndamento: 0,
      };
      addObra(newObra);
      toast({ title: 'Obra criada com sucesso!' });
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteObra(deleteConfirmId);
      toast({ title: 'Obra excluída.' });
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Obras</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} obra(s) encontrada(s)</p>
        </div>
        {hasPermission('obras:create') && (
          <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-1" /> Nova Obra</Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar obra..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'em_andamento', 'planejamento', 'pausada', 'concluida'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-accent'
              }`}
            >
              {s ? statusObraLabels[s] : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(obra => (
          <Link key={obra.id} to={`/obras/${obra.id}`}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{obra.codigo}</p>
                    <h3 className="text-base font-semibold text-foreground">{obra.nome}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasPermission('obras:edit') && (
                      <>
                        <button onClick={(e) => openEditDialog(obra, e)} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Editar">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={(e) => handleDelete(obra.id, e)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </>
                    )}
                    <Badge variant="secondary" className={statusColors[obra.status]}>
                      {statusObraLabels[obra.status]}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{obra.endereco}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{obra.dataInicio ? formatDate(obra.dataInicio) : '—'} → {obra.dataPrevisaoTermino ? formatDate(obra.dataPrevisaoTermino) : '—'}</span>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Andamento</span>
                    <span className="font-medium text-foreground">{obra.percentualAndamento}%</span>
                  </div>
                  <Progress value={obra.percentualAndamento} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Dialog Criar/Editar Obra */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize os dados da obra.' : 'Preencha os dados para cadastrar uma nova obra.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome da obra *</Label>
                <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" value={form.codigo} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <Input id="cliente" value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input id="dataInicio" type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dataFim">Previsão de término</Label>
                <Input id="dataFim" type="date" value={form.dataPrevisaoTermino} onChange={e => setForm(f => ({ ...f, dataPrevisaoTermino: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Obra['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planejamento</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 relative" ref={responsavelRef}>
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={form.responsavel}
                  onChange={e => { setForm(f => ({ ...f, responsavel: e.target.value })); setShowResponsavelList(true); }}
                  onFocus={() => setShowResponsavelList(true)}
                  autoComplete="off"
                />
                {showResponsavelList && filteredResponsaveis.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-32 overflow-y-auto">
                    {filteredResponsaveis.map(r => (
                      <button
                        key={r}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                        onClick={() => { setForm(f => ({ ...f, responsavel: r })); setShowResponsavelList(false); }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar Obra'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Obra</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
