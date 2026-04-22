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

type SinapiRegime = 'SEM_DESONERACAO' | 'COM_DESONERACAO' | 'SEM_ENCARGOS';
interface SinapiConfig { uf: string; competencia: string; regime: SinapiRegime; }

const SINAPI_CONFIG_KEY = 'obraconectada:sinapi_config';
function loadSinapiConfig(): SinapiConfig {
  try {
    const r = localStorage.getItem(SINAPI_CONFIG_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed.regime === 'normal') parsed.regime = 'SEM_DESONERACAO';
      if (parsed.regime === 'desonerado') parsed.regime = 'COM_DESONERACAO';
      return parsed;
    }
  } catch { /* ignore */ }
  return { uf: 'SP', competencia: '2026-02', regime: 'SEM_DESONERACAO' };
}
function saveSinapiConfig(cfg: SinapiConfig) {
  localStorage.setItem(SINAPI_CONFIG_KEY, JSON.stringify(cfg));
}

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

  // ── KPIs elevados do Dashboard para o PageShell ──────────────────────────
  const [kpis, setKpis] = useState<PageKPI[]>([]);
  const handleKpisReady = useCallback((next: PageKPI[]) => setKpis(next), []);

  // ── Versão ativa — lifted aqui para ser compartilhada entre as duas abas ──
  const [versaoAtiva, setVersaoAtiva] = useState<OrcamentoVersao | null>(null);
  useEffect(() => {
    if (!selectedObraId) { setVersaoAtiva(null); return; }
    const v = getVersaoAtiva(selectedObraId);
    if (v) setVersaoAtiva(v); else setVersaoAtiva(null);
  }, [selectedObraId, getVersaoAtiva]);

  // SINAPI config — mantida aqui para passar ao OrcamentoEditor
  const [sinapiConfig, setSinapiConfig] = useState<SinapiConfig>(loadSinapiConfig);
  const [sinapiReferencias, setSinapiReferencias] = useState<{ id: string; competencia: string; arquivo_nome: string }[]>([]);

  useEffect(() => {
    type SinapiRefRow = { id: string; competencia: string; arquivo_nome: string };
    supabase
      .from('sinapi_referencias')
      .select('id, competencia, arquivo_nome')
      .order('competencia', { ascending: false })
      .then(({ data }: { data: SinapiRefRow[] | null }) => {
        if (data && data.length > 0) {
          setSinapiReferencias(data);
          setSinapiConfig(prev => {
            const existe = data.some((r: SinapiRefRow) => r.competencia === prev.competencia);
            if (!existe) {
              const next = { ...prev, competencia: data[0].competencia };
              saveSinapiConfig(next);
              return next;
            }
            return prev;
          });
        }
      });
  }, []);

  const updateSinapiConfig = (partial: Partial<SinapiConfig>) => {
    const next = { ...sinapiConfig, ...partial };
    setSinapiConfig(next);
    saveSinapiConfig(next);
  };

  const obra = obras.find((o) => o.id === selectedObraId);

  // Badge da aba Cotação
  const orcamentoEtapas = useMemo(() =>
    obra ? (getOrcamento(obra.id)?.etapas ?? []) : [],
    [obra, getOrcamento]
  );

  const itensSemPreco = useMemo(() => {
    let count = 0;
    for (const etapa of orcamentoEtapas) {
      for (const comp of etapa.composicoes || []) {
        if (comp.usaInsumos && comp.insumos?.length) {
          count += comp.insumos.filter(ins => !ins.precoUnitario || ins.precoUnitario === 0).length;
        } else {
          if (!comp.precoUnitario || comp.precoUnitario === 0) count++;
        }
      }
    }
    return count;
  }, [orcamentoEtapas]);

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
      kpis={activeTab === 'overview' ? kpis : undefined}
      actions={[
        { label: 'Exportar', onClick: () => setExportOpen(true), variant: 'ghost' }
      ]}
    >
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── Faixa de versão — visível em ambas as abas quando há versões ── */}
        {temVersoes && (
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
                onKpisReady={handleKpisReady}
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
                sinapiConfig={sinapiConfig}
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
