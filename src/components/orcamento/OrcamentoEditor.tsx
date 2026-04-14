import { useState, useEffect } from 'react';
import {
  useOrcamento,
  OrcamentoObra,
  OrcamentoCategoria,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Save,
  ArrowLeft,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';
import CategoriaBlock from './CategoriaBlock';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ImportarSinapiDialog from './ImportarSinapiDialog';
import {
  expandirComposicaoSinapi,
  type SinapiRegime,
} from '@/lib/sinapi/expandComposicao';
import { sinapiExpandidaParaOrcamentoComposicao } from '@/lib/sinapi/toOrcamento';

interface Props {
  obraId: string;
  obraNome: string;
  onBack: () => void;
}

export default function OrcamentoEditor({
  obraId,
  obraNome,
  onBack,
}: Props) {
  const {
    getOrcamento,
    saveOrcamento,
    orcamentos,
    catalogoCategorias,
    generateCategoriaCodigo,
    getUnidadesUsadas,
    getSugestaoInsumos,
    generateComposicaoCodigo,
    generateSubitemCodigo,
  } = useOrcamento();

  const { obras } = useObras();

  const [categorias, setCategorias] = useState<OrcamentoCategoria[]>([]);
  const [newCatMode, setNewCatMode] = useState<'select' | 'custom'>('select');
  const [selectedCat, setSelectedCat] = useState('');
  const [customCatName, setCustomCatName] = useState('');

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');

  const [importSinapiOpen, setImportSinapiOpen] = useState(false);

  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);

  const unidades = getUnidadesUsadas();

  useEffect(() => {
    const existing = getOrcamento(obraId);
    if (existing) {
      setCategorias(existing.categorias);
    } else {
      setCategorias([]);
    }
  }, [obraId, getOrcamento]);

  const totalGeral = categorias.reduce(
    (sum: number, categoria: OrcamentoCategoria) => sum + (categoria.precoTotal || 0),
    0
  );

  const addCategoria = () => {
    let nome = '';
    let codigo = '';

    if (newCatMode === 'select' && selectedCat) {
      const template = catalogoCategorias.find((c) => c.codigo === selectedCat);
      if (template) {
        nome = template.nome;
        codigo = template.codigo;
      }
    } else if (newCatMode === 'custom' && customCatName.trim()) {
      nome = customCatName.trim();
      codigo = generateCategoriaCodigo();
    }

    if (!nome) {
      toast({
        title: 'Selecione ou digite o nome da categoria',
        variant: 'destructive',
      });
      return;
    }

    if (categorias.some((c) => c.nome === nome)) {
      toast({
        title: 'Categoria já adicionada',
        variant: 'destructive',
      });
      return;
    }

    const novaCategoria: OrcamentoCategoria = {
      id: crypto.randomUUID(),
      codigo,
      nome,
      precoTotal: 0,
      usaComposicoes: false,
      composicoes: [],
    };

    setCategorias((prev) => [...prev, novaCategoria]);
    setSelectedCat('');
    setCustomCatName('');
  };

  const updateCategoria = (idx: number, categoriaAtualizada: OrcamentoCategoria) => {
    setCategorias((prev) => {
      const next = [...prev];
      next[idx] = categoriaAtualizada;
      return next;
    });
  };

  const removeCategoria = (idx: number) => {
    setCategorias((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    const orcamento: OrcamentoObra = {
      obraId,
      categorias,
    };

    await saveOrcamento(orcamento);

    toast({
      title: 'Orçamento salvo com sucesso!',
    });
  };

  const handleImport = () => {
    if (!importObraId) return;

    const source = getOrcamento(importObraId);

    if (!source) {
      toast({
        title: 'Orçamento não encontrado para esta obra',
        variant: 'destructive',
      });
      return;
    }

    const cloned: OrcamentoCategoria[] = source.categorias.map((cat) => ({
      ...cat,
      id: crypto.randomUUID(),
      composicoes: cat.composicoes.map((comp) => ({
        ...comp,
        id: crypto.randomUUID(),
        subitens: comp.subitens.map((si) => ({
          ...si,
          id: `si-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      })),
    }));

    setCategorias(cloned);
    setImportDialogOpen(false);

    toast({
      title: 'Orçamento importado com sucesso! Edite conforme necessário.',
    });
  };

  const handleImportarSinapi = async (params: {
    categoriaId: string;
    referenciaId: string;
    competencia: string;
    codigoComposicao: number;
    uf: string;
    regime: SinapiRegime;
    onProgress?: (progress: number, message: string) => void;
  }) => {
    const {
      categoriaId,
      referenciaId,
      competencia,
      codigoComposicao,
      uf,
      regime,
      onProgress,
    } = params;

    onProgress?.(20, 'Buscando composição principal...');

    const expandida = await expandirComposicaoSinapi({
      referenciaId,
      codigoComposicao,
      uf,
      regime,
    });

    onProgress?.(70, 'Convertendo composição para o formato do orçamento...');

    const composicao = sinapiExpandidaParaOrcamentoComposicao({
      resultado: expandida,
      competencia,
    });

    onProgress?.(90, 'Inserindo composição na categoria selecionada...');

    setCategorias((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoriaId) return cat;

        const composicoes = [...cat.composicoes, composicao];
        const precoTotal = composicoes.reduce(
          (acc: number, item) => acc + (Number(item.precoTotal) || 0),
          0
        );

        return {
          ...cat,
          usaComposicoes: true,
          composicoes,
          precoTotal,
        };
      })
    );

    onProgress?.(100, 'Finalizado.');
  };

  const availableCats = catalogoCategorias.filter(
    (c) => !categorias.some((cat) => cat.nome === c.nome)
  );

  const obrasComOrcamento = orcamentos.filter(
    (o) => o.obraId !== obraId && o.categorias.length > 0
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Orçamento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orçamento — {obraNome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Defina as categorias e composições de custo previsto
            </p>

            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total Previsto</div>
              <div className="text-2xl font-semibold">
                {formatCurrency(totalGeral)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={newCatMode === 'select' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewCatMode('select')}
              >
                Sugerida
              </Button>

              <Button
                variant={newCatMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewCatMode('custom')}
              >
                Nova
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {newCatMode === 'select' ? (
                <Select value={selectedCat} onValueChange={setSelectedCat}>
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCats.map((c) => (
                      <SelectItem key={c.codigo} value={c.codigo}>
                        {c.codigo} — {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={customCatName}
                  onChange={(e) => setCustomCatName(e.target.value)}
                  placeholder="Nome da nova categoria"
                  className="w-80"
                />
              )}

              <Button onClick={addCategoria}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>

              {obrasComOrcamento.length > 0 && (
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Importar Orçamento
                </Button>
              )}

              <Button variant="outline" onClick={() => setImportSinapiOpen(true)}>
                Importar da SINAPI
              </Button>
            </div>
          </CardContent>
        </Card>

        {categorias.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAllExpanded(true)}>
              <ChevronDown className="w-4 h-4 mr-2" />
              Abrir Todas
            </Button>

            <Button variant="outline" onClick={() => setAllExpanded(false)}>
              <ChevronRight className="w-4 h-4 mr-2" />
              Fechar Todas
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {categorias.map((cat, idx) => (
            <CategoriaBlock
              key={cat.id}
              categoria={cat}
              onChange={(c: OrcamentoCategoria) => updateCategoria(idx, c)}
              onRemove={() => removeCategoria(idx)}
              unidades={unidades}
              getSugestaoInsumos={getSugestaoInsumos}
              generateComposicaoCodigo={generateComposicaoCodigo}
              generateSubitemCodigo={generateSubitemCodigo}
              forceExpanded={allExpanded}
            />
          ))}
        </div>

        {categorias.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma categoria adicionada. Use o painel acima para começar.
            </CardContent>
          </Card>
        )}

        {categorias.length > 0 && (
          <Card>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Geral Previsto</div>
                <div className="text-sm text-muted-foreground">
                  {categorias.length} categoria{categorias.length !== 1 ? 's' : ''}
                </div>
              </div>

              <div className="text-xl font-semibold">
                {formatCurrency(totalGeral)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Orçamento de Outra Obra</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione a obra de origem. O orçamento será copiado e você poderá editá-lo livremente.
            </p>

            <Select value={importObraId} onValueChange={setImportObraId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a obra de origem" />
              </SelectTrigger>
              <SelectContent>
                {obrasComOrcamento.map((o) => {
                  const obra = obras.find((ob) => ob.id === o.obraId);
                  return (
                    <SelectItem key={o.obraId} value={o.obraId}>
                      {obra?.nome || o.obraId} ({o.categorias.length} categorias)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarSinapiDialog
        open={importSinapiOpen}
        onOpenChange={setImportSinapiOpen}
        categorias={categorias}
        defaultCompetencia="2026-02"
        onConfirm={handleImportarSinapi}
      />
    </>
  );
}