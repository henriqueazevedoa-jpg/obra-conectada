import { useState, useEffect, useMemo, useCallback } from 'react';

import { useOrcamento } from '@/contexts/OrcamentoContext';
import type { OrcamentoVersao } from '@/contexts/OrcamentoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { usePersistentPageState } from '@/hooks/usePersistentPageState';

import OrcamentoEditor from '@/components/orcamento/OrcamentoEditor';
import OrcamentoDashboard from '@/components/orcamento/OrcamentoDashboard';
import ExportarOrcamentoDialog from '@/components/orcamento/ExportarOrcamentoDialog';
import VersaoSeletor from '@/components/orcamento/VersaoSeletor';
import CotacaoCentral from '@/components/orcamento/CotacaoCentral';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import NoObraState from '@/components/obras/NoObraState';
import { supabase } from '@/integrations/supabase/untyped';
import PageShell from '@/components/layout/PageShell';
import type { PageTab, PageKPI } from '@/components/layout/PageShell';

// ── Tipos e utilitários ──────────────────────────────────────────────────────

type OrcamentoTab = 'overview' | 'wbs' | 'cotacao';

// ── Ícone da página ──────────────────────────────────────────────────────────

const OrcamentoIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#AFA9EC"/>
    <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700"
          fill="#26215C" fontFamily="sans-serif">%</text>
  </svg>
);

// ── Componente Principal ─────────────────────────────────────────────────────

