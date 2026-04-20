import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import NoObraState from '@/components/obras/NoObraState';
import PageShell from '@/components/layout/PageShell';
import { PageFAB } from '@/components/ui/page-fab';
import type { PageKPI } from '@/components/layout/PageShell';
import ListaCompraTab from '@/components/compras/ListaCompraTab';
import PedidosTab from '@/components/execucao/PedidosTab';
import RecebimentosTab from '@/components/execucao/RecebimentosTab';
import { ShoppingCart, PackagePlus, ClipboardList } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'lista' | 'pedidos' | 'recebimentos';
const VALID_TABS: Tab[] = ['lista', 'pedidos', 'recebimentos'];

const TABS_CONFIG = [
  { id: 'lista'        as Tab, label: 'Lista de compra', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'pedidos'      as Tab, label: 'Pedidos',      icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  { id: 'recebimentos' as Tab, label: 'Recebimentos', icon: <PackagePlus className="h-3.5 w-3.5" /> },
];

// ── Icon ───────────────────────────────────────────────────────────────────────

const ComprasIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="14" r="1.2" fill="#534AB7" />
    <circle cx="12" cy="14" r="1.2" fill="#534AB7" />
    <path d="M1 1.5h1.8l2.2 7.5h6.5l1.5-5H4.5" stroke="#AFA9EC" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ComprasCentral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { getMateriaisByObra } = useEstoque();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Tab via URL (padrão PageShell)
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'lista';
  const setTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  const { company } = useCompany();

  // Estado para gerar pedido a partir da lista
  const [pedidoInicial, setPedidoInicial] = useState<{
    itens: any[];
    fornecedor?: string;
    lista_compra_id?: string;
  } | null>(null);

  const handlePedidoCriado = (pedidoId: string) => {
    setPedidoInicial(null);
    setTab('pedidos');
  };

  // KPI state
  const [kpiLoading, setKpiLoading] = useState(true);
  const [pedidosAbertos, setPedidosAbertos] = useState(0);
  const [recebimentosPendentes, setRecebimentosPendentes] = useState(0);
  const [materiaisCriticos, setMateriaisCriticos] = useState(0);

  const fetchKpi = useCallback(async () => {
    if (!obra) return;
    setKpiLoading(true);

    const [{ data: recebimentos }, { data: pedidos }] = await Promise.all([
      (supabase as any).from('material_recebimentos').select('id').eq('obra_id', obra.id).eq('status', 'pendente'),
      (supabase as any).from('material_pedidos').select('id').eq('obra_id', obra.id).not('status', 'in', '("recebido","cancelado")'),
    ]);

    setRecebimentosPendentes((recebimentos || []).length);
    setPedidosAbertos((pedidos || []).length);

    const materiais = obra ? getMateriaisByObra(obra.id) : [];
    setMateriaisCriticos(materiais.filter(m => (m.quantidadeAtual || 0) <= (m.estoqueMinimo || 0)).length);

    setKpiLoading(false);
  }, [obra?.id]);

  useEffect(() => { fetchKpi(); }, [fetchKpi]);

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar o módulo de compras."
      />
    );
  }

  // ── Tabs com badges ──────────────────────────────────────────────────────
  const tabsWithBadges = TABS_CONFIG.map(t => ({
    ...t,
    badge: t.id === 'recebimentos' && recebimentosPendentes > 0 ? recebimentosPendentes : undefined,
    badgeDanger: t.id === 'recebimentos' && recebimentosPendentes > 0,
  }));

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis: PageKPI[] = kpiLoading ? [] : [
    { id: 'pedidos', label: 'Pedidos ativos',         value: String(pedidosAbertos),      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7' },
    { id: 'rec',     label: 'Recebimentos pendentes', value: String(recebimentosPendentes), tint: recebimentosPendentes > 0 ? '#FCEBEB' : undefined, valueColor: recebimentosPendentes > 0 ? '#A32D2D' : undefined },
    { id: 'mats',    label: 'Mat. críticos',          value: String(materiaisCriticos),   tint: materiaisCriticos > 0 ? '#FFF7ED' : undefined, valueColor: materiaisCriticos > 0 ? '#C2410C' : undefined },
  ];

  return (
    <>
      <PageShell
        icon={ComprasIcon}
        title="Compras"
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        kpis={kpis}
      >
        <div style={{ height: '100%', position: 'relative', background: 'var(--color-background-primary)' }}>

          <div style={{ height: '100%', display: activeTab === 'lista' ? 'block' : 'none' }}>
            <ListaCompraTab
              obraId={obra.id}
              companyId={company?.id ?? ''}
              isActive={activeTab === 'lista'}
              onKpiChange={fetchKpi}
              onGerarPedido={(inicial) => {
                setPedidoInicial(inicial);
                setTab('pedidos');
              }}
            />
          </div>

          <div style={{ height: '100%', display: activeTab === 'pedidos' ? 'block' : 'none' }}>
            <PedidosTab 
              obraId={obra.id} 
              isActive={activeTab === 'pedidos'} 
              onKpiChange={fetchKpi}
              pedidoInicial={pedidoInicial}
              onPedidoCriado={handlePedidoCriado}
            />
          </div>

          <div style={{ height: '100%', display: activeTab === 'recebimentos' ? 'block' : 'none' }}>
            <RecebimentosTab obraId={obra.id} isActive={activeTab === 'recebimentos'} onCountChange={setRecebimentosPendentes} />
          </div>

        </div>
      </PageShell>

      {/* FAB mobile contextual */}
      {activeTab === 'lista' && (
        <PageFAB label="+ Nova Lista" onClick={() => {
          setSearchParams({ tab: 'lista', novo: '1' });
        }} />
      )}
      {activeTab === 'pedidos' && (
        <PageFAB label="+ Novo Pedido" onClick={() => {
          setSearchParams({ tab: 'pedidos', novo: '1' });
        }} />
      )}
      {activeTab === 'recebimentos' && (
        <PageFAB label="+ Registrar Recebimento" onClick={() => {
          setSearchParams({ tab: 'recebimentos', novo: '1' });
        }} />
      )}
    </>
  );
}
