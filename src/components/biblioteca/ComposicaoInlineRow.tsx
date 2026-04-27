import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/untyped';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronRight, ChevronDown, Layers, Package, Pencil, Trash2, Plus, X, Loader2, ArrowDown
} from 'lucide-react';

interface CatalogoRow {
  id: string;
  company_id: string;
  codigo: string | null;
  nome: string;
  unidade: string | null;
  categoria: string | null;
  usos: number | null;
  preco_medio: number | null;
  is_modelo: boolean | null;
}

interface InsumoRow {
  id: string;
  composicao_id: string;
  descricao: string;
  unidade: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  ordem: number;
}

interface PrecoReferencia {
  preco_medio: number;
  ultima_data: string;
  num_registros: number;
}

interface ComposicaoInlineRowProps {
  item: CatalogoRow;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleModelo: () => void;
  onUpdateSuccess: () => void;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function ComposicaoInlineRow({
  item,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleModelo,
  onUpdateSuccess,
}: ComposicaoInlineRowProps) {
  const { company } = useCompany();
  const [expanded, setExpanded] = useState(false);
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(item.nome);
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [referencias, setReferencias] = useState<Record<string, PrecoReferencia>>({});

  // 1. Fetch Insumos
  const loadInsumos = useCallback(async () => {
    if (!company?.id || !expanded) return;
    setLoadingInsumos(true);
    const { data, error } = await supabase
      .from('catalogo_composicao_insumos')
      .select('*')
      .eq('composicao_id', item.id)
      .eq('company_id', company.id)
      .order('ordem');

    if (!error && data) {
      setInsumos(data as InsumoRow[]);
      fetchReferencias(data as InsumoRow[]);
    }
    setLoadingInsumos(false);
  }, [company?.id, item.id, expanded]);

  useEffect(() => {
    if (expanded) {
      loadInsumos();
    }
  }, [expanded, loadInsumos]);

  // 2. Fetch Histórico de Preços
  const fetchReferencias = async (currentInsumos: InsumoRow[]) => {
    if (!company?.id) return;
    const newRefs: Record<string, PrecoReferencia> = { ...referencias };
    
    for (const ins of currentInsumos) {
      if (!ins.descricao || newRefs[ins.id]) continue;
      const descNorm = normalize(ins.descricao);
      const { data, error } = await supabase.rpc('get_preco_historico_referencia', {
        p_company_id: company.id,
        p_descricao: descNorm
      });
      
      // Fallback manual se RPC não existir (tentativa inline query)
      if (error) {
        const { data: refData } = await supabase
          .from('preco_historico')
          .select('preco_unitario, data_referencia')
          .eq('company_id', company.id)
          .ilike('descricao_normalizada', `%${descNorm}%`);
          
        if (refData && refData.length > 0) {
          const avg = refData.reduce((acc: number, val: any) => acc + Number(val.preco_unitario), 0) / refData.length;
          newRefs[ins.id] = {
            preco_medio: avg,
            ultima_data: refData[0].data_referencia,
            num_registros: refData.length
          };
        }
      } else if (data && data.length > 0) {
         newRefs[ins.id] = {
           preco_medio: data[0].preco_medio,
           ultima_data: data[0].ultima_data,
           num_registros: data[0].num_registros
         };
      }
    }
    setReferencias(newRefs);
  };

  // 3. Save Composition Nome
  const handleSaveNome = async () => {
    setIsEditingNome(false);
    if (nomeEdit === item.nome) return;
    if (!nomeEdit.trim()) {
      setNomeEdit(item.nome);
      return;
    }
    const { error } = await supabase
      .from('catalogo_composicoes')
      .update({ nome: nomeEdit.trim() })
      .eq('id', item.id);
      
    if (!error) onUpdateSuccess();
    else setNomeEdit(item.nome);
  };

  // 4. Save Insumo (Update/Insert)
  const handleSaveInsumo = async (index: number, field: keyof InsumoRow, value: any) => {
    const insumo = insumos[index];
    if (insumo[field] === value) return; // no changes
    
    const updatedInsumos = [...insumos];
    updatedInsumos[index] = { ...insumo, [field]: value };
    setInsumos(updatedInsumos);

    // Salvar no BD
    if (insumo.id.startsWith('temp-')) {
      // Create new
      const { data, error } = await supabase
        .from('catalogo_composicao_insumos')
        .insert({
          composicao_id: item.id,
          company_id: company?.id,
          descricao: updatedInsumos[index].descricao,
          unidade: updatedInsumos[index].unidade,
          quantidade: updatedInsumos[index].quantidade,
          preco_unitario: updatedInsumos[index].preco_unitario,
          ordem: updatedInsumos[index].ordem
        })
        .select()
        .single();
        
      if (!error && data) {
        updatedInsumos[index] = data as InsumoRow;
        setInsumos(updatedInsumos);
      }
    } else {
      // Update existing
      await supabase
        .from('catalogo_composicao_insumos')
        .update({ [field]: value })
        .eq('id', insumo.id);
    }
    
    recalcPrecoMedio(updatedInsumos);
  };

  // 5. Excluir Insumo
  const handleDeleteInsumo = async (index: number) => {
    const insumo = insumos[index];
    const newInsumos = insumos.filter((_, i) => i !== index);
    setInsumos(newInsumos);
    
    if (!insumo.id.startsWith('temp-')) {
      await supabase.from('catalogo_composicao_insumos').delete().eq('id', insumo.id);
      recalcPrecoMedio(newInsumos);
    }
  };

  const recalcPrecoMedio = async (currentInsumos: InsumoRow[]) => {
    const total = currentInsumos.reduce((acc, ins) => {
      const qtd = Number(ins.quantidade) || 0;
      const preco = Number(ins.preco_unitario) || 0;
      return acc + (qtd * preco);
    }, 0);
    
    await supabase
      .from('catalogo_composicoes')
      .update({ preco_medio: total })
      .eq('id', item.id);
      
    onUpdateSuccess();
  };

  const handleAddInsumo = () => {
    setInsumos(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        composicao_id: item.id,
        descricao: '',
        unidade: 'un',
        quantidade: 0,
        preco_unitario: 0,
        ordem: prev.length
      } as InsumoRow
    ]);
  };

  return (
    <div className={cn(
      'flex flex-col border-b border-border/50 group transition-colors',
      selected && 'bg-primary/5',
      expanded && 'bg-muted/10'
    )}>
      {/* ── ROW HEADER ── */}
      <div 
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30',
          selected && 'border-l-2 border-l-primary'
        )}
        onClick={() => {
          onSelect();
          // setExpanded(!expanded); // User clicks chevron to expand, name to edit
        }}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
          item.is_modelo ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-muted'
        )}>
          {item.is_modelo
            ? <Layers className="h-4 w-4 text-violet-500" />
            : <Package className="h-4 w-4 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
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
          
          {isEditingNome ? (
            <Input
              autoFocus
              value={nomeEdit}
              onChange={e => setNomeEdit(e.target.value)}
              onBlur={handleSaveNome}
              onKeyDown={e => e.key === 'Enter' && handleSaveNome()}
              className="h-7 text-xs flex-1 max-w-md bg-background"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <p 
              className="text-xs font-medium text-foreground truncate cursor-text hover:underline decoration-muted-foreground/30 underline-offset-4"
              onClick={(e) => { e.stopPropagation(); setIsEditingNome(true); }}
            >
              {item.nome}
            </p>
          )}
        </div>

        <div className="text-right shrink-0 hidden sm:block w-24">
          <p className="text-[10px] text-muted-foreground">{item.unidade || '—'}</p>
          {item.preco_medio !== null && (
            <p className="text-[10px] text-emerald-600 font-medium">
              {item.preco_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>

        {(item.usos ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[9px] h-4 shrink-0 hidden lg:block">
            {item.usos}x
          </Badge>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onToggleModelo(); }}
            className={cn(
              'h-6 w-6 rounded flex items-center justify-center transition-colors',
              item.is_modelo ? 'text-violet-500 hover:bg-violet-50' : 'text-muted-foreground hover:bg-muted'
            )}
            title={item.is_modelo ? 'Remover de modelos' : 'Marcar como modelo'}
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            title="Editar (Detalhes)"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── EXPANDED INSUMOS SECTION ── */}
      {expanded && (
        <div className="pl-14 pr-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border font-medium text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-1/2">Descrição</th>
                  <th className="px-3 py-2 w-16">UN</th>
                  <th className="px-3 py-2 w-24">Qtd.</th>
                  <th className="px-3 py-2 w-28">R$/UN</th>
                  <th className="px-3 py-2 w-28">Total</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingInsumos && insumos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground text-xs">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Carregando insumos...
                    </td>
                  </tr>
                ) : insumos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted-foreground text-xs">
                      Nenhum insumo cadastrado.
                    </td>
                  </tr>
                ) : (
                  insumos.map((ins, index) => {
                    const preco = Number(ins.preco_unitario) || 0;
                    const qtd = Number(ins.quantidade) || 0;
                    const total = preco * qtd;
                    const ref = referencias[ins.id];

                    return (
                      <tr key={ins.id} className="hover:bg-muted/30 group/row">
                        <td className="p-1 px-2">
                          <Input
                            className="h-7 text-xs border-transparent hover:border-input focus-visible:border-input bg-transparent px-2"
                            defaultValue={ins.descricao}
                            onBlur={(e) => handleSaveInsumo(index, 'descricao', e.target.value)}
                            placeholder="Descrição"
                          />
                          {ref && (
                            <div className="px-2 pb-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                              <span title="Preço de Referência Histórico do Banco de Preços" className="flex items-center gap-1">
                                Ref. Histórica: 
                                <span className={preco > ref.preco_medio ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
                                  {ref.preco_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                {preco > 0 && (
                                  <span className="flex items-center">
                                    {preco > ref.preco_medio ? <ArrowDown className="h-2.5 w-2.5 rotate-180 text-destructive inline" /> : <ArrowDown className="h-2.5 w-2.5 text-emerald-600 inline" />}
                                    {Math.abs((preco / ref.preco_medio) - 1).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 })}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-1">
                          <Input
                            className="h-7 text-xs border-transparent hover:border-input focus-visible:border-input bg-transparent px-2 text-center"
                            defaultValue={ins.unidade || ''}
                            onBlur={(e) => handleSaveInsumo(index, 'unidade', e.target.value)}
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            className="h-7 text-xs border-transparent hover:border-input focus-visible:border-input bg-transparent px-2"
                            defaultValue={ins.quantidade?.toString() || ''}
                            onBlur={(e) => handleSaveInsumo(index, 'quantidade', Number(e.target.value.replace(',','.')))}
                            type="number"
                            step="0.01"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            className="h-7 text-xs border-transparent hover:border-input focus-visible:border-input bg-transparent px-2 text-emerald-600 font-medium"
                            defaultValue={ins.preco_unitario?.toString() || ''}
                            onBlur={(e) => handleSaveInsumo(index, 'preco_unitario', Number(e.target.value.replace(',','.')))}
                            type="number"
                            step="0.01"
                          />
                        </td>
                        <td className="p-1 px-3 text-emerald-600 font-medium">
                          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-1">
                          <button
                            onClick={() => handleDeleteInsumo(index)}
                            className="opacity-0 group-hover/row:opacity-100 h-6 w-6 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors mx-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="bg-muted/10 border-t border-border/50 p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleAddInsumo}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar insumo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
