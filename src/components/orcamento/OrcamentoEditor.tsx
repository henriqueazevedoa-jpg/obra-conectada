import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { normalizeUnit } from '@/lib/formatters';
import { flattenTree, buildTree, getVisibleItems, moveItem, FlatItem } from '@/utils/treeSort';
import {
  useOrcamento,
  OrcamentoObra,
  OrcamentoEtapa,
} from '@/contexts/OrcamentoContext';
import { useObras } from '@/contexts/ObrasContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrcamentoShortcutsModal } from './OrcamentoShortcutsModal';
import {
  Plus,
  Save,
  Copy,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  DatabaseZap,
  LayoutTemplate,
  MoreHorizontal,
  Settings2,
  AlertTriangle,
  RefreshCw,
  Check,
  XCircle,
  Rows3,
  ClipboardPaste,
  ClipboardList,
  Zap,
  LayoutGrid,
  AlignJustify,
  Minimize2,
  Sparkles,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';
import EtapaBlock from './EtapaBlock';
import { SinapiConfigModal } from './SinapiConfigModal';
import { formatCompetencia } from '@/utils/sinapiFormatters';
import ComposicaoRow, { COMPOSICAO_GRID } from './ComposicaoRow';
import { 
  PLANILHA_FLEX_ROW, CELL_DESC, CELL_TIPO, CELL_UN, 
  CELL_QTD, CELL_PUNIT, CELL_TOTAL, CELL_ACOES 
} from './planilhaGrid';
import EtapaBlockCard from './EtapaBlockCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import ImportarSinapiDialog from './ImportarSinapiDialog';
import CatalogDrawer, { CarrinhoItem } from './CatalogDrawer';
import QuickStartModal from './QuickStartModal';
import PasteImportDialog, { PastedComposicao } from './PasteImportDialog';
import BdiPopover, { BdiConfig, DEFAULT_BDI } from './BdiPopover';

import {
  expandirComposicaoSinapi,
  type SinapiRegime,
  type SinapiComposicaoExpandida,
} from '@/lib/sinapi/expandComposicao';
import { sinapiExpandidaParaOrcamentoComposicao } from '@/lib/sinapi/toOrcamento';
import { useOrcamentoUndo } from '@/hooks/useOrcamentoUndo';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { OrcamentoVersao } from '@/contexts/OrcamentoContext';
import { useCompany } from '@/contexts/CompanyContext';
import { PLANILHA_GRID } from './planilhaGrid';

// UFs do Brasil
const UFS_BRASIL = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];





