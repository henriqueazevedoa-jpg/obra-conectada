import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronDown, Download, Loader2, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOrcamento, OrcamentoEtapa, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { CronogramaTarefa } from '@/hooks/useCronograma';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Modo = 'etapas' | 'completo';

interface TreeNode {
  id: string;
  nome: string;
  tipo: 'etapa' | 'composicao';
  valor: number;
  depth: number;
  children: TreeNode[];
  orcamentoCategoriaId?: string;
  orcamentoComposicaoId?: string;
}

interface Props {
  obraId: string;
  onClose: () => void;
  onImport: (tarefas: Partial<CronogramaTarefa>[]) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function buildTree(etapas: OrcamentoEtapa[], depth = 0): TreeNode[] {
  return etapas.map(e => {
    const children: TreeNode[] = [];

    for (const item of e.items ?? []) {
      if (item.tipo === 'etapa') {
        // subetapa (N-nível)
        children.push(...buildTree([item as OrcamentoEtapa], depth + 1));
      } else {
        const comp = item as OrcamentoComposicao;
        children.push({
          id: comp.id,
          nome: comp.descricao || comp.codigo,
          tipo: 'composicao',
          valor: comp.precoTotal,
          depth: depth + 1,
          children: [],
          orcamentoComposicaoId: comp.id,
          orcamentoCategoriaId: e.id,
        });
      }
    }

    return {
      id: e.id,
      nome: e.nome,
      tipo: 'etapa',
      valor: e.precoTotal,
      depth,
      children,
      orcamentoCategoriaId: e.id,
    };
  });
}

function collectIds(nodes: TreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (n: TreeNode) => { ids.add(n.id); n.children.forEach(walk); };
  nodes.forEach(walk);
  return ids;
}

function nodeChildrenIds(node: TreeNode): Set<string> {
  return collectIds(node.children);
}

// ─── NodeRow ─────────────────────────────────────────────────────────────────

function NodeRow({
  node, modo, selected, expanded, onToggleSelect, onToggleExpand
}: {
  node: TreeNode;
  modo: Modo;
  selected: Set<string>;
  expanded: Set<string>;
  onToggleSelect: (id: string, children: Set<string>) => void;
  onToggleExpand: (id: string) => void;
}) {
  const isSelected = selected.has(node.id);
  const childIds = useMemo(() => nodeChildrenIds(node), [node]);
  const anyChildSelected = [...childIds].some(id => selected.has(id));
  const allChildSelected = childIds.size > 0 && [...childIds].every(id => selected.has(id));
  const isIndeterminate = anyChildSelected && !allChildSelected;
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  const showComposicoes = modo === 'completo' || node.tipo === 'etapa';
  if (modo === 'etapas' && node.tipo === 'composicao') return null;

  const indentPx = node.depth * 18;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md cursor-pointer group transition-colors',
          isSelected ? 'bg-primary/8 text-primary' : 'hover:bg-muted/60 text-foreground'
        )}
        style={{ paddingLeft: indentPx + 12 }}
        onClick={() => onToggleSelect(node.id, childIds)}
      >
        {/* checkbox icon */}
        <span className="flex-none text-muted-foreground">
          {isIndeterminate
            ? <MinusSquare className="w-3.5 h-3.5 text-primary" />
            : isSelected || allChildSelected
              ? <CheckSquare className="w-3.5 h-3.5 text-primary" />
              : <Square className="w-3.5 h-3.5" />}
        </span>

        {/* expand chevron */}
        {hasChildren && (
          <span
            className="flex-none text-muted-foreground hover:text-foreground"
            onClick={e => { e.stopPropagation(); onToggleExpand(node.id); }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!hasChildren && <span className="w-3 flex-none" />}

        {/* type badge */}
        <span className={cn(
          'flex-none text-[9px] font-semibold px-1 py-0.5 rounded uppercase tracking-wide',
          node.tipo === 'etapa' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
        )}>
          {node.tipo === 'etapa' ? 'etapa' : 'serv.'}
        </span>

        <span className="flex-1 truncate text-xs font-medium">{node.nome}</span>
        <span className="flex-none text-[10px] text-muted-foreground">{fmt(node.valor)}</span>
      </div>

      {/* children */}
      {isExpanded && showComposicoes && node.children.map(child => (
        <NodeRow
          key={child.id}
          node={child}
          modo={modo}
          selected={selected}
          expanded={expanded}
          onToggleSelect={onToggleSelect}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  );
}

// ─── Main Dialog ─────────────────────────────────────────────────────────────

export default function ImportarOrcamentoDialog({ obraId, onClose, onImport }: Props) {
  const { getOrcamento, getVersaoAtiva, getEtapasDaVersao } = useOrcamento();

  const etapasSource = useMemo(() => {
    // Prefer active version, fall back to the general orcamento
    const versaoAtiva = getVersaoAtiva(obraId);
    if (versaoAtiva) {
      const etapas = getEtapasDaVersao(versaoAtiva.id);
      if (etapas && etapas.length > 0) return etapas;
    }
    return getOrcamento(obraId)?.etapas ?? [];
  }, [obraId, getOrcamento, getVersaoAtiva, getEtapasDaVersao]);

  const tree = useMemo(() => buildTree(etapasSource), [etapasSource]);
  const allIds = useMemo(() => collectIds(tree), [tree]);

  const [modo, setModo] = useState<Modo>('etapas');
  const [selected, setSelected] = useState<Set<string>>(new Set(allIds));
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(tree.map(n => n.id)) // expand root by default
  );
  const [loading, setLoading] = useState(false);

  const toggleSelect = useCallback((id: string, childIds: Set<string>) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        childIds.forEach(c => next.delete(c));
      } else {
        next.add(id);
        childIds.forEach(c => next.add(c));
      }
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () => {
    setSelected(prev => prev.size === allIds.size ? new Set() : new Set(allIds));
  };

  // Build the ordered list of tarefas to create from the selection
  const selectedCount = useMemo(() => {
    if (modo === 'etapas') {
      return [...selected].filter(id => {
        const walk = (nodes: TreeNode[]): boolean =>
          nodes.some(n => n.id === id && n.tipo === 'etapa' || walk(n.children));
        return walk(tree);
      }).length;
    }
    return selected.size;
  }, [selected, modo, tree]);

  const handleImport = async () => {
    setLoading(true);
    try {
      // Build flat ordered list preserving depth order
      const tarefas: Partial<CronogramaTarefa>[] = [];
      // Map from orçamento id → future cronograma parent task (we use insertion order)
      // Since addTarefa returns the created row, we build them sequentially
      // We'll pass parent_tarefa_id by tracking created ids

      const walk = (nodes: TreeNode[], parentCronoId: string | null, nivel: number) => {
        let ordem = 1;
        for (const node of nodes) {
          const includeNode = selected.has(node.id) && (modo === 'completo' || node.tipo === 'etapa');
          if (!includeNode) {
            // Still walk children if parent is excluded but children might be selected
            if (node.tipo === 'etapa') walk(node.children, parentCronoId, nivel);
            continue;
          }

          tarefas.push({
            nome: node.nome,
            tipo_tarefa: node.tipo === 'etapa' ? 'RESUMO' : 'PADRAO',
            nivel,
            ordem: ordem++,
            parent_tarefa_id: parentCronoId ?? undefined,
            orcamento_categoria_id: node.orcamentoCategoriaId ?? null,
            orcamento_composicao_id: node.orcamentoComposicaoId ?? null,
            peso_orcamento: node.valor,
          });

          if (node.tipo === 'etapa' && node.children.length > 0) {
            // children will be walked after, but we need to know the parent ID
            // We'll track this via a placeholder — the import function handles it sequentially
            walk(node.children, `__parent:${node.id}`, nivel + 1);
          }
        }
      };

      walk(tree, null, 1);
      await onImport(tarefas);
      toast({ title: `${tarefas.length} tarefas importadas com sucesso` });
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-card rounded-xl shadow-2xl border border-border flex flex-col" style={{ width: 520, maxHeight: '82vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Importar do Orçamento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {etapasSource.length === 0
                ? 'Nenhum orçamento encontrado para esta obra'
                : `${etapasSource.length} etapa${etapasSource.length > 1 ? 's' : ''} disponíve${etapasSource.length > 1 ? 'is' : 'l'}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground self-center mr-1">Importar:</span>
          {(['etapas', 'completo'] as Modo[]).map(m => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                modo === m
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {m === 'etapas' ? '📁 Só Etapas' : '📋 Etapas + Serviços'}
            </button>
          ))}
          <button
            onClick={toggleAll}
            className="ml-auto px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {selected.size === allIds.size ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </button>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
          {etapasSource.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
              <Download className="w-8 h-8 opacity-20" />
              <p className="text-xs">Crie um orçamento primeiro para importar</p>
            </div>
          ) : (
            tree.map(node => (
              <NodeRow
                key={node.id}
                node={node}
                modo={modo}
                selected={selected}
                expanded={expanded}
                onToggleSelect={toggleSelect}
                onToggleExpand={toggleExpand}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={loading || selectedCount === 0 || etapasSource.length === 0}
              className="gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Importar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
