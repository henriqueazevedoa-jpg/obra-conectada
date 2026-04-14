import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/data/mockData';
import { isBefore, startOfDay, addDays, parseISO, format } from 'date-fns';
import {
  TrendingUp, AlertTriangle, CheckCircle2, DollarSign, ListChecks, Lightbulb, ChevronRight,
} from 'lucide-react';

interface Props {
  obraId: string;
  totalPrevisto: number;
  totalRealizado: number;
  andamentoReal: number;
  andamentoPlanejado: number;
}

interface Pagamento {
  id: string; descricao: string; valor_previsto: number;
  data_vencimento: string; status: string;
}

interface Pendencia {
  id: string; titulo: string; status: string;
  prioridade: string; data_limite: string | null;
}

export default function ResumoExecutivo({ obraId, totalPrevisto, totalRealizado, andamentoReal, andamentoPlanejado }: Props) {
  const navigate = useNavigate();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);

  useEffect(() => {
    if (!obraId) return;
    Promise.all([
      supabase.from('pagamentos').select('id, descricao, valor_previsto, data_vencimento, status').eq('obra_id', obraId),
      supabase.from('pendencias').select('id, titulo, status, prioridade, data_limite').eq('obra_id', obraId),
    ]).then(([pRes, peRes]) => {
      setPagamentos((pRes.data || []) as Pagamento[]);
      setPendencias((peRes.data || []) as Pendencia[]);
    });
  }, [obraId]);

  const today = startOfDay(new Date());
  const proxSemana = addDays(today, 7);

  const desvio = totalPrevisto > 0 ? ((totalRealizado - totalPrevisto) / totalPrevisto) * 100 : 0;
  const statusFinanceiro = desvio > 10 ? 'critico' : desvio > 5 ? 'atencao' : 'saudavel';
  const financeiroLabel = { saudavel: 'Saudável', atencao: 'Atenção', critico: 'Crítico' }[statusFinanceiro];
  const financeiroColor = { saudavel: 'bg-success/10 text-success', atencao: 'bg-warning/10 text-warning', critico: 'bg-destructive/10 text-destructive' }[statusFinanceiro];

  const statusPrazo = andamentoReal >= andamentoPlanejado ? 'no_prazo' : (andamentoPlanejado - andamentoReal > 15 ? 'atrasado' : 'atencao');
  const prazoLabel = { no_prazo: 'No Prazo', atencao: 'Atenção', atrasado: 'Atrasado' }[statusPrazo];
  const prazoColor = { no_prazo: 'bg-success/10 text-success', atencao: 'bg-warning/10 text-warning', atrasado: 'bg-destructive/10 text-destructive' }[statusPrazo];

  const proximosPagamentos = pagamentos
    .filter(p => p.status === 'previsto' && p.data_vencimento)
    .filter(p => {
      const d = parseISO(p.data_vencimento);
      return !isBefore(d, today) && isBefore(d, proxSemana);
    })
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    .slice(0, 3);

  const pagAtrasados = pagamentos.filter(p => p.status === 'atrasado' || (p.status === 'previsto' && p.data_vencimento && isBefore(parseISO(p.data_vencimento), today)));
  const pendenciasAbertas = pendencias.filter(p => p.status !== 'resolvida');
  const pendenciasAlta = pendenciasAbertas.filter(p => p.prioridade === 'alta');

  let acaoRecomendada = 'Tudo em dia. Continue o bom trabalho!';
  if (pagAtrasados.length > 0) {
    acaoRecomendada = `Regularize ${pagAtrasados.length} pagamento(s) atrasado(s) — total de ${formatCurrency(pagAtrasados.reduce((s, p) => s + p.valor_previsto, 0))}.`;
  } else if (pendenciasAlta.length > 0) {
    acaoRecomendada = `Resolva ${pendenciasAlta.length} pendência(s) de alta prioridade.`;
  } else if (statusPrazo === 'atrasado') {
    acaoRecomendada = 'Revise o cronograma — obra com atraso significativo.';
  } else if (statusFinanceiro === 'critico') {
    acaoRecomendada = 'Revise custos — desvio orçamentário acima de 10%.';
  } else if (proximosPagamentos.length > 0) {
    acaoRecomendada = `${proximosPagamentos.length} pagamento(s) vencem nos próximos 7 dias.`;
  }

  const clickableRow = "flex items-center justify-between cursor-pointer rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors group";

  return (
    <Card className="shadow-card print:shadow-none print:border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Resumo Executivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badges — clickable */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/custo-real')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Financeiro:</span>
            <Badge variant="secondary" className={financeiroColor + ' border-0'}>{financeiroLabel}</Badge>
            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
          <button onClick={() => navigate('/cronograma')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Prazo:</span>
            <Badge variant="secondary" className={prazoColor + ' border-0'}>{prazoLabel}</Badge>
          </button>
          <button onClick={() => navigate('/pendencias')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pendências:</span>
            <span className="text-sm font-medium text-foreground">{pendenciasAbertas.length} abertas</span>
          </button>
        </div>

        {/* Próximos pagamentos — clickable */}
        {proximosPagamentos.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pagamentos próximos (7 dias)</p>
            {proximosPagamentos.map(p => (
              <div key={p.id} onClick={() => navigate('/pagamentos')} className={clickableRow}>
                <span className="text-sm text-foreground truncate">{p.descricao}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{format(parseISO(p.data_vencimento), 'dd/MM')}</span>
                  <span className="font-medium text-foreground">{formatCurrency(p.valor_previsto)}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagamentos atrasados — clickable */}
        {pagAtrasados.length > 0 && (
          <button onClick={() => navigate('/pagamentos')} className="w-full flex items-start gap-2 text-sm p-2 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors text-left">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-foreground flex-1">{pagAtrasados.length} pagamento(s) atrasado(s) — {formatCurrency(pagAtrasados.reduce((s, p) => s + p.valor_previsto, 0))}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          </button>
        )}

        {/* Ação recomendada */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary mb-0.5">Ação recomendada da semana</p>
            <p className="text-sm text-foreground">{acaoRecomendada}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
