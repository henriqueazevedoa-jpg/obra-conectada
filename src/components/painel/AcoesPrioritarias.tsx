import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Wallet, Package, ListChecks, CalendarDays, BookOpen,
} from 'lucide-react';

interface Acao {
  icon: React.ReactNode;
  texto: string;
  prioridade: 'alta' | 'media' | 'baixa';
  to: string;
  acao: string;
}

interface Props {
  pagamentosAtrasados: number;
  pagamentosAtrasadosValor: number;
  materiaisBaixo: { nome: string; estoqueAtual: number; unidade: string }[];
  pendenciasAlta: number;
  etapasAtrasadas: { nome: string }[];
  registrosPendentes: number;
}

export default function AcoesPrioritarias({
  pagamentosAtrasados, pagamentosAtrasadosValor, materiaisBaixo,
  pendenciasAlta, etapasAtrasadas, registrosPendentes,
}: Props) {
  const acoes: Acao[] = [];

  if (pagamentosAtrasados > 0) {
    acoes.push({
      icon: <Wallet className="h-4 w-4 text-destructive" />,
      texto: `Regularizar ${pagamentosAtrasados} pagamento(s) atrasado(s)`,
      prioridade: 'alta',
      to: '/pagamentos',
      acao: 'Ver pagamentos',
    });
  }

  if (materiaisBaixo.length > 0) {
    acoes.push({
      icon: <Package className="h-4 w-4 text-warning" />,
      texto: `Comprar ${materiaisBaixo.length} material(is) com estoque crítico`,
      prioridade: 'alta',
      to: '/estoque',
      acao: 'Ver estoque',
    });
  }

  if (pendenciasAlta > 0) {
    acoes.push({
      icon: <ListChecks className="h-4 w-4 text-destructive" />,
      texto: `Resolver ${pendenciasAlta} pendência(s) de alta prioridade`,
      prioridade: 'alta',
      to: '/pendencias',
      acao: 'Ver pendências',
    });
  }

  if (etapasAtrasadas.length > 0) {
    acoes.push({
      icon: <CalendarDays className="h-4 w-4 text-warning" />,
      texto: `Revisar ${etapasAtrasadas.length} etapa(s) atrasada(s) no cronograma`,
      prioridade: 'media',
      to: '/cronograma',
      acao: 'Ver cronograma',
    });
  }

  if (registrosPendentes > 0) {
    acoes.push({
      icon: <BookOpen className="h-4 w-4 text-warning" />,
      texto: `Aprovar ${registrosPendentes} registro(s) de diário pendente(s)`,
      prioridade: 'media',
      to: '/diario',
      acao: 'Ver diário',
    });
  }

  if (acoes.length === 0) return null;

  const prioridadeColors = {
    alta: 'bg-destructive/10 text-destructive border-0',
    media: 'bg-warning/10 text-warning border-0',
    baixa: 'bg-muted text-muted-foreground border-0',
  };

  return (
    <Card className="shadow-card border-primary/20 print:shadow-none print:border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Ações Prioritárias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {acoes.map((a, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
            {a.icon}
            <span className="text-sm text-foreground flex-1">{a.texto}</span>
            <Badge variant="secondary" className={`${prioridadeColors[a.prioridade]} text-[10px] mr-2`}>
              {a.prioridade}
            </Badge>
            <Link to={a.to} className="print:hidden">
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">{a.acao}</Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
