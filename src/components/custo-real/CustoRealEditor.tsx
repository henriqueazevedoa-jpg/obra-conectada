import { useState, useEffect } from 'react';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCustoReal, CustoRealItem, CATEGORIAS_CUSTO } from '@/contexts/CustoRealContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';

interface Props {
  obraId: string;
  obraNome: string;
  onBack: () => void;
}

export default function CustoRealEditor({ obraId, obraNome, onBack }: Props) {
  const { getOrcamento } = useOrcamento();
  const { getItensByObra, saveItems, deleteItem } = useCustoReal();
  const { company } = useCompany();

  const orcamento = getOrcamento(obraId);
  const categorias = orcamento?.categorias || [];

  // Map: catId → items
  const [itensMap, setItensMap] = useState<Map<string, CustoRealItem[]>>(new Map());
  // Items removed by the user (need to be deleted on save)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existing = getItensByObra(obraId);
    const map = new Map<string, CustoRealItem[]>();
    for (const cat of categorias) {
      // Match by etapaNome (new field) — fall back to old categoria match for legacy items
      map.set(cat.id, existing.filter(i =>
        i.etapaNome === cat.nome || (i.etapaNome === '' && i.categoria === cat.nome)
      ));
    }
    setItensMap(map);
  }, [obraId]);

  const toggleCat = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const addItem = (catId: string, catNome: string) => {
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items.push({
        id: crypto.randomUUID(),
        obraId,
        companyId: company?.id || '',
        categoria: '',          // user must pick
        etapaNome: catNome,     // linked to orcamento stage
        descricao: '',
        fornecedor: '',
        valor: 0,
        data: new Date().toISOString().slice(0, 10),
        observacoes: '',
      });
      next.set(catId, items);
      return next;
    });
    setExpandedCats(prev => new Set([...prev, catId]));
  };

  const updateItem = (catId: string, idx: number, updates: Partial<CustoRealItem>) => {
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items[idx] = { ...items[idx], ...updates };
      next.set(catId, items);
      return next;
    });
  };

  const removeItem = (catId: string, idx: number, itemId: string) => {
    setDeletedIds(prev => [...prev, itemId]);
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items.splice(idx, 1);
      next.set(catId, items);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete removed items from DB
      for (const id of deletedIds) {
        await deleteItem(id);
      }
      // Upsert all current items
      const allItems: CustoRealItem[] = Array.from(itensMap.values()).flat();
      const validItems = allItems.filter(i => i.descricao.trim() && i.valor > 0);
      await saveItems(validItems);
      toast({ title: 'Custos salvos com sucesso!' });
      onBack();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const totalGeral = Array.from(itensMap.values()).flat().reduce((s, i) => s + i.valor, 0);

  if (categorias.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-lg font-bold text-foreground">Custo Real — {obraNome}</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground text-sm">
          Cadastre um orçamento primeiro para poder registrar custos reais por etapa.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Custo Real — {obraNome}</h1>
            <p className="text-xs text-muted-foreground">Custos por etapa · selecione a categoria de cada item</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>

      {/* Sections per orcamento category */}
      {categorias.map(cat => {
        const catItems = itensMap.get(cat.id) || [];
        const catTotal = catItems.reduce((s, i) => s + i.valor, 0);
        const expanded = expandedCats.has(cat.id);

        return (
          <Card key={cat.id} className="shadow-card">
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleCat(cat.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cat.codigo} — {cat.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Previsto: {formatCurrency(cat.precoTotal)} · Realizado: {formatCurrency(catTotal)} · {catItems.length} item(ns)
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 text-xs gap-1 shrink-0"
                  onClick={e => { e.stopPropagation(); addItem(cat.id, cat.nome); }}
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
            </CardHeader>

            {expanded && (
              <CardContent className="space-y-3 pt-0">
                {catItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Nenhum item. Clique em "Adicionar" para registrar um custo nesta etapa.
                  </p>
                )}
                {catItems.map((item, idx) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                    {/* Row 1: description + delete */}
                    <div className="grid grid-cols-[1fr_36px] gap-2 items-start">
                      <Input
                        value={item.descricao}
                        onChange={e => updateItem(cat.id, idx, { descricao: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="Descrição do custo *"
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(cat.id, idx, item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Row 2: categoria, valor, data, fornecedor */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Categoria dropdown — standardized type */}
                      <Select
                        value={item.categoria}
                        onValueChange={v => updateItem(cat.id, idx, { categoria: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Categoria *" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_CUSTO.map(c => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min="0" step="0.01"
                        value={item.valor || ''}
                        onChange={e => updateItem(cat.id, idx, { valor: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs"
                        placeholder="Valor (R$) *"
                      />
                      <Input
                        type="date"
                        value={item.data}
                        onChange={e => updateItem(cat.id, idx, { data: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Input
                        value={item.fornecedor}
                        onChange={e => updateItem(cat.id, idx, { fornecedor: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="Fornecedor"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Total footer */}
      <Card className="shadow-card">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Total Geral Realizado</span>
          <span className="text-lg font-bold text-foreground">{formatCurrency(totalGeral)}</span>
        </CardContent>
      </Card>
    </div>
  );
}
