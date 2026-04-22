import React, { useState, useMemo, useRef } from 'react';
import {
  Plus, List, Trash2, ChevronRight, Check, X, Search, RefreshCw,
  Sparkles, Package, User, Tag, AlertCircle, FolderOpen, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCotacaoListas, CotacaoLista, ListaStatus } from '@/hooks/useCotacaoListas';
import type { CotacaoCategoria } from '@/hooks/useCotacaoCategorias';
import { inferirCategoriaObj } from '@/utils/cotacaoCategorias';
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, useDraggable, DragOverlay, closestCenter } from '@dnd-kit/core';

// ── DnD Wrappers ───────────────────────────────────────────────────────────────

function DroppableLista({ lista, isSelected, statusMeta, children, className, onClick }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: lista.id,
    data: { type: 'lista', lista }
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(className, isOver && 'ring-2 ring-primary ring-inset bg-primary/10 shadow-md')}
    >
      {children}
    </div>
  );
}

function DraggableItem({ item, children, className }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.key,
    data: { type: 'item', item }
  });

  return (
    <tr
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(className, isDragging ? 'opacity-50 select-none bg-muted' : 'cursor-grab active:cursor-grabbing hover:bg-muted/50')}
    >
      {children}
    </tr>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
  etapaNome: string;
  etapaId: string;
  fonteReferencia?: string;
}

