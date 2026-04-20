import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, HardHat, Wrench, UserCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Colaborador {
  id: string;
  nome: string;
  funcao?: string;
  status?: string;
  telefone?: string;
}

export default function EquipeTab({ obraId }: { obraId: string }) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    // Tenta equipe_colaboradores, aceita erro graciosamente
    const { data } = await (supabase as any)
      .from('equipe_colaboradores')
      .select('*')
      .eq('obra_id', obraId)
      .order('nome');
    setColaboradores((data || []) as Colaborador[]);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}
      </div>
    );
  }

  if (colaboradores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground">Nenhum colaborador cadastrado nesta obra.</p>
        <Button asChild size="sm" variant="outline">
          <Link to="/usuarios">Gerenciar Equipe</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''} na obra</p>
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <Link to="/usuarios">Gerenciar</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {colaboradores.map(c => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle2 className="h-5 w-5 text-primary/80" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{c.nome}</p>
              {c.funcao && <p className="text-xs text-muted-foreground truncate">{c.funcao}</p>}
            </div>
            {c.status && (
              <Badge variant="secondary" className={cn(
                'ml-auto text-[10px] shrink-0',
                c.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
              )}>
                {c.status}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
