import { useState, useEffect, useMemo } from 'react';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCustoReal, CustoRealItem } from '@/contexts/CustoRealContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { getItensByObra, saveItems, deleteItemsByCategoria } = useCustoReal();
  const { company } = useCompany();

  const orcamento = getOrcamento(obraId);
  const categorias = orcamento?.categorias || [];

  const [itensMap, setItensMap] = useState<Map<string, CustoRealItem[]>>(new Map());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const existing = getItensByObra(obraId);
    const map = new Map<string, CustoRealItem[]>();
    for (const cat of categorias) {
      map.set(cat.id, existing.filter(i => i.categoria === cat.nome));
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

  const addItem = (catId: string) => {
    const cat = categorias.find(c => c.id === catId);
    setItensMap(prev => {
      const next = new Map(prev);
      const items = [...(next.get(catId) || [])];
      items.push({
        id: crypto.randomUUID(),
        obraId,
        companyId: company?.id || '',
        categoria: cat?.nome || '',
        descricao: '',
        fornecedor: '',
        valor: 0,
        data: new Date().toISOString().slice(0, 10),
        observacoes: '',
      });
      next.set(catId, items);
      return next;
    });
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

  const removeItem = (catId: string, idx: number) => {
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
      const allItems: CustoRealItem[] = [];
      for (const [catId, items] of itensMap) {
        const cat = categorias.find(c => c.id === catId);
        allItems.push(...items);
        await deleteItemsByCategoria(cat?.nome || '', items.map(i => i.id));
      }
      await saveItems(allItems);
      toast({ title: 'Custos salvos com sucesso!' });
      onBack();
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
    setSaving(false);
  };

  const totalGeral = Array.from(itensMap.values()).flat().reduce((s, i) => s + i.valor, 0);

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
        const catTotal = catItems.reduce((s, i) => s + i.valor, 0);
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
                    <div className="grid grid-cols-[1fr_36px] gap-2 items-start">
                      <Input value={item.descricao} onChange={e => updateItem(cat.id, idx, { descricao: e.target.value })} className="h-8 text-xs" placeholder="Descrição do custo" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(cat.id, idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input value={item.fornecedor} onChange={e => updateItem(cat.id, idx, { fornecedor: e.target.value })} className="h-8 text-xs" placeholder="Fornecedor" />
                      <Input type="number" value={item.valor || ''} onChange={e => updateItem(cat.id, idx, { valor: parseFloat(e.target.value) || 0 })} className="h-8 text-xs" placeholder="Valor (R$)" />
                      <Input type="date" value={item.data} onChange={e => updateItem(cat.id, idx, { data: e.target.value })} className="h-8 text-xs" />
                      <Input value={item.observacoes} onChange={e => updateItem(cat.id, idx, { observacoes: e.target.value })} className="h-8 text-xs" placeholder="Observações" />
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
