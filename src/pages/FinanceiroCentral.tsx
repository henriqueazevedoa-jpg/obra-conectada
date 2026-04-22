import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import NoObraState from '@/components/obras/NoObraState';
import PagamentosTab from '@/components/financeiro/PagamentosTab';
import CustoRealTab from '@/components/financeiro/CustoRealTab';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab';
import DRETab from '@/components/financeiro/DRETab';
import FinanceiroDashboard from '@/components/financeiro/FinanceiroDashboard';
import RecebiveisTab from '@/components/financeiro/RecebiveisTab';
import PageShell from '@/components/layout/PageShell';
import type { PageAction, PageKPI } from '@/components/layout/PageShell';
import { Receipt } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'pagamentos' | 'custo-real' | 'fluxo-caixa' | 'dre' | 'recebiveis';
const VALID_TABS: Tab[] = ['dashboard', 'pagamentos', 'custo-real', 'fluxo-caixa', 'dre', 'recebiveis'];

const TABS_CONFIG = [
  { id: 'dashboard'   as Tab, label: 'Dashboard' },
  { id: 'pagamentos'  as Tab, label: 'Pagamentos',     moduloPermissao: 'financeiro_pagamentos' },
  { id: 'custo-real'  as Tab, label: 'Custo real',     moduloPermissao: 'financeiro_custo_real' },
  { id: 'fluxo-caixa' as Tab, label: 'Fluxo de caixa', moduloPermissao: 'financeiro_fluxo_caixa' },
  { id: 'dre'         as Tab, label: 'DRE',            moduloPermissao: 'financeiro_dre' },
  { id: 'recebiveis'  as Tab, label: 'Recebíveis',     moduloPermissao: 'financeiro_recebiveis' },
];

const FinanceiroIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#AFA9EC"/>
    <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700"
          fill="#26215C" fontFamily="sans-serif">$</text>
  </svg>
);

// ─── Main ────────────────────────────────────────────────────────────────────

export default function FinanceiroCentral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'dashboard';
  const setTab = useCallback((tab: Tab) => setSearchParams({ tab }, { replace: true }), [setSearchParams]);

  const { hasModulePermission } = useAuth();
  
  const visibleTabs = useMemo(() => 
    TABS_CONFIG.filter(tab => tab.moduloPermissao ? hasModulePermission(tab.moduloPermissao) : true),
  [hasModulePermission]);



  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs, setTab]);

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // ── Lift-state-up: KPIs controlados pelo pai ────────────────────────────
  const [currentKpis, setCurrentKpis] = useState<PageKPI[]>([]);
  const handleKpisReady = useCallback((kpis: PageKPI[]) => setCurrentKpis(kpis), []);

  const handleNovoPagamento = () => {
    setSearchParams(prev => { prev.set('tab', 'pagamentos'); prev.set('novo', '1'); return prev; });
  };

  const handleRegistrarCusto = () => {
    setSearchParams(prev => { prev.set('tab', 'custo-real'); prev.set('registrar', '1'); return prev; });
  };

  const TOOLTIP_PAGAMENTO = 'Registra um compromisso financeiro: nota fiscal, boleto, parcela ou contrato com fornecedor';
  const TOOLTIP_CUSTO = 'Lança uma despesa real por etapa, sem vínculo obrigatório com fornecedor ou data futura';

  // ── Ações nos KPI cards (ao lado dos cards) ──────────────────────────────
  const kpiActions: PageAction[] = [
    ...(activeTab === 'dashboard' ? [{
      label: '+ Novo pagamento',
      variant: 'split' as const,
      onClick: handleNovoPagamento,
      tooltip: TOOLTIP_PAGAMENTO,
      splitItems: [
        { label: '+ Registrar custo', onClick: handleRegistrarCusto, labelRight: 'por etapa' },
      ],
    }] : []),
    ...(activeTab === 'pagamentos' ? [{
      label: '+ Novo pagamento',
      variant: 'primary' as const,
      onClick: handleNovoPagamento,
      tooltip: TOOLTIP_PAGAMENTO,
    }] : []),
    ...(activeTab === 'custo-real' ? [{
      label: '+ Registrar custo',
      variant: 'primary' as const,
      onClick: handleRegistrarCusto,
      tooltip: TOOLTIP_CUSTO,
    }] : []),
  ];

  // ── Ações desktop (header) ───────────────────────────────────────────────
  const headerActions: PageAction[] = [
    { label: 'Exportar', variant: 'ghost', onClick: () => {}, tooltip: 'Exportar relatório financeiro' },
  ];

  // ── Mensagens mobile adaptáveis ao Shell (opcional, como os FABs foram preteridos) ────────

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar o financeiro."
      />
    );
  }

  return (
    <>
      <PageShell
        icon={FinanceiroIcon}
        title="Financeiro"
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        actions={headerActions}
        kpiActions={kpiActions}
        kpis={currentKpis}
      >
        <div style={{ height: '100%', position: 'relative', background: 'var(--color-background-primary)' }}>
          <div style={{ height: '100%', display: activeTab === 'dashboard'   ? 'block' : 'none' }}>
            <FinanceiroDashboard obraId={obra.id} isActive={activeTab === 'dashboard'} onKpisReady={handleKpisReady} />
          </div>
          <div style={{ height: '100%', display: activeTab === 'pagamentos'  ? 'block' : 'none' }}>
            <PagamentosTab  obraId={obra.id} isActive={activeTab === 'pagamentos'}  onKpisReady={handleKpisReady} />
          </div>
          <div style={{ height: '100%', display: activeTab === 'custo-real'  ? 'block' : 'none' }}>
            <CustoRealTab   obraId={obra.id} isActive={activeTab === 'custo-real'}  onKpisReady={handleKpisReady} />
          </div>
          <div style={{ height: '100%', display: activeTab === 'fluxo-caixa' ? 'block' : 'none' }}>
            <FluxoCaixaTab  obraId={obra.id} isActive={activeTab === 'fluxo-caixa'} onKpisReady={handleKpisReady} />
          </div>
          <div style={{ height: '100%', display: activeTab === 'dre'         ? 'block' : 'none' }}>
            <DRETab         obraId={obra.id} isActive={activeTab === 'dre'}         onKpisReady={handleKpisReady} />
          </div>
          <div style={{ height: '100%', display: activeTab === 'recebiveis'  ? 'block' : 'none' }}>
            <RecebiveisTab  obraId={obra.id} isActive={activeTab === 'recebiveis'}  onKpisReady={handleKpisReady} />
          </div>
        </div>
      </PageShell>
    </>
  );
}
