import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/data/mockData';
import { DollarSign, TrendingUp, TrendingDown, Edit } from 'lucide-react';
import VoiceInputButton from '@/components/voice/VoiceInputButton';
import OrcamentoEditor from '@/components/orcamento/OrcamentoEditor';
import { toast } from '@/hooks/use-toast';

export default function OrcamentoPage() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const [editing, setEditing] = useState(false);

  const obra = obras.find(o => o.id === selectedObraId);
  const orcamento = selectedObraId ? getOrcamento(selectedObraId) : undefined;

  const totalPrevisto = orcamento?.categorias.reduce((s, c) => s + c.precoTotal, 0) ?? 0;
  const isCliente = user?.role === 'cliente';
  const isGestor = user?.role === 'gestor';

  if (editing && obra) {
    return <OrcamentoEditor obraId={obra.id} obraNome={obra.nome} onBack={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orçamento</h1>
          <p className="text-muted-foreground text-sm">Gestão orçamentária por obra</p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceInputButton
            module="orcamento"
            obraId={selectedObraId}
            onResult={(parsed) => {
              toast({ title: 'Dados de voz recebidos', description: `Item: ${parsed.item || '?'}, Qtd: ${parsed.quantidade || '?'}` });
            }}
          />
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGestor && (
            <Button onClick={() => setEditing(true)} className="gap-1">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      {!obra && (
        <div className="text-center py-12 text-muted-foreground">Selecione uma obra para visualizar o orçamento.</div>
      )}

      {obra && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Total Previsto</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Categorias</p>
                <p className="text-xl font-bold text-foreground">{orcamento?.categorias.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Progresso da Obra</p>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-foreground">{obra.percentualAndamento}%</p>
                  <Progress value={obra.percentualAndamento} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories breakdown */}
          {orcamento && orcamento.categorias.length > 0 ? (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Categorias do Orçamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground font-medium">Código</th>
                        <th className="text-left p-2 text-muted-foreground font-medium">Categoria</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Valor Previsto</th>
                        <th className="text-right p-2 text-muted-foreground font-medium">Composições</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamento.categorias.map(cat => (
                        <tr key={cat.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="p-2 font-mono text-xs text-muted-foreground">{cat.codigo}</td>
                          <td className="p-2 text-foreground font-medium">{cat.nome}</td>
                          <td className="p-2 text-right text-foreground">{formatCurrency(cat.precoTotal)}</td>
                          <td className="p-2 text-right text-muted-foreground">{cat.usaComposicoes ? cat.composicoes.length : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td className="p-2" colSpan={2}>Total</td>
                        <td className="p-2 text-right text-foreground">{formatCurrency(totalPrevisto)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {isGestor ? 'Nenhum orçamento cadastrado. Clique em "Editar" para criar.' : 'Orçamento ainda não cadastrado para esta obra.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
