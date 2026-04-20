import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { catalogoInsumos } from '@/data/catalogoInsumos';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Layers,
  Box,
  Check,
  Plus,
  Search,
  DatabaseZap,
  Loader2,
  Filter,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';

interface SugestaoItem {
  id: string;
  descricao: string;
  unidade: string;
  tipo: 'modelo' | 'historico' | 'insumo' | 'sinapi';
  codigoSinapi?: string;
  precoMedio?: number;
  grupo?: string;
}

type TabId = 'historico' | 'modelos' | 'insumos' | 'sinapi';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaNome: string;
  existingDescricoes: string[];
  onAddSelected: (items: SugestaoItem[]) => void;
  /** Quando true, renderiza sem Sheet (modo painel inline 50/50) */
  inline?: boolean;
}

export default function SugestoesEtapaPanel({
  open,
  onOpenChange,
  etapaNome,
  existingDescricoes,
  onAddSelected,
  inline,
}: Props) {
  const { getComposicoesUsadasPorEtapa, getSugestaoInsumos } = useOrcamento();

  const [activeTab, setActiveTab] = useState<TabId>('historico');
  const [searchQuery, setSearchQuery] = useState('');
  const [sinapiResults, setSinapiResults] = useState<SugestaoItem[]>([]);
  const [sinapiLoading, setSinapiLoading] = useState(false);
  const [sinapiGrupos, setSinapiGrupos] = useState<string[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState('todos');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // ── Dados de histórico e modelos ──────────────────────────────────────────────
  const { modelos, historico, insumos } = useMemo(() => {
    const baseInsumos = catalogoInsumos.filter((i) => i.etapaRef === etapaNome);
    const historicoUsadas = getComposicoesUsadasPorEtapa(etapaNome);

    const catsModelos: SugestaoItem[] = baseInsumos.map((i) => ({
      id: `mod-${i.descricao}`,
      descricao: i.descricao,
      unidade: i.unidade,
      tipo: 'modelo',
    }));

    const catsHistorico: SugestaoItem[] = historicoUsadas.map((h) => ({
      id: `hist-${h.descricao}`,
      descricao: h.descricao,
      unidade: h.unidade,
      tipo: 'historico',
    }));

    const catsInsumos = getSugestaoInsumos(etapaNome)
      .filter(
        (i) =>
          !baseInsumos.some((b) => b.descricao === i.descricao) &&
          !historicoUsadas.some((h) => h.descricao === i.descricao)
      )
      .map((i) => ({
        id: `ins-${i.descricao}`,
        descricao: i.descricao,
        unidade: i.unidade,
        tipo: 'insumo' as const,
      }));

    return { modelos: catsModelos, historico: catsHistorico, insumos: catsInsumos };
  }, [etapaNome, getComposicoesUsadasPorEtapa, getSugestaoInsumos]);

  // ── Buscar grupos SINAPI (uma vez ao abrir) ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const fetchGrupos = async () => {
      try {
        const { data } = await (supabase as any)
          .from('sinapi_composicoes')
          .select('grupo')
          .not('grupo', 'is', null)
          .limit(500);
        if (data) {
          const unique = Array.from(
            new Set<string>((data as any[]).map((r) => r.grupo).filter(Boolean))
          ).sort();
          setSinapiGrupos(unique);
        }
      } catch {
        // silently fail
      }
    };
    fetchGrupos();
  }, [open]);

  // ── Busca SINAPI ──────────────────────────────────────────────────────────────
  const searchSinapi = useCallback(async (query: string, grupo: string) => {
    if (!query || query.length < 3) {
      setSinapiResults([]);
      return;
    }
    setSinapiLoading(true);
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    try {
      let q = (supabase as any)
        .from('sinapi_composicoes')
        .select('codigo, descricao, unidade, grupo')
        .ilike('descricao', `%${normalizedQuery}%`)
        .limit(50);

      if (grupo && grupo !== 'todos') {
        q = q.eq('grupo', grupo);
      }

      const { data } = await q;

      if (data) {
        setSinapiResults(
          (data as any[]).map((row) => ({
            id: `sinapi-${row.codigo}`,
            descricao: row.descricao,
            unidade: row.unidade || '',
            tipo: 'sinapi' as const,
            codigoSinapi: String(row.codigo),
            grupo: row.grupo,
          }))
        );
      }
    } finally {
      setSinapiLoading(false);
    }
  }, []);

  // Debounce ao mudar query ou grupo
  useEffect(() => {
    if (activeTab !== 'sinapi') return;
    const t = window.setTimeout(() => searchSinapi(searchQuery, selectedGrupo), 400);
    return () => window.clearTimeout(t);
  }, [searchQuery, activeTab, searchSinapi, selectedGrupo]);

  // Resetar estado ao fechar
  const handleClose = () => {
    setSearchQuery('');
    setAddedItems(new Set());
    onOpenChange(false);
  };

  // ── Filtro local ──────────────────────────────────────────────────────────────
  const filter = <T extends SugestaoItem>(items: T[]) =>
    searchQuery.trim()
      ? items.filter((i) => i.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
      : items;

  // ── Adicionar com 1 clique ────────────────────────────────────────────────────
  const handleAddItem = (item: SugestaoItem) => {
    if (existingDescricoes.includes(item.descricao)) return;
    onAddSelected([item]);
    setAddedItems((prev) => new Set(prev).add(item.id));
  };

  // ── Badge de tipo ─────────────────────────────────────────────────────────────
  const typeBadge = (tipo: SugestaoItem['tipo']) => {
    if (tipo === 'sinapi')
      return (
        <Badge variant="outline" className="text-[9px] border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-700 px-1 py-0 h-4 shrink-0">
          SINAPI
        </Badge>
      );
    if (tipo === 'historico')
      return (
        <Badge variant="outline" className="text-[9px] border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1 py-0 h-4 shrink-0">
          Suas obras
        </Badge>
      );
    if (tipo === 'modelo')
      return (
        <Badge variant="outline" className="text-[9px] border-primary/80 text-primary bg-primary/8 dark:bg-indigo-950/40 dark:text-primary/80 px-1 py-0 h-4 shrink-0">
          Modelo
        </Badge>
      );
    return null;
  };

  // ── Item card ─────────────────────────────────────────────────────────────────
  const ItemCard = ({ item }: { item: SugestaoItem }) => {
    const alreadyExists = existingDescricoes.includes(item.descricao);
    const justAdded = addedItems.has(item.id);
    const isDone = alreadyExists || justAdded;

    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group',
          isDone
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 opacity-70'
            : 'border-border/50 hover:border-primary/40 hover:bg-muted/30 cursor-pointer'
        )}
        onClick={() => !isDone && handleAddItem(item)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-medium leading-tight text-foreground">{item.descricao}</p>
            {typeBadge(item.tipo)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            {item.unidade && (
              <span>
                Un: <span className="font-mono font-medium text-foreground">{item.unidade}</span>
              </span>
            )}
            {item.codigoSinapi && <span className="font-mono">Cód: {item.codigoSinapi}</span>}
            {item.precoMedio && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ~R$ {item.precoMedio.toFixed(2)}
              </span>
            )}
            {item.grupo && (
              <span className="text-muted-foreground/70 truncate max-w-[160px]">{item.grupo}</span>
            )}
          </div>
        </div>

        {isDone ? (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Check className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">{justAdded ? 'Adicionado' : 'Já existe'}</span>
          </div>
        ) : (
          <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        )}
      </div>
    );
  };

  // ── Render lista ──────────────────────────────────────────────────────────────
  const renderList = (items: SugestaoItem[], emptyMsg: string, loading = false) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Buscando...</span>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="py-10 text-center border border-dashed rounded-xl mt-3">
          <p className="text-sm text-muted-foreground">{emptyMsg}</p>
        </div>
      );
    }
    return (
      <div className="space-y-1 mt-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    );
  };

  // ── Definição das abas ────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'historico',
      label: 'Suas obras',
      icon: <Layers className="w-3 h-3" />,
      count: historico.length || undefined,
    },
    {
      id: 'modelos',
      label: 'Modelos',
      icon: <Target className="w-3 h-3" />,
      count: modelos.length || undefined,
    },
    { id: 'insumos', label: 'Avulsos', icon: <Box className="w-3 h-3" /> },
    { id: 'sinapi', label: 'SINAPI', icon: <DatabaseZap className="w-3 h-3" /> },
  ];

  // ── Conteúdo da aba ativa ─────────────────────────────────────────────────────
  const tabContent = () => {
    switch (activeTab) {
      case 'historico':
        return renderList(
          filter(historico),
          searchQuery
            ? 'Nenhuma composição de suas obras corresponde à busca.'
            : 'Nenhuma composição usada em outras obras para esta etapa ainda.'
        );

      case 'modelos':
        return renderList(
          filter(modelos),
          searchQuery ? 'Nenhum modelo corresponde à busca.' : 'Nenhum modelo padrão encontrado para esta etapa.'
        );

      case 'insumos':
        return renderList(
          filter(insumos),
          searchQuery ? 'Nenhum insumo corresponde à busca.' : 'Nenhum insumo avulso sugerido.'
        );

      case 'sinapi':
        return (
          <>
            {/* Filtro por grupo */}
            {sinapiGrupos.length > 0 && (
              <div className="flex items-center gap-2 mt-2 shrink-0">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Filtrar por grupo..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="todos" className="text-xs">Todos os grupos</SelectItem>
                    {sinapiGrupos.map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {searchQuery.length < 3 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center mt-2">
                <DatabaseZap className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">Busca SINAPI</p>
                  <p className="text-xs text-muted-foreground">
                    Digite ao menos 3 caracteres na barra de busca.
                    {selectedGrupo !== 'todos' && (
                      <span className="block mt-0.5 text-blue-600 dark:text-blue-400">
                        Filtrado por: <strong>{selectedGrupo}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              renderList(
                sinapiResults,
                'Nenhuma composição SINAPI encontrada. Tente outra busca.',
                sinapiLoading
              )
            )}
          </>
        );
    }
  };

  const totalResultados = modelos.length + historico.length + insumos.length;

  // ── Layout interno (compartilhado entre inline e Sheet) ───────────────────────
  const panelBody = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold flex-1">Buscar no Catálogo</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted"
            aria-label="Fechar painel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {etapaNome && (
          <p className="text-xs text-muted-foreground mb-2">
            Adicionando à etapa:{' '}
            <span className="font-semibold text-foreground bg-primary/8 dark:bg-indigo-950/30 text-primary dark:text-primary/60 px-1.5 py-0.5 rounded-md">
              {etapaNome}
            </span>
          </p>
        )}
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar composição ou insumo..."
            className="pl-8 h-9 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Abas manuais */}
      <div className="flex border-b shrink-0 bg-muted/20">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary bg-background'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span className={cn(
                'rounded-full text-[9px] px-1 ml-0.5',
                tab.id === 'historico' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                tab.id === 'modelos' ? 'bg-primary/12 dark:bg-indigo-900 text-primary dark:text-primary/60' :
                'bg-muted text-muted-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba — scrollável */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
        {tabContent()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t bg-muted/10 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {addedItems.size > 0 ? (
              <>
                <strong className="text-foreground">{addedItems.size}</strong>{' '}
                item{addedItems.size !== 1 ? 's' : ''} adicionado{addedItems.size !== 1 ? 's' : ''}
              </>
            ) : (
              `${totalResultados} composições disponíveis`
            )}
          </span>
          <Button variant="outline" size="sm" onClick={handleClose} className="h-7 text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Modo inline: sem Sheet ────────────────────────────────────────────────────
  if (inline) {
    return panelBody;
  }

  // ── Modo Sheet (overlay lateral) ──────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col">
        {panelBody}
      </SheetContent>
    </Sheet>
  );
}
