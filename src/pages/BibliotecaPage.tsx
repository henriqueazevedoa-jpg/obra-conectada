import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI, PageAction } from '@/components/layout/PageShell';
import { BookOpen } from 'lucide-react';
import ComposicoesTab from '@/components/biblioteca/ComposicoesTab';
import BancoPrecosTab from '@/components/biblioteca/BancoPrecosTab';
import ImportarExcelModal from '@/components/biblioteca/ImportarExcelModal';

type Tab = 'composicoes' | 'banco-precos';
const VALID_TABS: Tab[] = ['composicoes', 'banco-precos'];

const TABS_CONFIG = [
  { id: 'composicoes' as Tab, label: 'Composições' },
  { id: 'banco-precos' as Tab, label: 'Banco de Preços' },
];

const BibliotecaIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#AFA9EC"/>
    <path d="M4.5 5.5v5A1.5 1.5 0 006 12h4a1.5 1.5 0 001.5-1.5v-5A1.5 1.5 0 0010 4H6A1.5 1.5 0 004.5 5.5z" fill="#26215C" />
  </svg>
);

export default function BibliotecaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'composicoes';
  
  const setTab = useCallback((tab: Tab) => setSearchParams({ tab }, { replace: true }), [setSearchParams]);

  // Lift-state-up: KPIs controlled by children
  const [composicaoKpis, setComposicaoKpis] = useState<PageKPI[]>([]);
  const [bancoKpis, setBancoKpis] = useState<PageKPI[]>([]);

  // We combine the KPIs to show them all at the top regardless of the tab, 
  // or show only the relevant ones based on design. The plan says to unify them.
  const currentKpis = [...composicaoKpis, ...bancoKpis];

  const handleComposicaoKpisReady = useCallback((kpis: PageKPI[]) => setComposicaoKpis(kpis), []);
  const handleBancoKpisReady = useCallback((kpis: PageKPI[]) => setBancoKpis(kpis), []);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'paste' | 'upload'>('upload');

  // Used to trigger reload in ComposicoesTab
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const headerActions: PageAction[] = [
    { 
      label: 'Upload Excel', 
      variant: 'split', 
      onClick: () => { setImportMode('upload'); setImportModalOpen(true); },
      splitItems: [
        { label: 'Colar do Excel', onClick: () => { setImportMode('paste'); setImportModalOpen(true); } }
      ]
    },
  ];

  return (
    <>
      <PageShell
        icon={BibliotecaIcon}
        title="Biblioteca"
        tabs={TABS_CONFIG}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        actions={headerActions}
        kpis={currentKpis}
      >
        <div className="h-full relative bg-background">
          <ComposicoesTab 
            isActive={activeTab === 'composicoes'} 
            onKpisReady={handleComposicaoKpisReady} 
            refreshTrigger={refreshTrigger}
          />
          <BancoPrecosTab 
            isActive={activeTab === 'banco-precos'} 
            onKpisReady={handleBancoKpisReady} 
          />
        </div>
      </PageShell>
      
      <ImportarExcelModal 
        open={importModalOpen} 
        onOpenChange={setImportModalOpen} 
        mode={importMode} 
        onSuccess={() => setRefreshTrigger(prev => prev + 1)} 
      />
    </>
  );
}
