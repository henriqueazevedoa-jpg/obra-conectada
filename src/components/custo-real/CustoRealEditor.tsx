import { useState, useEffect, useMemo } from 'react';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCustoReal, CustoRealItem } from '@/contexts/CustoRealContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';

interface Props {
  obraId: string;
  obraNome: string;
  onBack: () => void;
}

const TIPOS_INSUMO_DEFAULT = ['Material', 'Mão de Obra', 'Locação', 'Serviço Terceirizado', 'Outros'];

const EQUIPAMENTOS_LOCACAO = [
  'Betoneira 400L', 'Retroescavadeira', 'Escavadeira Hidráulica', 'Caminhão Basculante',
  'Guindaste Móvel', 'Plataforma Elevatória', 'Compactador de Solo', 'Vibrador de Concreto',
  'Serra Circular de Bancada', 'Andaime Fachadeiro', 'Container Escritório', 'Container Almoxarifado',
  'Gerador de Energia', 'Compressor de Ar', 'Bomba de Concreto', 'Martelete Rompedor',
  'Mini Carregadeira', 'Rolo Compactador', 'Guincho de Coluna',
];

const MAO_DE_OBRA_TIPOS = [
  'Pedreiro', 'Servente', 'Mestre de Obras', 'Encanador', 'Eletricista',
  'Carpinteiro', 'Armador', 'Pintor', 'Azulejista', 'Gesseiro',
  'Soldador', 'Serralheiro', 'Marmorista', 'Vidraceiro', 'Impermeabilizador',
  'Engenheiro Civil', 'Arquiteto', 'Topógrafo',
];

