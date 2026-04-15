import { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Save,
  ArrowLeft,
  Copy,
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  Lock,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/data/mockData';
import CategoriaBlock from './CategoriaBlock';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import ImportarSinapiDialog from './ImportarSinapiDialog';
import {
  expandirComposicaoSinapi,
  type SinapiRegime,
  type SinapiComposicaoExpandida,
} from '@/lib/sinapi/expandComposicao';
import { sinapiExpandidaParaOrcamentoComposicao } from '@/lib/sinapi/toOrcamento';

interface Props {
  obraId: string;
  obraNome: string;
  onBack: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

  // Import from other obra
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');

  // SINAPI import
  const [importSinapiOpen, setImportSinapiOpen] = useState(false);
  const [expandedCategoriaId, setExpandedCategoriaId] = useState<string | null>(null);

  // Template (catalog) selector dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplateCodes, setSelectedTemplateCodes] = useState<Set<string>>(new Set());

  const [allExpanded, setAllExpanded] = useState<boolean | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const unidades = getUnidadesUsadas();

  const hasLoadedInitialDataRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string>('');
  const autosaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const existing = getOrcamento(obraId);
    const categoriasIniciais = existing ? existing.categorias : [];
    setCategorias(categoriasIniciais);
    lastSavedSnapshotRef.current = JSON.stringify(categoriasIniciais);
    hasLoadedInitialDataRef.current = true;
    setSaveStatus('idle');
  }, [obraId, getOrcamento]);

  // Auto-save on change
  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return;
    const currentSnapshot = JSON.stringify(categorias);
    if (currentSnapshot === lastSavedSnapshotRef.current) return;

    if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current);
    setSaveStatus('saving');

    autosaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await saveOrcamento({ obraId, categorias });
        lastSavedSnapshotRef.current = JSON.stringify(categorias);
        setSaveStatus('saved');
        window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
      } catch (error) {
        console.error(error);
        setSaveStatus('error');
      }
    }, 1000);

    return () => { if (autosaveTimeoutRef.current) window.clearTimeout(autosaveTimeoutRef.current); };
  }, [categorias, obraId, saveOrcamento]);

  const totalGeral = categorias.reduce(
    (sum: number, cat: OrcamentoCategoria) => sum + (cat.precoTotal || 0),
    0
  );

  // ── Adicionar etapa em branco (nome vazio — editável inline no CategoriaBlock) ──
  const addEmptyCategoria = () => {
    const novaCategoria: OrcamentoCategoria = {
      id: crypto.randomUUID(),
      codigo: generateCategoriaCodigo(),
      nome: '',
      precoTotal: 0,
      usaComposicoes: false,
      composicoes: [],
    };
    setCategorias(prev => [...prev, novaCategoria]);
    setExpandedCategoriaId(novaCategoria.id);
    setAllExpanded(undefined);
  };

  // ── Adicionar a partir de modelos do catálogo (multi-seleção) ──
  const addFromTemplates = () => {
    const toAdd: OrcamentoCategoria[] = [];
    for (const code of selectedTemplateCodes) {
      const template = catalogoCategorias.find(c => c.codigo === code);
      if (!template) continue;
      if (categorias.some(c => c.nome === template.nome)) continue;
      toAdd.push({
        id: crypto.randomUUID(),
        codigo: template.codigo,
        nome: template.nome,
        precoTotal: 0,
        usaComposicoes: false,
        composicoes: [],
      });
    }
    if (toAdd.length > 0) {
      setCategorias(prev => [...prev, ...toAdd]);
      toast({ title: `${toAdd.length} etapa${toAdd.length !== 1 ? 's' : ''} adicionada${toAdd.length !== 1 ? 's' : ''}!` });
    }
    setSelectedTemplateCodes(new Set());
    setTemplateDialogOpen(false);
  };

  const toggleTemplateCode = (code: string, checked: boolean) => {
    setSelectedTemplateCodes(prev => {
      const next = new Set(prev);
      if (checked) next.add(code); else next.delete(code);
      return next;
    });
  };

  const updateCategoria = (idx: number, categoriaAtualizada: OrcamentoCategoria) => {
    setCategorias(prev => {
      const next = [...prev];
      next[idx] = categoriaAtualizada;
      return next;
    });
  };

  const removeCategoria = (idx: number) => {
    setCategorias(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      await saveOrcamento({ obraId, categorias });
      lastSavedSnapshotRef.current = JSON.stringify(categorias);
      setSaveStatus('saved');
      toast({ title: 'Orçamento salvo com sucesso!' });
      window.setTimeout(() => setSaveStatus(p => p === 'saved' ? 'idle' : p), 1500);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      toast({ title: 'Erro ao salvar orçamento', variant: 'destructive' });
    }
  };

  const handleImport = () => {
    if (!importObraId) return;
    const source = getOrcamento(importObraId);
    if (!source) {
      toast({ title: 'Orçamento não encontrado para esta obra', variant: 'destructive' });
      return;
    }
    const cloned: OrcamentoCategoria[] = source.categorias.map(cat => ({
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

  const handleImportarSinapi = async (params: {
    categoriaId: string;
    referenciaId: string;
    competencia: string;
    codigoComposicao: number;
    uf: string;
    regime: SinapiRegime;
    resultadoBase?: SinapiComposicaoExpandida;
    onProgress?: (progress: number, message: string) => void;
  }) => {
    const { categoriaId, referenciaId, competencia, codigoComposicao, uf, regime, resultadoBase, onProgress } = params;

    onProgress?.(20, 'Carregando composição...');
    const expandida = resultadoBase ?? await expandirComposicaoSinapi({ referenciaId, codigoComposicao, uf, regime });

    onProgress?.(70, 'Convertendo composição para o orçamento...');
    const composicao = sinapiExpandidaParaOrcamentoComposicao({ resultado: expandida, competencia });

    onProgress?.(90, 'Inserindo composição na etapa selecionada...');
    setCategorias(prev =>
      prev.map(cat => {
        if (cat.id !== categoriaId) return cat;
        const composicoes = [...cat.composicoes, composicao];
        const precoTotal = composicoes.reduce((acc: number, item) => acc + (Number(item.precoTotal) || 0), 0);
        return { ...cat, usaComposicoes: true, composicoes, precoTotal };
      })
    );
    setExpandedCategoriaId(categoriaId);
    setAllExpanded(undefined);
    onProgress?.(100, 'Finalizado.');
  };

  // Catalog items not yet added
  const availableCats = catalogoCategorias.filter(c => !categorias.some(cat => cat.nome === c.nome));
  const obrasComOrcamento = orcamentos.filter(o => o.obraId !== obraId && o.categorias.length > 0);

  const saveStatusLabel =
    saveStatus === 'saving' ? 'Salvando...' :
    saveStatus === 'saved'  ? 'Salvo automaticamente ✓' :
    saveStatus === 'error'  ? 'Erro no salvamento' :
    'Auto-save ativo';

  const saveStatusColor =
    saveStatus === 'saving' ? 'text-muted-foreground' :
    saveStatus === 'saved'  ? 'text-emerald-600 dark:text-emerald-400' :
    saveStatus === 'error'  ? 'text-destructive' :
    'text-muted-foreground';

  return (
    <>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <span className={`text-sm hidden sm:inline ${saveStatusColor}`}>{saveStatusLabel}</span>

            {/* Botão de bloqueio — muda para modo visualização */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              title="Bloquear edição (modo visualização)"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar editor e entrar em modo de visualização"
            >
              <Lock className="w-4 h-4" />
            </Button>

            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </div>
        </div>

        {/* ── Totalizador ── */}
        <Card>
          <CardHeader>
            <CardTitle>Orçamento — {obraNome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Defina as etapas e composições de custo previsto
            </p>
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total Previsto</div>
              <div className="text-2xl font-semibold">{formatCurrency(totalGeral)}</div>
            </div>
          </CardContent>
        </Card>

        {/* ── Adicionar etapa ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Etapas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Ação principal: cria etapa em branco imediatamente */}
              <Button onClick={addEmptyCategoria} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nova etapa
              </Button>

              {/* Template do catálogo */}
              {availableCats.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplateCodes(new Set());
                    setTemplateDialogOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  Usar modelo…
                </Button>
              )}

              {/* Importar de outra obra */}
              {obrasComOrcamento.length > 0 && (
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-1.5">
                  <Copy className="w-4 h-4" />
                  Importar orçamento
                </Button>
              )}

              {/* SINAPI */}
              <Button
                variant="outline"
                onClick={() => setImportSinapiOpen(true)}
                className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
              >
                <DatabaseZap className="w-3.5 h-3.5" />
                Importar da SINAPI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Recolher / expandir ── */}
        {categorias.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllExpanded(true)}>
              <ChevronDown className="w-4 h-4 mr-1" /> Abrir todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllExpanded(false)}>
              <ChevronRight className="w-4 h-4 mr-1" /> Fechar todas
            </Button>
          </div>
        )}

        {/* ── Etapas ── */}
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
              forceExpanded={expandedCategoriaId === cat.id ? true : allExpanded}
            />
          ))}
        </div>

        {/* Estado vazio */}
        {categorias.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-muted-foreground text-sm">Nenhuma etapa adicionada.</p>
              <p className="text-xs text-muted-foreground">
                Clique em <span className="font-medium">Nova etapa</span> para começar do zero,
                ou em <span className="font-medium">Usar modelo…</span> para aproveitar o catálogo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Totalizador rodapé */}
        {categorias.length > 0 && (
          <Card>
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Geral Previsto</div>
                <div className="text-xs text-muted-foreground">
                  {categorias.length} etapa{categorias.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-xl font-semibold">{formatCurrency(totalGeral)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Dialog: Selecionar modelo de etapa ── */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar modelo de etapa</DialogTitle>
            <DialogDescription>
              Escolha uma ou mais etapas do catálogo para adicionar ao orçamento.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-72 pr-2">
            <div className="space-y-1">
              {availableCats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Todas as etapas do catálogo já foram adicionadas.
                </p>
              ) : (
                availableCats.map(cat => {
                  const checked = selectedTemplateCodes.has(cat.codigo);
                  return (
                    <label
                      key={cat.codigo}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted ${checked ? 'bg-primary/5' : ''}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={v => toggleTemplateCode(cat.codigo, !!v)}
                        id={`tpl-${cat.codigo}`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{cat.nome}</p>
                        <p className="text-[11px] text-muted-foreground">{cat.codigo}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={addFromTemplates}
              disabled={selectedTemplateCodes.size === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              {selectedTemplateCodes.size > 0
                ? `Adicionar ${selectedTemplateCodes.size} etapa${selectedTemplateCodes.size !== 1 ? 's' : ''}`
                : 'Adicionar etapas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Importar orçamento de outra obra ── */}
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
                {obrasComOrcamento.map(o => {
                  const obra = obras.find(ob => ob.id === o.obraId);
                  return (
                    <SelectItem key={o.obraId} value={o.obraId}>
                      {obra?.nome || o.obraId} ({o.categorias.length} etapas)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: SINAPI ── */}
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