// ── Wrapper sortable para DnD — passa listeners para o filho via render prop ───────
// O EtapaBlock recebe `dragListeners` e os aplica ao seu drag handle
function SortableEtapaWrapper({
  id, children,
}: {
  id: string;
  children: (props: { dragListeners: React.HTMLAttributes<HTMLElement> }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    data: { type: 'etapa' }
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="relative"
      {...attributes}
    >
      {children({ dragListeners: listeners ?? {} })}
    </div>
  );
}

interface Props {
  obraId: string;
  obraNome: string;
  readOnly?: boolean;
  onBack: () => void;
  /** 3C: Navegar à aba Cotação com item pré-filtrado */
  onGoCotacao?: (descricao: string) => void;
  /** Sprint 4: versão ativa lifted do OrcamentoCentral */
  versaoAtiva?: OrcamentoVersao | null;
  /** Sprint 4: callback quando versão muda */
  onVersaoChange?: (v: OrcamentoVersao) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Componente interno para Dropdown de Bulk Action ────────────────────────
function BulkListaDropdown({
  obraId,
  selectedIds,
  onClearSelection
}: {
  obraId: string;
  selectedIds: Set<string>;
  onClearSelection: () => void;
}) {
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [lotes, setLotes] = useState<{ id: string; titulo: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaLista, setNovaLista] = useState('');
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (!open || !obraId || !company?.id) return;
    const fetchLotes = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('cotacao_lotes')
        .select('id, titulo')
        .eq('obra_id', obraId)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (data) setLotes(data);
      setLoading(false);
    };
    fetchLotes();
  }, [open, obraId, company?.id]);

  const addToLote = async (loteId: string, titulo: string) => {
    setCriando(true);
    let adicionados = 0;
    try {
      const inserts = Array.from(selectedIds).map(id => ({
        lote_id: loteId,
        item_origem_id: id,
      }));
      // UPSERT to ignore duplicates
      const { error } = await (supabase as any)
        .from('cotacao_lote_itens')
        .upsert(inserts, { onConflict: 'lote_id,item_origem_id', ignoreDuplicates: true });
        
      if (error) throw error;
      adicionados = selectedIds.size;
      toast({ title: `Adicionados à lista`, description: `${adicionados} itens adicionados à "${titulo}"` });
      setOpen(false);
      onClearSelection();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setCriando(false);
    }
  };

  const criarEAdicionar = async () => {
    if (!novaLista.trim() || !obraId || !company?.id) return;
    setCriando(true);
    try {
      const { data: novoLote, error: errLote } = await (supabase as any)
        .from('cotacao_lotes')
        .insert({
          obra_id: obraId,
          company_id: company.id,
          titulo: novaLista.trim(),
          status: 'rascunho'
        })
        .select('id')
        .single();
      if (errLote) throw errLote;

      await addToLote(novoLote.id, novaLista.trim());
      setNovaLista('');
    } catch (e: any) {
      toast({ title: 'Erro ao criar lista', description: e.message, variant: 'destructive' });
      setCriando(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
          <ClipboardList className="h-3 w-3" />
          Adicionar à lista <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="p-2 border-b border-border/50 bg-muted/20">
          <Input
            autoFocus
            placeholder="Nova lista + Enter"
            className="h-7 text-xs bg-background"
            value={novaLista}
            onChange={e => setNovaLista(e.target.value)}
            disabled={criando}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                criarEAdicionar();
              }
            }}
          />
        </div>
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Carregando...</div>
        ) : lotes.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma lista existente</div>
        ) : (
          <ScrollArea className="max-h-60">
            {lotes.map(lote => (
              <DropdownMenuItem
                key={lote.id}
                onClick={(e) => { e.preventDefault(); addToLote(lote.id, lote.titulo); }}
                disabled={criando}
                className="text-xs py-2 cursor-pointer"
              >
                {lote.titulo}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function OrcamentoEditor({
  obraId,
  obraNome,
  readOnly,
  onBack,
  onGoCotacao,
  versaoAtiva: versaoAtivaProp,
  onVersaoChange,
}: Props) {
  const {
    getOrcamento,
    saveOrcamento,
    orcamentos,
    catalogoEtapas,
    generateEtapaCodigo,
    getUnidadesUsadas,
    generateComposicaoCodigo,
    generateInsumoCodigo,
    recalcularWBS,
    getVersaoAtiva,
    getVersoes,
    getEtapasDaVersao,
    salvarVersao,
    loading,
    sinapiConfig,
    updateSinapiConfig,
  } = useOrcamento();

  // Sprint 4: versão ativa — usa prop do Central quando disponível
  const [versaoAtivaInternal, setVersaoAtivaInternal] = useState<OrcamentoVersao | null>(null);
  const versaoAtiva = versaoAtivaProp !== undefined ? versaoAtivaProp : versaoAtivaInternal;
  const setVersaoAtiva = (v: OrcamentoVersao) => {
    setVersaoAtivaInternal(v);
    onVersaoChange?.(v);
  };
  useEffect(() => {
    const v = getVersaoAtiva(obraId);
    if (v) setVersaoAtivaInternal(v);
  }, [obraId, getVersaoAtiva]);

  const { obras } = useObras();
  const obra = obras.find(o => o.id === obraId);
  const [bdiConfig, setBdiConfig] = useState<BdiConfig>(DEFAULT_BDI);

  useEffect(() => {
    if (obra?.orcamento_bdi_config) {
      setBdiConfig(obra.orcamento_bdi_config as BdiConfig);
    }
  }, [obra?.orcamento_bdi_config]);

  const [etapas, setEtapas] = useState<OrcamentoEtapa[]>([]);
  const etapasRef = useRef(etapas);
  useEffect(() => { etapasRef.current = etapas; }, [etapas]);
  const undoManager = useOrcamentoUndo();

  const [viewMode, setViewMode] = useState<'cards' | 'excel'>(() => {
    return (localStorage.getItem('lastra_orcamento_view_mode') as 'cards' | 'excel') || 'excel';
  });

  const toggleViewMode = (mode: 'cards' | 'excel') => {
    setViewMode(mode);
    localStorage.setItem('lastra_orcamento_view_mode', mode);
  };

  const applyTextFormat = async (mode: 'title'|'upper'|'lower') => {
    const LOWER_WORDS = new Set(['de','da','do','das','dos','e','a','o','em','no','na','por','para','com']);
    const transformText = (text: string, m: 'title'|'upper'|'lower') => {
      if (!text) return text;
      if (m === 'upper') return text.toUpperCase();
      if (m === 'lower') return text.toLowerCase();
      // title case respeitando artigos
      return text.toLowerCase().split(' ').map((w, i) =>
        i === 0 || !LOWER_WORDS.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
      ).join(' ');
    };

    const nextEtapas = etapas.map(etapa => ({
      ...etapa,
      nome: transformText(etapa.nome, mode),
      items: etapa.items.map(item => {
        if (item.tipo === 'etapa') {
          return { ...item, nome: transformText((item as OrcamentoEtapa).nome, mode) };
        } else {
          const comp = item as OrcamentoComposicao;
          return {
            ...comp,
            descricao: transformText(comp.descricao, mode),
            unidade: mode === 'upper' ? comp.unidade.toUpperCase()
                    : mode === 'lower' ? comp.unidade.toLowerCase()
                    : comp.unidade.toUpperCase(),
            insumos: comp.insumos.map(ins => ({
              ...ins,
              descricao: transformText(ins.descricao, mode),
              unidade: mode === 'upper' ? ins.unidade.toUpperCase()
                     : mode === 'lower' ? ins.unidade.toLowerCase()
                     : ins.unidade.toUpperCase(),
            })),
          };
        }
      }),
    }));
    
    setEtapasWithUndo(nextEtapas);
    toast({ title: 'Formatação aplicada a todas as etapas' });
    
    try {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus('saving');
      const currentSnapshot = nextEtapas;
      await saveOrcamento({ obraId, etapas: currentSnapshot });
      lastSavedSnapshotRef.current = JSON.stringify(currentSnapshot);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
    } catch (e) {
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  };

  const applyUnitNormalization = async () => {
    const nextEtapas = etapas.map(etapa => ({
      ...etapa,
      items: etapa.items.map(item => {
        if (item.tipo === 'etapa') {
          // Simplification, ideally should be a deep clone
          return { ...item, id: crypto.randomUUID() };
        } else {
          const comp = item as OrcamentoComposicao;
          return {
            ...comp,
            id: crypto.randomUUID(),
            unidade: normalizeUnit(comp.unidade),
            insumos: comp.insumos.map(ins => ({ 
              ...ins, 
              id: crypto.randomUUID(),
              unidade: normalizeUnit(ins.unidade) 
            }))
          };
        }
      })
    }));
    
    setEtapasWithUndo(nextEtapas);
    toast({ title: 'Unidades normalizadas' });

    try {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus('saving');
      const currentSnapshot = nextEtapas;
      await saveOrcamento({ obraId, etapas: currentSnapshot });
      lastSavedSnapshotRef.current = JSON.stringify(currentSnapshot);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
    } catch (e) {
      setSaveStatus('error');
    } finally {
      isSavingRef.current = false;
    }
  };

  const setEtapasWithUndo = useCallback(
    (updater: OrcamentoEtapa[] | ((prev: OrcamentoEtapa[]) => OrcamentoEtapa[])) => {
      setEtapas((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        undoManager.pushSnapshot(prev);
        return next;
      });
    },
    [undoManager]
  );

  // Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const tagName = (e.target as HTMLElement)?.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (e.shiftKey) {
          const redone = undoManager.redo(etapas);
          if (redone) setEtapas(redone);
        } else {
          const undone = undoManager.undo(etapas);
          if (undone) setEtapas(undone);
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [etapas, undoManager]);

  // ── Importar de outra obra ──────────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');
  const [importMode, setImportMode] = useState<'mesclar' | 'substituir'>('mesclar');

  // ── SINAPI: usa config do OrcamentoCentral se disponível, senão local ────────
  const [importSinapiOpen, setImportSinapiOpen] = useState(false);
  const [expandedEtapaId, setExpandedEtapaId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  /** null = indeterminate (estado individual por etapa), true/false = expandir/colapsar todas */
  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(true);
  
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const resizeIndicatorRef = useRef<HTMLDivElement>(null);

  // Resizing de Colunas using a ref avoids React re-renders entirely for resizing
  const colWidthsRef = useRef({
    desc: 350,
    tipo: 40,
    un: 40,
    qtd: 70,
    punit: 100,
    total: 120,
    acoes: 220
  });

  const resizingRef = useRef<{ col: string, nextCol: string | null, startX: number, startWidth: number, startNextWidth: number } | null>(null);

  // Apply all column widths on mount
  useEffect(() => {
    if (!gridWrapperRef.current) return;
    const wrapperWidth = gridWrapperRef.current.clientWidth;
    const sumOfOthers = 40 + 40 + 70 + 100 + 120 + 220; // 590
    const remaining = wrapperWidth - sumOfOthers;
    if (remaining > 350) {
      colWidthsRef.current.desc = remaining;
    }
    // Always apply ALL column widths so CSS vars are in sync
    const el = gridWrapperRef.current;
    Object.entries(colWidthsRef.current).forEach(([k, v]) => {
      el.style.setProperty(`--w-${k}`, `${v}px`);
    });
  }, []);

  const resetColumns = () => {
    if (!gridWrapperRef.current) return;
    const wrapperWidth = gridWrapperRef.current.clientWidth;
    const sumOfOthers = 40 + 40 + 70 + 100 + 120 + 220;
    const descWidth = Math.max(350, wrapperWidth - sumOfOthers);
    
    const defaults = {
      desc: descWidth,
      tipo: 40,
      un: 40,
      qtd: 70,
      punit: 100,
      total: 120,
      acoes: 220
    };
    colWidthsRef.current = defaults;
    Object.entries(defaults).forEach(([k, v]) => {
      gridWrapperRef.current!.style.setProperty(`--w-${k}`, `${v}px`);
    });
  };

  const handleResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const gridWrapper = gridWrapperRef.current;
    if (!gridWrapper) return;
    const rect = gridWrapper.getBoundingClientRect();
    const initialLeft = e.clientX - rect.left + gridWrapper.scrollLeft;

    const headerCell = (e.target as HTMLElement).parentElement;
    const startWidth = headerCell ? headerCell.getBoundingClientRect().width : colWidthsRef.current[col as keyof typeof colWidthsRef.current];

    const columns = ['desc', 'tipo', 'un', 'qtd', 'punit', 'total', 'acoes'] as const;
    const colIndex = columns.indexOf(col as any);
    const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1] : null;

    resizingRef.current = {
      col,
      nextCol,
      startX: e.clientX,
      startWidth,
      startNextWidth: nextCol ? colWidthsRef.current[nextCol as keyof typeof colWidthsRef.current] : 0
    };

    if (resizeIndicatorRef.current) {
      resizeIndicatorRef.current.style.display = 'block';
      resizeIndicatorRef.current.style.left = `${initialLeft}px`;
    }
    
    const minWidths: Record<string, number> = {
      desc: 150, tipo: 30, un: 30, qtd: 50, punit: 70, total: 80, acoes: 180
    };

    const handleMouseMove = (me: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, nextCol, startX, startWidth, startNextWidth } = resizingRef.current;
      const delta = me.clientX - startX;
      
      let finalDelta = delta;

      if (nextCol) {
        // Hybrid split-pane resizing
        const minW = minWidths[col] || 30;
        const minNextW = minWidths[nextCol] || 30;
        
        let newWidth = Math.max(minW, startWidth + delta);
        let actualDelta = newWidth - startWidth;
        
        let nextNewWidth = Math.max(minNextW, startNextWidth - actualDelta);
        // We calculate how much nextCol shrank, but we DO NOT limit col's growth!
        // This allows col to push the table if nextCol hits its minimum width!
        finalDelta = actualDelta;

        if (resizeIndicatorRef.current) {
          resizeIndicatorRef.current.style.left = `${initialLeft + finalDelta}px`;
        }

        colWidthsRef.current = { ...colWidthsRef.current, [col]: newWidth, [nextCol]: nextNewWidth };
        if (gridWrapperRef.current) {
          gridWrapperRef.current.style.setProperty(`--w-${col}`, `${newWidth}px`);
          gridWrapperRef.current.style.setProperty(`--w-${nextCol}`, `${nextNewWidth}px`);
        }
      } else {
        // Last column (acoes) just resizes normally
        const minW = minWidths[col] || 30;
        let newWidth = Math.max(minW, startWidth + delta);
        finalDelta = newWidth - startWidth;

        if (resizeIndicatorRef.current) {
          resizeIndicatorRef.current.style.left = `${initialLeft + finalDelta}px`;
        }

        colWidthsRef.current = { ...colWidthsRef.current, [col]: newWidth };
        if (gridWrapperRef.current) {
          gridWrapperRef.current.style.setProperty(`--w-${col}`, `${newWidth}px`);
        }
      }
    };

    const handleMouseUp = (me: MouseEvent) => {
      if (resizingRef.current) {
        resizingRef.current = null;
      }
      if (resizeIndicatorRef.current) {
        resizeIndicatorRef.current.style.display = 'none';
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // 🔘 Bulk selection 🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘🔘
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const bulkActive = selectedIds.size > 0;
  


  useEffect(() => {
    if (!localStorage.getItem('lastra_orcamento_shortcuts_hint')) {
      setShowHint(true);
      const timer = setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('lastra_orcamento_shortcuts_hint', 'true');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem('lastra_orcamento_shortcuts_hint', 'true');
  };

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ignore if inside a modal or standard input that shouldn't trigger global shortcuts
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault();
        setShowShortcuts(v => !v);
      }
      if (e.key === 'e' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setAllExpanded(true);
      }
      if (e.key === 'r' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setAllExpanded(false);
      }
      if (e.key === 'Delete' && selectedIds.size > 0 && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (confirm(`Remover as ${selectedIds.size} linhas selecionadas?`)) {
          const filterItens = (etps: OrcamentoEtapa[]): OrcamentoEtapa[] => etps.map(etapa => ({
            ...etapa,
            items: etapa.items.filter(i => !selectedIds.has(i.id)).map(i => i.tipo === 'etapa' ? filterItens([i as OrcamentoEtapa])[0] : i)
          }));
          const nextEtapas = filterItens(etapas);
          setEtapasWithUndo(nextEtapas);
          saveOrcamento({ obraId, etapas: nextEtapas });
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [selectedIds, etapas, obraId, saveOrcamento, setEtapasWithUndo]);

  const [sinapiConfigOpen, setSinapiConfigOpen] = useState(false);
  // Competências realmente carregadas no banco (sinapi_referencias)
  const [sinapiReferencias, setSinapiReferencias] = useState<{ id: string; competencia: string; arquivo_nome: string }[]>([]);

  useEffect(() => {
    type SinapiReferenciaRow = { id: string; competencia: string; arquivo_nome: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('sinapi_referencias')
      .select('id, competencia, arquivo_nome')
      .order('competencia', { ascending: false })
      .then(({ data }: { data: SinapiReferenciaRow[] | null }) => {
        if (data && data.length > 0) {
          setSinapiReferencias(data);
          updateSinapiConfig({ competencia: data[0].competencia });
        }
      });
  }, []);

  // ── Catálogo Global Drawer (substitui painel 50/50) ────────────────────────
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  const [catalogDrawerDefaultEtapaId, setCatalogDrawerDefaultEtapaId] = useState<string | undefined>(undefined);
  const [catalogDrawerTab, setCatalogDrawerTab] = useState<any | undefined>(undefined);
  const [catalogDrawerQuery, setCatalogDrawerQuery] = useState<string | undefined>(undefined);

  const handleOpenCatalogo = useCallback((etapa?: OrcamentoEtapa, tab?: string, query?: string) => {
    setCatalogDrawerDefaultEtapaId(etapa?.id);
    setCatalogDrawerTab(tab);
    setCatalogDrawerQuery(query);
    setCatalogDrawerOpen(true);
  }, []);

  const handleCatalogApply = useCallback(async (items: CarrinhoItem[]) => {
    setEtapasWithUndo(prev => {
      const next = [...prev];
      for (const item of items) {
        const idx = next.findIndex(e => e.id === item.etapaId);
        if (idx === -1) continue;
        const etapa = next[idx];
        const nova = {
          id: crypto.randomUUID(),
          codigo: generateComposicaoCodigo(etapa.codigo, etapa.items.filter(i => i.tipo !== 'etapa').map(c => c.codigo)),
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: null,
          precoUnitario: item.precoMedio ?? null,
          precoTotal: 0,
          insumos: [],
          usaInsumos: false,
          fonteReferencia: item.codigoSinapi ? 'SINAPI' : undefined,
          codigoReferenciaExterna: item.codigoSinapi,
          tipo: 'composicao'
        };
        next[idx] = { ...etapa, usaComposicoes: true, items: [...etapa.items, nova] };
      }
      return next;
    });
  }, [setEtapasWithUndo, generateComposicaoCodigo]);


  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [collapsedEtapas, setCollapsedEtapas] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedEtapas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDoubleClickChevron = (expanded: boolean) => {
    setAllExpanded(expanded);
    if (expanded) {
      setCollapsedEtapas(new Set());
    } else {
      const allIds = new Set<string>();
      const addIds = (items: any[]) => {
        items.forEach(i => {
          if (i.tipo === 'etapa') {
            allIds.add(i.id);
            addIds(i.items || []);
          }
        });
      };
      addIds(etapas);
      setCollapsedEtapas(allIds);
    }
  };

  const flatItemsRaw = useMemo(() => flattenTree(etapas), [etapas]);
  const visibleFlatItems = useMemo(() => getVisibleItems(flatItemsRaw, collapsedEtapas), [flatItemsRaw, collapsedEtapas]);

  const [activeEtapaId, setActiveEtapaId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: any) => {
    setActiveEtapaId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over, delta } = event;
    setActiveEtapaId(null);

    if (!over || active.id === over.id) return;

    const activeIndex = visibleFlatItems.findIndex(i => i.id === active.id);
    const overIndex = visibleFlatItems.findIndex(i => i.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const activeItem = visibleFlatItems[activeIndex];
    
    // Project depth based on offset X
    const indentPixels = 32;
    const offsetDepth = Math.round(delta.x / indentPixels);
    let projectedDepth = Math.max(1, activeItem.depth + offsetDepth);

    // Constrain depth by previous item
    const prevItem = overIndex > 0 ? visibleFlatItems[overIndex - (activeIndex < overIndex ? 0 : 1)] : null;
    const maxDepth = prevItem 
       ? (prevItem.item.tipo === 'etapa' ? prevItem.depth + 1 : prevItem.depth) 
       : 1;

    if (projectedDepth > maxDepth) projectedDepth = maxDepth;

    setEtapasWithUndo(prev => {
       const fullFlat = flattenTree(prev);
       const nextFlat = moveItem(fullFlat, active.id as string, over.id as string, projectedDepth);
       const nextTree = buildTree(nextFlat);
       
       // Recalcular totais recursivamente
       const recalcEtapa = (etapa: OrcamentoEtapa): number => {
         let total = 0;
         if (etapa.items) {
           for (const item of etapa.items) {
             if (item.tipo === 'etapa') {
               total += recalcEtapa(item as OrcamentoEtapa);
             } else {
               total += (item as OrcamentoComposicao).precoTotal || 0;
             }
           }
         }
         etapa.precoTotal = total;
         return total;
       };
       for (const e of nextTree) {
         if (e.tipo === 'etapa') recalcEtapa(e as OrcamentoEtapa);
       }
       
       // And recalculate WBS
       return recalcularWBS(nextTree) as OrcamentoEtapa[];
    });
  }, [visibleFlatItems, recalcularWBS, setEtapasWithUndo]);



  // ── Seleção de modelo de etapa ────────
  // compactMode — densidade controlada pelo toggle (padrão: 'padrao')
  type DensityMode = 'detalhado' | 'padrao' | 'compacto';
  const [densityMode, setDensityMode] = useState<DensityMode>(() => {
    try { return (localStorage.getItem('obraconectada:density_mode') as DensityMode) || 'padrao'; }
    catch { return 'padrao'; }
  });
  const handleSetDensity = (m: DensityMode) => {
    setDensityMode(m);
    try { localStorage.setItem('obraconectada:density_mode', m); } catch (_) { /* ignore */ }
  };
  const compactMode = densityMode === 'compacto';

  // ── Sprint 3.2: Toggle sugestão de preços ────────────────────────────────────
  const [priceSuggestionEnabled, setPriceSuggestionEnabled] = useState(() => {
    try { return localStorage.getItem('obraconectada:price_suggestion') === 'true'; }
    catch { return false; }
  });
  const handleTogglePriceSuggestion = () => {
    const next = !priceSuggestionEnabled;
    setPriceSuggestionEnabled(next);
    try { localStorage.setItem('obraconectada:price_suggestion', String(next)); } catch (_) { /* ignore */ }
  };

  // ── Sprint 3.4: Badges SINAPI ? por composição (para o banner) ──────────────
  const [priceBadges, setPriceBadges] = useState<Map<string, string>>(new Map());
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const handlePriceBadge = (composicaoId: string, badge: string | null) => {
    setPriceBadges(prev => {
      const next = new Map(prev);
      if (badge === null) next.delete(composicaoId);
      else next.set(composicaoId, badge);
      return next;
    });
    setBannerDismissed(false); // reset dismiss quando novos badges chegam
  };
  const uncertainCount = Array.from(priceBadges.values()).filter(b => b === 'sinapi_uncertain').length;


  // Templates de etapa (mantido para compatibilidade com JSX legado)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateCodes, setSelectedTemplateCodes] = useState<Set<string>>(new Set());

  // ── Paste Import Dialog ─────────────────────────────────────────────────────
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);

  // ── Ctrl+S: salvar manual com atalho ─────────────────────────────────────────
  useEffect(() => {
    const handleSaveKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleSaveKey);
    return () => window.removeEventListener('keydown', handleSaveKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapas, obraId]);

  // ── N: nova etapa com atalho ─────────────────────────────────────────────────
  useEffect(() => {
    const handleN = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        addEmptyEtapa();
      }
    };
    window.addEventListener('keydown', handleN);
    return () => window.removeEventListener('keydown', handleN);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, etapas]);

  const unidades = getUnidadesUsadas();

  const hasLoadedInitialDataRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>('');
  const autosaveTimeoutRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const lastActionRef = useRef<{ type: string; timestamp: number } | null>(null);
  const prevEtapasRef = useRef(etapas);

  const loadedObraIdRef = useRef<string | null>(null);

  useEffect(() => {
    const trackingId = `${obraId}-${versaoAtiva?.id || 'default'}`;
    if (loadedObraIdRef.current === trackingId) return;
    const existing = getOrcamento(obraId);
    
    let etapasIniciais: OrcamentoEtapa[] = [];
    if (existing) {
      if (versaoAtiva) {
        etapasIniciais = existing.etapas.filter(e => e.versaoId === versaoAtiva.id);
      } else {
        etapasIniciais = existing.etapas.filter(e => !e.versaoId);
      }
    }

    if (etapasIniciais.length > 0 || !loading) {
      setEtapas(etapasIniciais);
      prevEtapasRef.current = etapasIniciais;
      lastSavedSnapshotRef.current = JSON.stringify(etapasIniciais);
      hasLoadedInitialDataRef.current = true;
      loadedObraIdRef.current = trackingId;
      setSaveStatus('idle');
    }
  }, [obraId, getOrcamento, loading, versaoAtiva]);

  // Estado de foco para evitar salvar durante digitação ativa
  const isEditingRef = useRef(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        isEditingRef.current = true;
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        isEditingRef.current = false;
        // Ao sair do input, se houver alterações pendentes, agenda save em 2s
        const currentSnapshot = JSON.stringify(etapasRef.current);
        if (currentSnapshot !== lastSavedSnapshotRef.current) {
          if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
          autosaveTimeoutRef.current = window.setTimeout(async () => {
            try {
              setSaveStatus('saving');
              isSavingRef.current = true;
              const currentState = etapasRef.current;
              await saveOrcamento({ obraId, etapas: currentState });
              lastSavedSnapshotRef.current = JSON.stringify(currentState);
              setSaveStatus('saved');
              window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
            } catch (error) {
              console.error(error);
              setSaveStatus('error');
            } finally {
              isSavingRef.current = false;
            }
          }, 2000);
        }
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [obraId, saveOrcamento]);

  // Auto-save
  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return;
    const currentSnapshot = JSON.stringify(etapas);
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    const getCompsCount = (etapaList: OrcamentoEtapa[]) => {
      let count = 0;
      const traverse = (list: OrcamentoEtapa[]) => {
        for (const e of list) {
          for (const item of e.items || []) {
            if (item.tipo === 'etapa') traverse([item as OrcamentoEtapa]);
            else count++;
          }
        }
      };
      traverse(etapaList);
      return count;
    };
    const totalCompsPrev = getCompsCount(prevEtapasRef.current);
    const totalCompsCurr = getCompsCount(etapas);
    if (totalCompsCurr > totalCompsPrev) {
      lastActionRef.current = { type: 'addComposicao', timestamp: Date.now() };
    }
    prevEtapasRef.current = etapas;

    if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);

    // Se estiver digitando, aborta esse trigger intervalar para não causar race condition ou fechar combobox
    // O evento focusout vai se encarregar de retomar o save.
    if (isEditingRef.current) {
      // Don't update saveStatus to 'saving' while typing, it causes massive lag and confuses the user.
      return;
    }

    const timeSinceAdd = lastActionRef.current?.type === 'addComposicao' ? Date.now() - lastActionRef.current.timestamp : 3000;
    const delay = timeSinceAdd < 3000 ? 3000 - timeSinceAdd + 2000 : 2000;
    const safeDelay = Math.max(delay, 2000); // 2000ms minimum

    autosaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        setSaveStatus('saving');
        isSavingRef.current = true;
        const currentState = etapasRef.current; // Pega ref super atualizada
        await saveOrcamento({ obraId, etapas: currentState });
        lastSavedSnapshotRef.current = JSON.stringify(currentState);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
      } catch (error) {
        console.error(error);
        setSaveStatus('error');
      } finally {
        isSavingRef.current = false;
      }
    }, safeDelay);

    return () => { if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current); };
  }, [etapas, obraId, saveOrcamento]);

  const totalGeral = etapas.reduce((sum, e) => sum + (e.precoTotal || 0), 0);

  // ── Ações de etapas ─────────────────────────────────────────────────────────

  const addEmptyEtapa = () => {
    const novaEtapa: OrcamentoEtapa = {
      id: crypto.randomUUID(),
      codigo: generateEtapaCodigo(etapas),
      nome: '',
      precoTotal: 0,
      usaComposicoes: false,
      composicoes: [],
    };
    setEtapasWithUndo(prev => [...prev, novaEtapa]);
    setExpandedEtapaId(novaEtapa.id);
    setAllExpanded(undefined);
  };

  const addFromTemplates = () => {
    const toAdd: OrcamentoEtapa[] = [];
    for (const code of selectedTemplateCodes) {
      const template = catalogoEtapas.find(c => c.codigo === code);
      if (!template) continue;
      if (etapas.some(c => c.nome === template.nome)) continue;
      toAdd.push({
        id: crypto.randomUUID(),
        codigo: template.codigo,
        nome: template.nome,
        precoTotal: 0,
        usaComposicoes: false,
        composicoes: [],
      });
    }
    if (toAdd.length > 0) {
      setEtapasWithUndo(prev => [...prev, ...toAdd]);
      toast({ title: `${toAdd.length} etapa${toAdd.length !== 1 ? 's' : ''} adicionada${toAdd.length !== 1 ? 's' : ''}!` });
    }
    setSelectedTemplateCodes(new Set());
    setTemplateDialogOpen(false);
  };

  /** Adiciona composições coladas do Excel a uma etapa existente */
  const handleApplyPastedComposicoes = useCallback((etapaId: string, composicoes: PastedComposicao[]) => {
    setEtapasWithUndo(prev => prev.map(e => {
      if (e.id !== etapaId) return e;
      const novas = composicoes.map(c => ({
        id: crypto.randomUUID(),
        codigo: generateComposicaoCodigo(e.codigo, [...e.items.filter(i => i.tipo !== 'etapa').map(x => x.codigo)]),
        descricao: c.descricao,
        unidade: c.unidade ?? 'un',
        quantidade: c.quantidade ?? null,
        precoUnitario: c.precoUnitario ?? null,
        precoTotal: (c.quantidade ?? 0) * (c.precoUnitario ?? 0),
        insumos: [],
        usaInsumos: false,
        tipo: 'composicao' as const
      }));
      const itemsAtualizados = [...e.items, ...novas];
      return {
        ...e,
        usaComposicoes: true,
        items: itemsAtualizados,
        precoTotal: itemsAtualizados.reduce((s, c) => s + (c.precoTotal || 0), 0),
      };
    }));
    toast({ title: `${composicoes.length} composição${composicoes.length !== 1 ? 'ões' : ''} importada${composicoes.length !== 1 ? 's' : ''}!` });
  }, [setEtapasWithUndo, generateComposicaoCodigo]);

  const toggleTemplateCode = (code: string, checked: boolean) => {
    setSelectedTemplateCodes(prev => {
      const next = new Set(prev);
      if (checked) next.add(code); else next.delete(code);
      return next;
    });
  };

  const updateEtapa = (idx: number, etapaAtualizada: OrcamentoEtapa) => {
    setEtapas(prev => {
      const next = [...prev];
      next[idx] = etapaAtualizada;
      return next;
    });
  };

  const removeEtapa = (idx: number) => {
    setEtapasWithUndo(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setSaveStatus('saving');
      await saveOrcamento({ obraId, etapas });
      lastSavedSnapshotRef.current = JSON.stringify(etapas);
      setSaveStatus('saved');
      toast({ title: 'Orçamento salvo com sucesso!' });
      window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      toast({ title: 'Erro ao salvar orçamento', variant: 'destructive' });
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleImport = () => {
    if (!importObraId) return;
    const source = getOrcamento(importObraId);
    if (!source) {
      toast({ title: 'Orçamento não encontrado para esta obra', variant: 'destructive' });
      return;
    }
    const cloned: OrcamentoEtapa[] = source.etapas.map(cat => ({
      ...cat,
      id: crypto.randomUUID(),
      items: cat.items.map(comp => comp.tipo === 'etapa' ? {
        ...comp, id: crypto.randomUUID(), items: []
      } : {
        ...comp,
        id: crypto.randomUUID(),
        insumos: (comp as OrcamentoComposicao).insumos.map(si => ({
          ...si,
          id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      }),
    }));

    if (importMode === 'mesclar') {
      setEtapasWithUndo(prev => [...prev, ...cloned]);
      toast({ title: `${cloned.length} etapa${cloned.length !== 1 ? 's' : ''} importada${cloned.length !== 1 ? 's' : ''} e mesclada${cloned.length !== 1 ? 's' : ''}!` });
    } else {
      setEtapasWithUndo(cloned);
      toast({ title: 'Orçamento substituído. Edite conforme necessário.' });
    }
    setImportDialogOpen(false);
  };

  const handleImportarSinapi = async (params: {
    etapaId: string;
    referenciaId: string;
    competencia: string;
    codigoComposicao: number;
    uf: string;
    regime: SinapiRegime;
    resultadoBase?: SinapiComposicaoExpandida;
    onProgress?: (progress: number, message: string) => void;
  }) => {
    const { etapaId, referenciaId, competencia, codigoComposicao, uf, regime, resultadoBase, onProgress } = params;

    onProgress?.(20, 'Carregando composição...');
    const expandida = resultadoBase ?? await expandirComposicaoSinapi({ referenciaId, codigoComposicao, uf, regime });

    onProgress?.(70, 'Convertendo composição para o orçamento...');
    const composicao = sinapiExpandidaParaOrcamentoComposicao({ resultado: expandida, competencia });

    onProgress?.(90, 'Inserindo composição na etapa selecionada...');
    setEtapas(prev =>
      prev.map(cat => {
        if (cat.id !== etapaId) return cat;
        const items = [...cat.items, composicao];
        const precoTotal = items.reduce((acc, item) => acc + (Number(item.precoTotal) || 0), 0);
        return { ...cat, usaComposicoes: true, items, precoTotal };
      })
    );
    setExpandedEtapaId(etapaId);
    setAllExpanded(undefined);
    onProgress?.(100, 'Finalizado.');
  };



  const availableCats = catalogoEtapas.filter(c => !etapas.some(cat => cat.nome === c.nome));
  const obrasComOrcamento = orcamentos.filter(o => o.obraId !== obraId && o.etapas.length > 0);
  const anyExpanded = allExpanded === true;

  const saveStatusLabel =
    saveStatus === 'saving' ? 'Salvando...' :
    saveStatus === 'saved'  ? 'Salvo ✓' :
    saveStatus === 'error'  ? 'Erro no save' :
    '';

  const saveStatusColor =
    saveStatus === 'saving' ? 'text-muted-foreground' :
    saveStatus === 'saved'  ? 'text-emerald-600 dark:text-emerald-400' :
    saveStatus === 'error'  ? 'text-destructive' :
    'text-muted-foreground';

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header movido para OrcamentoCentral (header global) */}

        {/* Sprint 4: Seletor de versão — renderizado no OrcamentoCentral (acima das abas); omitido aqui para evitar duplicação */}

        {/* ── Toolbar de Ações ──────────────────────────────────────────── */}
        {!readOnly && (
          <div className="flex items-center gap-2 px-4 md:px-6 py-1.5 border-b bg-muted/20 shrink-0">
            {/* ⚡ Orçamento Rápido */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative hidden sm:block">
                    {etapas.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
                      </span>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5 h-7 text-xs bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 text-white border-0 shadow-sm"
                      onClick={() => handleOpenCatalogo()}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Orçamento Rápido
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                  <p className="font-semibold mb-1">⚡ Orçamento Rápido</p>
                  <p className="text-muted-foreground leading-snug">Adicione composições, insumos e itens do SINAPI sem sair da planilha.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* + Nova etapa */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={addEmptyEtapa} variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    Nova etapa
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Nova etapa <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted border rounded font-mono">N</kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="mx-2 w-px h-4 bg-border/50" />

            {/* SINAPI Config & Toggle */}
            <TooltipProvider>
              <div className="flex items-center gap-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => {
                        if (sinapiConfig.referencia_id) {
                          updateSinapiConfig({ isSinapiSearchEnabled: !sinapiConfig.isSinapiSearchEnabled });
                        } else {
                          setSinapiConfigOpen(true);
                        }
                      }}
                      variant={sinapiConfig.referencia_id ? "outline" : "ghost"} 
                      size="sm" 
                      className={cn(
                        "gap-1.5 h-7 text-xs px-2.5",
                        sinapiConfig.referencia_id && sinapiConfig.isSinapiSearchEnabled !== false
                          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:text-primary rounded-r-none border-r-0"
                          : sinapiConfig.referencia_id && sinapiConfig.isSinapiSearchEnabled === false
                          ? "bg-muted text-muted-foreground border-border hover:bg-muted/80 rounded-r-none border-r-0"
                          : "text-muted-foreground"
                      )}
                    >
                      {sinapiConfig.referencia_id 
                        ? `SINAPI · ${sinapiConfig.uf} · ${formatCompetencia(sinapiConfig.competencia || '')}` 
                        : "SINAPI ⚙️"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {sinapiConfig.referencia_id 
                      ? (sinapiConfig.isSinapiSearchEnabled !== false ? "Desativar busca automática no SINAPI" : "Ativar busca automática no SINAPI")
                      : "Configurar base SINAPI para importação"}
                  </TooltipContent>
                </Tooltip>

                {sinapiConfig.referencia_id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setSinapiConfigOpen(true)}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-7 w-7 px-0 rounded-l-none border-l-[1px]",
                          sinapiConfig.isSinapiSearchEnabled !== false
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:text-primary border-l-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80 border-l-border"
                        )}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Configurações do SINAPI
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>

            <div className="mx-2 w-px h-4 bg-border/50" />

            {/* Toggle View Mode */}
            <div className="flex bg-muted/50 p-0.5 rounded-md border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleViewMode('cards')}
                className={cn('h-6 px-2 text-[10px] gap-1', viewMode === 'cards' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="h-3 w-3" /> Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleViewMode('excel')}
                className={cn('h-6 px-2 text-[10px] gap-1', viewMode === 'excel' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <AlignJustify className="h-3 w-3" /> Excel
              </Button>
            </div>

            <div className="mx-2 w-px h-4 bg-border/50" />

            {/* Configurar BDI */}
            <BdiPopover
              obraId={obraId}
              initialConfig={bdiConfig}
              onConfigChange={setBdiConfig}
            />

            {/* Formatação de Texto */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground">
                  Aa <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36 text-xs">
                <DropdownMenuItem onClick={() => applyTextFormat('title')} className="gap-2 cursor-pointer text-xs">
                  <span className="font-semibold text-[10px] w-4 text-center">Aa</span> Title Case
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTextFormat('upper')} className="gap-2 cursor-pointer text-xs">
                  <span className="font-semibold text-[10px] w-4 text-center">AA</span> MAIÚSCULAS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => applyTextFormat('lower')} className="gap-2 cursor-pointer text-xs">
                  <span className="font-semibold text-[10px] w-4 text-center">aa</span> minúsculas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={applyUnitNormalization} className="gap-2 cursor-pointer text-xs">
                  <span className="font-semibold text-[10px] w-4 text-center">m²</span> Normalizar unidades
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Undo / Redo + Salvar + Mais */}
            <div className="ml-auto flex items-center gap-2">
              <TooltipProvider>
                <div className="flex items-center gap-0.5 border rounded-md overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        disabled={!undoManager.canUndo}
                        onClick={() => { const u = undoManager.undo(etapas); if (u) setEtapas(u); }}
                        className="flex items-center px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >↩</button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Desfazer <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted border rounded font-mono">Ctrl+Z</kbd>
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-border" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        disabled={!undoManager.canRedo}
                        onClick={() => { const r = undoManager.redo(etapas); if (r) setEtapas(r); }}
                        className="flex items-center px-2 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >↪</button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Refazer <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted border rounded font-mono">Ctrl+⇧+Z</kbd>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Botão salvar com spinner */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleSave} variant="outline" size="sm" className="gap-1.5 h-7 text-xs relative" disabled={saveStatus === 'saving'}>
                      {saveStatus === 'saving' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saveStatus === 'saved' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">
                        {saveStatus === 'saving' ? 'Salvando' : saveStatus === 'saved' ? 'Salvo' : 'Salvar'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Salvar manualmente <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-muted border rounded font-mono">Ctrl+S</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Menu "Mais" */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-muted-foreground px-2">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setPasteDialogOpen(true)}
                    className="text-xs gap-2"
                    disabled={etapas.length === 0}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5 text-emerald-600" />
                    Colar do Excel
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleTogglePriceSuggestion}
                    className="text-xs gap-2"
                  >
                    <Sparkles className={cn('h-3.5 w-3.5', priceSuggestionEnabled ? 'text-amber-500' : '')} />
                    Sugestão de preços {priceSuggestionEnabled ? '(Ativa)' : '(Desativada)'}
                  </DropdownMenuItem>


                  {obrasComOrcamento.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setImportDialogOpen(true)}
                        className="text-xs gap-2"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Importar de outra obra
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}        {/* ── Área de conteúdo ─────────────────────────────────────────────── */}
        <div 
          ref={gridWrapperRef}
          className="flex-1 flex overflow-hidden"
          style={{
            '--w-desc': `${colWidthsRef.current.desc}px`,
            '--w-tipo': `${colWidthsRef.current.tipo}px`,
            '--w-un': `${colWidthsRef.current.un}px`,
            '--w-qtd': `${colWidthsRef.current.qtd}px`,
            '--w-punit': `${colWidthsRef.current.punit}px`,
            '--w-total': `${colWidthsRef.current.total}px`,
            '--w-acoes': `${colWidthsRef.current.acoes}px`,
          } as React.CSSProperties}
        >

          {/* Planilha plana — sem padding, sem space-y (linhas contíguas) */}
          <div className="flex-1 overflow-y-auto relative bg-background">
            
            {/* Visual Drag Indicator */}
            <div 
              ref={resizeIndicatorRef} 
              className="absolute top-0 bottom-0 w-[2px] bg-primary z-50 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.5)]" 
              style={{ display: 'none', left: 0 }} 
            />

            {/* Cabeçalho global removido - movido para EtapaBlock.tsx */}

            {/* ── Sprint 3.4: Banner de revisão SINAPI ? ── */}
            {uncertainCount > 0 && !bannerDismissed && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 animate-in fade-in duration-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    {uncertainCount} preço{uncertainCount !== 1 ? 's' : ''} com correspondência SINAPI incerta — recomendável revisar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerDismissed(true)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {etapas.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed py-14 px-6 bg-muted/5">
                {!readOnly ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="text-sm font-medium text-muted-foreground">Nenhuma etapa adicionada ainda</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Escolha como quer começar:</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                      {/* Card: etapas pré-definidas */}
                      <button
                        type="button"
                        onClick={() => handleOpenCatalogo()}
                        className="flex flex-col items-start gap-2 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 text-left hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                          <LayoutTemplate className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Usar etapas pré-definidas</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Selecione as etapas comuns da sua obra</p>
                        </div>
                        <span className="text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Selecionar <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>

                      {/* Card: colar do Excel */}
                      <button
                        type="button"
                        onClick={() => setPasteDialogOpen(true)}
                        className="flex flex-col items-start gap-2 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-left hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all group"
                      >
                        <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <ClipboardPaste className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Já tenho planilha no Excel</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Cole suas composições diretamente</p>
                        </div>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Colar Excel <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </div>

                    {/* Link discreto */}
                    <div className="text-center mt-5">
                      <button
                        type="button"
                        onClick={addEmptyEtapa}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                      >
                        + Criar etapa manualmente
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="text-4xl">📋</div>
                    <p className="text-muted-foreground font-medium">Nenhuma etapa adicionada.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visibleFlatItems.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {viewMode !== 'cards' && (
                      <div 
                        className={cn(
                          "sticky top-0 z-30 border-b border-border/70 bg-white dark:bg-slate-900/90 backdrop-blur-sm",
                          "h-8 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider shadow-sm",
                          PLANILHA_FLEX_ROW
                        )}
                      >
                        <div className={cn(CELL_DESC, "pl-[68px] relative")}>
                          Descrição
                          <div onMouseDown={(e) => handleResizeStart('desc', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_TIPO, "px-0 text-muted-foreground/60 relative")} title="Tipo do item">
                          T.
                          <div onMouseDown={(e) => handleResizeStart('tipo', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_UN, "relative")}>
                          UN
                          <div onMouseDown={(e) => handleResizeStart('un', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_QTD, "relative")}>
                          QTD
                          <div onMouseDown={(e) => handleResizeStart('qtd', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_PUNIT, "relative")}>
                          R$/UN
                          <div onMouseDown={(e) => handleResizeStart('punit', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_TOTAL, "relative")}>
                          TOTAL
                          <div onMouseDown={(e) => handleResizeStart('total', e)} className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-primary/20 z-10" />
                        </div>
                        <div className={cn(CELL_ACOES, "justify-center relative group/headeracoes")}>
                          Ações
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={resetColumns} 
                            className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/headeracoes:opacity-100 transition-opacity" 
                            title="Restaurar tamanho das colunas"
                          >
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className={cn(viewMode === 'cards' && "flex flex-col gap-3 p-3")}>
                      {visibleFlatItems.map((flat, idx) => {
                        if (flat.item.tipo === 'etapa') {
                          const cat = flat.item as OrcamentoEtapa;
                          return (
                            <SortableEtapaWrapper key={flat.id} id={flat.id}>
                              {({ dragListeners }) => (
                                viewMode === 'cards' ? (
                                  <EtapaBlockCard
                                    etapa={cat}
                                    posicao={idx + 1}
                                    // ... skipping cards mode detailed flat support for now, assuming viewMode isn't cards
                                    onChange={() => {}}
                                    onRemove={() => {}}
                                    unidades={unidades}
                                    generateComposicaoCodigo={generateComposicaoCodigo}
                                    generateInsumoCodigo={generateInsumoCodigo}
                                    forceExpanded={false}
                                    readOnly={readOnly}
                                    dragListeners={dragListeners}
                                  />
                                ) : (
                                  <EtapaBlock
                                    etapa={cat}
                                    posicao={idx + 1}
                                    onChange={(updated: OrcamentoEtapa) => {
                                      setEtapasWithUndo(prev => {
                                         const fullFlat = flattenTree(prev);
                                         const i = fullFlat.findIndex(x => x.id === cat.id);
                                         if (i !== -1) fullFlat[i].item = updated;
                                         return buildTree(fullFlat) as OrcamentoEtapa[];
                                      });
                                    }}
                                    onRemove={() => {
                                      setEtapasWithUndo(prev => {
                                         const fullFlat = flattenTree(prev);
                                         const i = fullFlat.findIndex(x => x.id === cat.id);
                                         if (i !== -1) fullFlat.splice(i, 1);
                                         return recalcularWBS(buildTree(fullFlat)) as OrcamentoEtapa[];
                                      });
                                    }}
                                    unidades={unidades}
                                    generateComposicaoCodigo={generateComposicaoCodigo}
                                    generateInsumoCodigo={generateInsumoCodigo}
                                    forceExpanded={expandedEtapaId === cat.id ? true : allExpanded}
                                    readOnly={readOnly}
                                    obraId={obraId}
                                    allEtapas={etapas}
                                    dragListeners={dragListeners}
                                    onOpenCatalogo={(tab, query) => handleOpenCatalogo(cat, tab, query)}
                                    onGoCotacao={onGoCotacao}
                                    priceSuggestionEnabled={priceSuggestionEnabled}
                                    onPriceBadge={handlePriceBadge}
                                    bdiConfig={bdiConfig}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleSelect}
                                    bulkActive={bulkActive}
                                    onDoubleClickChevron={handleDoubleClickChevron}
                                    depth={flat.depth}
                                    isFlatHeaderOnly={true}
                                    isCollapsed={collapsedEtapas.has(flat.id)}
                                    onToggleCollapse={() => toggleCollapse(flat.id)}
                                  />
                                )
                              )}
                            </SortableEtapaWrapper>
                          );
                        } else {
                          const comp = flat.item as OrcamentoComposicao;
                          return (
                            <div key={flat.id} className="flex flex-col border-b border-border/40 last:border-b-0 group/comporow relative">
                              <ComposicaoRow
                                composicao={comp}
                                unidades={unidades}
                                onChange={(updated: OrcamentoComposicao) => {
                                  setEtapasWithUndo(prev => {
                                     const fullFlat = flattenTree(prev);
                                     const i = fullFlat.findIndex(x => x.id === comp.id);
                                     if (i !== -1) fullFlat[i].item = updated;
                                     return buildTree(fullFlat) as OrcamentoEtapa[];
                                  });
                                }}
                                onRemove={() => {
                                  setEtapasWithUndo(prev => {
                                     const fullFlat = flattenTree(prev);
                                     const i = fullFlat.findIndex(x => x.id === comp.id);
                                     if (i !== -1) fullFlat.splice(i, 1);
                                     return recalcularWBS(buildTree(fullFlat)) as OrcamentoEtapa[];
                                  });
                                }}
                                generateInsumoCodigo={generateInsumoCodigo}
                                readOnly={readOnly}
                                obraId={obraId}
                                onGoCotacao={onGoCotacao}
                                priceSuggestionEnabled={priceSuggestionEnabled}
                                onPriceBadge={handlePriceBadge}
                                depth={flat.depth}
                                isSelected={selectedIds?.has(comp.id) ?? false}
                                onToggleSelect={() => toggleSelect(comp.id)}
                                bulkActive={bulkActive}
                                bdiConfig={bdiConfig}
                              />
                            </div>
                          );
                        }
                      })}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeEtapaId && (
                      <div className="rounded-lg border-2 border-primary/60 bg-card opacity-90 shadow-2xl p-4">
                        <p className="text-sm font-semibold">
                          {etapas.find(e => e.id === activeEtapaId)?.nome || 'Etapa'}
                        </p>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>

                {showHint && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-blue-200/30 bg-blue-500/10 backdrop-blur-md shadow-lg shadow-blue-900/10">
                      <span className="text-[13px] font-medium text-blue-100 flex items-center gap-1.5">
                        <span className="text-blue-300/80">⌨</span> Use <kbd className="px-1.5 py-0.5 rounded-md bg-blue-900/30 text-[10px] font-mono border border-blue-400/20 text-blue-200">Tab</kbd> e <kbd className="px-1.5 py-0.5 rounded-md bg-blue-900/30 text-[10px] font-mono border border-blue-400/20 text-blue-200">Enter</kbd> para navegar <span className="text-blue-300/50 mx-1">·</span> <kbd className="px-1.5 py-0.5 rounded-md bg-blue-900/30 text-[10px] font-mono border border-blue-400/20 text-blue-200">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded-md bg-blue-900/30 text-[10px] font-mono border border-blue-400/20 text-blue-200">/</kbd> atalhos
                      </span>
                      <button 
                        onClick={dismissHint}
                        className="p-1 rounded-md hover:bg-blue-900/30 text-blue-300/60 hover:text-blue-200 transition-colors ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <OrcamentoShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
                {/* Rodapé totalizador */}
                {selectedIds.size === 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-background sticky bottom-0 z-20">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Total Geral</div>
                      <div className="text-[10px] text-muted-foreground">{etapas.length} etapa{etapas.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-base font-bold text-foreground tabular-nums">{formatCurrency(totalGeral)}</div>
                  </div>
                )}

                {/* ── Bulk action toolbar ── */}
                {selectedIds.size > 0 && (
                  <div className="sticky bottom-0 z-20 flex items-center gap-3 px-4 py-2 bg-primary text-primary-foreground border-t border-primary/60 animate-in slide-in-from-bottom-2 duration-200">
                    <span className="text-xs font-semibold">{selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}</span>
                    <div className="flex-1" />
                    <BulkListaDropdown 
                      obraId={obraId} 
                      selectedIds={selectedIds} 
                      onClearSelection={clearSelection} 
                    />
                    <button
                      className="text-xs font-medium px-2.5 py-1 rounded border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors"
                      onClick={clearSelection}
                    >
                      ✕ Limpar
                    </button>
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {/* ── CatalogDrawer — substituiu o painel 50/50 ─────────────────── */}
      <CatalogDrawer
        open={catalogDrawerOpen}
        onOpenChange={setCatalogDrawerOpen}
        etapas={etapas}
        defaultEtapaId={catalogDrawerDefaultEtapaId}
        defaultTab={catalogDrawerTab || (etapas.length === 0 ? 'etapas' : 'biblioteca')}
        defaultQuery={catalogDrawerQuery}
        onApply={handleCatalogApply}
        onApplyEtapas={(templates) => {
          const toAdd = templates.filter(
            (t) => !etapas.some((e) => e.nome === t.nome)
          );
          if (toAdd.length === 0) return;
          const newEtapas = toAdd.map((t) => ({
            id: crypto.randomUUID(),
            codigo: t.codigo,
            nome: t.nome,
            precoTotal: 0,
            tipo: 'etapa' as const,
            usaComposicoes: true,
            items: [],
          }));
          setEtapasWithUndo((prev) => recalcularWBS([...prev, ...newEtapas]) as OrcamentoEtapa[]);
        }}
      />


      {/* ── Dialog: Importar orçamento de outra obra ──────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Importar orçamento</DialogTitle>
            <DialogDescription>
              Selecione a obra de origem e como deseja importar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={importObraId} onValueChange={setImportObraId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a obra de origem" />
              </SelectTrigger>
              <SelectContent>
                {obrasComOrcamento.map(o => {
                  const obra = obras.find(ob => ob.id === o.obraId);
                  return (
                    <SelectItem key={o.obraId} value={o.obraId}>
                      {obra?.nome || o.obraId} ({o.etapas.length} etapas)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Escolha de modo */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Como importar?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setImportMode('mesclar')}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    importMode === 'mesclar' ? 'border-primary bg-primary/8 dark:bg-indigo-950/30' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <div className="text-sm font-semibold mb-0.5">Mesclar</div>
                  <div className="text-[10px] text-muted-foreground">Adiciona as etapas ao orçamento atual sem remover nada</div>
                </button>
                <button
                  onClick={() => setImportMode('substituir')}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    importMode === 'substituir' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <div className="text-sm font-semibold mb-0.5">Substituir</div>
                  <div className="text-[10px] text-muted-foreground">Remove o orçamento atual e importa o da obra selecionada</div>
                </button>
              </div>
              {importMode === 'substituir' && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">O orçamento atual será perdido. Esta ação pode ser desfeita com Ctrl+Z.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleImport}
              disabled={!importObraId}
              className={importMode === 'substituir' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {importMode === 'mesclar' ? 'Mesclar' : 'Substituir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: SINAPI ─────────────────────────────────────────────── */}
      <ImportarSinapiDialog
        open={importSinapiOpen}
        onOpenChange={setImportSinapiOpen}
        etapas={etapas}
        defaultCompetencia={sinapiConfig.competencia || ''}
        onConfirm={handleImportarSinapi}
      />

      {/* ── Modal: Configuração SINAPI ── */}
      <SinapiConfigModal
        open={sinapiConfigOpen}
        onOpenChange={setSinapiConfigOpen}
      />

      {/* ── QuickStart Wizard (primeira visita com orçamento vazio) ─────── */}
      {!readOnly && (
        <QuickStartModal
          hasNoEtapas={etapas.length === 0}
          onStartManual={() => { addEmptyEtapa(); }}
          onOpenTemplates={() => setCatalogDrawerOpen(true)}
          onOpenSinapi={() => setImportSinapiOpen(true)}
          onOpenPaste={() => setPasteDialogOpen(true)}
        />
      )}

      {/* ── PasteImportDialog ───────────────────────────────────────────── */}
      <PasteImportDialog
        mode="planilha"
        open={pasteDialogOpen}
        onOpenChange={setPasteDialogOpen}
        etapas={etapas}
        onApplyComposicoes={handleApplyPastedComposicoes}
      />
    </div>{/* ← fecha <div className="flex flex-col h-full overflow-hidden"> */}
    </>
  );
}
