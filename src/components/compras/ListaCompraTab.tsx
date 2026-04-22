import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { ShoppingCart, Plus, AlertTriangle, Tags, Trash2, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ListaCompraItem {
  id: string;
  lista_id: string;
  obra_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number | null;
  fornecedor_sugerido: string | null;
  origem: 'manual' | 'falta_reportada' | 'estoque_critico';
  origem_ref_id: string | null;
  created_at: string;
}

interface ListaCompra {
  id: string;
  obra_id: string;
  nome: string;
  status: 'aberta' | 'em_cotacao' | 'pedido_gerado' | 'cancelada';
  pedido_id: string | null;
  criado_por: string | null;
  created_at: string;
  itens?: ListaCompraItem[];
}

interface Sugestao {
  id: string;
  nome: string;
  responsavel: string;
  origem_ref_id: string;
}

interface Props {
  obraId: string;
  isActive?: boolean;
  onKpiChange?: () => void;
  onIrParaCotacao?: (listaNome?: string) => void;
}

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  em_cotacao: 'Em cotação',
  pedido_gerado: 'Pedido gerado',
  cancelada: 'Cancelada',
};

const statusColors: Record<string, string> = {
  aberta: 'bg-emerald-500/10 text-emerald-600',
  em_cotacao: 'bg-violet-500/10 text-violet-600',
  pedido_gerado: 'bg-primary/10 text-primary',
  cancelada: 'bg-muted text-muted-foreground',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function ListaCompraTab({ obraId, companyId, isActive = true, onKpiChange, onIrParaCotacao }: Props) {
  const navigate = useNavigate();

  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [listaAtiva, setListaAtiva] = useState<string | null>(null);
  const [itens, setItens] = useState<ListaCompraItem[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);

  // Editores em lista
  const [editingListaNomeId, setEditingListaNomeId] = useState<string | null>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);

  const fetchDados = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    
    try {
      const [{ data: listasDB }, { data: entradas }] = await Promise.all([
        (supabase as any)
          .from('lista_compra')
          .select('*, itens:lista_compra_itens(*)')
          .eq('obra_id', obraId)
          .order('created_at', { ascending: false }),

        (supabase as any)
          .from('entradas_pendentes')
          .select('id, nome_responsavel, observacao, dados_extraidos')
          .eq('obra_id', obraId)
          .eq('status', 'pendente'),
      ]);

      const listasArr = (listasDB || []) as ListaCompra[];
      setListas(listasArr);
      
      if (!listaAtiva && listasArr.length > 0) {
        setListaAtiva(listasArr[0].id);
      }

      // Processar sugestões
      const newSugestoes: Sugestao[] = [];
      const itensCompletos = listasArr.flatMap(l => l.itens || []);
      const refsCriadas = new Set(itensCompletos.map(i => i.origem_ref_id).filter(Boolean));

      for (const ent of (entradas || [])) {
        if (refsCriadas.has(ent.id)) continue;
        
        let materiais: string[] = [];
        const extraidos = ent.dados_extraidos as any;
        
        if (extraidos) {
          if (Array.isArray(extraidos.materiais)) {
            materiais = extraidos.materiais.map((m: any) => typeof m === 'string' ? m : m.nome).filter(Boolean);
          } else if (typeof extraidos.material === 'string') {
            materiais = [extraidos.material];
          } else if (typeof extraidos.materiais === 'string') {
            materiais = [extraidos.materiais];
          }
        }
        
        if (materiais.length === 0 && ent.observacao) {
          materiais = [ent.observacao];
        }

        for (const mat of materiais) {
          newSugestoes.push({
            id: crypto.randomUUID(),
            nome: mat,
            responsavel: ent.nome_responsavel || 'Funcionário',
            origem_ref_id: ent.id,
          });
        }
      }

      setSugestoes(newSugestoes);
    } catch (e) {
      console.error('Erro no fetch dados', e);
    } finally {
      setLoading(false);
    }
  }, [obraId, listaAtiva]);

  useEffect(() => {
    if (isActive) fetchDados();
  }, [fetchDados, isActive]);

  useEffect(() => {
    const lista = listas.find(l => l.id === listaAtiva);
    if (lista) {
      setItens(lista.itens || []);
    } else {
      setItens([]);
    }
  }, [listas, listaAtiva]);

  const handleNovaLista = async () => {
    const { data } = await (supabase as any)
      .from('lista_compra')
      .insert({
        obra_id: obraId,
        company_id: companyId,
        nome: 'Lista de compra',
        status: 'aberta',
      })
      .select()
      .single();

    if (data) {
      setListas(prev => [data, ...prev]);
      setListaAtiva(data.id);
      setEditingListaNomeId(data.id);
      setTimeout(() => nomeInputRef.current?.focus(), 100);
      onKpiChange?.();
    }
  };

  const handleUpdateNomeLista = async (id: string, novoNome: string) => {
    const trimmed = novoNome.trim() || 'Lista de compra';
    setListas(prev => prev.map(l => l.id === id ? { ...l, nome: trimmed } : l));
    setEditingListaNomeId(null);
    await (supabase as any)
      .from('lista_compra')
      .update({ nome: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id);
  };

  const handleAdicionarSugestao = async (s: Sugestao) => {
    if (!listaAtiva) return;
    
    const novoItem = {
      lista_id: listaAtiva,
      obra_id: obraId,
      nome: s.nome,
      quantidade: 1,
      unidade: 'un',
      origem: 'falta_reportada' as const,
      origem_ref_id: s.origem_ref_id,
    };

    const { data } = await (supabase as any)
      .from('lista_compra_itens')
      .insert(novoItem)
      .select()
      .single();

    if (data) {
      setItens(prev => [...prev, data]);
      setListas(prev => prev.map(l => l.id === listaAtiva ? { ...l, itens: [...(l.itens || []), data] } : l));
      setSugestoes(prev => prev.filter(x => x.origem_ref_id !== s.origem_ref_id));
      onKpiChange?.();
    }
  };

  const handleAddItem = () => {
    if (!listaAtiva) return;
    const placeholderTempId = crypto.randomUUID();
    const tempItem: ListaCompraItem = {
      id: placeholderTempId,
      lista_id: listaAtiva,
      obra_id: obraId,
      nome: '',
      quantidade: 1,
      unidade: 'un',
      preco_unitario: null,
      fornecedor_sugerido: null,
      origem: 'manual',
      origem_ref_id: null,
      created_at: new Date().toISOString()
    };
    setItens(prev => [...prev, tempItem]);
  };

  const updateItemLocal = (id: string, updates: Partial<ListaCompraItem>) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleBlurItemRow = async (item: ListaCompraItem) => {
    if (!item.nome.trim()) return;
    
    const isTemp = !item.created_at || (item.created_at && new Date(item.created_at).getTime() > new Date().getTime() - 10000 && !item.origem_ref_id && !listas.find(l => l.id === item.lista_id)?.itens?.find(i => i.id === item.id));

    if (isTemp) {
        // Verifica se é um novo item
        const payload = {
          lista_id: item.lista_id,
          obra_id: item.obra_id,
          nome: item.nome.trim(),
          quantidade: item.quantidade,
          unidade: item.unidade,
          preco_unitario: item.preco_unitario,
          fornecedor_sugerido: item.fornecedor_sugerido,
          origem: item.origem,
          origem_ref_id: item.origem_ref_id,
        };

        const { data } = await (supabase as any)
          .from('lista_compra_itens')
          .insert(payload)
          .select()
          .single();
          
        if (data) {
            setItens(prev => prev.map(i => i.id === item.id ? data : i));
            setListas(prev => prev.map(l => l.id === listaAtiva ? { ...l, itens: [...(l.itens?.filter(li => li.id !== item.id) || []), data] } : l));
        }
    } else {
        await (supabase as any)
          .from('lista_compra_itens')
          .upsert({
            id: item.id,
            lista_id: item.lista_id,
            obra_id: item.obra_id,
            nome: item.nome.trim(),
            quantidade: item.quantidade,
            unidade: item.unidade,
            preco_unitario: item.preco_unitario,
            fornecedor_sugerido: item.fornecedor_sugerido,
            origem: item.origem,
            origem_ref_id: item.origem_ref_id,
          });
    }
  };

  const handleDeleteItem = async (id: string) => {
    // Apenas se não for um item temporário sem nome salvo
    const item = itens.find(i => i.id === id);
    if (item && item.nome.trim()) {
      await (supabase as any).from('lista_compra_itens').delete().eq('id', id);
    }
    setItens(prev => prev.filter(i => i.id !== id));
    setListas(prev => prev.map(l => l.id === listaAtiva ? { ...l, itens: l.itens?.filter(i => i.id !== id) || [] } : l));
    
    // Se tinha origem referência, trazer de volta para sugestões (se ainda estiver pendente, o próximo fetch resolve, mas já removemos daqui)
    if (item?.origem_ref_id) {
        fetchDados();
    }
  };

  const handleIrParaCotacao = async () => {
    if (!listaAtiva) return;
    await (supabase as any)
      .from('lista_compra')
      .update({ status: 'em_cotacao', updated_at: new Date().toISOString() })
      .eq('id', listaAtiva);
    
    if (onIrParaCotacao) {
      const nome = listas.find(l => l.id === listaAtiva)?.nome;
      onIrParaCotacao(nome);
    } else {
      navigate(`/cotacao?origem=compra&listaId=${listaAtiva}`);
    }
  };

  const handleDeleteLista = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente deletar esta lista?')) return;
    await (supabase as any).from('lista_compra').delete().eq('id', id);
    setListas(prev => prev.filter(l => l.id !== id));
    if (listaAtiva === id) setListaAtiva(null);
    onKpiChange?.();
  };

  const handleDuplicateLista = async (lista: ListaCompra, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Create new list
    const { data: nova } = await (supabase as any)
      .from('lista_compra')
      .insert({
        obra_id: obraId,
        company_id: companyId,
        nome: `${lista.nome} (Cópia)`,
        status: 'aberta',
      })
      .select()
      .single();

    if (!nova) return;

    // Duplicate items
    if (lista.itens && lista.itens.length > 0) {
      const novosItens = lista.itens.filter(i => i.nome.trim()).map(i => ({
        lista_id: nova.id,
        obra_id: obraId,
        nome: i.nome,
        quantidade: i.quantidade,
        unidade: i.unidade,
        preco_unitario: i.preco_unitario,
        fornecedor_sugerido: i.fornecedor_sugerido,
        origem: i.origem,
        origem_ref_id: i.origem_ref_id
      }));

      if (novosItens.length > 0) {
        const { data: itensDB } = await (supabase as any)
          .from('lista_compra_itens')
          .insert(novosItens)
          .select();
        
        nova.itens = itensDB || [];
      }
    } else {
      nova.itens = [];
    }
    
    setListas(prev => [nova, ...prev]);
    setListaAtiva(nova.id);
    onKpiChange?.();
  };

  if (loading && listas.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Layout Empty State Geral
  if (listas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium">Nenhuma lista de compra criada</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Crie uma lista para organizar os materiais que precisa comprar.
        </p>
        <Button onClick={handleNovaLista} className="gap-1.5 mt-2">
          <Plus className="h-4 w-4" />
          Nova lista de compra
        </Button>
      </div>
    );
  }

  const listaAtivaDados = listas.find(l => l.id === listaAtiva);

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-background">
      {/* ── Painel Esquerdo: Lista de Listas ── */}
      <div className="w-full md:w-[280px] border-r flex flex-col shrink-0 bg-muted/10 h-1/3 md:h-full border-b md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shrink-0">
          <span className="text-sm font-medium">Minhas Listas</span>
          <Button size="sm" variant="outline" onClick={handleNovaLista} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Nova
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {listas.map(lista => (
            <button
              key={lista.id}
              onClick={() => {
                  if (editingListaNomeId !== lista.id) {
                      setListaAtiva(lista.id);
                  }
              }}
              className={cn(
                'w-full text-left px-4 py-3 border-b text-sm transition-colors hover:bg-muted/40 relative group',
                listaAtiva === lista.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                {editingListaNomeId === lista.id ? (
                  <Input 
                    ref={nomeInputRef}
                    className="h-6 text-xs p-1"
                    defaultValue={lista.nome}
                    onBlur={(e) => handleUpdateNomeLista(lista.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateNomeLista(lista.id, e.currentTarget.value)}
                  />
                ) : (
                  <span 
                    className="font-semibold text-foreground truncate cursor-text"
                    onDoubleClick={() => setEditingListaNomeId(lista.id)}
                  >
                    {lista.nome}
                  </span>
                )}
                {!editingListaNomeId && <Badge variant="outline" className={cn("text-[10px] shrink-0 border-0", statusColors[lista.status])}>
                  {statusLabels[lista.status]}
                </Badge>}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 min-h-[20px]">
                <span>{(lista.itens || []).filter(i => i.nome.trim() !== '').length} itens</span>
                <div className="hidden group-hover:flex items-center gap-1 bg-background/80 rounded-md">
                  <button onClick={(e) => handleDuplicateLista(lista, e)} className="p-1 hover:text-foreground text-muted-foreground transition-colors" title="Duplicar lista"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => handleDeleteLista(lista.id, e)} className="p-1 hover:text-red-500 text-muted-foreground transition-colors" title="Deletar lista"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Painel Direito: Itens da Lista ── */}
      <div className="flex-1 flex flex-col h-2/3 md:h-full min-w-0 bg-background relative">
        {!listaAtivaDados ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione uma lista para visualizar
          </div>
        ) : (
          <>
            {/* Banner de Sugestões */}
            {sugestoes.length > 0 && (
              <div className="mx-4 mt-4 mb-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">
                    {sugestoes.length} falta{sugestoes.length > 1 ? 's' : ''} reportada{sugestoes.length > 1 ? 's' : ''} no campo
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map(s => (
                    <button
                      key={s.origem_ref_id}
                      onClick={() => handleAdicionarSugestao(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background border border-amber-500/20 hover:bg-amber-500/10 text-xs text-amber-900 transition-colors shadow-sm"
                    >
                      <Plus className="h-3 w-3 text-amber-600" />
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-amber-600/70">· {s.responsavel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-[1fr_80px_60px_100px_120px_32px] gap-2 px-4 py-2 mt-2 border-b bg-muted/40 shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Material</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Qtd</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Un.</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">R$ Unit.</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fornecedor (Opcional)</span>
              <span />
            </div>

            {/* Linhas da Tabela */}
            <div className="flex-1 overflow-y-auto pb-4">
              {itens.map(item => (
                <div key={item.id} className="group grid grid-cols-[1fr_80px_60px_100px_120px_32px] gap-2 px-4 py-1.5 items-center border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    {item.origem === 'falta_reportada' && item.nome && (
                      <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 border-amber-500/20 whitespace-nowrap shrink-0 px-1 py-0 h-4">
                        Reportado
                      </Badge>
                    )}
                    {item.origem === 'estoque_critico' && item.nome && (
                      <Badge variant="outline" className="text-[9px] bg-orange-500/10 text-orange-700 border-orange-500/20 whitespace-nowrap shrink-0 px-1 py-0 h-4">
                        Crítico
                      </Badge>
                    )}
                    <Input
                      defaultValue={item.nome}
                      placeholder="Nome do material"
                      className="h-7 text-xs border-transparent hover:border-border focus:border-ring bg-transparent shadow-none px-2"
                      onBlur={(e) => {
                        updateItemLocal(item.id, { nome: e.target.value });
                        handleBlurItemRow({ ...item, nome: e.target.value });
                      }}
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      defaultValue={item.quantidade}
                      className="h-7 text-xs border-transparent hover:border-border focus:border-ring bg-transparent shadow-none px-2 text-right"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        updateItemLocal(item.id, { quantidade: val });
                        handleBlurItemRow({ ...item, quantidade: val });
                      }}
                    />
                  </div>
                  <div>
                    <Select 
                      value={item.unidade} 
                      onValueChange={(val) => {
                        updateItemLocal(item.id, { unidade: val });
                        handleBlurItemRow({ ...item, unidade: val });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs border-transparent hover:border-border bg-transparent shadow-none px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['un', 'kg', 'm', 'm²', 'm³', 'saco', 'l', 'cx'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input
                      type="number"
                      defaultValue={item.preco_unitario || ''}
                      placeholder="0,00"
                      className="h-7 text-xs border-transparent hover:border-border focus:border-ring bg-transparent shadow-none px-2 text-right"
                      onBlur={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : null;
                        updateItemLocal(item.id, { preco_unitario: val });
                        handleBlurItemRow({ ...item, preco_unitario: val });
                      }}
                    />
                  </div>
                  <div>
                    <Input
                      defaultValue={item.fornecedor_sugerido || ''}
                      placeholder="Fornecedor"
                      className="h-7 text-xs border-transparent hover:border-border focus:border-ring bg-transparent shadow-none px-2 text-muted-foreground placeholder:text-muted-foreground/40"
                      onBlur={(e) => {
                        updateItemLocal(item.id, { fornecedor_sugerido: e.target.value || null });
                        handleBlurItemRow({ ...item, fornecedor_sugerido: e.target.value || null });
                      }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                      title="Remover linha"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2.5 w-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar material
              </button>
            </div>

            {/* Footer com totais e ações */}
            <div className="mt-auto border-t py-3 px-4 flex items-center justify-between bg-background shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="text-sm">
                <span className="text-muted-foreground">Total estimado: </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    itens.filter(i => i.nome.trim()).reduce((s, i) =>
                      s + (i.quantidade ?? 0) * (i.preco_unitario ?? 0), 0
                    )
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm focus:ring-primary/20"
                  onClick={() => handleIrParaCotacao()}
                  disabled={itens.filter(i => i.nome.trim()).length === 0}
                >
                  <Tags className="h-3.5 w-3.5" />
                  Ir para cotação
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
