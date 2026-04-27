import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Package, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OrcamentoCategoriaImport,
  NivelImportacao,
  OrcamentoVersao,
  useCronogramaImport,
} from '@/hooks/useCronogramaImport';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CronogramaImportWizardProps {
  obraId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── TreePreview (preview da hierarquia colapsável) ───────────────────────────

function TreeNode({ node, depth = 0, maxDepth, incluiComp }: {
  node: OrcamentoCategoriaImport;
  depth?: number;
  maxDepth: number;
  incluiComp: boolean;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.filhos.length > 0 || (incluiComp && node.composicoes.length > 0);
  const isVisible = node.nivel <= maxDepth;
  if (!isVisible) return null;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 rounded text-[11px] cursor-pointer hover:bg-muted/50 transition-colors',
          depth === 0 && 'font-semibold text-foreground',
          depth === 1 && 'text-foreground/80',
          depth >= 2 && 'text-muted-foreground',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : <span className="w-3 shrink-0" />}
        <span className={cn(
          'h-1.5 w-1.5 rounded-full shrink-0',
          depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-primary/50' : 'bg-muted-foreground/40'
        )} />
        <span className="truncate flex-1">{node.nome}</span>
        {node.codigo && <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">{node.codigo}</span>}
        <span className="text-[9px] text-muted-foreground/60 shrink-0 tabular-nums">
          R$ {node.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.filhos.map(filho => (
            <TreeNode key={filho.id} node={filho} depth={depth + 1} maxDepth={maxDepth} incluiComp={incluiComp} />
          ))}
          {incluiComp && node.nivel === maxDepth && node.composicoes.map(comp => (
            <div
              key={comp.id}
              className="flex items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground/70"
              style={{ paddingLeft: `${8 + (depth + 1) * 16}px` }}
            >
              <span className="w-3 shrink-0" />
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="truncate flex-1">{comp.descricao}</span>
              {comp.codigo && <span className="font-mono text-[8px] text-muted-foreground/40 shrink-0">{comp.codigo}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wizard principal ─────────────────────────────────────────────────────────

export default function CronogramaImportWizard({ obraId, open, onOpenChange }: CronogramaImportWizardProps) {
  const { fetchVersoes, fetchEstrutura, importarHierarquia, loading } = useCronogramaImport(obraId);

  const [step, setStep] = useState(1);

  // Passo 1
  const [versoes, setVersoes] = useState<OrcamentoVersao[]>([]);
  const [versaoId, setVersaoId] = useState<string>('');
  const [loadingVersoes, setLoadingVersoes] = useState(false);

  // Passo 1 → 2: estrutura carregada
  const [arvore, setArvore] = useState<OrcamentoCategoriaImport[]>([]);
  const [niveisDisponiveis, setNiveisDisponiveis] = useState<NivelImportacao[]>([]);
  const [nivelSelecionado, setNivelSelecionado] = useState<NivelImportacao | null>(null);
  const [loadingEstrutura, setLoadingEstrutura] = useState(false);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setStep(1);
      setVersaoId('');
      setArvore([]);
      setNiveisDisponiveis([]);
      setNivelSelecionado(null);
    }
  }, [open]);

  // Carrega versões ao abrir
  useEffect(() => {
    if (open && versoes.length === 0) {
      setLoadingVersoes(true);
      fetchVersoes().then(v => {
        setVersoes(v);
        if (v.length === 1) setVersaoId(v[0].id);
      }).finally(() => setLoadingVersoes(false));
    }
  }, [open, fetchVersoes, versoes.length]);

  // Carrega estrutura quando versão selecionada muda
  const carregarEstrutura = useCallback(async (vId: string) => {
    setLoadingEstrutura(true);
    const result = await fetchEstrutura(vId);
    setArvore(result.arvore);
    setNiveisDisponiveis(result.niveisDisponiveis);
    setNivelSelecionado(result.niveisDisponiveis[0] ?? null);
    setLoadingEstrutura(false);
  }, [fetchEstrutura]);

  useEffect(() => {
    if (versaoId && open) carregarEstrutura(versaoId);
  }, [versaoId, open, carregarEstrutura]);

  const canAdvance = !!versaoId && !!nivelSelecionado && arvore.length > 0 && !loadingEstrutura;

  const handleImport = async () => {
    if (!nivelSelecionado) return;
    const ok = await importarHierarquia(arvore, nivelSelecionado);
    if (ok) onOpenChange(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Importar do Orçamento
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Selecione a versão do orçamento e o nível de detalhe a importar.'}
            {step === 2 && 'Confirme a estrutura que será criada no cronograma.'}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 shrink-0">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                step === s ? 'bg-primary text-white' : step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <div className={cn('h-1 flex-1 rounded-full', step >= s ? 'bg-primary/30' : 'bg-muted')} />
            </div>
          ))}
        </div>

        {/* Corpo — scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">

          {/* ── PASSO 1: Versão + Nível ─────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Seletor de versão */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Versão do Orçamento
                </Label>
                {loadingVersoes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando versões...
                  </div>
                ) : versoes.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Nenhuma versão de orçamento encontrada para esta obra.
                  </div>
                ) : (
                  <Select value={versaoId} onValueChange={setVersaoId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a versão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {versoes.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{v.numero_versao}</span>
                            <Badge variant="outline" className="text-[9px] uppercase">{v.tipo}</Badge>
                            <span className="text-muted-foreground text-[11px]">
                              R$ {Number(v.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Seletor de nível adaptativo */}
              {versaoId && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nível de Detalhe
                  </Label>
                  {loadingEstrutura ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analisando estrutura do orçamento...
                    </div>
                  ) : niveisDisponiveis.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Nenhum item encontrado nessa versão.
                    </div>
                  ) : (
                    <RadioGroup
                      value={nivelSelecionado ? `${nivelSelecionado.profundidade}_${nivelSelecionado.incluiComposicoes}` : ''}
                      onValueChange={val => {
                        const found = niveisDisponiveis.find(n => `${n.profundidade}_${n.incluiComposicoes}` === val);
                        if (found) setNivelSelecionado(found);
                      }}
                      className="space-y-2"
                    >
                      {niveisDisponiveis.map(n => {
                        const key = `${n.profundidade}_${n.incluiComposicoes}`;
                        return (
                          <div
                            key={key}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              nivelSelecionado && `${nivelSelecionado.profundidade}_${nivelSelecionado.incluiComposicoes}` === key
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/40 hover:bg-muted/30'
                            )}
                            onClick={() => setNivelSelecionado(n)}
                          >
                            <RadioGroupItem value={key} id={key} className="mt-0.5" />
                            <Label htmlFor={key} className="cursor-pointer flex-1 space-y-0.5">
                              <div className="text-sm font-medium">{n.label}</div>
                              <div className="text-xs text-muted-foreground">{n.descricao}</div>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── PASSO 2: Preview da estrutura ──────────────────────────── */}
          {step === 2 && nivelSelecionado && (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{nivelSelecionado.totalItens}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">tarefas a criar</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{nivelSelecionado.profundidade}{nivelSelecionado.incluiComposicoes ? `+1` : ''}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">níveis de hierarquia</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Modo</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {nivelSelecionado.incluiComposicoes ? 'Completo' : 'Só categorias'}
                  </p>
                </div>
              </div>

              {/* Tree preview */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Preview da estrutura
                </p>
                <div className="border border-border rounded-lg max-h-[280px] overflow-y-auto">
                  {arvore.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">Nenhum item.</div>
                  ) : (
                    <div className="py-1">
                      {arvore.map(node => (
                        <TreeNode
                          key={node.id}
                          node={node}
                          maxDepth={nivelSelecionado.profundidade}
                          incluiComp={nivelSelecionado.incluiComposicoes}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Os itens serão importados sem datas ou duração. Você poderá editar inline após a importação.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex justify-between w-full mt-4">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          ) : <div />}

          {step < 2 ? (
            <Button onClick={() => setStep(2)} disabled={!canAdvance}>
              Avançar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={loading || !nivelSelecionado}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
