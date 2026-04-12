import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ListChecks, ArrowRight } from 'lucide-react';

interface Pendencia {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  tipo: string;
  data_limite: string | null;
}

interface Props {
  obraId: string;
}

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning border-0',
  resolvida: 'bg-success/10 text-success border-0',
  rejeitada: 'bg-destructive/10 text-destructive border-0',
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  resolvida: 'Resolvida',
  rejeitada: 'Rejeitada',
};

const tipoLabels: Record<string, string> = {
  financeiro: '💰 Financeiro',
  execucao: '🔧 Execução',
  administrativo: '📋 Administrativo',
};

export default function PendenciasBlock({ obraId }: Props) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);

  useEffect(() => {
    if (!obraId) return;
    supabase.from('pendencias').select('id, titulo, status, prioridade, tipo, data_limite')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setPendencias(data as Pendencia[]); });
  }, [obraId]);

  const abertas = pendencias.filter(p => p.status === 'pendente');
  const resolvidas = pendencias.filter(p => p.status === 'resolvida');

  const byTipo = abertas.reduce((acc, p) => {
    const tipo = p.tipo || 'administrativo';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="shadow-card print:shadow-none print:border" data-print-section="pendencias">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Pendências da Obra
          </CardTitle>
          <Link to="/pendencias">
            <Button variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resumo */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-foreground">{abertas.length}</span>
            <span className="text-xs text-muted-foreground">abertas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-success">{resolvidas.length}</span>
            <span className="text-xs text-muted-foreground">resolvidas</span>
          </div>
        </div>

        {/* Por tipo */}
        {Object.keys(byTipo).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(byTipo).map(([tipo, count]) => (
              <Badge key={tipo} variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs">
                {tipoLabels[tipo] || tipo}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Itens recentes */}
        <div className="space-y-1.5">
          {abertas.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className={`${p.prioridade === 'alta' ? 'bg-destructive/10 text-destructive' : p.prioridade === 'media' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'} border-0 text-[10px]`}>
                  {p.prioridade}
                </Badge>
                <span className="text-sm text-foreground truncate">{p.titulo}</span>
              </div>
              <Badge variant="secondary" className={`${statusColors[p.status] || 'bg-muted text-muted-foreground border-0'} text-[10px]`}>
                {statusLabels[p.status] || p.status}
              </Badge>
            </div>
          ))}
          {abertas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhuma pendência aberta 🎉</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
