import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useObras } from '@/contexts/ObrasContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NoObraState from '@/components/obras/NoObraState';
import DiarioTab from '@/components/execucao/DiarioTab';
import EstoqueQuickView from '@/components/execucao/EstoqueQuickView';
import EquipeTab from '@/components/execucao/EquipeTab';
import EntradasPendentesPanel from '@/components/execucao/EntradasPendentesPanel';
import {
  BookOpen, Package, Users, Hammer,
  PackagePlus, AlertTriangle, ListChecks,
} from 'lucide-react';

// ─── Tipos locais ──────────────────────────────────────────────────────────────

type Tab = 'diario' | 'estoque' | 'equipe' | 'entradas';

interface KpiDia {
  trabalhadores: number;
  registrosHoje: number;
  problemasAbertos: number;
  pendenciasAbertas: number;
  materiaisCriticos: number;
}

// ─── KPI Strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ kpi, loading }: { kpi: KpiDia; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 w-36 shrink-0 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const items = [
    {
      icon: Users,
      label: 'Trabalhadores',
      value: kpi.trabalhadores,
      color: 'text-primary/80',
      bg: 'bg-primary/10',
    },
    {
      icon: BookOpen,
      label: 'Registros hoje',
      value: kpi.registrosHoje,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: AlertTriangle,
      label: 'Problemas',
      value: kpi.problemasAbertos,
      color: kpi.problemasAbertos > 0 ? 'text-red-400' : 'text-muted-foreground',
      bg: kpi.problemasAbertos > 0 ? 'bg-red-500/10' : 'bg-muted/30',
    },
    {
      icon: ListChecks,
      label: 'Pendências',
      value: kpi.pendenciasAbertas,
      color: kpi.pendenciasAbertas > 0 ? 'text-amber-400' : 'text-muted-foreground',
      bg: kpi.pendenciasAbertas > 0 ? 'bg-amber-500/10' : 'bg-muted/30',
    },
    {
      icon: Package,
      label: 'Mat. críticos',
      value: kpi.materiaisCriticos,
      color: kpi.materiaisCriticos > 0 ? 'text-orange-400' : 'text-muted-foreground',
      bg: kpi.materiaisCriticos > 0 ? 'bg-orange-500/10' : 'bg-muted/30',
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {items.map(({ icon: Icon, label, value, color, bg }) => (
        <div
          key={label}
          className={cn(
            'flex items-center gap-2.5 shrink-0 rounded-xl px-3 py-2.5 border border-border/60',
            bg
          )}
        >
          <div className={cn('flex items-center justify-center h-8 w-8 rounded-lg bg-background/50')}>
            <Icon className={cn('h-4 w-4', color)} />
          </div>
          <div>
            <p className={cn('text-xl font-bold leading-none', color)}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab Button ────────────────────────────────────────────────────────────────

function TabButton({
  id,
  active,
  icon: Icon,
  label,
  badge,
  alertBadge,
  onClick,
}: {
  id: Tab;
  active: boolean;
  icon: React.ElementType;
  label: string;
  badge?: number;
  /** Red dot count for critical alerts (e.g. falta de material) */
  alertBadge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-150 whitespace-nowrap shrink-0',
        active
          ? 'bg-card text-foreground border border-b-card border-border shadow-sm -mb-px z-10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge className="h-5 min-w-[20px] px-1 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 ml-0.5">
          {badge}
        </Badge>
      )}
      {alertBadge !== undefined && alertBadge > 0 && (
        <span className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" title={`${alertBadge} falta(s) de material`} />
      )}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
      )}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExecucaoCentral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { obras } = useObras();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const { getMateriaisByObra } = useEstoque();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Tab state from URL
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && ['diario', 'estoque', 'equipe', 'entradas'].includes(rawTab)
    ? rawTab as Tab
    : 'diario';

  const setTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  // KPI state
  const [kpi, setKpi] = useState<KpiDia>({
    trabalhadores: 0,
    registrosHoje: 0,
    problemasAbertos: 0,
    pendenciasAbertas: 0,
    materiaisCriticos: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [entradasCount, setEntradasCount] = useState(0);
  const [faltaMaterialCount, setFaltaMaterialCount] = useState(0);

  const fetchKpi = useCallback(async () => {
    if (!obra) return;
    setKpiLoading(true);

    const hoje = format(new Date(), 'yyyy-MM-dd');

    const [{ data: registros }, { data: pendencias }] = await Promise.all([
      (supabase as any)
        .from('diario_registros')
        .select('id, data, trabalhadores, problemas')
        .eq('obra_id', obra.id),
      (supabase as any)
        .from('obra_agenda')
        .select('id, status')
        .eq('obra_id', obra.id)
        .eq('tipo', 'pendencia')
        .not('status', 'in', '("concluido","cancelado")'),
    ]);

    const registrosHoje = (registros || []).filter((r: any) => r.data === hoje);
    const trabalhadores = registrosHoje.reduce((s: number, r: any) => s + (r.trabalhadores || 0), 0);
    const problemasAbertos = (registros || []).filter((r: any) => r.problemas && r.status !== 'resolvida').length;
    const pendenciasAbertas = (pendencias || []).length;

    // Materiais críticos: qty abaixo do estoque mínimo
    const materiais = obra ? getMateriaisByObra(obra.id) : [];
    const materiaisCriticos = materiais.filter(m => (m.quantidadeAtual || 0) <= (m.estoqueMinimo || 0)).length;

    const newKpi = {
      trabalhadores,
      registrosHoje: registrosHoje.length,
      problemasAbertos,
      pendenciasAbertas,
      materiaisCriticos,
    };

    setKpi(newKpi);
    setKpiLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchKpi(); }, [fetchKpi]);

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar o canteiro de execução."
      />
    );
  }

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex flex-col gap-4 animate-fade-in min-h-full">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary/80" />
            Execução & Canteiro
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {today} · {obra.nome}
          </p>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────── */}
      <KpiStrip kpi={kpi} loading={kpiLoading} />

      {/* ── Tab Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-col">
        <div className="flex gap-1 overflow-x-auto border-b border-border scrollbar-none">
          <TabButton
            id="diario"
            active={activeTab === 'diario'}
            icon={BookOpen}
            label="Diário"
            onClick={() => setTab('diario')}
          />
          <TabButton
            id="estoque"
            active={activeTab === 'estoque'}
            icon={Package}
            label="Estoque"
            onClick={() => setTab('estoque')}
          />
          <TabButton
            id="equipe"
            active={activeTab === 'equipe'}
            icon={Users}
            label="Equipe"
            onClick={() => setTab('equipe')}
          />
          <TabButton
            id="entradas"
            active={activeTab === 'entradas'}
            icon={PackagePlus}
            label="Entradas NF"
            badge={entradasCount}
            alertBadge={faltaMaterialCount}
            onClick={() => setTab('entradas')}
          />
        </div>

        {/* ── Tab Content ──────────────────────────────────────────── */}
        <div className="pt-4">
          {activeTab === 'diario' && (
            <DiarioTab obraId={obra.id} onKpiChange={fetchKpi} />
          )}
          {activeTab === 'estoque' && (
            <EstoqueQuickView obraId={obra.id} />
          )}
          {activeTab === 'equipe' && (
            <EquipeTab obraId={obra.id} />
          )}
          {activeTab === 'entradas' && (
            <EntradasPendentesPanel
              obraId={obra.id}
              onCountChange={setEntradasCount}
              onAlertChange={setFaltaMaterialCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
