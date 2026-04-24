import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, BarChart2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { classificarCurvaABC, AbcItem, AbcClasse } from '@/lib/curvaABC';
import type { OrcamentoEtapa } from '@/contexts/OrcamentoContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CotacaoAbcPanelProps {
  etapas: OrcamentoEtapa[];
  filtroClasseAAtivo: boolean;
  onToggleFiltroClasseA: () => void;
}

export default function CotacaoAbcPanel({ etapas, filtroClasseAAtivo, onToggleFiltroClasseA }: CotacaoAbcPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Calcula a curva ABC usando o utilitário padrão do sistema
  const { abcItems, summary } = useMemo(() => {
    const items = classificarCurvaABC(etapas, 'todos');
    
    let totalValue = 0;
    const stats: Record<AbcClasse, { count: number; value: number; pct: number }> = {
      A: { count: 0, value: 0, pct: 0 },
      B: { count: 0, value: 0, pct: 0 },
      C: { count: 0, value: 0, pct: 0 },
    };

    for (const item of items) {
      totalValue += item.valor;
      stats[item.classe].count++;
      stats[item.classe].value += item.valor;
    }

    if (totalValue > 0) {
      stats.A.pct = (stats.A.value / totalValue) * 100;
      stats.B.pct = (stats.B.value / totalValue) * 100;
      stats.C.pct = (stats.C.value / totalValue) * 100;
    }

    return { abcItems: items, summary: { totalValue, stats } };
  }, [etapas]);

  if (abcItems.length === 0) return null;

  const { A, B, C } = summary.stats;

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPct = (val: number) => val.toFixed(1) + '%';

  return (
    <div className="bg-white border-b shadow-sm flex flex-col transition-all">
      {/* HEADER DO PAINEL (Sempre visível) */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <BarChart2 className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 leading-tight">Curva ABC</h2>
              <p className="text-xs text-slate-500">Priorize suas cotações</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-3 ml-4 pl-4 border-l">
            <div className="text-xs">
              <span className="font-semibold text-emerald-600 mr-1">Classe A:</span>
              <span className="text-slate-600">{A.count} itens ({formatPct(A.pct)} do orçamento)</span>
            </div>
            <div className="text-xs">
              <span className="font-semibold text-amber-600 mr-1">Classe B:</span>
              <span className="text-slate-600">{B.count} itens ({formatPct(B.pct)})</span>
            </div>
            <div className="text-xs">
              <span className="font-semibold text-slate-500 mr-1">Classe C:</span>
              <span className="text-slate-600">{C.count} itens ({formatPct(C.pct)})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={filtroClasseAAtivo ? "default" : "outline"}
            className={cn(
              "h-7 text-xs gap-1.5 px-2.5",
              filtroClasseAAtivo && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFiltroClasseA();
            }}
          >
            <Filter className="h-3 w-3" />
            {filtroClasseAAtivo ? 'Filtro Classe A: Ativo' : 'Filtrar Classe A'}
          </Button>
          
          <div className="text-slate-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* ÁREA EXPANSÍVEL (Tabela de itens) */}
      {expanded && (
        <div className="border-t bg-slate-50 p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-4xl">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Itens mais representativos (Top 20)
            </h3>
            
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <ScrollArea className="h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b z-10">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500 w-12">Rk</th>
                      <th className="px-4 py-2.5 text-left font-medium text-slate-500">Descrição do Item</th>
                      <th className="px-4 py-2.5 text-center font-medium text-slate-500 w-24">Classe</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500 w-32">Valor Total</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-500 w-24">% Acum.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {abcItems.slice(0, 20).map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2 text-slate-400 font-medium">{item.rank}º</td>
                        <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[300px]">
                          {item.descricao}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0 h-4 border-0",
                              item.classe === 'A' ? "bg-emerald-100 text-emerald-700" :
                              item.classe === 'B' ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            )}
                          >
                            Classe {item.classe}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 font-medium">
                          {formatMoney(item.valor)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          {item.pctAcumulado.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              {abcItems.length > 20 && (
                <div className="px-4 py-2 bg-slate-50 border-t text-center text-xs text-slate-500">
                  Mais {abcItems.length - 20} itens ocultos... (Mostrando apenas o top 20)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