interface Props {
  itens: MapaItem[];
  obraId: string;
  companyId: string | undefined;
  categorias: CotacaoCategoria[];
  /** Fornecedores cadastrados nesta obra */
  fornecedores: { id: string; nome: string; email?: string | null }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ListaStatus, { label: string; color: string }> = {
  rascunho:   { label: 'Rascunho',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  pronto:     { label: 'Pronto',     color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  enviada:    { label: 'Enviada',    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  respondida: { label: 'Respondida', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  parcial:    { label: 'Parcial',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

function normalize(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CotacaoListasView({ itens, obraId, companyId, categorias, fornecedores }: Props) {
  const {
    listas, modelos, loading, saving,
    criarLista, criarDeModelo, salvarComoModelo,
    renomearLista, deletarLista,
    removerItem, adicionarItens, reload,
  } = useCotacaoListas(obraId, companyId);

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedListaId, setSelectedListaId] = useState<string | null>(null);
  const [showNovaLista, setShowNovaLista] = useState(false);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novaListaSelecionados, setNovaListaSelecionados] = useState<Set<string>>(new Set());
  const [novaListaBusca, setNovaListaBusca] = useState('');
  const [novaListaEtapa, setNovaListaEtapa] = useState('todas');
  const [criandoAuto, setCriandoAuto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renomearId, setRenomearId] = useState<string | null>(null);
  const [renomearValor, setRenomearValor] = useState('');
  const renomearRef = useRef<HTMLInputElement>(null);
  const [showModelos, setShowModelos] = useState(false);
  const [salvandoModeloId, setSalvandoModeloId] = useState<string | null>(null);

  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedLista = listas.find(l => l.id === selectedListaId) ?? null;

  // Items already in any list
  const keysEmListas = useMemo(() => {
    const s = new Set<string>();
    for (const l of listas) for (const k of l.item_keys) s.add(k);
    return s;
  }, [listas]);

  // Items sem preço (candidatos para lista)
  const itensSemPreco = useMemo(
    () => itens.filter(i => !i.precoAtual || i.precoAtual === 0),
    [itens]
  );

  // Items filtered for the Nova Lista dialog
  const etapas = useMemo(() => [...new Set(itens.map(i => i.etapaNome))], [itens]);

  const itensFiltradosDialog = useMemo(() => {
    return itensSemPreco.filter(i => {
      if (novaListaEtapa !== 'todas' && i.etapaNome !== novaListaEtapa) return false;
      if (novaListaBusca && !normalize(i.descricao).includes(normalize(novaListaBusca))) return false;
      return true;
    });
  }, [itensSemPreco, novaListaEtapa, novaListaBusca]);

  // Items of selected list (with details)
  const itensSelected = useMemo(() => {
    if (!selectedLista) return [];
    return selectedLista.item_keys
      .map(k => itens.find(i => i.key === k))
      .filter(Boolean) as MapaItem[];
  }, [selectedLista, itens]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function confirmarNovaLista() {
    if (!novaListaNome.trim() || novaListaSelecionados.size === 0) return;
    const lista = await criarLista(novaListaNome.trim(), [...novaListaSelecionados]);
    if (lista) {
      setSelectedListaId(lista.id);
      setShowNovaLista(false);
      setNovaListaNome('');
      setNovaListaSelecionados(new Set());
      setNovaListaBusca('');
    }
  }

  async function criarListasAutomaticas() {
    if (criandoAuto) return;
    setCriandoAuto(true);
    try {
      // Group items by inferred category
      const grupos: Record<string, { nome: string; emoji: string; items: string[] }> = {};
      const semCategoria: string[] = [];

      for (const item of itensSemPreco) {
        if (keysEmListas.has(item.key)) continue; // skip if already in a list
        const cat = inferirCategoriaObj(item.descricao, categorias);
        if (cat) {
          const key = cat.codigo;
          if (!grupos[key]) grupos[key] = { nome: cat.nome, emoji: cat.emoji || '📦', items: [] };
          grupos[key].items.push(item.key);
        } else {
          semCategoria.push(item.key);
        }
      }

      // Create one list per group (min 1 item)
      let lastId: string | null = null;
      for (const [, grupo] of Object.entries(grupos)) {
        if (grupo.items.length === 0) continue;
        const lista = await criarLista(`${grupo.emoji} ${grupo.nome}`, grupo.items, 'automatica');
        if (lista) lastId = lista.id;
      }
      if (semCategoria.length > 0) {
        const lista = await criarLista('📦 Diversos', semCategoria, 'automatica');
        if (lista) lastId = lista.id;
      }
      if (lastId) setSelectedListaId(lastId);
    } finally {
      setCriandoAuto(false);
    }
  }

  async function confirmarRenomear() {
    if (!renomearId || !renomearValor.trim()) return;
    await renomearLista(renomearId, renomearValor.trim());
    setRenomearId(null);
  }

  function toggleItemDialog(key: string) {
    setNovaListaSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === 'item' && over.data.current?.type === 'lista') {
      const itemKey = active.id as string;
      const listaId = over.id as string;
      
      if (!keysEmListas.has(itemKey)) {
        await adicionarItens(listaId, [itemKey]);
      }
    }
  }

  const activeItemData = activeDragId ? itensSemPreco.find(i => i.key === activeDragId) : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar da etapa ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 shrink-0">
        <span className="text-xs text-muted-foreground">
          {itensSemPreco.length} itens sem preço ·{' '}
          {listas.length} {listas.length === 1 ? 'lista criada' : 'listas criadas'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Carregar de modelo (só aparece se há modelos) */}
          {modelos.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => setShowModelos(v => !v)}
            >
              <Star className="h-3.5 w-3.5" />
              {modelos.length} modelo{modelos.length !== 1 ? 's' : ''}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={criarListasAutomaticas}
            disabled={criandoAuto || itensSemPreco.length === 0}
          >
            {criandoAuto
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5 text-violet-500" />}
            Criar listas automáticas
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => { setNovaListaNome(''); setNovaListaSelecionados(new Set()); setShowNovaLista(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova lista
          </Button>
        </div>
      </div>

      {/* ── Painel de Modelos (templates da empresa) ─────────── */}
      {showModelos && modelos.length > 0 && (
        <div className="border-b bg-amber-50/50 dark:bg-amber-950/10 px-4 py-3 shrink-0 animate-in slide-in-from-top-1 duration-150">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Modelos salvos — clique em "Usar" para criar uma cópia nesta obra
          </p>
          <div className="flex flex-wrap gap-2">
            {modelos.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-background border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
                <span className="text-xs font-medium">{m.nome}</span>
                <span className="text-[10px] text-muted-foreground">{m.item_keys.length} itens</span>
                <Button
                  size="sm" variant="ghost"
                  className="h-5 text-[10px] px-1.5 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/30"
                  onClick={async () => {
                    const lista = await criarDeModelo(m.id);
                    if (lista) { setSelectedListaId(lista.id); setShowModelos(false); }
                  }}
                  disabled={saving}
                >
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Conteúdo 2 colunas com Drag & Drop ──────────────── */}
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">

          {/* Coluna esquerda — Lista de listas */}
        <div className="w-[40%] border-r flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Carregando listas...
            </div>
          ) : listas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nenhuma lista criada</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Use "Criar automáticas" para agrupar por categoria ou crie manualmente.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={() => { setNovaListaNome(''); setNovaListaSelecionados(new Set()); setShowNovaLista(true); }}>
                <Plus className="h-3.5 w-3.5" />
                Nova lista
              </Button>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {listas.map(lista => {
                  const isSelected = lista.id === selectedListaId;
                  const statusMeta = STATUS_LABELS[lista.status];
                  return (
                    <DroppableLista
                      key={lista.id}
                      lista={lista}
                      isSelected={isSelected}
                      onClick={() => setSelectedListaId(isSelected ? null : lista.id)}
                      className={cn(
                        'group relative rounded-lg border p-3 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary/40 bg-primary/5 shadow-sm'
                          : 'border-border hover:border-border/80 hover:bg-muted/40'
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-md flex items-center justify-center text-xs shrink-0',
                          isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          <List className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {renomearId === lista.id ? (
                            <Input
                              ref={renomearRef}
                              value={renomearValor}
                              onChange={e => setRenomearValor(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') confirmarRenomear(); if (e.key === 'Escape') setRenomearId(null); }}
                              onBlur={confirmarRenomear}
                              className="h-5 text-xs px-1 py-0"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <p className="text-sm font-medium truncate leading-tight">
                              {lista.nome}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {lista.item_keys.length} {lista.item_keys.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', statusMeta.color)}>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Fornecedores */}
                      {lista.fornecedores.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 pl-10">
                          <User className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {lista.fornecedores.map(f => f.nome).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Actions (visible on hover) */}
                      <div
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {!lista.is_template && (
                          <button
                            className="p-1 rounded hover:bg-amber-50 text-muted-foreground hover:text-amber-600"
                            title="Salvar como modelo"
                            onClick={async () => {
                              setSalvandoModeloId(lista.id);
                              await salvarComoModelo(lista.id);
                              setSalvandoModeloId(null);
                            }}
                            disabled={salvandoModeloId === lista.id}
                          >
                            {salvandoModeloId === lista.id
                              ? <RefreshCw className="h-3 w-3 animate-spin" />
                              : <Star className="h-3 w-3" />}
                          </button>
                        )}
                        <button
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Renomear"
                          onClick={() => { setRenomearId(lista.id); setRenomearValor(lista.nome); }}
                        >
                          <Tag className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"
                          title="Excluir lista"
                          onClick={() => setConfirmDeleteId(lista.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Arrow indicator */}
                      {isSelected && (
                        <ChevronRight className="absolute right-2 bottom-3 h-3.5 w-3.5 text-primary/60" />
                      )}
                    </DroppableLista>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Coluna direita — Itens da lista selecionada */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedLista ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 bg-muted/10">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Itens sem preço (Avulsos)</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Arraste itens para suas listas na esquerda
                </span>
              </div>
              <ScrollArea className="flex-1 bg-muted/5">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr>
                      <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Item</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider w-20">Un</th>
                      <th className="text-center px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider w-20">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensSemPreco.filter(i => !keysEmListas.has(i.key)).map((item, idx) => (
                      <DraggableItem key={item.key} item={item} className={cn('border-b transition-colors bg-background', idx % 2 === 0 ? '' : 'bg-muted/30')}>
                        <td className="px-4 py-2 font-medium flex items-center gap-2 text-sm">
                           <span className="cursor-grab text-muted-foreground/40 hover:text-foreground">⋮⋮</span>
                           {item.descricao}
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{item.unidade || '—'}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">
                          {item.quantidade != null ? item.quantidade : '—'}
                        </td>
                      </DraggableItem>
                    ))}
                    {itensSemPreco.filter(i => !keysEmListas.has(i.key)).length === 0 && (
                       <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">Nenhum item avulso faltando organizar!</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          ) : (
            <>
              {/* Right header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0">
                <span className="text-sm font-medium">{selectedLista.nome}</span>
                <Badge variant="outline" className={cn('text-[10px] border-0', STATUS_LABELS[selectedLista.status].color)}>
                  {STATUS_LABELS[selectedLista.status].label}
                </Badge>
                <span className="text-xs text-muted-foreground ml-1">
                  {itensSelected.length} {itensSelected.length === 1 ? 'item' : 'itens'}
                </span>
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
              </div>

              {itensSelected.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
                  <AlertCircle className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Esta lista não tem itens. Adicione itens clicando em "Nova lista" e edite.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b z-10">
                      <tr>
                        <th className="text-left px-4 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Item</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider w-20">Un</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider w-20">Qtd</th>
                        <th className="text-muted-foreground px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensSelected.map((item, idx) => (
                        <tr key={item.key} className={cn('border-b transition-colors hover:bg-muted/30', idx % 2 === 0 ? '' : 'bg-muted/10')}>
                          <td className="px-4 py-2 font-medium">{item.descricao}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{item.unidade || '—'}</td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {item.quantidade != null ? item.quantidade : '—'}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removerItem(selectedLista.id, item.key)}
                              className="p-1 rounded text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remover da lista"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </>
          )}
        </div>

        {/* Overlay Drag */}
        <DragOverlay>
           {activeItemData ? (
             <div className="bg-background border shadow-xl rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 opacity-90">
               <span className="text-muted-foreground">⋮⋮</span>
               {activeItemData.descricao}
             </div>
           ) : null}
        </DragOverlay>

        </div>
      </DndContext>

      {/* ── Dialog Nova Lista ─────────────────────────────────── */}
      <Dialog open={showNovaLista} onOpenChange={setShowNovaLista}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova lista de cotação
            </DialogTitle>
          </DialogHeader>

          {/* Nome */}
          <div className="px-6 py-3 border-b shrink-0">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nome da lista
            </label>
            <Input
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              placeholder="Ex: Materiais Hidráulicos, Estrutura..."
              className="mt-1.5 h-9"
              autoFocus
            />
          </div>

          {/* Filtros + itens */}
          <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={novaListaBusca}
                onChange={e => setNovaListaBusca(e.target.value)}
                placeholder="Buscar item..."
                className="pl-8 h-7 text-xs"
              />
            </div>
            <select
              value={novaListaEtapa}
              onChange={e => setNovaListaEtapa(e.target.value)}
              className="h-7 text-xs rounded-md border border-input bg-background px-2 text-muted-foreground"
            >
              <option value="todas">Todas as etapas</option>
              {etapas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <span className="text-xs text-muted-foreground shrink-0">
              {novaListaSelecionados.size} selecionado{novaListaSelecionados.size !== 1 ? 's' : ''}
            </span>
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {itensFiltradosDialog.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                  <Search className="h-6 w-6 opacity-40" />
                  <p className="text-sm">Nenhum item encontrado</p>
                  <p className="text-xs opacity-60">Ajuste os filtros ou a busca</p>
                </div>
              ) : (
                itensFiltradosDialog.map(item => {
                  const isSelected = novaListaSelecionados.has(item.key);
                  const jaEmLista = keysEmListas.has(item.key);
                  return (
                    <div
                      key={item.key}
                      onClick={() => !jaEmLista && toggleItemDialog(item.key)}
                      className={cn(
                        'flex items-center gap-3 px-6 py-2.5 transition-colors',
                        jaEmLista
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'bg-primary/5 cursor-pointer'
                            : 'hover:bg-muted/40 cursor-pointer'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-border'
                      )}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{item.descricao}</span>
                        {jaEmLista && (
                          <span className="text-[10px] text-muted-foreground ml-2 italic">já em uma lista</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{item.unidade}</span>
                      <span className="text-xs text-muted-foreground/60 shrink-0 min-w-[60px] text-right">
                        {item.etapaNome}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNovaLista(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmarNovaLista}
              disabled={!novaListaNome.trim() || novaListaSelecionados.size === 0 || saving}
              className="gap-1.5"
            >
              {saving
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Check className="h-3.5 w-3.5" />}
              Criar lista ({novaListaSelecionados.size} itens)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Delete ───────────────────────────── */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir lista
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta lista? Os itens não serão afetados.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirmDeleteId) {
                  if (selectedListaId === confirmDeleteId) setSelectedListaId(null);
                  await deletarLista(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
