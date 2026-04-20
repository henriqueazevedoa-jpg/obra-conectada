import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useObras } from '@/contexts/ObrasContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import NoObraState from '@/components/obras/NoObraState';
import PageShell from '@/components/layout/PageShell';
import { PageFAB } from '@/components/ui/page-fab';
import type { PageKPI } from '@/components/layout/PageShell';
import DiarioTab from '@/components/execucao/DiarioTab';
import EstoqueQuickView from '@/components/execucao/EstoqueQuickView';
import EquipeTab from '@/components/execucao/EquipeTab';
import PedidosTab from '@/components/execucao/PedidosTab';
import RecebimentosTab from '@/components/execucao/RecebimentosTab';
import {
  BookOpen, Package, Users, ShoppingCart, PackagePlus, Hammer,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'diario' | 'estoque' | 'equipe' | 'pedidos' | 'recebimentos';
const VALID_TABS: Tab[] = ['diario', 'estoque', 'equipe', 'pedidos', 'recebimentos'];

const TABS_CONFIG = [
  { id: 'diario'        as Tab, label: 'Diário',        icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'estoque'       as Tab, label: 'Estoque',       icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'equipe'        as Tab, label: 'Equipe',        icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'pedidos'       as Tab, label: 'Pedidos',       icon: <ShoppingCart className="h-3.5 w-3.5" /> },
  { id: 'recebimentos'  as Tab, label: 'Recebimentos',  icon: <PackagePlus className="h-3.5 w-3.5" /> },
];

// ── Icon ──────────────────────────────────────────────────────────────────────

const ExecucaoIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="14" height="10" rx="2" fill="#AFA9EC" />
    <path d="M5 1 L8 4 L11 1" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="4" y="7" width="3" height="3" rx="0.5" fill="#534AB7" opacity="0.7" />
    <rect x="9" y="7" width="3" height="3" rx="0.5" fill="#534AB7" opacity="0.4" />
  </svg>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExecucaoCentral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { getMateriaisByObra } = useEstoque();

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Tab via URL (padrão PageShell)
  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'diario';
  const setTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  // KPI state
  const [kpiLoading, setKpiLoading] = useState(true);
  const [trabalhadores, setTrabalhadores] = useState(0);
  const [registrosHoje, setRegistrosHoje] = useState(0);
  const [problemasAbertos, setProblemasAbertos] = useState(0);
  const [pendenciasAbertas, setPendenciasAbertas] = useState(0);
  const [materiaisCriticos, setMateriaisCriticos] = useState(0);
  const [recebimentosPendentes, setRecebimentosPendentes] = useState(0);
  const [pedidosAbertos, setPedidosAbertos] = useState(0);

  const fetchKpi = useCallback(async () => {
    if (!obra) return;
    setKpiLoading(true);

    const hoje = format(new Date(), 'yyyy-MM-dd');

    const [{ data: registros }, { data: pendencias }, { data: recebimentos }, { data: pedidos }] = await Promise.all([
      (supabase as any).from('diario_registros').select('id, data, trabalhadores, problemas').eq('obra_id', obra.id),
      (supabase as any).from('obra_agenda').select('id').eq('obra_id', obra.id).eq('tipo', 'pendencia').not('status', 'in', '("concluido","cancelado")'),
      (supabase as any).from('material_recebimentos').select('id').eq('obra_id', obra.id).eq('status', 'pendente'),
      (supabase as any).from('material_pedidos').select('id').eq('obra_id', obra.id).not('status', 'in', '("recebido","cancelado")'),
    ]);

    const hoje_reg = (registros || []).filter((r: any) => r.data === hoje);
    setTrabalhadores(hoje_reg.reduce((s: number, r: any) => s + (r.trabalhadores || 0), 0));
    setRegistrosHoje(hoje_reg.length);
    setProblemasAbertos((registros || []).filter((r: any) => r.problemas && r.status !== 'resolvida').length);
    setPendenciasAbertas((pendencias || []).length);
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
        description="Selecione uma obra para acessar o canteiro de execução."
      />
    );
  }

  // ── Tabs com badges ───────────────────────────────────────────────────────

  const tabsWithBadges = TABS_CONFIG.map(t => ({
    ...t,
    badge: t.id === 'recebimentos' && recebimentosPendentes > 0 ? recebimentosPendentes : undefined,
    badgeDanger: t.id === 'recebimentos' && recebimentosPendentes > 0,
  }));

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis: PageKPI[] = kpiLoading ? [] : [
    { id: 'trab',     label: 'Trabalhadores',   value: String(trabalhadores),       tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7' },
    { id: 'reg',      label: 'Registros hoje',  value: String(registrosHoje),       tint: '#EAF3DE', valueColor: '#3B6D11' },
    { id: 'prob',     label: 'Problemas',       value: String(problemasAbertos),    tint: problemasAbertos > 0 ? '#FCEBEB' : undefined, valueColor: problemasAbertos > 0 ? '#A32D2D' : undefined },
    { id: 'pend',     label: 'Pendências',      value: String(pendenciasAbertas),   tint: pendenciasAbertas > 0 ? '#FFFBEB' : undefined, valueColor: pendenciasAbertas > 0 ? '#92400E' : undefined },
    { id: 'pedidos',  label: 'Pedidos ativos',  value: String(pedidosAbertos),      tint: '#F3F2FD', valueColor: '#3C3489', labelColor: '#534AB7' },
    { id: 'mats',     label: 'Mat. críticos',   value: String(materiaisCriticos),   tint: materiaisCriticos > 0 ? '#FFF7ED' : undefined, valueColor: materiaisCriticos > 0 ? '#C2410C' : undefined },
  ];

  return (
    <>
      <PageShell
        icon={ExecucaoIcon}
        title="Execução & Canteiro"
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={id => setTab(id as Tab)}
        kpis={kpis}
      >
        <div style={{ height: '100%', position: 'relative', background: 'var(--color-background-primary)' }}>

          <div style={{ height: '100%', display: activeTab === 'diario' ? 'block' : 'none' }}>
            <DiarioTab obraId={obra.id} onKpiChange={fetchKpi} />
          </div>

          <div style={{ height: '100%', display: activeTab === 'estoque' ? 'block' : 'none' }}>
            <EstoqueQuickView obraId={obra.id} />
          </div>

          <div style={{ height: '100%', display: activeTab === 'equipe' ? 'block' : 'none' }}>
            <EquipeTab obraId={obra.id} />
          </div>

          <div style={{ height: '100%', display: activeTab === 'pedidos' ? 'block' : 'none' }}>
            <PedidosTab obraId={obra.id} isActive={activeTab === 'pedidos'} onKpiChange={fetchKpi} />
          </div>

          <div style={{ height: '100%', display: activeTab === 'recebimentos' ? 'block' : 'none' }}>
            <RecebimentosTab obraId={obra.id} isActive={activeTab === 'recebimentos'} onCountChange={setRecebimentosPendentes} />
          </div>

        </div>
      </PageShell>

      {/* FAB mobile contextual */}
      {activeTab === 'diario' && (
        <PageFAB label="+ Novo Registro" onClick={() => {
          setSearchParams({ tab: 'diario', novo: '1' });
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
