import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ListChecks, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PendenciaAgenda {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  data_limite: string | null;
  data_programada: string;
}

interface Props {
  obraId: string;
}

const prioridadeColors: Record<string, string> = {
  alta:  'bg-destructive/10 text-destructive border-0',
  media: 'bg-amber-500/10 text-amber-600 border-0',
  baixa: 'bg-muted text-muted-foreground border-0',
};

export default function PendenciasBlock({ obraId }: Props) {
  const [pendencias, setPendencias] = useState<PendenciaAgenda[]>([]);

  useEffect(() => {
    if (!obraId) return;
    (supabase as any)
      .from('obra_agenda')
      .select('id, titulo, status, prioridade, data_limite, data_programada')
      .eq('obra_id', obraId)
      .eq('tipo', 'pendencia')
      .not('status', 'in', '("concluido","cancelado")')
      .order('data_programada', { ascending: true })
      .limit(20)
      .then(({ data }: { data: PendenciaAgenda[] | null }) => {
        if (data) setPendencias(data);
      });
  }, [obraId]);

  const abertas    = pendencias.filter(p => p.status !== 'concluido' && p.status !== 'cancelado');
  const concluidas = pendencias.filter(p => p.status === 'concluido');

  return (
    <Card className="shadow-card print:shadow-none print:border" data-print-section="pendencias">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Pendências da Obra
          </CardTitle>
          <Link to="/agenda?tipo=pendencia" className="print:hidden">
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
            <span className="text-lg font-bold text-emerald-600">{concluidas.length}</span>
            <span className="text-xs text-muted-foreground">concluídas</span>
          </div>
        </div>

        {/* Itens recentes */}
        <div className="space-y-1.5">
          {abertas.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className={`${prioridadeColors[p.prioridade] || 'bg-muted text-muted-foreground border-0'} text-[10px]`}>
                  {p.prioridade}
                </Badge>
                <span className="text-sm text-foreground truncate">{p.titulo}</span>
              </div>
              {p.data_limite && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(parseISO(p.data_limite), 'dd/MM')}
                </span>
              )}
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