export default function OrcamentoCentral() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();
  const { getOrcamento, getVersaoAtiva, getVersoes } = useOrcamento();

  const [activeTab, setActiveTab] = usePersistentPageState<OrcamentoTab>(
    'orcamento:tab', 'overview', selectedObraId
  );

  const editing = user?.role === 'gestor' || user?.role === 'admin';


  const [exportOpen, setExportOpen] = useState(false);
  const [cotacaoSearch, setCotacaoSearch] = useState('');

  // ── Toggle KPIs expandidos ───────────────────────────────────────────────────
  const [kpisExpanded, setKpisExpanded] = usePersistentPageState<boolean>(
    'orcamento:kpis_expanded', false, selectedObraId
  );

  const [versaoAtiva, setVersaoAtiva] = useState<OrcamentoVersao | null>(null);
  useEffect(() => {
    if (!selectedObraId) { setVersaoAtiva(null); return; }
    const v = getVersaoAtiva(selectedObraId);
    if (v) setVersaoAtiva(v); else setVersaoAtiva(null);
  }, [selectedObraId, getVersaoAtiva]);

  const obra = obras.find((o) => o.id === selectedObraId);

  // Badge da aba Cotação
  const orcamentoEtapas = useMemo(() =>
    obra ? (getOrcamento(obra.id)?.etapas ?? []) : [],
    [obra, getOrcamento]
  );

  const stats = useMemo(() => {
    let totalGeral = 0;
    let totalInsumos = 0;
    let insumosSemPreco = 0;
    
    // Categorias
    let totalMaterial = 0;
    let totalMaoObra = 0;
    let totalEquipamento = 0;
    let totalServico = 0;

    const classificarItem = (descricao: string): 'material' | 'mao_obra' | 'equipamento' | 'servico' | 'outros' => {
      const lower = descricao.toLowerCase();
      if (/pedreiro|servente|ajudante|operário|operario|oficial|encanador|eletricista|pintor|carpinteiro|armador|mestre|mao.de.obra|encargos.complementares/.test(lower))
        return 'mao_obra';
      if (/argamassa|concreto|areia|cimento|brita|bloco|tijolo|tinta|impermeabilizante|tubo|fio|cabo|vergalhao|aco|aço|madeira|chapa/.test(lower))
        return 'material';
      if (/betoneira|andaime|forma|escora|equipamento|locacao|aluguel/.test(lower))
        return 'equipamento';
      if (/servico|serviço|instalação|instalacao|montagem/.test(lower))
        return 'servico';
      return 'outros';
    };

    for (const etapa of orcamentoEtapas) {
      for (const comp of etapa.composicoes || []) {
        if (comp.usaInsumos && comp.insumos?.length) {
          for (const ins of comp.insumos) {
            totalInsumos++;
            const precoItem = ins.precoTotal || 0;
            totalGeral += precoItem;
            if (!ins.precoUnitario || ins.precoUnitario === 0) insumosSemPreco++;
            
            const tipo = ins.tipo_item || classificarItem(ins.descricao || '');
            if (tipo === 'material') totalMaterial += precoItem;
            else if (tipo === 'mao_obra') totalMaoObra += precoItem;
            else if (tipo === 'equipamento') totalEquipamento += precoItem;
            else totalServico += precoItem;
          }
        } else {
          totalInsumos++;
          const precoItem = comp.precoTotal || 0;
          totalGeral += precoItem;
          if (!comp.precoUnitario || comp.precoUnitario === 0) insumosSemPreco++;
          
          const tipo = comp.tipo_item || classificarItem(comp.descricao || '');
          if (tipo === 'material') totalMaterial += precoItem;
          else if (tipo === 'mao_obra') totalMaoObra += precoItem;
          else if (tipo === 'equipamento') totalEquipamento += precoItem;
          else totalServico += precoItem;
        }
      }
    }
    
    const cotadoPct = totalInsumos > 0
      ? Math.round(((totalInsumos - insumosSemPreco) / totalInsumos) * 100)
      : 100;

    return { totalGeral, totalInsumos, insumosSemPreco, cotadoPct, totalMaterial, totalMaoObra, totalEquipamento, totalServico };
  }, [orcamentoEtapas]);

  const itensSemPreco = stats.insumosSemPreco;

  const kpis = useMemo<PageKPI[]>(() => [
    {
      id: 'total',
      label: 'Total Previsto',
      value: stats.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      tint: 'rgba(83,74,183,0.08)',
      valueColor: '#534AB7',
      labelColor: '#7c75be',
    },
    {
      id: 'cotado',
      label: '% Cotado',
      value: `${stats.cotadoPct}%`,
      tint: stats.cotadoPct === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
      valueColor: stats.cotadoPct === 100 ? '#059669' : '#d97706',
      labelColor: stats.cotadoPct === 100 ? '#10b981' : '#f59e0b',
    },
    {
      id: 'sem_preco',
      label: 'Sem Preço',
      value: stats.insumosSemPreco.toString(),
      tint: stats.insumosSemPreco > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
      valueColor: stats.insumosSemPreco > 0 ? '#ef4444' : '#10b981',
      labelColor: stats.insumosSemPreco > 0 ? '#ef4444' : '#10b981',
    }
  ], [stats]);

  const kpisOverview = useMemo<PageKPI[]>(() => {
    let maiorPendencia: { nome: string; count: number } | null = null;
    if (stats.insumosSemPreco > 0) {
      for (const etapa of orcamentoEtapas) {
        let c = 0;
        for (const comp of etapa.composicoes || []) {
          if (comp.usaInsumos && comp.insumos?.length) {
            for (const ins of comp.insumos) { if (!ins.precoUnitario || ins.precoUnitario === 0) c++; }
          } else { if (!comp.precoUnitario || comp.precoUnitario === 0) c++; }
        }
        if (c > 0 && (!maiorPendencia || c > maiorPendencia.count)) maiorPendencia = { nome: etapa.nome || etapa.codigo || '?', count: c };
      }
    }

    const composicaoCusto = [
      { key: 'MAT', color: '#10b981', pct: stats.totalGeral > 0 ? Math.round((stats.totalMaterial / stats.totalGeral) * 100) : 0 },
      { key: 'MO',  color: '#3b82f6', pct: stats.totalGeral > 0 ? Math.round((stats.totalMaoObra / stats.totalGeral) * 100) : 0 },
      { key: 'EQU', color: '#f59e0b', pct: stats.totalGeral > 0 ? Math.round((stats.totalEquipamento / stats.totalGeral) * 100) : 0 },
      { key: 'SER', color: '#64748b', pct: stats.totalGeral > 0 ? Math.round((stats.totalServico / stats.totalGeral) * 100) : 0 },
    ].filter(d => d.pct > 0);

    const pct = stats.cotadoPct;
    const barColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
    const totalCotado = stats.totalGeral * (pct / 100);

    return [
      {
        id: 'total',
        label: 'Total do Orçamento',
        value: (
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-2xl font-bold leading-none tracking-tight">{stats.totalGeral >= 1_000_000 ? `R$ ${(stats.totalGeral/1_000_000).toFixed(2)}M` : stats.totalGeral >= 1_000 ? `R$ ${(stats.totalGeral/1_000).toFixed(1)}k` : `R$ ${stats.totalGeral.toFixed(0)}`}</span>
            {obra?.area_construida && obra.area_construida > 0 ? (
              <span className="text-[10px] opacity-70 tracking-normal font-medium">{(stats.totalGeral / obra.area_construida).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} / m²</span>
            ) : <span className="text-[10px] opacity-0">-</span>}
          </div>
        ),
        tint: 'rgba(83,74,183,0.08)',
        valueColor: '#534AB7',
        labelColor: '#7c75be',
      },
      {
        id: 'cotado',
        label: 'Cotado',
        value: (
          <div className="flex flex-col gap-1.5 w-32 mt-1">
            <div className="flex items-end gap-2 leading-none">
              <span className="text-2xl font-bold tracking-tight" style={{ color: barColor }}>{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
            </div>
            <span className="text-[10px] opacity-70 leading-none truncate font-medium tracking-normal" style={{ color: barColor }}>
              {totalCotado >= 1000 ? `R$ ${(totalCotado/1000).toFixed(1)}k` : `R$ ${totalCotado.toFixed(0)}`} de {stats.totalGeral >= 1000 ? `R$ ${(stats.totalGeral/1000).toFixed(1)}k` : `R$ ${stats.totalGeral.toFixed(0)}`}
            </span>
          </div>
        ),
        tint: pct === 100 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
        valueColor: pct === 100 ? '#059669' : '#d97706',
        labelColor: pct === 100 ? '#10b981' : '#f59e0b',
      },
      {
        id: 'sem_preco',
        label: 'Sem Preço',
        value: (
          <div className="flex flex-col gap-1 w-32 mt-1">
            <span className="text-2xl font-bold leading-none tracking-tight">
              {stats.insumosSemPreco === 0 ? '✓' : stats.insumosSemPreco}
            </span>
            {maiorPendencia ? (
              <span className="text-[10px] opacity-70 leading-tight truncate font-medium tracking-normal" title={maiorPendencia.nome}>
                Maior: {maiorPendencia.nome} ({maiorPendencia.count})
              </span>
            ) : (
              <span className="text-[10px] opacity-70 leading-tight font-medium tracking-normal">Todos cotados</span>
            )}
          </div>
        ),
        tint: stats.insumosSemPreco > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
        valueColor: stats.insumosSemPreco > 0 ? '#ef4444' : '#10b981',
        labelColor: stats.insumosSemPreco > 0 ? '#ef4444' : '#10b981',
      },
      {
        id: 'composicao',
        label: 'Composição',
        value: (
          <div className="flex flex-col gap-1 w-40 mt-1">
            {composicaoCusto.length > 0 ? composicaoCusto.map(d => (
              <div key={d.key} className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold opacity-70 w-6 tracking-normal">{d.key}</span>
                <div className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                </div>
                <span className="text-[9px] font-medium opacity-70 w-6 text-right tracking-normal">{d.pct}%</span>
              </div>
            )) : <span className="text-[10px] opacity-70 font-medium tracking-normal pt-1">Indisponível</span>}
          </div>
        ),
        tint: 'rgba(100,116,139,0.08)',
        valueColor: '#475569',
        labelColor: '#64748b',
      }
    ];
  }, [stats, orcamentoEtapas, obra]);

  // Abas — sem ícones para consistência com o Financeiro
  const tabs: PageTab[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'wbs',      label: 'Planilha' },
    { id: 'cotacao',  label: 'Cotação & Preços', badge: itensSemPreco > 0 ? itensSemPreco : undefined, badgeDanger: itensSemPreco > 0 },
  ];

  // Sem obra
  if (!obra) {
    return (
      <PageShell
        icon={OrcamentoIcon}
        title="Orçamento"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={id => setActiveTab(id as OrcamentoTab)}
      >
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <NoObraState
            title="Nenhuma obra selecionada"
            description="Selecione uma obra no seletor acima para acessar a Central de Orçamento"
          />
        </div>
      </PageShell>
    );
  }

  const temVersoes = getVersoes(obra.id).length > 0;

  return (
    <PageShell
      icon={OrcamentoIcon}
      title="Orçamento"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={id => setActiveTab(id as OrcamentoTab)}
      kpis={activeTab === 'overview' ? kpisOverview : kpis}
      actions={
        activeTab === 'overview' 
          ? [{ label: 'Exportar', onClick: () => setExportOpen(true), variant: 'ghost' }]
          : [
              { label: kpisExpanded ? 'Recolher Detalhes' : 'Detalhar Custos', onClick: () => setKpisExpanded(!kpisExpanded), variant: 'ghost' },
              { label: 'Exportar', onClick: () => setExportOpen(true), variant: 'ghost' }
            ]
      }
    >
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Faixa de versão — invisível na aba de visão geral ── */}
        {activeTab !== 'overview' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 20px',
            borderBottom: '1px solid hsl(var(--border))',
            background: 'hsl(var(--background))',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontWeight: 500 }}>
              Versão:
            </span>
            <VersaoSeletor
              obraId={obra.id}
              versaoAtiva={versaoAtiva}
              onVersaoChange={v => setVersaoAtiva(v)}
              readOnly={!editing}
            />
          </div>
        )}

        {kpisExpanded && (
          <div className="flex flex-col gap-2 px-5 py-3 border-b bg-muted/10 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Materiais</span>
                <span className="font-semibold">{stats.totalMaterial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Mão de Obra</span>
                <span className="font-semibold">{stats.totalMaoObra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Equipamentos</span>
                <span className="font-semibold">{stats.totalEquipamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-muted-foreground">Serviços/Outros</span>
                <span className="font-semibold">{stats.totalServico.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
            {stats.totalGeral > 0 && (
              <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
                <div style={{ width: `${(stats.totalMaterial / stats.totalGeral) * 100}%` }} className="bg-emerald-500 hover:opacity-80 transition-opacity" title={`Materiais: ${((stats.totalMaterial / stats.totalGeral) * 100).toFixed(1)}%`} />
                <div style={{ width: `${(stats.totalMaoObra / stats.totalGeral) * 100}%` }} className="bg-blue-500 hover:opacity-80 transition-opacity" title={`Mão de Obra: ${((stats.totalMaoObra / stats.totalGeral) * 100).toFixed(1)}%`} />
                <div style={{ width: `${(stats.totalEquipamento / stats.totalGeral) * 100}%` }} className="bg-amber-500 hover:opacity-80 transition-opacity" title={`Equipamentos: ${((stats.totalEquipamento / stats.totalGeral) * 100).toFixed(1)}%`} />
                <div style={{ width: `${(stats.totalServico / stats.totalGeral) * 100}%` }} className="bg-slate-500 hover:opacity-80 transition-opacity" title={`Serviços: ${((stats.totalServico / stats.totalGeral) * 100).toFixed(1)}%`} />
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'overview' && (
            <ErrorBoundary context="Visão Geral">
              <OrcamentoDashboard
                obra={obra}
                onEditWBS={() => setActiveTab('wbs')}
                onGoCotacao={() => {
                  setCotacaoSearch('');
                  setActiveTab('cotacao');
                }}
                onGoCotacaoClasseA={() => {
                  setCotacaoSearch('__classe_a__');
                  setActiveTab('cotacao');
                }}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'wbs' && (
            <ErrorBoundary context="Planilha Orçamentária">
              <OrcamentoEditor
                obraId={obra.id}
                obraNome={obra.nome}
                readOnly={!editing}
                onBack={() => setActiveTab('overview')}
                versaoAtiva={versaoAtiva}
                onVersaoChange={v => setVersaoAtiva(v)}
                onGoCotacao={(descricao) => {
                  setCotacaoSearch(descricao || '');
                  setActiveTab('cotacao');
                }}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'cotacao' && (
            <ErrorBoundary context="Cotação & Preços">
              <CotacaoCentral
                obra={obra}
                onBack={() => setActiveTab('wbs')}
                contexto="orcamento"
                initialSearch={cotacaoSearch}
                onClearInitialSearch={() => setCotacaoSearch('')}
              />
            </ErrorBoundary>
          )}
        </div>

      </div>

      {exportOpen && (
        <ExportarOrcamentoDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          obraNome={obra.nome}
          etapas={orcamentoEtapas}
        />
      )}
    </PageShell>
  );
}