export default function CustoRealEditor({ obraId, obraNome, onBack }: Props) {
  const { getOrcamento } = useOrcamento();
  const { getItensByObra, saveItems, deleteItemsByCategoria } = useCustoReal();
  const { getMateriaisByObra, getMovimentacoesByObra } = useEstoque();

  const orcamento = getOrcamento(obraId);
  const categorias = orcamento?.categorias || [];
  const materiaisObra = getMateriaisByObra(obraId);
  const movimentacoesObra = getMovimentacoesByObra(obraId);
  const movimentacoesEntrada = movimentacoesObra.filter(m => m.tipo === 'entrada');

  const [itensMap, setItensMap] = useState<Map<string, CustoRealItem[]>>(new Map());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [tiposInsumo, setTiposInsumo] = useState<string[]>(TIPOS_INSUMO_DEFAULT);
  const [saving, setSaving] = useState(false);

  // Track which movimentacao IDs are already used
  const usedMovIds = useMemo(() => {
    const set = new Set<string>();
    for (const [, items] of itensMap) {
      for (const item of items) {
        if (item.movimentacaoId) set.add(item.movimentacaoId);
      }
    }
    return set;
  }, [itensMap]);

  useEffect(() => {
    const existing = getItensByObra(obraId);
    const map = new Map<string, CustoRealItem[]>();
    for (const cat of categorias) {
      map.set(cat.id, existing.filter(i => i.categoriaId === cat.id));
    }
    setItensMap(map);
    // Collect custom tipos
    const customTipos = new Set(TIPOS_INSUMO_DEFAULT);
    existing.forEach(i => customTipos.add(i.tipoInsumo));
    setTiposInsumo(Array.from(customTipos));
  }, [obraId]);

  const toggleCat = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const addItem = (catId: string) => {
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items.push({
        id: crypto.randomUUID(),
        obraId,
        categoriaId: catId,
        tipoInsumo: 'Material',
        descricao: '',
        unidade: '',
        quantidade: 0,
        fornecedor: '',
        precoUnitario: 0,
        precoTotal: 0,
      });
      next.set(catId, items);
      return next;
    });
  };

  const updateItem = (catId: string, idx: number, updates: Partial<CustoRealItem>) => {
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      const item = { ...items[idx], ...updates };

      // Auto-calc
      if ('quantidade' in updates || 'precoUnitario' in updates) {
        if (item.quantidade && item.precoUnitario) {
          item.precoTotal = item.quantidade * item.precoUnitario;
        }
      }
      if ('precoTotal' in updates && item.quantidade && item.quantidade > 0 && !('precoUnitario' in updates)) {
        item.precoUnitario = item.precoTotal / item.quantidade;
      }

      items[idx] = item;
      next.set(catId, items);
      return next;
    });
  };

  const removeItem = (catId: string, idx: number) => {
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items.splice(idx, 1);
      next.set(catId, items);
      return next;
    });
  };

  const linkMovimentacao = (catId: string, idx: number, movId: string) => {
    const mov = movimentacoesEntrada.find(m => m.id === movId);
    if (!mov) return;
    updateItem(catId, idx, {
      movimentacaoId: movId,
      descricao: mov.materialNome,
      unidade: materiaisObra.find(m => m.id === mov.materialId)?.unidade || '',
      quantidade: mov.quantidade,
      fornecedor: mov.origemDestino,
    });
  };

  const addCustomTipo = (tipo: string) => {
    if (tipo.trim() && !tiposInsumo.includes(tipo.trim())) {
      setTiposInsumo(prev => [...prev, tipo.trim()]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allItems: CustoRealItem[] = [];
      for (const [catId, items] of itensMap) {
        allItems.push(...items);
        // Delete removed items
        await deleteItemsByCategoria(catId, items.map(i => i.id));
      }
      await saveItems(allItems);
      toast({ title: 'Custos salvos com sucesso!' });
      onBack();
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const totalGeral = Array.from(itensMap.values()).flat().reduce((s, i) => s + i.precoTotal, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Custo Real — {obraNome}</h1>
            <p className="text-xs text-muted-foreground">Cadastre os custos reais por etapa</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>

      {categorias.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Cadastre um orçamento primeiro para poder registrar custos reais.
        </div>
      )}

      {categorias.map(cat => {
        const catItems = itensMap.get(cat.id) || [];
        const catTotal = catItems.reduce((s, i) => s + i.precoTotal, 0);
        const expanded = expandedCats.has(cat.id);

        return (
          <Card key={cat.id} className="shadow-card">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleCat(cat.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cat.codigo} — {cat.nome}</p>
                    <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(cat.precoTotal)} · Realizado: {formatCurrency(catTotal)} · {catItems.length} item(ns)</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            {expanded && (
              <CardContent className="space-y-3">
                {catItems.map((item, idx) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-[120px_1fr_36px] gap-2 items-start">
                      <Select value={item.tipoInsumo} onValueChange={v => {
                        if (v === '_custom') {
                          const custom = prompt('Nome do novo tipo de insumo:');
                          if (custom) { addCustomTipo(custom); updateItem(cat.id, idx, { tipoInsumo: custom }); }
                        } else {
                          updateItem(cat.id, idx, { tipoInsumo: v });
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {tiposInsumo.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          <SelectItem value="_custom">+ Novo tipo...</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={item.descricao} onChange={e => updateItem(cat.id, idx, { descricao: e.target.value })} className="h-8 text-xs" placeholder="Descrição" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(cat.id, idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Material linking */}
                    {item.tipoInsumo === 'Material' && (
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Select value={item.movimentacaoId || '_none'} onValueChange={v => {
                          if (v === '_none') {
                            updateItem(cat.id, idx, { movimentacaoId: undefined });
                          } else {
                            linkMovimentacao(cat.id, idx, v);
                          }
                        }}>
                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Vincular entrada de estoque..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Sem vínculo</SelectItem>
                            {movimentacoesEntrada.filter(m => !usedMovIds.has(m.id) || m.id === item.movimentacaoId).map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.materialNome} — {m.quantidade} ({m.origemDestino}) {m.data}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Suggestions for Locação */}
                    {item.tipoInsumo === 'Locação' && !item.descricao && (
                      <div className="flex flex-wrap gap-1">
                        {EQUIPAMENTOS_LOCACAO.slice(0, 8).map(eq => (
                          <Button key={eq} variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => updateItem(cat.id, idx, { descricao: eq, unidade: 'mês' })}>
                            {eq}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Suggestions for Mão de Obra */}
                    {item.tipoInsumo === 'Mão de Obra' && !item.descricao && (
                      <div className="flex flex-wrap gap-1">
                        {MAO_DE_OBRA_TIPOS.slice(0, 8).map(mo => (
                          <Button key={mo} variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => updateItem(cat.id, idx, { descricao: mo, unidade: 'dia' })}>
                            {mo}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Material suggestions from estoque */}
                    {item.tipoInsumo === 'Material' && !item.descricao && !item.movimentacaoId && (
                      <div className="flex flex-wrap gap-1">
                        {materiaisObra.slice(0, 6).map(m => (
                          <Button key={m.id} variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => updateItem(cat.id, idx, { descricao: m.nome, unidade: m.unidade })}>
                            {m.nome}
                          </Button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <Input value={item.unidade} onChange={e => updateItem(cat.id, idx, { unidade: e.target.value })} className="h-8 text-xs" placeholder="Unidade" />
                      <Input type="number" value={item.quantidade || ''} onChange={e => updateItem(cat.id, idx, { quantidade: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" placeholder="Qtd" />
                      <Input value={item.fornecedor} onChange={e => updateItem(cat.id, idx, { fornecedor: e.target.value })} className="h-8 text-xs" placeholder="Fornecedor" />
                      <Input type="number" value={item.precoUnitario || ''} onChange={e => updateItem(cat.id, idx, { precoUnitario: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" placeholder="P. Unit." />
                      <Input type="number" value={item.precoTotal || ''} onChange={e => updateItem(cat.id, idx, { precoTotal: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" placeholder="P. Total" />
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>📷 Nota fiscal (em breve)</span>
                    </div>
                  </div>
                ))}

                <Button variant="outline" size="sm" className="w-full h-9 text-xs" onClick={() => addItem(cat.id)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      {categorias.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total Geral Realizado</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(totalGeral)}</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
