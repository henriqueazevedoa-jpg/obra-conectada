import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Network, Package, BarChart3, Clock, DollarSign, ExternalLink, Zap } from 'lucide-react';
import { OrcamentoEtapa, OrcamentoComposicao, OrcamentoInsumo, useOrcamento } from '@/contexts/OrcamentoContext';
import { formatCurrency } from '@/data/mockData';
import { useSuprimentos } from '@/contexts/SuprimentosContext';

interface InspectorPanelProps {
  selectedItem: OrcamentoEtapa | OrcamentoComposicao | OrcamentoInsumo | null;
  itemType: 'etapa' | 'composicao' | 'insumo' | null;
  onClose: () => void;
  obraId: string;
}

export default function InspectorPanel({ selectedItem, itemType, onClose, obraId }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'pricing'>('info');

  if (!selectedItem || !itemType) return null;

  return (
    <div className="w-80 border-l bg-card/50 shadow-inner flex flex-col h-full animate-in slide-in-from-right-8 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          {itemType === 'etapa' && <Network className="h-4 w-4 text-primary" />}
          {itemType === 'composicao' && <Package className="h-4 w-4 text-orange-500" />}
          {itemType === 'insumo' && <Box className="h-4 w-4 text-blue-500" />}
          <span className="font-semibold text-sm truncate">Inspetor</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tipo e Identificação Básica */}
      <div className="px-4 py-4 bg-muted/20 border-b shrink-0">
        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
          {itemType === 'etapa' ? 'Etapa' : itemType === 'composicao' ? 'Composição' : 'Insumo'}
        </div>
        <div className="text-sm font-medium leading-tight">
          {'nome' in selectedItem ? selectedItem.nome : selectedItem.descricao}
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">
          {selectedItem.codigo} ({'unidade' in selectedItem ? selectedItem.unidade : 'Geral'})
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">
          {formatCurrency(selectedItem.precoTotal || 0)}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
        >
          Detalhes
        </button>
        {itemType === 'insumo' && (
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1 ${activeTab === 'pricing' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted/50'}`}
          >
            <DollarSign className="h-3 w-3" /> Preços
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Especificações Técnicas</label>
              <div className="text-xs p-3 bg-muted/30 rounded-md border text-muted-foreground italic">
                Nenhuma especificação ou anotação detalhada inserida para este item.
              </div>
            </div>

            {itemType === 'composicao' && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><BarChart3 className="h-3 w-3"/> Estatísticas</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-2 rounded border">
                    <div className="text-[10px] text-muted-foreground">Insumos Dependentes</div>
                    <div className="text-sm font-semibold">{('insumos' in selectedItem ? (selectedItem as OrcamentoComposicao).insumos.length : 0)}</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded border">
                    <div className="text-[10px] text-muted-foreground">Preço Unitário</div>
                    <div className="text-sm font-semibold">{formatCurrency(('precoUnitario' in selectedItem ? selectedItem.precoUnitario : 0) || 0)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'pricing' && itemType === 'insumo' && (
          <div className="space-y-4">
            <PricingTabContent insumo={selectedItem as OrcamentoInsumo} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function PricingTabContent({ insumo }: { insumo: OrcamentoInsumo }) {
  // Poderia integrar com view_file / SuprimentosContext
  return (
    <div className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
          <Zap className="h-4 w-4" />
          <h4 className="text-xs font-bold">Cotação Dinâmica</h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
          Este insumo não necessita ser migrado manualmente usando ping-pong de telas. Envie à fila de cotação agora.
        </p>
        <Button size="sm" className="w-full text-xs h-7 bg-blue-600 hover:bg-blue-700">Adicionar a Lote Existente</Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <ExternalLink className="h-3 w-3" /> Histórico Banco de Preços
        </h4>
        <div className="p-3 border rounded-lg bg-card shadow-sm space-y-1">
           <div className="flex justify-between items-center">
             <span className="text-[11px] text-muted-foreground">Último Fechamento</span>
             <span className="text-xs font-medium">12/03/2026</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-[11px] text-muted-foreground">Preço (Leroy Merlin)</span>
             <span className="text-xs font-bold text-green-600">R$ 29,90</span>
           </div>
        </div>
      </div>
    </div>
  );
}

// Para usar icones faltantes localmente (Box) caso não exportado acima
function Box(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}
