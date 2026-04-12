import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, Package, CalendarDays, BookOpen } from 'lucide-react';

interface Props {
  etapasAtrasadas: { id: string; nome: string; percentual: number }[];
  materiaisBaixo: { id: string; nome: string; estoqueAtual: number; estoqueMinimo: number; unidade: string }[];
  registrosPendentes: number;
  pagamentosAtrasados: number;
  pagamentosAtrasadosValor: number;
}

export default function PontosAtencao({
  etapasAtrasadas, materiaisBaixo, registrosPendentes,
  pagamentosAtrasados, pagamentosAtrasadosValor,
}: Props) {
  const hasAny = etapasAtrasadas.length > 0 || materiaisBaixo.length > 0 || registrosPendentes > 0 || pagamentosAtrasados > 0;
  if (!hasAny) return null;

  const financeiro = pagamentosAtrasados > 0;
  const estoque = materiaisBaixo.length > 0;
  const execucao = etapasAtrasadas.length > 0 || registrosPendentes > 0;

  return (
    <Card className="shadow-card border-warning/30 print:shadow-none print:border" data-print-section="pontosAtencao">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" /> Pontos de Atenção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financeiro */}
        {financeiro && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
              <DollarSign className="h-3 w-3" /> Financeiro
            </p>
            <div className="flex items-start gap-2 text-sm text-foreground p-2 rounded-lg bg-destructive/5">
              <span className="text-destructive">⚠️</span>
              <span>{pagamentosAtrasados} pagamento(s) atrasado(s)</span>
            </div>
          </div>
        )}

        {/* Estoque */}
        {estoque && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
              <Package className="h-3 w-3" /> Estoque
            </p>
            <div className="space-y-1.5">
              {materiaisBaixo.map(m => (
                <div key={m.id} className="flex items-start gap-2 text-sm text-foreground p-2 rounded-lg bg-warning/5">
                  <span className="text-warning">📦</span>
                  <span><strong>{m.nome}</strong> — {m.estoqueAtual} {m.unidade} (mín: {m.estoqueMinimo})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Execução */}
        {execucao && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1.5">
              <CalendarDays className="h-3 w-3" /> Execução
            </p>
            <div className="space-y-1.5">
              {etapasAtrasadas.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-sm text-foreground p-2 rounded-lg bg-destructive/5">
                  <span className="text-destructive">📅</span>
                  <span><strong>{c.nome}</strong> — etapa atrasada ({c.percentual}% concluído)</span>
                </div>
              ))}
              {registrosPendentes > 0 && (
                <div className="flex items-start gap-2 text-sm text-foreground p-2 rounded-lg bg-warning/5">
                  <span className="text-warning">📋</span>
                  <span>{registrosPendentes} registro(s) de diário pendente(s)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
