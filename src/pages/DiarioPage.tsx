import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI } from '@/components/layout/PageShell';
import DiarioTab from '@/components/execucao/DiarioTab';
import { BookOpen, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import NoObraState from '@/components/obras/NoObraState';

const DiarioIcon = (
  <BookOpen className="h-4 w-4" />
);

export default function DiarioPage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId);
  
  const [kpiLoading, setKpiLoading] = useState(false);
  const [trabalhadores, setTrabalhadores] = useState(0);
  const [registrosHoje, setRegistrosHoje] = useState(0);
  const [problemasAbertos, setProblemasAbertos] = useState(0);

  const fetchKpis = useCallback(async () => {
    if (!selectedObraId) return;
    setKpiLoading(true);
    const hoje = format(new Date(), 'yyyy-MM-dd');

    const { data: registros } = await supabase
      .from('diario_registros')
      .select('trabalhadores, problemas, data, status')
      .eq('obra_id', selectedObraId);

    if (registros) {
      const hojeRegs = registros.filter(r => r.data === hoje);
      setTrabalhadores(hojeRegs.reduce((s, r) => s + (r.trabalhadores || 0), 0));
      setRegistrosHoje(hojeRegs.length);
      setProblemasAbertos(registros.filter(r => r.problemas && r.status !== 'resolvida').length);
    }
    setKpiLoading(false);
  }, [selectedObraId]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const kpis: PageKPI[] = [
    { 
      id: 'trab', 
      label: 'Trabalhadores Hoje', 
      value: String(trabalhadores), 
      icon: <CheckCircle2 className="h-4 w-4" />,
      tint: '#EAF3DE', valueColor: '#3B6D11' 
    },
    { 
      id: 'reg', 
      label: 'Registros Hoje', 
      value: String(registrosHoje), 
      icon: <Clock className="h-4 w-4" />,
      tint: '#F3F2FD', valueColor: '#3C3489' 
    },
    { 
      id: 'prob', 
      label: 'Problemas em Aberto', 
      value: String(problemasAbertos), 
      icon: <AlertTriangle className="h-4 w-4" />,
      tint: problemasAbertos > 0 ? '#FCEBEB' : undefined, 
      valueColor: problemasAbertos > 0 ? '#A32D2D' : undefined 
    },
  ];

  if (!obra) {
    return (
      <PageShell title="Diário de Obra" icon={DiarioIcon}>
        <NoObraState title="Nenhuma obra selecionada" description="Selecione uma obra para acessar o diário." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Diário de Obra"
      subtitle={`Registros de campo da obra ${obra.nome}`}
      icon={DiarioIcon}
      kpis={kpiLoading ? [] : kpis}
    >
      <div className="h-full relative bg-background">
        <DiarioTab obraId={obra.id} onKpiChange={fetchKpis} />
      </div>
    </PageShell>
  );
}
