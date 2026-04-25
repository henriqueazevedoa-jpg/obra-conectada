import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, List, Trash2, ChevronRight, Check, X, Search, RefreshCw,
  Sparkles, Package, User, Tag, AlertCircle, FolderOpen, Star, MoreHorizontal, Menu
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
import type { MapaItem, MapaFornecedor } from '@/types/cotacao';
import CotacaoComparativoTable from './CotacaoComparativoTable';

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

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  itens: MapaItem[];
  obraId: string;
  companyId: string | undefined;
  categorias: CotacaoCategoria[];
  todosFornecedores: MapaFornecedor[];
  contexto?: 'orcamento' | 'compra'; // FASE 1: adicionado conforme prop real passada
  historico: Record<string, { preco: number; ocorrencias: number }>;
  onUpdatePrecoManual: (itemKey: string, fornId: string, fornNome: string, value: number) => Promise<void>;
  onAddFornecedor: (nome: string) => Promise<void>;
  onRemoveFornecedor: (fornId: string, fornNome: string) => Promise<void>;
}

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

export default function CotacaoSplitView({
  itens, obraId, companyId, categorias, todosFornecedores, historico,
  onUpdatePrecoManual, onAddFornecedor, onRemoveFornecedor
}: Props) {
  const {
    listas, modelos, loading, saving,
    criarLista, criarDeModelo, salvarComoModelo,
    renomearLista, deletarLista,
    removerItem, adicionarItens, reload,
  } = useCotacaoListas(obraId, companyId);

  // ── State ────────────────────────────────────────────────────────────────────
  const STORAGE_KEY = `lastra_cotacao_lista_ativa_${obraId}`;
  
  // Persistência inicial
  const getInitialLista = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? saved : '__sem_lista__';
  };

  const [selectedListaId, setSelectedListaIdState] = useState<string | null>(getInitialLista());
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Intercept setter para gravar no localstorage
  const setSelectedListaId = (id: string | null) => {
    setSelectedListaIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
    setDrawerOpen(false); // fecha o drawer mobile ao selecionar
  };

  const [showNovaLista, setShowNovaLista] = useState(false);
  const [novaListaNome, setNovaListaNome] = useState('');
  const [novaListaSelecionados, setNovaListaSelecionados] = useState<Set<string>>(new Set());
  const [novaListaBusca, setNovaListaBusca] = useState('');
  const [novaListaEtapa, setNovaListaEtapa] = useState('todas');
  const [criandoAuto, setCriandoAuto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // DnD state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const selectedLista = listas.find(l => l.id === selectedListaId) ?? null;

  const keysEmListas = useMemo(() => {
    const s = new Set<string>();
    for (const l of listas) for (const k of l.item_keys) s.add(k);
    return s;
  }, [listas]);

  const itensSemPreco = useMemo(
    () => itens.filter(i => !i.precoAtual || i.precoAtual === 0),
    [itens]
  );
  
  const itensSemLista = useMemo(
    () => itensSemPreco.filter(i => !keysEmListas.has(i.key)),
    [itensSemPreco, keysEmListas]
  );

  const itensFiltradosDialog = useMemo(() => {
    return itensSemPreco.filter(i => {
      if (novaListaEtapa !== 'todas' && i.etapaNome !== novaListaEtapa) return false;
      if (novaListaBusca && !normalize(i.descricao).includes(normalize(novaListaBusca))) return false;
      return true;
    });
  }, [itensSemPreco, novaListaEtapa, novaListaBusca]);

  const itensSelected = useMemo(() => {
    if (selectedListaId === '__sem_lista__') return itensSemLista;
    if (!selectedLista) return [];
    return selectedLista.item_keys
      .map(k => itens.find(i => i.key === k))
      .filter(Boolean) as MapaItem[];
  }, [selectedListaId, selectedLista, itens, itensSemLista]);

  const activeItemData = activeDragId ? itens.find(i => i.key === activeDragId) : null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function confirmarNovaLista() {
    if (!novaListaNome.trim()) return;
    const lista = await criarLista(novaListaNome.trim(), [...novaListaSelecionados]);
    if (lista) {
      setSelectedListaId(lista.id);
      setShowNovaLista(false);
      setNovaListaNome('');
      setNovaListaSelecionados(new Set());
      setNovaListaBusca('');
    }
  }

  function toggleItemDialog(key: string) {
    setNovaListaSelecionados(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  // ── DnD Handlers ─────────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    
    const dragData = active.data.current;
    const dropData = over.data.current;

    if (dragData?.type === 'item' && dropData?.type === 'lista') {
      const listaId = dropData.lista.id;
      const itemKey = dragData.item.key;
      if (selectedListaId === listaId) return; // já está nessa lista (ou arrastou pro vazio)
      if (listaId === '__sem_lista__') {
        // Remover de todas as listas (opcional, pode implementar)
        if (selectedLista) await removerItem(selectedLista.id, itemKey);
        return;
      }
      // Se estava em outra lista, remove da antiga e adiciona na nova (ou apenas adiciona na nova se for multiselect)
      // O backend do hook adicionarItens só faz append
      await adicionarItens(listaId, [itemKey]);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        
        {/* BOTÃO MOBILE PRA ABRIR LISTAS */}
        <div className="md:hidden absolute top-3 left-3 z-20">
          <Button variant="outline" size="icon" onClick={() => setDrawerOpen(true)} className="h-8 w-8 bg-white/80 backdrop-blur">
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* ── PAINEL ESQUERDO: Listas (Responsivo) ── */}
        <div className={cn(
          "flex flex-col bg-slate-50/50 border-r shrink-0 transition-transform duration-300 z-30 absolute md:relative h-full md:translate-x-0 w-[260px]",
          drawerOpen ? "translate-x-0 bg-white shadow-2xl" : "-translate-x-full"
        )}>
          {/* Header Painel Esquerdo */}
          <div className="p-3 border-b flex items-center justify-between shrink-0 bg-white md:bg-transparent">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
              <FolderOpen className="h-4 w-4 text-slate-500" />
              Listas de Cotação
            </h3>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-800" onClick={() => setShowNovaLista(true)}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden text-slate-500" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              <DroppableLista
                lista={{ id: '__sem_lista__' }}
                onClick={() => setSelectedListaId('__sem_lista__')}
                className={cn(
                  'group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border',
                  selectedListaId === '__sem_lista__'
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Package className={cn("h-4 w-4 shrink-0", selectedListaId === '__sem_lista__' ? "text-primary" : "text-slate-400")} />
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-xs font-medium truncate", selectedListaId === '__sem_lista__' ? "text-primary font-semibold" : "text-slate-700")}>
                      Itens sem lista
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                  {itensSemLista.length}
                </span>
              </DroppableLista>

              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Carregando...
                </div>
              ) : (
                listas.map(lista => {
                  const meta = STATUS_LABELS[lista.status];
                  const isSelected = selectedListaId === lista.id;
                  return (
                    <DroppableLista
                      key={lista.id}
                      lista={lista}
                      isSelected={isSelected}
                      onClick={() => setSelectedListaId(lista.id)}
                      className={cn(
                        'group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border',
                        isSelected
                          ? 'bg-primary border-primary shadow-sm'
                          : 'bg-white border-slate-200/60 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <List className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary-foreground" : "text-slate-400")} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn("text-xs truncate font-medium", isSelected ? "text-primary-foreground font-semibold" : "text-slate-700")}>
                            {lista.nome}
                          </span>
                          {!isSelected && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", meta.color.split(' ')[0])} />
                              {meta.label}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(lista.id); }}
                          className={cn(
                            "p-1 rounded transition-all md:opacity-0 md:group-hover:opacity-100",
                            isSelected 
                              ? "text-primary-foreground/70 hover:text-white hover:bg-primary-foreground/20" 
                              : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          )}
                          title="Excluir lista"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] text-center",
                          isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-slate-100 text-slate-600"
                        )}>
                          {lista.item_keys.length}
                        </span>
                      </div>
                    </DroppableLista>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── PAINEL DIREITO: Tabela Comparativa (Opção B) ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative pt-10 md:pt-0">
          <CotacaoComparativoTable
            itensFiltrados={itensSelected}
            todosFornecedores={todosFornecedores}
            historicoPrecos={historico}
            onUpdatePrecoManual={onUpdatePrecoManual}
            onAddFornecedor={onAddFornecedor}
            onRemoveFornecedor={onRemoveFornecedor}
            companyId={companyId}
            obraId={obraId}
            onRemoveItemDaLista={selectedLista ? async (key) => removerItem(selectedLista.id, key) : undefined}
          />
        </div>

        {/* Overlay Drag */}
        <DragOverlay>
           {activeItemData ? (
             <div className="bg-white border shadow-xl rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 opacity-90 z-50">
               <span className="text-slate-400">⋮⋮</span>
               <span className="truncate max-w-[200px]">{activeItemData.descricao}</span>
             </div>
           ) : null}
        </DragOverlay>

      </DndContext>

      {/* ── Dialog Nova Lista (Cópia simplificada) ── */}
      <Dialog open={showNovaLista} onOpenChange={setShowNovaLista}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova lista de cotação
            </DialogTitle>
          </DialogHeader>

          {/* Nome */}
          <div className="px-6 py-3 border-b shrink-0 bg-slate-50/50">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nome da lista</label>
            <Input
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              placeholder="Ex: Materiais Hidráulicos..."
              className="mt-1.5 h-9 bg-white"
              autoFocus
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {itensFiltradosDialog.length === 0 ? (
                <div className="p-8 text-center text-slate-500">Nenhum item encontrado</div>
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
                        jaEmLista ? 'opacity-40 cursor-not-allowed' : isSelected ? 'bg-primary/5 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'
                      )}
                    >
                      <div className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors', isSelected ? 'bg-primary border-primary' : 'border-slate-300')}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-800">{item.descricao}</span>
                        {jaEmLista && <span className="text-[10px] text-slate-400 ml-2 italic">já em uma lista</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2 bg-slate-50">
            <Button variant="ghost" size="sm" onClick={() => setShowNovaLista(false)}>Cancelar</Button>
            <Button size="sm" onClick={confirmarNovaLista} disabled={!novaListaNome.trim() || saving}>
              {novaListaSelecionados.size > 0 ? `Criar lista (${novaListaSelecionados.size} itens)` : 'Criar lista vazia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Delete ── */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir lista</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Tem certeza? Os itens voltarão para "Itens sem lista".</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={async () => {
              if (confirmDeleteId) {
                if (selectedListaId === confirmDeleteId) setSelectedListaId('__sem_lista__');
                await deletarLista(confirmDeleteId);
                setConfirmDeleteId(null);
              }
            }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
