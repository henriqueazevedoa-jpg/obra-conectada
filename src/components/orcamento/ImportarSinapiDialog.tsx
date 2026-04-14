type SinapiComposicaoResumo = {
  codigo: number;
  descricao: string;
  unidade: string | null;
  grupo: string | null;
};
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

import { listarReferenciasSinapi } from '@/lib/sinapi/listarReferencias';
import { buscarComposicoesSinapi } from '@/lib/sinapi/buscarComposicoes';

import type { OrcamentoCategoria } from '@/contexts/OrcamentoContext';
import type { SinapiRegime } from '@/lib/sinapi/expandComposicao';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: OrcamentoCategoria[];
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
  defaultCompetencia = '',
  onConfirm,
}: Props) {
  const [categoriaId, setCategoriaId] = useState('');
  const [referenciaId, setReferenciaId] = useState('');
  const [competencia, setCompetencia] = useState(defaultCompetencia);

  const [uf, setUf] = useState('SP');
  const [regime, setRegime] = useState<SinapiRegime>('SEM_DESONERACAO');

  const [referencias, setReferencias] = useState<{ id: string; label: string }[]>([]);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<SinapiComposicaoResumo[]>([]);
  const [composicaoSelecionada, setComposicaoSelecionada] = useState<SinapiComposicaoResumo | null>(null);

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

  // carregar referências
  useEffect(() => {
    if (!open) return;

    listarReferenciasSinapi().then(setReferencias);
  }, [open]);

  // busca com debounce
  useEffect(() => {
    if (!referenciaId || busca.length < 3) return;

    const timeout = setTimeout(async () => {
      try {
        const data = await buscarComposicoesSinapi({
          referenciaId,
          termo: busca,
        });
        setResultados(data);
      } catch (err) {
        console.error(err);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [busca, referenciaId]);

  async function handleSubmit() {
    if (!categoriaId) {
      toast({ title: 'Selecione a categoria', variant: 'destructive' });
      return;
    }

    if (!referenciaId) {
      toast({ title: 'Selecione a referência SINAPI', variant: 'destructive' });
      return;
    }

    if (!composicaoSelecionada) {
      toast({ title: 'Selecione uma composição', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setProgress(10);

    try {
      appendLog('Buscando composição...', 20);

      await onConfirm({
        categoriaId,
        referenciaId,
        competencia,
        codigoComposicao: Number(composicaoSelecionada.codigo),
        uf,
        regime,
        onProgress: (p: number, msg: string) => appendLog(msg, p),
      });

      appendLog('Importação concluída.', 100);

      toast({ title: 'Composição importada com sucesso' });
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro inesperado';

      toast({
        title: 'Erro ao importar',
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
          <DialogTitle>Importar da SINAPI</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">

          {/* Categoria */}
          <div className="grid gap-2">
            <Label>Categoria destino</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
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

          {/* Referência */}
          <div className="grid gap-2">
            <Label>Referência SINAPI</Label>
            <Select value={referenciaId} onValueChange={setReferenciaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a referência" />
              </SelectTrigger>
              <SelectContent>
                {referencias.map((ref) => (
                  <SelectItem key={ref.id} value={ref.id}>
                    {ref.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Busca */}
          <div className="grid gap-2">
            <Label>Buscar composição</Label>
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite nome ou código"
              disabled={!referenciaId || isLoading}
            />
          </div>

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-auto">
              {resultados.map((item) => (
                <div
                  key={item.codigo}
                  className={`p-2 cursor-pointer hover:bg-muted ${
                    composicaoSelecionada?.codigo === item.codigo
                      ? 'bg-muted'
                      : ''
                  }`}
                  onClick={() => setComposicaoSelecionada(item)}
                >
                  <div className="text-sm font-medium">
                    {item.codigo} — {item.descricao}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.unidade} • {item.grupo}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* UF + Regime */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>UF</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Regime</Label>
              <Select value={regime} onValueChange={(v) => setRegime(v as SinapiRegime)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIMES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="border p-3 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />

              <div className="text-xs max-h-32 overflow-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
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
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}