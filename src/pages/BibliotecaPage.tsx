import { useState, useMemo, useCallback, useEffect } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BookOpen, Plus, Search, Pencil, Trash2, Star, Layers, Package,
  Loader2, X, ChevronRight, Grid3X3, List, Upload, FileDown,
  BarChart3, Clock, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogoRow {
  id: string;
  company_id: string;
  codigo: string | null;
  nome: string;
  unidade: string | null;
  categoria: string | null;
  insumos: Record<string, unknown>[] | null;
  usos: number | null;
  preco_medio: number | null;
  is_modelo: boolean | null;
  origem: string | null;
  obra_origem_id: string | null;
  created_at: string;
}

interface CatalogoForm {
  codigo: string;
  nome: string;
  unidade: string;
  categoria: string;
  preco_medio: string;
  is_modelo: boolean;
}

const CATEGORIAS = [
  'Fundações',
  'Estrutura',
  'Alvenaria',
  'Cobertura',
  'Instalações Hidráulicas',
  'Instalações Elétricas',
  'Revestimentos',
  'Esquadrias',
  'Pintura',
  'Pavimentação',
  'Outros',
];

const EMPTY_FORM: CatalogoForm = {
  codigo: '',
  nome: '',
  unidade: 'un',
  categoria: '',
  preco_medio: '',
  is_modelo: false,
};

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BibliotecaPage() {
  const { company } = useCompany();

  // ── Estado ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<CatalogoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [filterModelo, setFilterModelo] = useState<'todos' | 'modelos' | 'catalogo'>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedItem, setSelectedItem] = useState<CatalogoRow | null>(null);

  // ── Dialog de edição ──────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── Dialog de exclusão ────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Carregar dados ────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('catalogo_composicoes')
      .select('*')
      .eq('company_id', company.id)
      .order('nome') as { data: CatalogoRow[] | null; error: unknown };
    if (error) {
      toast({ title: 'Erro ao carregar biblioteca', variant: 'destructive' });
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ── Métricas ──────────────────────────────────────────────────────────────
  const metricas = useMemo(() => ({
    total: items.length,
    modelos: items.filter(i => i.is_modelo).length,
    categorias: new Set(items.map(i => i.categoria).filter(Boolean)).size,
    usoTotal: items.reduce((s, i) => s + (i.usos ?? 0), 0),
  }), [items]);

  // ── Categorias disponíveis ────────────────────────────────────────────────
  const categoriasDisponiveis = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.categoria).filter(Boolean) as string[])).sort();
    return cats;
  }, [items]);

  // ── Itens filtrados ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items;
    if (filterModelo === 'modelos') list = list.filter(i => i.is_modelo);
    if (filterModelo === 'catalogo') list = list.filter(i => !i.is_modelo);
    if (selectedCategoria !== 'todos') list = list.filter(i => i.categoria === selectedCategoria);
    if (searchQuery.trim()) {
      const q = normalize(searchQuery.trim());
      list = list.filter(i =>
        normalize(i.nome).includes(q) ||
        normalize(i.codigo || '').includes(q) ||
        normalize(i.categoria || '').includes(q)
      );
    }
    return list;
  }, [items, filterModelo, selectedCategoria, searchQuery]);

  // ── Abrir dialog criar/editar ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogoRow) => {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo || '',
      nome: item.nome,
      unidade: item.unidade || 'un',
      categoria: item.categoria || '',
      preco_medio: item.preco_medio ? String(item.preco_medio) : '',
      is_modelo: item.is_modelo ?? false,
    });
    setDialogOpen(true);
  };

  // ── Salvar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (!company?.id) return;
    setSaving(true);

    const payload = {
      company_id: company.id,
      codigo: form.codigo.trim() || null,
      nome: form.nome.trim(),
      unidade: form.unidade.trim() || null,
      categoria: form.categoria || null,
      preco_medio: form.preco_medio ? parseFloat(form.preco_medio.replace(',', '.')) : null,
      is_modelo: form.is_modelo,
      origem: 'manual',
    };

    try {
      if (editingId) {
        const { error } = await (supabase as any)
          .from('catalogo_composicoes')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Composição atualizada com sucesso!' });
      } else {
        const { error } = await (supabase as any)
          .from('catalogo_composicoes')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Composição criada na biblioteca!' });
      }
      setDialogOpen(false);
      loadItems();
    } catch {
      toast({ title: 'Erro ao salvar composição', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle modelo ─────────────────────────────────────────────────────────
  const toggleModelo = async (item: CatalogoRow) => {
    const { error } = await (supabase as any)
      .from('catalogo_composicoes')
      .update({ is_modelo: !item.is_modelo })
      .eq('id', item.id);
    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_modelo: !item.is_modelo } : i));
      if (selectedItem?.id === item.id) {
        setSelectedItem(prev => prev ? { ...prev, is_modelo: !item.is_modelo } : null);
      }
    }
  };

  // ── Excluir ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any)
      .from('catalogo_composicoes')
      .delete()
      .eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Composição removida da biblioteca.' });
      setItems(prev => prev.filter(i => i.id !== deleteId));
      if (selectedItem?.id === deleteId) setSelectedItem(null);
    }
    setDeleteId(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background animate-fade-in">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">Biblioteca de Composições</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Catálogo mestre de composições e modelos da empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs hidden md:flex">
            <Upload className="h-3.5 w-3.5" />
            Importar Excel
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Nova Composição
          </Button>
        </div>
      </div>

      {/* ── MÉTRICAS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-px bg-border shrink-0">
        {[
          { icon: Package, label: 'Total', value: metricas.total, color: 'text-foreground' },
          { icon: Layers, label: 'Modelos', value: metricas.modelos, color: 'text-violet-600' },
          { icon: Grid3X3, label: 'Categorias', value: metricas.categorias, color: 'text-blue-600' },
          { icon: TrendingUp, label: 'Usos registrados', value: metricas.usoTotal, color: 'text-emerald-600' },
        ].map(m => (
          <div key={m.label} className="bg-card px-4 py-2.5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className={cn('text-xl font-bold leading-none', m.color)}>{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div className="w-48 shrink-0 border-r border-border flex flex-col bg-muted/20 overflow-y-auto">
          <div className="p-3">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Tipo</p>
            {[
              { id: 'todos', label: 'Todos', count: metricas.total },
              { id: 'catalogo', label: 'Meu Catálogo', count: metricas.total - metricas.modelos },
              { id: 'modelos', label: 'Modelos', count: metricas.modelos },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterModelo(f.id as typeof filterModelo)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors mb-0.5',
                  filterModelo === f.id
                    ? 'bg-primary text-white font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{f.label}</span>
                <Badge
                  variant={filterModelo === f.id ? 'outline' : 'secondary'}
                  className={cn('text-[9px] h-4', filterModelo === f.id && 'border-white/40 text-white bg-white/20')}
                >
                  {f.count}
                </Badge>
              </button>
            ))}

            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 mt-4">Categoria</p>
            <button
              onClick={() => setSelectedCategoria('todos')}
              className={cn(
                'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors mb-0.5',
                selectedCategoria === 'todos'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              Todas
            </button>
            {categoriasDisponiveis.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoria(cat)}
                className={cn(
                  'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors mb-0.5 text-left',
                  selectedCategoria === cat
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
                <span className="truncate">{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── ÁREA PRINCIPAL ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar de busca e view toggle */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, código ou categoria..."
                className="h-8 pl-8 pr-8 text-xs"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
            <div className="flex border border-border rounded-md overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={cn('px-2 h-7 transition-colors', viewMode === 'list' ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground')}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('px-2 h-7 transition-colors', viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-muted text-muted-foreground')}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Lista/Grid */}
          <div className="flex flex-1 overflow-hidden">
            <div className={cn('flex-1 overflow-y-auto', selectedItem ? 'hidden md:block' : '')}>
              {loading ? (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando biblioteca...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground px-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                    <BookOpen className="h-8 w-8 opacity-30" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {items.length === 0 ? 'Biblioteca vazia' : 'Nenhum resultado'}
                    </p>
                    <p className="text-xs mt-1">
                      {items.length === 0
                        ? 'Crie sua primeira composição ou use o ⭐ na planilha orçamentária para salvar composições aqui.'
                        : 'Tente ajustar os filtros de busca.'}
                    </p>
                  </div>
                  {items.length === 0 && (
                    <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5" />
                      Criar primeira composição
                    </Button>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                /* ── LISTA ── */
                <div className="divide-y divide-border/50">
                  {filtered.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors group',
                        selectedItem?.id === item.id && 'bg-primary/5 border-l-2 border-l-primary'
                      )}
                      onClick={() => setSelectedItem(prev => prev?.id === item.id ? null : item)}
                    >
                      {/* Ícone */}
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        item.is_modelo ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-muted'
                      )}>
                        {item.is_modelo
                          ? <Layers className="h-4 w-4 text-violet-500" />
                          : <Package className="h-4 w-4 text-muted-foreground" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {item.is_modelo && (
                            <Badge variant="outline" className="text-[9px] h-4 border-violet-200 text-violet-600 bg-violet-50">Modelo</Badge>
                          )}
                          {item.codigo && (
                            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 rounded">{item.codigo}</span>
                          )}
                          {item.categoria && (
                            <span className="text-[9px] text-muted-foreground">{item.categoria}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{item.nome}</p>
                      </div>

                      {/* Unidade e preço */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-[10px] text-muted-foreground">{item.unidade || '—'}</p>
                        {item.preco_medio && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            {item.preco_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </div>

                      {/* Usos */}
                      {(item.usos ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-[9px] h-4 shrink-0 hidden lg:block">
                          {item.usos}x
                        </Badge>
                      )}

                      {/* Ações no hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); toggleModelo(item); }}
                          className={cn(
                            'h-6 w-6 rounded flex items-center justify-center transition-colors',
                            item.is_modelo ? 'text-violet-500 hover:bg-violet-50' : 'text-muted-foreground hover:bg-muted'
                          )}
                          title={item.is_modelo ? 'Remover de modelos' : 'Marcar como modelo'}
                        >
                          <Layers className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(item); }}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(item.id); }}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── GRID ── */
                <div className="p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'bg-card border border-border rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group',
                        selectedItem?.id === item.id && 'border-primary shadow-md'
                      )}
                      onClick={() => setSelectedItem(prev => prev?.id === item.id ? null : item)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={cn(
                          'h-8 w-8 rounded-lg flex items-center justify-center',
                          item.is_modelo ? 'bg-violet-50' : 'bg-muted'
                        )}>
                          {item.is_modelo ? <Layers className="h-4 w-4 text-violet-500" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); openEdit(item); }} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteId(item.id); }} className="h-6 w-6 rounded hover:bg-destructive/10 flex items-center justify-center">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">{item.nome}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">{item.unidade || '—'}</span>
                        {item.preco_medio && (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            {item.preco_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </div>
                      {item.categoria && (
                        <p className="text-[9px] text-muted-foreground mt-1 truncate">{item.categoria}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── PAINEL DE DETALHE ─────────────────────────────────────────── */}
            {selectedItem && (
              <div className="w-72 shrink-0 border-l border-border flex flex-col bg-card overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Detalhes</span>
                  <button onClick={() => setSelectedItem(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Nome */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selectedItem.is_modelo && (
                        <Badge variant="outline" className="text-[9px] border-violet-200 text-violet-600 bg-violet-50">Modelo</Badge>
                      )}
                      {selectedItem.codigo && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 rounded">{selectedItem.codigo}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{selectedItem.nome}</p>
                  </div>

                  {/* Atributos */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Unidade</p>
                      <p className="font-medium">{selectedItem.unidade || '—'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Preço médio</p>
                      <p className="font-medium text-emerald-600">
                        {selectedItem.preco_medio
                          ? selectedItem.preco_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Categoria</p>
                      <p className="font-medium">{selectedItem.categoria || '—'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Usos</p>
                      <p className="font-medium">{selectedItem.usos ?? 0}x</p>
                    </div>
                  </div>

                  {/* Origem */}
                  {selectedItem.origem && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Origem: <span className="capitalize">{selectedItem.origem}</span>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="space-y-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 h-8 text-xs"
                      onClick={() => openEdit(selectedItem)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar Composição
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        'w-full gap-2 h-8 text-xs',
                        selectedItem.is_modelo
                          ? 'text-violet-600 border-violet-200 hover:bg-violet-50'
                          : ''
                      )}
                      onClick={() => toggleModelo(selectedItem)}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {selectedItem.is_modelo ? 'Remover de Modelos' : 'Marcar como Modelo'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 h-8 text-xs text-destructive hover:bg-destructive/5 border-destructive/20"
                      onClick={() => setDeleteId(selectedItem.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DIALOG CRIAR/EDITAR ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Composição' : 'Nova Composição'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-xs font-medium text-muted-foreground">Código</label>
                <Input
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="01.01"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                <Input
                  value={form.unidade}
                  onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                  placeholder="m², kg, un..."
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome da composição *</label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Alvenaria em bloco cerâmico 14x19x39cm"
                className="h-8 text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Preço médio (R$)</label>
                <Input
                  value={form.preco_medio}
                  onChange={e => setForm(f => ({ ...f, preco_medio: e.target.value }))}
                  placeholder="0,00"
                  className="h-8 text-sm mt-1"
                  inputMode="decimal"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_modelo}
                onChange={e => setForm(f => ({ ...f, is_modelo: e.target.checked }))}
                className="rounded"
              />
              <span className="text-xs text-foreground">Marcar como Modelo (disponível para outras obras)</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG EXCLUIR ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta composição será removida do catálogo da empresa. Composições já usadas em orçamentos não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
