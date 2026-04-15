import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import NoObraState from '@/components/obras/NoObraState';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/data/mockData';
import { Edit, Copy, DollarSign } from 'lucide-react';
import VoiceInputButton from '@/components/voice/VoiceInputButton';
import OrcamentoEditor from '@/components/orcamento/OrcamentoEditor';
import { toast } from '@/hooks/use-toast';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';
import type { OrcamentoObra } from '@/contexts/OrcamentoContext';

export default function OrcamentoPage() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { getOrcamento, orcamentos, saveOrcamento } = useOrcamento();
  const { selectedObraId, setSelectedObraId } = useObraSelection();

  const [editing, setEditing] = usePersistentPageState<boolean>(
    'orcamento:editing',
    false,
    selectedObraId
  );

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importObraId, setImportObraId] = useState('');

  const obra = obras.find((o) => o.id === selectedObraId);
  const orcamento = selectedObraId ? getOrcamento(selectedObraId) : undefined;
  const totalPrevisto =
    orcamento?.categorias.reduce((s, c) => s + c.precoTotal, 0) ?? 0;

  const isGestor = user?.role === 'gestor';

  const obraIds = new Set(obras.map((o) => o.id));
  const obrasComOrcamento = orcamentos.filter(
    (o) =>
      o.obraId !== selectedObraId &&
      o.categorias.length > 0 &&
      obraIds.has(o.obraId)
  );

  const handleImport = async () => {
    if (!importObraId || !selectedObraId) return;

    const source = getOrcamento(importObraId);

    if (!source) {
      toast({
        title: 'Orçamento não encontrado para esta obra',
        variant: 'destructive',
      });
      return;
    }

    const cloned: OrcamentoObra = {
      obraId: selectedObraId,
      categorias: source.categorias.map((cat) => ({
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
      })),
    };

    await saveOrcamento(cloned);
    setImportDialogOpen(false);
    setImportObraId('');
    setEditing(true);

    toast({
      title: 'Orçamento importado com sucesso!',
      description: 'O editor foi aberto para você continuar de onde parou.',
    });
  };

  if (editing && obra) {
    return (
      <OrcamentoEditor
        obraId={obra.id}
        obraNome={obra.nome}
        onBack={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orçamento</h1>
        <p className="text-muted-foreground">
          Gestão orçamentária por obra
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Obra</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={selectedObraId || ''}
            onValueChange={setSelectedObraId}
          >
            <SelectTrigger className="sm:w-[360px]">
              <SelectValue placeholder="Selecione uma obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo ? `${o.codigo} - ` : ''}
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedObraId && (
            <div className="flex flex-wrap gap-2">
              {isGestor && obrasComOrcamento.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                  className="gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Importar
                </Button>
              )}

              {isGestor && (
                <Button onClick={() => setEditing(true)} className="gap-1">
                  <Edit className="w-4 h-4" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!obra && (
        <NoObraState
          title="Nenhuma obra selecionada"
          description="Selecione uma obra acima para visualizar o orçamento"
        />
      )}

      {obra && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Previsto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(totalPrevisto)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Etapas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orcamento?.categorias.length ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Progresso da Obra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">
                  {obra.percentualAndamento}%
                </div>
                <Progress value={obra.percentualAndamento} />
              </CardContent>
            </Card>
          </div>

          {orcamento && orcamento.categorias.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Etapas do Orçamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Código</th>
                        <th className="py-2 text-left">Etapa</th>
                        <th className="py-2 text-right">Valor Previsto</th>
                        <th className="py-2 text-right">Composições</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamento.categorias.map((cat) => (
                        <tr key={cat.id} className="border-b last:border-0">
                          <td className="py-2">{cat.codigo}</td>
                          <td className="py-2">{cat.nome}</td>
                          <td className="py-2 text-right">
                            {formatCurrency(cat.precoTotal)}
                          </td>
                          <td className="py-2 text-right">
                            {cat.usaComposicoes ? cat.composicoes.length : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="py-3 font-semibold" colSpan={2}>
                          Total
                        </td>
                        <td className="py-3 text-right font-semibold">
                          {formatCurrency(totalPrevisto)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {isGestor
                  ? 'Nenhum orçamento cadastrado. Clique em "Editar" para criar.'
                  : 'Orçamento ainda não cadastrado para esta obra.'}
              </CardContent>
            </Card>
          )}
        </>
      )}

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
                  const ob = obras.find((item) => item.id === o.obraId);
                  return (
                    <SelectItem key={o.obraId} value={o.obraId}>
                      {ob?.nome || o.obraId} ({o.categorias.length} etapas)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleImport}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}