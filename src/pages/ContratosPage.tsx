import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useAuth } from '@/contexts/AuthContext';
import NoObraState from '@/components/obras/NoObraState';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI } from '@/components/layout/PageShell';
import { FileText, ShieldAlert } from 'lucide-react';
import ContratosListTab from '@/components/contratos/ContratosListTab';

type Tab = 'clientes' | 'empreiteiros';
const VALID_TABS: Tab[] = ['clientes', 'empreiteiros'];

const TABS_CONFIG = [
  { id: 'clientes'     as Tab, label: 'Clientes' },
  { id: 'empreiteiros' as Tab, label: 'Empreiteiros' },
];

const ContratosIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="2" width="10" height="12" rx="2" fill="#E6F1FB" stroke="#534AB7" strokeWidth="1.5"/>
    <path d="M5 5h6M5 8h6M5 11h4" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function ContratosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { hasModulePermission } = useAuth();
  
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'clientes';
  const setTab = useCallback((tab: Tab) => setSearchParams({ tab }, { replace: true }), [setSearchParams]);

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  const [currentKpis, setCurrentKpis] = useState<PageKPI[]>([]);
  const handleKpisReady = useCallback((kpis: PageKPI[]) => setCurrentKpis(kpis), []);

  const hasAccess = hasModulePermission('contratos');

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-64px)] w-full">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Você não possui permissão para acessar o módulo de contratos. Solicite liberação ao gestor.
        </p>
      </div>
    );
  }

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para gerenciar contratos e medições."
      />
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <PageShell
        icon={ContratosIcon}
        title="Contratos"
        tabs={TABS_CONFIG}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        kpis={currentKpis}
      >
        <div style={{ display: activeTab === 'clientes' ? 'block' : 'none', height: '100%' }}>
          <ContratosListTab
            obraId={obra.id}
            tipo="cliente"
            isActive={activeTab === 'clientes'}
            onKpisReady={handleKpisReady}
          />
        </div>

        <div style={{ display: activeTab === 'empreiteiros' ? 'block' : 'none', height: '100%' }}>
          <ContratosListTab
            obraId={obra.id}
            tipo="empreiteiro"
            isActive={activeTab === 'empreiteiros'}
            onKpisReady={handleKpisReady}
          />
        </div>
      </PageShell>
    </div>
  );
}
