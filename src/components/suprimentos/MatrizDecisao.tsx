import { useState, useEffect, useMemo } from 'react';
import { useSuprimentos } from '@/contexts/SuprimentosContext';
import { CotacaoLote, CotacaoResposta } from '@/types/suprimentos';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, TrendingDown, Target, BarChart, Trash2, Download, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';
import { exportarPlanilhaCotacao } from '@/lib/planilha/exportCotacao';

interface MatrizDecisaoProps {
  lote: CotacaoLote | null;
  onClose: () => void;
  onImport: () => void;
}

export default function MatrizDecisao({ lote, onClose, onImport }: MatrizDecisaoProps) {
  const { respostas, fetchRespostas, fetchItensDoLote, finalizarLote } = useSuprimentos();
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecoes, setSelecoes] = useState<Record<string, string>>({}); // item_origem_id -> fornecedor_nome

  useEffect(() => {
    if (lote) {
      setLoading(true);
      Promise.all([
        fetchItensDoLote(lote.id),
        fetchRespostas(lote.id)
      ]).then(([itensData]) => {
        setItens(itensData);
        setLoading(false);
      });
    }
  }, [lote, fetchRespostas, fetchItensDoLote]);

  // Lista única de fornecedores que responderam
  const fornecedores = useMemo(() => {
    const set = new Set<string>();
    respostas.forEach(r => set.add(r.fornecedor_nome));
    return Array.from(set).sort();
  }, [respostas]);

  // Calcula o menor preço por linha
  const menoresPrecos = useMemo(() => {
    const map: Record<string, number> = {};
    itens.forEach(item => {
      const precosItem = respostas.filter(r => r.item_origem_id === item.id && r.preco_unitario > 0);
      if (precosItem.length > 0) {
        map[item.id] = Math.min(...precosItem.map(r => r.preco_unitario));
      }
    });
    return map;
  }, [itens, respostas]);

  // Calcula o total por fornecedor
  const totaisFornecedor = useMemo(() => {
    const map: Record<string, number> = {};
    fornecedores.forEach(f => {
      map[f] = itens.reduce((acc, item) => {
        const resp = respostas.find(r => r.item_origem_id === item.id && r.fornecedor_nome === f);
        return acc + (resp?.preco_unitario || 0); // Aqui assumimos quantidade 1 para comparação unitária simples ou podemos pegar a qtd do item
      }, 0);
    });
    return map;
  }, [fornecedores, itens, respostas]);

  // Estratégias de Decisão
  const aplicarMelhorPorItem = () => {
    const novasSelecoes: Record<string, string> = {};
    itens.forEach(item => {
      const melhor = respostas
        .filter(r => r.item_origem_id === item.id && r.preco_unitario > 0)
        .sort((a, b) => a.preco_unitario - b.preco_unitario)[0];
      if (melhor) novasSelecoes[item.id] = melhor.fornecedor_nome;
    });
    setSelecoes(novasSelecoes);
    toast({ title: "Estratégia: Melhor por Item aplicada" });
  };

  const aplicarMelhorGlobal = () => {
    let melhorF = '';
    let menorTotal = Infinity;
    fornecedores.forEach(f => {
      if (totaisFornecedor[f] > 0 && totaisFornecedor[f] < menorTotal) {
        menorTotal = totaisFornecedor[f];
        melhorF = f;
      }
    });
    if (melhorF) {
      const novasSelecoes: Record<string, string> = {};
      itens.forEach(item => {
        if (respostas.some(r => r.item_origem_id === item.id && r.fornecedor_nome === melhorF)) {
          novasSelecoes[item.id] = melhorF;
        }
      });
      setSelecoes(novasSelecoes);
      toast({ title: `Estratégia: Melhor Global (${melhorF}) aplicada` });
    }
  };

  const handleConfirmar = async () => {
    if (Object.keys(selecoes).length === 0) {
      toast({ title: "Selecione pelo menos um preço", variant: "destructive" });
      return;
    }
    
    if (lote) {
      await aplicarPrecosDecididos(lote.id, selecoes);
      onClose();
    }
  };

  if (!lote) return null;

  return (
    <Dialog open={!!lote} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Matriz de Decisão: {lote.titulo}
              </DialogTitle>
              <DialogDescription>
                Compare os preços dos fornecedores e escolha a melhor estratégia de compra.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => exportarPlanilhaCotacao(itens, lote.titulo)}>
                <Download className="h-4 w-4" /> Exportar Template
              </Button>
              <Button variant="default" size="sm" className="gap-2" onClick={onImport}>
                <Download className="h-4 w-4 rotate-180" /> Importar Respostas
              </Button>
            </div>
          </div>
          
          {/* Quick Actions Bar */}
          <div className="flex gap-2 mt-4 p-2 bg-muted/40 rounded-lg border border-border/50">
            <span className="text-xs font-semibold text-muted-foreground self-center px-2">Estratégias:</span>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 hover:bg-green-500/10 hover:text-green-600" onClick={aplicarMelhorPorItem}>
              <Target className="h-3.5 w-3.5" /> Melhor por Item (Cherry-picking)
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 hover:bg-blue-500/10 hover:text-blue-600" onClick={aplicarMelhorGlobal}>
              <TrendingDown className="h-3.5 w-3.5" /> Melhor Oferta Global
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">Carregando dados...</div>
          ) : fornecedores.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl">
              <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium text-lg">Nenhuma resposta recebida ainda</p>
              <p className="text-sm max-w-xs text-center mt-2">Exporte o template e importe as planilhas preenchidas pelos fornecedores para ver a comparação.</p>
              <Button variant="outline" className="mt-6" onClick={onImport}>Importar Agora</Button>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-background shadow-sm h-full flex flex-col">
              <ScrollArea className="flex-1 h-full">
                <Table className="relative">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="min-w-[250px] font-bold text-foreground bg-muted/50">Insumo / Item</TableHead>
                      {fornecedores.map(f => (
                        <TableHead key={f} className="min-w-[150px] text-center font-bold text-foreground">
                          <div className="flex flex-col items-center py-1">
                            <span className="truncate max-w-[140px]">{f}</span>
                            <Badge variant="outline" className="mt-1 text-[10px] font-normal border-primary/30">
                              Total: {formatCurrency(totaisFornecedor[f])}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map(item => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{item.nome_insumo}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{item.unidade} · {item.categoria}</span>
                          </div>
                        </TableCell>
                        {fornecedores.map(f => {
                          const resp = respostas.find(r => r.item_origem_id === item.id && r.fornecedor_nome === f);
                          const isMenor = resp && resp.preco_unitario > 0 && resp.preco_unitario === menoresPrecos[item.id];
                          const isSelected = selecoes[item.id] === f;

                          return (
                            <TableCell 
                              key={f} 
                              className={`text-center cursor-pointer transition-all border-l ${isSelected ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''}`}
                              onClick={() => setSelecoes(prev => ({ ...prev, [item.id]: f }))}
                            >
                              {resp && resp.preco_unitario > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-sm font-semibold ${isMenor ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                                    {formatCurrency(resp.preco_unitario)}
                                  </span>
                                  {isMenor && (
                                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none text-[9px] h-4 px-1">
                                      Melhor Preço
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <CheckCircle2 className="h-3 w-3 text-primary mt-0.5" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex gap-4">
                  <span>Itens no Lote: <strong>{itens.length}</strong></span>
                  <span>Selecionados: <strong className={Object.keys(selecoes).length === itens.length ? 'text-green-600' : ''}>{Object.keys(selecoes).length} / {itens.length}</strong></span>
                </div>
                <div className="flex gap-2 items-center">
                  <Target className="h-3 w-3 text-primary" />
                  <span>Escolha o fornecedor clicando no preço correspondente</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/5">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button 
            disabled={loading || Object.keys(selecoes).length === 0} 
            onClick={handleConfirmar}
            className="gap-2 shadow-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aplicar Decisões ao Sistema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
