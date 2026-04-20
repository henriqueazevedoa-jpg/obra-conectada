import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import NoObraState from '@/components/obras/NoObraState';
import PagamentosTab from '@/components/financeiro/PagamentosTab';
import CustoRealTab from '@/components/financeiro/CustoRealTab';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab';
import DRETab from '@/components/financeiro/DRETab';
import FinanceiroDashboard from '@/components/financeiro/FinanceiroDashboard';
import PageShell from '@/components/layout/PageShell';
import { PageFAB } from '@/components/ui/page-fab';
import type { PageAction, PageKPI } from '@/components/layout/PageShell';
import { Receipt } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'pagamentos' | 'custo-real' | 'fluxo-caixa' | 'dre';
const VALID_TABS: Tab[] = ['dashboard', 'pagamentos', 'custo-real', 'fluxo-caixa', 'dre'];

const TABS_CONFIG = [
  { id: 'dashboard'   as Tab, label: 'Dashboard'      },
  { id: 'pagamentos'  as Tab, label: 'Pagamentos'     },
  { id: 'custo-real'  as Tab, label: 'Custo real'     },
  { id: 'fluxo-caixa' as Tab, label: 'Fluxo de caixa' },
  { id: 'dre'         as Tab, label: 'DRE'            },
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
  const setTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

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

  // ── FAB mobile — por aba ─────────────────────────────────────────────────
  const mobileFAB = (() => {
    if (activeTab === 'dashboard') {
      return (
        <PageFAB
          label="+ Novo pagamento"
          onClick={handleNovoPagamento}
          items={[{
            label: '+ Registrar custo',
            description: 'Despesa direta por etapa',
            onClick: handleRegistrarCusto,
            icon: <Receipt style={{ width: 14, height: 14, color: '#534AB7' }} />,
          }]}
        />
      );
    }
    if (activeTab === 'pagamentos') {
      return (
        <PageFAB
          label="+ Novo pagamento"
          onClick={handleNovoPagamento}
        />
      );
    }
    if (activeTab === 'custo-real') {
      return (
        <PageFAB
          label="+ Registrar custo"
          onClick={handleRegistrarCusto}
          icon={<Receipt style={{ width: 20, height: 20 }} />}
        />
      );
    }
    return null;
  })();

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
        tabs={TABS_CONFIG}
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
        </div>
      </PageShell>

      {/* FAB mobile — renderizado fora do PageShell para posicionamento fixed correto */}
      {mobileFAB}
    </>
  );
}
