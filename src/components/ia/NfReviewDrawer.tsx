import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, RotateCcw,
  Package, Sparkles, ChevronRight, Building2,
} from 'lucide-react';
import type { DocItem, DocResultado } from '@/hooks/useIADocumentos';

interface Material {
  id: string;
  nome: string;
  unidade: string;
}

interface Props {
  open: boolean;
  resultado: DocResultado | null;
  materiaisObra: Material[];
  loading?: boolean;
  onClose: () => void;
  onConfirm: (itensRevisados: DocItem[]) => void;
  onReprocess?: () => void;
}

function matchColor(score: number) {
  if (score >= 0.85) return 'text-emerald-400';
  if (score >= 0.5)  return 'text-amber-400';
  return 'text-red-400';
}

function matchLabel(score: number) {
  if (score >= 0.85) return 'Match alto';
  if (score >= 0.5)  return 'Match parcial';
  return 'Sem match';
}

function matchBadge(score: number) {
  if (score >= 0.85) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 0.5)  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

export default function NfReviewDrawer({
  open, resultado, materiaisObra, loading, onClose, onConfirm, onReprocess,
}: Props) {
  const [itens, setItens] = useState<DocItem[]>([]);

  // Inicializa ao abrir
  useState(() => {
    if (resultado?.itens) {
      setItens(resultado.itens.map(i => ({
        ...i,
        material_id_final: i.material_id_sugerido,
        material_nome_final: i.material_nome_sugerido,
        quantidade_final: i.quantidade,
      })));
    }
  });

  // Atualiza quando resultado muda
  const currentItens = resultado ? itens.length > 0 ? itens : resultado.itens.map(i => ({
    ...i,
    material_id_final: i.material_id_sugerido,
    material_nome_final: i.material_nome_sugerido,
    quantidade_final: i.quantidade,
  })) : [];

  const updateItem = (idx: number, changes: Partial<DocItem>) => {
    setItens(prev => {
      const base = prev.length > 0 ? prev : (resultado?.itens || []).map(i => ({
        ...i,
        material_id_final: i.material_id_sugerido,
        material_nome_final: i.material_nome_sugerido,
        quantidade_final: i.quantidade,
      }));
      return base.map((item, i) => i === idx ? { ...item, ...changes } : item);
    });
  };

  const handleToggleAceito = (idx: number, val: boolean | null) => {
    updateItem(idx, { aceito: val });
  };

  const handleMaterialChange = (idx: number, matId: string) => {
    const mat = materiaisObra.find(m => m.id === matId);
    if (mat) updateItem(idx, { material_id_final: mat.id, material_nome_final: mat.nome, aceito: true });
    else updateItem(idx, { material_id_final: null, material_nome_final: null, aceito: null });
  };

  const itensAceitos = currentItens.filter(i => i.aceito === true && i.tipo_item === 'material').length;
  const totalItens = currentItens.filter(i => i.tipo_item === 'material').length;
  const progressoPct = totalItens > 0 ? Math.round((currentItens.filter(i => i.aceito !== null).length / totalItens) * 100) : 0;

  if (!resultado && !loading) return null;

  return (
    <Drawer open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DrawerContent className="max-h-[92vh] flex flex-col">
        <DrawerHeader className="border-b border-border pb-3 shrink-0">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-primary/80 animate-spin" />
              </div>
              <div>
                <DrawerTitle>Analisando documento...</DrawerTitle>
                <p className="text-xs text-muted-foreground mt-0.5">A IA está lendo os itens. Aguarde.</p>
              </div>
            </div>
          ) : resultado ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary/80" />
                  </div>
                  <div>
                    <DrawerTitle className="text-base">
                      {resultado.numero_doc ? `NF ${resultado.numero_doc}` : 'Documento Analisado'}
                    </DrawerTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {resultado.fornecedor_nome && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{resultado.fornecedor_nome}
                        </span>
                      )}
                      {resultado.data_doc && (
                        <span className="text-xs text-muted-foreground">· {resultado.data_doc.split('-').reverse().join('/')}</span>
                      )}
                      {resultado.valor_total != null && (
                        <span className="text-xs text-muted-foreground">· {resultado.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      )}
                    </div>
                  </div>
                </div>
                {resultado.confianca != null && (
                  <Badge className={cn('text-[10px] border shrink-0', matchBadge(resultado.confianca))}>
                    {Math.round(resultado.confianca * 100)}% confiança
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{itensAceitos} / {totalItens} material(is) aceito(s)</span>
                  <span>{progressoPct}% revisado</span>
                </div>
                <Progress value={progressoPct} className="h-1.5" />
              </div>
            </div>
          ) : null}
        </DrawerHeader>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}
            </div>
          )}

          {!loading && currentItens.map((item, idx) => {
            const isMaterial = item.tipo_item === 'material';
            const score = item.confianca_match || 0;
            const rowRef = currentItens;

            return (
              <div key={idx} className={cn(
                'border rounded-xl p-3 transition-colors',
                item.aceito === true  ? 'border-emerald-500/30 bg-emerald-500/5' :
                item.aceito === false ? 'border-muted/30 bg-muted/10 opacity-60' :
                                       'border-border bg-card',
                !isMaterial && 'border-dashed'
              )}>
                <div className="flex items-start gap-2">
                  {/* Toggle aceitar/rejeitar */}
                  {isMaterial ? (
                    <button
                      onClick={() => handleToggleAceito(idx, item.aceito === true ? null : true)}
                      className="shrink-0 mt-0.5"
                    >
                      {item.aceito === true
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        : item.aceito === false
                        ? <XCircle className="h-5 w-5 text-muted-foreground/40" />
                        : <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      }
                    </button>
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Descrição original */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                        {item.descricao_doc}
                      </span>
                      {isMaterial && (
                        <Badge className={cn('text-[9px] border', matchBadge(score))}>
                          {matchLabel(score)} {score > 0 ? `${Math.round(score * 100)}%` : ''}
                        </Badge>
                      )}
                      {!isMaterial && (
                        <Badge variant="outline" className="text-[9px]">
                          {item.tipo_item}
                        </Badge>
                      )}
                    </div>

                    {isMaterial && (
                      <>
                        {/* Select material de destino */}
                        <Select
                          value={item.material_id_final || '_none'}
                          onValueChange={v => handleMaterialChange(idx, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <Package className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue placeholder="Selecionar material..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">— Não associar —</SelectItem>
                            {materiaisObra.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Quantidade editável */}
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-muted-foreground whitespace-nowrap">Qtd. recebida:</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-7 text-xs w-24"
                            value={item.quantidade_final ?? item.quantidade}
                            onChange={e => updateItem(idx, { quantidade_final: parseFloat(e.target.value) || 0 })}
                          />
                          <span className="text-xs text-muted-foreground">{item.unidade}</span>
                          {item.valor_unitario && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              × {item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Serviço / frete — opções */}
                    {!isMaterial && (
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleToggleAceito(idx, false)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Ignorar
                        </Button>
                        {item.tipo_item !== 'desconto' && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-primary/80 border-primary/30"
                            onClick={() => {/* TODO: redirecionar para pagamentos */}}
                          >
                            <ChevronRight className="h-3.5 w-3.5 mr-1" /> → Pagamentos
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && currentItens.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum item encontrado no documento.</p>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-border shrink-0">
          {!loading && resultado && (
            <>
              <Button
                className="w-full h-11"
                disabled={itensAceitos === 0}
                onClick={() => onConfirm(currentItens)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Lançar {itensAceitos} item(s) no Estoque
              </Button>
              {onReprocess && (
                <Button variant="outline" className="w-full h-9 text-xs" onClick={onReprocess}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reprocessar documento
                </Button>
              )}
            </>
          )}
          {loading && (
            <Button disabled className="w-full h-11">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full h-9 text-muted-foreground" onClick={onClose}>
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
