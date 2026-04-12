import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import NoObraState from '@/components/obras/NoObraState';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/data/mockData';
import { Edit, Copy, DollarSign } from 'lucide-react';
import VoiceInputButton from '@/components/voice/VoiceInputButton';
import OrcamentoEditor from '@/components/orcamento/OrcamentoEditor';
import { toast } from '@/hooks/use-toast';

export default function OrcamentoPage() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { getOrcamento, orcamentos, saveOrcamento } = useOrcamento();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const [editing, setEditing] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');

  const obra = obras.find(o => o.id === selectedObraId);
  const orcamento = selectedObraId ? getOrcamento(selectedObraId) : undefined;

  const totalPrevisto = orcamento?.categorias.reduce((s, c) => s + c.precoTotal, 0) ?? 0;
  const isGestor = user?.role === 'gestor';

  // Obras that have budgets (excluding current)
  const obrasComOrcamento = orcamentos.filter(o => o.obraId !== selectedObraId && o.categorias.length > 0);

  const handleImport = () => {
    if (!importObraId || !selectedObraId) return;
    const source = getOrcamento(importObraId);
    if (!source) {
      toast({ title: 'Orçamento não encontrado para esta obra', variant: 'destructive' });
      return;
    }
    const cloned = {
      obraId: selectedObraId,
      categorias: source.categorias.map(cat => ({
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
      })),
    };
    saveOrcamento(cloned);
    setImportDialogOpen(false);
    setImportObraId('');
    toast({ title: 'Orçamento importado com sucesso!', description: 'Clique em "Editar" para ajustar os valores.' });
  };

  if (editing && obra) {
    return <OrcamentoEditor obraId={obra.id} obraNome={obra.nome} onBack={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Orçamento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestão orçamentária por obra</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <VoiceInputButton
            module="orcamento"
            obraId={selectedObraId}
            onResult={(parsed) => {
              toast({ title: 'Dados de voz recebidos', description: `Item: ${parsed.item || '?'}, Qtd: ${parsed.quantidade || '?'}` });
            }}
          />
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.codigo ? `${o.codigo} - ` : ''}{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGestor && obrasComOrcamento.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="gap-1">
              <Copy className="h-4 w-4" /> Importar
            </Button>
          )}
          {isGestor && (
            <Button size="sm" onClick={() => setEditing(true)} className="gap-1">
              <Edit className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      {!obra && (
        <NoObraState
          title="Nenhuma obra cadastrada"
          description="Cadastre uma obra para começar a gerenciar o orçamento da construção."
        />
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
                  <table className="min-w-[720px] w-full text-sm">
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
