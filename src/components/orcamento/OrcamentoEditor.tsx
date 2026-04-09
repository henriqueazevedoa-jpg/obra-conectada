import { useState, useEffect } from 'react';
import { useOrcamento, OrcamentoObra, OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import { useObras } from '@/contexts/ObrasContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, ArrowLeft, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';
import CategoriaBlock from './CategoriaBlock';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  obraId: string;
  obraNome: string;
  onBack: () => void;
}

export default function OrcamentoEditor({ obraId, obraNome, onBack }: Props) {
  const { getOrcamento, saveOrcamento, orcamentos, catalogoCategorias, generateCategoriaCodigo, getUnidadesUsadas, getSugestaoInsumos, generateComposicaoCodigo, generateSubitemCodigo } = useOrcamento();
  const { obras } = useObras();

  const [categorias, setCategorias] = useState<OrcamentoCategoria[]>([]);
  const [newCatMode, setNewCatMode] = useState<'select' | 'custom'>('select');
  const [selectedCat, setSelectedCat] = useState('');
  const [customCatName, setCustomCatName] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');
  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);

  const unidades = getUnidadesUsadas();

  useEffect(() => {
    const existing = getOrcamento(obraId);
    if (existing) setCategorias(existing.categorias);
  }, [obraId, getOrcamento]);

  const totalGeral = categorias.reduce((s, c) => s + c.precoTotal, 0);

  const addCategoria = () => {
    let nome = '';
    let codigo = '';

    if (newCatMode === 'select' && selectedCat) {
      const tpl = catalogoCategorias.find(c => c.codigo === selectedCat);
      if (tpl) { nome = tpl.nome; codigo = tpl.codigo; }
    } else if (newCatMode === 'custom' && customCatName.trim()) {
      nome = customCatName.trim();
      codigo = generateCategoriaCodigo();
    }

    if (!nome) {
      toast({ title: 'Selecione ou digite o nome da categoria', variant: 'destructive' });
      return;
    }

    if (categorias.some(c => c.nome === nome)) {
      toast({ title: 'Categoria já adicionada', variant: 'destructive' });
      return;
    }

    const cat: OrcamentoCategoria = {
      id: crypto.randomUUID(),
      codigo, nome, precoTotal: 0, usaComposicoes: false, composicoes: [],
    };
    setCategorias(prev => [...prev, cat]);
    setSelectedCat('');
    setCustomCatName('');
  };

  const updateCategoria = (idx: number, cat: OrcamentoCategoria) => {
    setCategorias(prev => { const n = [...prev]; n[idx] = cat; return n; });
  };

  const removeCategoria = (idx: number) => {
    setCategorias(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const orc: OrcamentoObra = { obraId, categorias };
    saveOrcamento(orc);
    toast({ title: 'Orçamento salvo com sucesso!' });
  };

  const handleImport = () => {
    if (!importObraId) return;
    const source = getOrcamento(importObraId);
    if (!source) {
      toast({ title: 'Orçamento não encontrado para esta obra', variant: 'destructive' });
      return;
    }
    // Deep clone with new IDs
    const cloned = source.categorias.map(cat => ({
      ...cat,
      id: crypto.randomUUID(),
      composicoes: cat.composicoes.map(comp => ({
        ...comp,
        id: crypto.randomUUID(),
        subitens: comp.subitens.map(si => ({
          ...si,
          id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      })),
    }));
    setCategorias(cloned);
    setImportDialogOpen(false);
    toast({ title: 'Orçamento importado com sucesso! Edite conforme necessário.' });
  };

  const availableCats = catalogoCategorias.filter(c => !categorias.some(cat => cat.nome === c.nome));
  const obrasComOrcamento = orcamentos.filter(o => o.obraId !== obraId && o.categorias.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Orçamento — {obraNome}</h1>
          <p className="text-xs text-muted-foreground">Defina as categorias e composições de custo previsto</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Previsto</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalGeral)}</p>
        </div>
      </div>

      {/* Import + Add category */}
      <div className="flex flex-wrap gap-3">
        <Card className="shadow-card flex-1 min-w-[300px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Adicionar Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex items-center gap-2">
                <Button variant={newCatMode === 'select' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setNewCatMode('select')}>Sugerida</Button>
                <Button variant={newCatMode === 'custom' ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setNewCatMode('custom')}>Nova</Button>
              </div>
              {newCatMode === 'select' ? (
                <Select value={selectedCat} onValueChange={setSelectedCat}>
                  <SelectTrigger className="w-60 h-8 text-xs">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCats.map(c => (
                      <SelectItem key={c.codigo} value={c.codigo} className="text-xs">
                        <span className="font-mono text-muted-foreground mr-2">{c.codigo}</span>{c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={customCatName} onChange={e => setCustomCatName(e.target.value)} placeholder="Nome da nova categoria" className="w-60 h-8 text-xs" />
              )}
              <Button size="sm" className="h-8 text-xs gap-1" onClick={addCategoria}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {obrasComOrcamento.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Importar de Outra Obra</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={() => setImportDialogOpen(true)}>
                <Copy className="h-3 w-3" /> Importar Orçamento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expand/Collapse all + Categories */}
      {categorias.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setAllExpanded(true)}>
            <ChevronDown className="h-3 w-3 mr-1" /> Abrir Todas
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setAllExpanded(false)}>
            <ChevronRight className="h-3 w-3 mr-1" /> Fechar Todas
          </Button>
        </div>
      )}
      <div className="space-y-4">
        {categorias.map((cat, idx) => (
          <CategoriaBlock
            key={cat.id}
            categoria={cat}
            unidades={unidades}
            onChange={c => updateCategoria(idx, c)}
            onRemove={() => removeCategoria(idx)}
            getSugestaoInsumos={getSugestaoInsumos}
            generateComposicaoCodigo={generateComposicaoCodigo}
            generateSubitemCodigo={generateSubitemCodigo}
            forceExpanded={allExpanded}
          />
        ))}
      </div>

      {categorias.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma categoria adicionada. Use o painel acima para começar.
        </div>
      )}

      {categorias.length > 0 && (
        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Total Geral Previsto</p>
            <p className="text-xs text-muted-foreground">{categorias.length} categoria{categorias.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
            <Button onClick={handleSave} className="gap-1">
              <Save className="h-4 w-4" /> Salvar Orçamento
            </Button>
          </div>
        </div>
      )}

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Orçamento de Outra Obra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Selecione a obra de origem. O orçamento será copiado e você poderá editá-lo livremente.</p>
          <Select value={importObraId} onValueChange={setImportObraId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a obra..." />
            </SelectTrigger>
            <SelectContent>
              {obrasComOrcamento.map(o => {
                const ob = obras.find(ob => ob.id === o.obraId);
                return (
                  <SelectItem key={o.obraId} value={o.obraId}>
                    {ob?.nome || o.obraId} ({o.categorias.length} categorias)
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={!importObraId}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
