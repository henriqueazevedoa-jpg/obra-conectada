import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check, X, Search, UserPlus, Users, Save, XCircle, Trash2, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/untyped';
import { normalizeText } from '@/lib/normalizeText';

function DraggableRow({ item, children, className }: any) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.key,
    data: { type: 'item', item }
  });

  return (
    <tr
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(className, isDragging ? 'opacity-50 select-none bg-primary/10' : 'cursor-grab active:cursor-grabbing hover:bg-slate-50')}
    >
      {children}
    </tr>
  );
}

const formatBRL = (val: number | null | undefined) => {
  if (val == null || isNaN(val) || val === 0) return '—';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function CotacaoComparativoTable({ 
  itensFiltrados, todosFornecedores, historicoPrecos,
  onUpdatePrecoManual, onAddFornecedor, onRemoveFornecedor,
  companyId, obraId, onRemoveItemDaLista
}: any) {
  // Limite de performance: 50 itens
  const LIMIT = 50;
  const isOverLimit = itensFiltrados.length > LIMIT;
  const itens = isOverLimit ? itensFiltrados.slice(0, LIMIT) : itensFiltrados;

  // Toggles de Highlight
  const [highlightRow, setHighlightRow] = useState(true);
  const [highlightFornecedor, setHighlightFornecedor] = useState<string | null>(null);

  // Toggle Histórico
  const [modoHistorico, setModoHistorico] = useState<'ultimo' | 'medio' | 'menor'>('ultimo');

  // Autocomplete Fornecedores
  const [showAddForn, setShowAddForn] = useState(false);
  const [buscaForn, setBuscaForn] = useState('');
  const [fornecedoresDB, setFornecedoresDB] = useState<any[]>([]);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!obraId) return;
    (supabase as any)
      .from('fornecedores')
      .select('id, nome, cnpj, especialidades')
      .eq('company_id', companyId)
      .then(({ data }: any) => { if (data) setFornecedoresDB(data); });
  }, [obraId]);

  const sugestoesForn = useMemo(() => {
    if (!buscaForn.trim()) return [];
    const q = normalizeText(buscaForn.trim());
    return fornecedoresDB.filter(f => 
      normalizeText(f.nome).includes(q) &&
      !todosFornecedores.some((tf: any) => tf.nome.toLowerCase() === f.nome.toLowerCase())
    ).slice(0, 5);
  }, [buscaForn, fornecedoresDB, todosFornecedores]);

  const handleAddForn = async () => {
    if (buscaForn.trim()) {
      await onAddFornecedor(buscaForn.trim());
      setBuscaForn('');
      setShowAddForn(false);
    }
  };

  // Melhor preço da linha
  const getMelhorPreco = (key: string) => {
    let min = Infinity;
    for (const f of todosFornecedores) {
      const p = f.precos?.[key];
      if (p && p > 0 && p < min) min = p;
    }
    return min === Infinity ? null : min;
  };

  // Célula Editável
  const [editingCell, setEditingCell] = useState<{ itemKey: string, fornId: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Sugestão de Histórico (Mini-card) < 90 dias
  // Usaremos um efeito: ao focar numa célula de fornecedor manual, checamos se existe preço histórico
  // Para simplicidade, vamos consultar `preco_historico` para o item + fornecedor
  const [sugestaoHist, setSugestaoHist] = useState<{ preco: number, data: string, origem: string } | null>(null);
  const [checkingHist, setCheckingHist] = useState(false);

  const startEdit = async (itemKey: string, forn: any, currentValue?: number, descricao?: string) => {
    if (forn.fonte !== 'manual') return; // só edita manuais
    setEditingCell({ itemKey, fornId: forn.id });
    setEditingValue(currentValue ? String(currentValue) : '');
    setSugestaoHist(null);
    
    // Check histórico se estiver vazio
    if (!currentValue && companyId && descricao) {
      setCheckingHist(true);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 90);
      const { data } = await (supabase as any).from('preco_historico')
        .select('preco_unitario, data_referencia, origem')
        .eq('company_id', companyId)
        .eq('fornecedor_nome', forn.nome)
        .eq('descricao_normalizada', normalizeText(descricao))
        .gte('data_referencia', limitDate.toISOString().split('T')[0])
        .order('data_referencia', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setSugestaoHist({ preco: Number(data[0].preco_unitario), data: data[0].data_referencia, origem: data[0].origem });
      }
      setCheckingHist(false);
    }
  };

  const commitEdit = async (fornNome: string) => {
    if (!editingCell) return;
    const { itemKey, fornId } = editingCell;
    const v = parseFloat(editingValue);
    setEditingCell(null);
    if (!isNaN(v) && v > 0) {
      await onUpdatePrecoManual(itemKey, fornId, fornNome, v);
    }
  };

  if (itensFiltrados.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center bg-slate-50/50">
        <Package className="h-12 w-12 opacity-20" />
        <p>Selecione uma lista no painel esquerdo ou arraste itens para cá.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header Tabela */}
      <div className="px-4 py-3 flex items-center justify-between border-b shrink-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            {itensFiltrados.length} Itens
          </Badge>
          {isOverLimit && (
            <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Mostrando os primeiros {LIMIT} (limite de performance)
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-slate-500 flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={highlightRow} onChange={e => setHighlightRow(e.target.checked)} className="rounded border-slate-300" />
            Destacar Menor Preço
          </label>
          <div className="w-px h-4 bg-slate-200 mx-1" />
          <Popover open={showAddForn} onOpenChange={setShowAddForn}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200" onClick={() => setTimeout(() => addRef.current?.focus(), 50)}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Fornecedor
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <p className="text-xs font-semibold mb-2">Adicionar fornecedor ao comparativo</p>
              <Input ref={addRef} value={buscaForn} onChange={e => setBuscaForn(e.target.value)} placeholder="Nome do fornecedor..." className="h-8 text-sm" onKeyDown={e => e.key === 'Enter' && handleAddForn()} />
              {sugestoesForn.length > 0 && (
                <div className="mt-1 border rounded-md overflow-hidden bg-white shadow-sm">
                  {sugestoesForn.map(f => (
                    <div key={f.id} className="text-xs px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2" onClick={() => { setBuscaForn(f.nome); handleAddForn(); }}>
                      <Users className="h-3 w-3 text-slate-400" /> <span className="font-medium truncate">{f.nome}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button size="sm" className="w-full h-8 mt-2" onClick={handleAddForn} disabled={!buscaForn.trim()}>Adicionar Manualmente</Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="min-w-max pb-16">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 z-20 shadow-[0_1px_0_rgba(203,213,225,1)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold w-[320px]">Descrição do Item</th>
                <th className="px-2 py-2.5 font-semibold text-center w-14">Un</th>
                <th className="px-2 py-2.5 font-semibold text-center w-16">Qtd</th>
                
                {/* Colunas de Fornecedores */}
                {todosFornecedores.map((f: any) => (
                  <th key={f.id} className={cn("px-3 py-2.5 font-semibold border-l align-top min-w-[120px] max-w-[160px]", highlightFornecedor === f.id ? "bg-indigo-50 text-indigo-700" : "")}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between group">
                        <span className="truncate" title={f.nome}>{f.nome}</span>
                        {f.fonte === 'manual' && (
                          <button onClick={() => onRemoveFornecedor(f.id, f.nome)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:bg-red-50 rounded">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={cn("text-[9px] border-0 px-1 py-0", f.fonte === 'link' ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-600")}>
                          {f.fonte === 'link' ? 'Link Cotação' : 'Manual'}
                        </Badge>
                        <button 
                          className="text-[9px] text-slate-400 hover:text-indigo-600 underline"
                          onClick={() => setHighlightFornecedor(h => h === f.id ? null : f.id)}
                        >
                          {highlightFornecedor === f.id ? 'Limpar' : 'Destacar'}
                        </button>
                      </div>
                    </div>
                  </th>
                ))}

                {/* Coluna Histórico da Empresa */}
                <th className="px-3 py-2.5 font-semibold border-l border-indigo-100 bg-indigo-50/30 text-indigo-900 w-[140px] align-top">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-700">
                      <Save className="h-3 w-3" />
                      <span>Histórico (90d)</span>
                    </div>
                    <select 
                      className="text-[10px] bg-white border-indigo-200 text-indigo-700 rounded p-0.5 shadow-sm outline-none"
                      value={modoHistorico}
                      onChange={e => setModoHistorico(e.target.value as any)}
                    >
                      <option value="ultimo">Último preço</option>
                      <option value="medio">Preço médio</option>
                      <option value="menor">Menor preço</option>
                    </select>
                  </div>
                </th>
                <th className="px-2 py-2.5 w-10 border-l"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((item: any) => {
                const min = highlightRow ? getMelhorPreco(item.key) : null;
                const registros = historicoPrecos?.[normalizeText(item.descricao)];
                let hist = null;
                if (registros && registros.length > 0) {
                  if (modoHistorico === 'ultimo') {
                    hist = { preco: registros[0].preco_unitario, ocorrencias: registros.length, data: registros[0].data_referencia, origem: registros[0].origem };
                  } else if (modoHistorico === 'menor') {
                    const menor = registros.reduce((m: any, r: any) => r.preco_unitario < m.preco_unitario ? r : m);
                    hist = { preco: menor.preco_unitario, ocorrencias: registros.length, data: menor.data_referencia, origem: menor.origem };
                  } else if (modoHistorico === 'medio') {
                    const avg = registros.reduce((s: number, r: any) => s + r.preco_unitario, 0) / registros.length;
                    hist = { preco: avg, ocorrencias: registros.length };
                  }
                }
                
                return (
                  <DraggableRow key={item.key} item={item} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-700">
                      <div className="line-clamp-2" title={item.descricao}>{item.descricao}</div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-slate-500">{item.unidade}</td>
                    <td className="px-2 py-2.5 text-center text-slate-500 font-medium bg-slate-50/50">{item.quantidade ?? '—'}</td>
                    
                    {/* Células Fornecedores */}
                    {todosFornecedores.map((f: any) => {
                      const isEditing = editingCell?.itemKey === item.key && editingCell?.fornId === f.id;
                      const val = f.precos?.[item.key];
                      const isMin = highlightRow && min !== null && val === min;
                      const isFornHl = highlightFornecedor === f.id;

                      return (
                        <td 
                          key={f.id} 
                          className={cn(
                            "px-3 py-2 border-l relative transition-colors",
                            f.fonte === 'manual' ? "cursor-text hover:bg-indigo-50/30" : "",
                            isMin ? "bg-emerald-50" : isFornHl ? "bg-indigo-50/50" : ""
                          )}
                          onClick={() => !isEditing && startEdit(item.key, f, val, item.descricao)}
                        >
                          {isEditing ? (
                            <div className="relative z-50">
                              <Input
                                autoFocus
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onBlur={() => setTimeout(() => commitEdit(f.nome), 150)} // delay para permitir click no suggestion
                                onKeyDown={e => e.key === 'Enter' && commitEdit(f.nome)}
                                className="h-7 text-xs px-2 w-full text-right"
                              />
                              {/* Sugestão de Preço Histórico < 90 dias */}
                              {sugestaoHist && (
                                <div className="absolute left-0 top-full mt-1 w-48 bg-white shadow-xl border rounded-lg p-2 z-50 text-left animate-in slide-in-from-top-1">
                                  <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
                                    <Save className="h-3 w-3" /> Preço Histórico
                                  </div>
                                  <div className="text-sm font-bold text-indigo-700">{formatBRL(sugestaoHist.preco)}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">Em {new Date(sugestaoHist.data).toLocaleDateString()} via {sugestaoHist.origem}</div>
                                  <div className="flex gap-1 mt-2">
                                    <Button size="sm" className="h-6 text-[10px] flex-1 px-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingValue(String(sugestaoHist.preco)); setTimeout(() => commitEdit(f.nome), 0); }}>Usar valor</Button>
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] w-6 px-0" onClick={() => setSugestaoHist(null)}><X className="h-3 w-3" /></Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={cn("text-right font-medium", isMin ? "text-emerald-700" : isFornHl ? "text-indigo-700" : "text-slate-700")}>
                              {formatBRL(val)}
                              {isMin && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 border-l border-indigo-50 bg-indigo-50/10 text-right relative group/hist">
                      {hist ? (
                        <div>
                          <div className="font-semibold text-indigo-700">{formatBRL(hist.preco)}</div>
                          <div className="text-[9px] text-slate-400 font-medium">{hist.ocorrencias} ref{hist.ocorrencias !== 1 ? 's' : ''}</div>
                          {hist.data && (
                            <div className="absolute hidden group-hover/hist:block right-full mr-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap z-50">
                              Em {new Date(hist.data).toLocaleDateString()} via {hist.origem}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-2 py-2 border-l text-center">
                      {onRemoveItemDaLista && (
                        <button onClick={() => onRemoveItemDaLista(item.key)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </DraggableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
