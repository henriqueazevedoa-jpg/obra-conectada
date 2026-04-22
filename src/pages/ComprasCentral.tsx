import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import NoObraState from '@/components/obras/NoObraState';
import PageShell from '@/components/layout/PageShell';
import type { PageKPI } from '@/components/layout/PageShell';
import ListaCompraTab from '@/components/compras/ListaCompraTab';
import PedidosTab from '@/components/execucao/PedidosTab';
import RecebimentosTab from '@/components/execucao/RecebimentosTab';
import { ShoppingCart, PackagePlus, ClipboardList, Tags } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import CotacaoCentral from '@/components/orcamento/CotacaoCentral';
import { AlertCircle } from 'lucide-react';
import ChecagemSemanalDrawer from '@/components/compras/ChecagemSemanalDrawer';
import { getProximaSemanaRange } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'lista' | 'cotacao' | 'pedidos' | 'recebimentos';
const VALID_TABS: Tab[] = ['lista', 'cotacao', 'pedidos', 'recebimentos'];

const TABS_CONFIG = [
  { id: 'lista'        as Tab, label: 'Lista de compra', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'cotacao'      as Tab, label: 'Cotações',      icon: <Tags className="h-3.5 w-3.5" /> },
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

  const [kpiLoading, setKpiLoading] = useState(true);
  const [pedidosAbertos, setPedidosAbertos] = useState(0);
  const [recebimentosPendentes, setRecebimentosPendentes] = useState(0);
  const [materiaisCriticos, setMateriaisCriticos] = useState(0);
  const [cotacaoSearch, setCotacaoSearch] = useState('');
  const [cotacaoKpis, setCotacaoKpis] = useState<PageKPI[]>([]);

  // Estado para checagem semanal
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [needsSemanalCheck, setNeedsSemanalCheck] = useState(false);

  const checkSemanalStatus = useCallback(async () => {
    if (!obra) return;
    const isFriday = new Date().getDay() === 5;
    if (!isFriday) {
      setNeedsSemanalCheck(false);
      return;
    }

    const { inicio } = getProximaSemanaRange();
    const strInicio = format(inicio, 'yyyy-MM-dd');

    const { data } = await (supabase as any).from('checagem_material')
      .select('id')
      .eq('obra_id', obra.id)
      .eq('semana_inicio', strInicio)
      .limit(1);

    if (!data || data.length === 0) {
      setNeedsSemanalCheck(true);
    } else {
      setNeedsSemanalCheck(false);
    }
  }, [obra?.id]);

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
  }, [obra?.id, getMateriaisByObra]);

  useEffect(() => { 
    fetchKpi(); 
    checkSemanalStatus();
  }, [fetchKpi, checkSemanalStatus]);

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
  const comprasKpis: PageKPI[] = kpiLoading ? [] : [
    { id: 'pedidos', label: 'Pedidos ativos',         value: String(pedidosAbertos),      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7' },
    { id: 'rec',     label: 'Recebimentos pendentes', value: String(recebimentosPendentes), tint: recebimentosPendentes > 0 ? '#FCEBEB' : undefined, valueColor: recebimentosPendentes > 0 ? '#A32D2D' : undefined },
    { id: 'mats',    label: 'Mat. críticos',          value: String(materiaisCriticos),   tint: materiaisCriticos > 0 ? '#FFF7ED' : undefined, valueColor: materiaisCriticos > 0 ? '#C2410C' : undefined },
  ];

  const currentKpis = activeTab === 'cotacao' ? cotacaoKpis : comprasKpis;

  return (
    <>
      <PageShell
        icon={ComprasIcon}
        title="Compras"
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        kpis={currentKpis}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-background-primary)' }}>
          
          {needsSemanalCheck && (
            <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-1.5 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Planejamento da próxima semana</p>
                  <p className="text-xs text-amber-700">Verifique os materiais necessários para as tarefas da semana que vem.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white hover:bg-amber-50 text-amber-900 border-amber-200" onClick={() => setDrawerOpen(true)}>
                Fazer checagem
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            <div style={{ height: '100%', display: activeTab === 'lista' ? 'block' : 'none' }}>
              <ListaCompraTab
                obraId={obra.id}
                companyId={company?.id ?? ''}
                isActive={activeTab === 'lista'}
                onKpiChange={fetchKpi}
                onIrParaCotacao={(listaNome) => {
                  setCotacaoSearch(listaNome || '');
                  setTab('cotacao');
                }}
              />
            </div>

            <div style={{ height: '100%', display: activeTab === 'cotacao' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
              {activeTab === 'cotacao' && (
                <CotacaoCentral
                  obra={obra}
                  onBack={() => setTab('lista')}
                  contexto="compra"
                  initialSearch={cotacaoSearch}
                  onClearInitialSearch={() => setCotacaoSearch('')}
                  onKpisChange={setCotacaoKpis}
                />
              )}
            </div>

            <div style={{ height: '100%', display: activeTab === 'pedidos' ? 'block' : 'none' }}>
              <PedidosTab 
                obraId={obra.id} 
                isActive={activeTab === 'pedidos'} 
                onKpiChange={fetchKpi}
              />
            </div>

            <div style={{ height: '100%', display: activeTab === 'recebimentos' ? 'block' : 'none' }}>
              <RecebimentosTab obraId={obra.id} isActive={activeTab === 'recebimentos'} onCountChange={setRecebimentosPendentes} />
            </div>
          </div>

          <ChecagemSemanalDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            obraId={obra.id}
            onConcluida={() => {
              checkSemanalStatus();
              // Se tivermos na lista, forçar update para mostrar a nova lista!
              // Como ListaCompraTab.tsx usa isActive para data fetching, o setActive('lista') no próximo useEffect deve cobrir, ou onKpiChange().
              fetchKpi();
            }}
          />

        </div>
      </PageShell>
    </>
  );
}
