import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI } from '@/components/layout/PageShell';
import EquipeTab from '@/components/execucao/EquipeTab';
import { Users, UserCheck, UserMinus, ShieldAlert } from 'lucide-react';
import NoObraState from '@/components/obras/NoObraState';

const EquipeIcon = (
  <Users className="h-4 w-4" />
);

export default function EquipePage() {
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId);
  
  const [kpiLoading, setKpiLoading] = useState(false);
  const [totalEquipe, setTotalEquipe] = useState(0);
  const [terceirizados, setTerceirizados] = useState(0);
  const [epiVencendo, setEpiVencendo] = useState(0);

  const fetchKpis = useCallback(async () => {
    if (!selectedObraId) return;
    setKpiLoading(true);

    const { data: equipe } = await supabase
      .from('equipe_colaboradores')
      .select('status, funcao')
      .eq('obra_id', selectedObraId);

    if (equipe) {
      setTotalEquipe(equipe.length);
      setTerceirizados(equipe.filter(e => e.status === 'ativo').length); // Or adjust based on your logic
      
      const hoje = new Date();
      const em15dias = new Date();
      em15dias.setDate(hoje.getDate() + 15);
      
      setEpiVencendo(equipe.filter(e => {
        if (!e.validade_epi) return false;
        const d = new Date(e.validade_epi);
        return d <= em15dias;
      }).length);
    }
    setKpiLoading(false);
  }, [selectedObraId]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const kpis: PageKPI[] = [
    { 
      id: 'total', 
      label: 'Mão de Obra Total', 
      value: String(totalEquipe), 
      icon: <UserCheck className="h-4 w-4" />,
      tint: '#F3F2FD', valueColor: '#3C3489' 
    },
    { 
      id: 'terc', 
      label: 'Terceirizados', 
      value: String(terceirizados), 
      icon: <UserMinus className="h-4 w-4" />,
      tint: '#FAF5FF', valueColor: '#6B21A8' 
    },
    { 
      id: 'epi', 
      label: 'EPIs Vencendo', 
      value: String(epiVencendo), 
      icon: <ShieldAlert className="h-4 w-4" />,
      tint: epiVencendo > 0 ? '#FCEBEB' : undefined, 
      valueColor: epiVencendo > 0 ? '#A32D2D' : undefined 
    },
  ];

  if (!obra) {
    return (
      <PageShell title="Gestão de Equipe" icon={EquipeIcon}>
        <NoObraState title="Nenhuma obra selecionada" description="Selecione uma obra para gerenciar a equipe." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Gestão de Equipe"
      subtitle={`Controle de pessoal e EPIs da obra ${obra.nome}`}
      icon={EquipeIcon}
      kpis={kpiLoading ? [] : kpis}
    >
      <div className="h-full relative bg-background">
        <EquipeTab obraId={obra.id} />
      </div>
    </PageShell>
  );
}
