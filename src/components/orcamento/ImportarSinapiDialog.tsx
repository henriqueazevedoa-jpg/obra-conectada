import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import type { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import type { SinapiRegime } from '@/lib/sinapi/expandComposicao';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: OrcamentoCategoria[];
  defaultReferenciaId?: string;
  defaultCompetencia?: string;
  onConfirm: (params: {
    categoriaId: string;
    referenciaId: string;
    competencia: string;
    codigoComposicao: number;
    uf: string;
    regime: SinapiRegime;
    onProgress?: (progress: number, message: string) => void;
  }) => Promise<void>;
}

const REGIMES: SinapiRegime[] = [
  'SEM_DESONERACAO',
  'COM_DESONERACAO',
  'SEM_ENCARGOS',
];

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

export default function ImportarSinapiDialog({
  open,
  onOpenChange,
  categorias,
  defaultReferenciaId = '',
  defaultCompetencia = '',
  onConfirm,
}: Props) {
  const [categoriaId, setCategoriaId] = useState('');
  const [referenciaId, setReferenciaId] = useState(defaultReferenciaId);
  const [competencia, setCompetencia] = useState(defaultCompetencia);
  const [codigoComposicao, setCodigoComposicao] = useState('');
  const [uf, setUf] = useState('SP');
  const [regime, setRegime] = useState<SinapiRegime>('SEM_DESONERACAO');

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const categoriaOptions = useMemo(
    () => categorias.filter((cat) => !!cat.id),
    [categorias]
  );

  function appendLog(message: string, value?: number) {
    setLogs((prev) => [...prev, message]);
    if (typeof value === 'number') setProgress(value);
  }

  async function handleSubmit() {
    if (!categoriaId) {
      toast({ title: 'Selecione a categoria de destino', variant: 'destructive' });
      return;
    }

    if (!referenciaId.trim()) {
      toast({ title: 'Informe o ID da referência SINAPI', variant: 'destructive' });
      return;
    }

    if (!competencia.trim()) {
      toast({ title: 'Informe a competência da referência', variant: 'destructive' });
      return;
    }

    const codigo = Number(codigoComposicao);
    if (!codigo) {
      toast({ title: 'Informe um código de composição válido', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setProgress(5);

    try {
      appendLog('Iniciando importação...', 10);

      await onConfirm({
        categoriaId,
        referenciaId: referenciaId.trim(),
        competencia: competencia.trim(),
        codigoComposicao: codigo,
        uf,
        regime,
        onProgress: (value, message) => appendLog(message, value),
      });

      appendLog('Composição importada com sucesso.', 100);

      toast({ title: 'Composição SINAPI adicionada ao orçamento' });
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
         error instanceof Error ? error.message : 'Falha inesperada';

        toast({
          title: 'Erro ao importar composição SINAPI',
          description: message,
          variant: 'destructive',
        });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isLoading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar composição da SINAPI</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Categoria de destino</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriaOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.codigo} — {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>ID da referência</Label>
              <Input
                value={referenciaId}
                onChange={(e) => setReferenciaId(e.target.value)}
                placeholder="UUID da sinapi_referencias"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label>Competência</Label>
              <Input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="2026-02"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2 sm:col-span-1">
              <Label>Código da composição</Label>
              <Input
                value={codigoComposicao}
                onChange={(e) => setCodigoComposicao(e.target.value)}
                placeholder="Ex: 104658"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label>UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Regime</Label>
              <Select value={regime} onValueChange={(v) => setRegime(v as SinapiRegime)}>
                <SelectTrigger>
                  <SelectValue placeholder="Regime" />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && (
            <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span>Importando dados da SINAPI</span>
                <span>{progress}%</span>
              </div>

              <Progress value={progress} />

              <div className="rounded-md bg-background border p-3 max-h-40 overflow-auto text-xs space-y-1">
                {logs.map((log, index) => (
                  <div key={`${log}-${index}`}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}