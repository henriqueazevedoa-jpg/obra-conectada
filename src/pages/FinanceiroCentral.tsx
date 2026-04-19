import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { cn } from '@/lib/utils';
import NoObraState from '@/components/obras/NoObraState';
import { DollarSign } from 'lucide-react';
import PagamentosTab from '@/components/financeiro/PagamentosTab';
import CustoRealTab from '@/components/financeiro/CustoRealTab';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab';
import DRETab from '@/components/financeiro/DRETab';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'pagamentos' | 'custo-real' | 'fluxo-caixa' | 'dre';
const VALID_TABS: Tab[] = ['pagamentos', 'custo-real', 'fluxo-caixa', 'dre'];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceiroCentral() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  const rawTab = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'pagamentos';

  const setTab = (tab: Tab) => setSearchParams({ tab }, { replace: true });

  const obra = obras.find(o => o.id === selectedObraId) || obras[0];

  // Primary Action Logic
  const handlePrimaryAction = () => {
    if (activeTab === 'pagamentos') setSearchParams(prev => { prev.set('novo', '1'); return prev; });
    if (activeTab === 'custo-real') setSearchParams(prev => { prev.set('registrar', '1'); return prev; });
  };

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar o financeiro."
      />
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in relative bg-[var(--color-background-primary)]">
      
      {/* ── STICKY HEADER (Camadas 1, 2 e 3) ────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-col w-full shadow-sm drop-shadow-sm">
        
        {/* CAMADA 1 — Linha do título (~46px) */}
        <div className="h-[46px] shrink-0 bg-[var(--color-background-primary)] px-[16px] py-[10px] flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" fill="#AFA9EC"/>
                <text x="10" y="14.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#26215C" fontFamily="sans-serif">$</text>
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[14px] font-medium text-[var(--color-text-primary)]">Financeiro</h1>
              <span className="text-[12px] text-[var(--color-text-secondary)]">{obra.nome}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center h-8 px-3 border-[0.5px] border-[#AFA9EC] bg-transparent text-[#3C3489] hover:bg-[#EEEDFE]/50 rounded text-[13px] font-medium transition-colors">
              Exportar
            </button>
            {activeTab === 'pagamentos' && (
              <button onClick={handlePrimaryAction} className="flex items-center gap-1.5 h-8 px-3 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white rounded text-[13px] font-medium transition-colors">
                <span className="text-lg leading-none mb-[2px]">+</span> Novo pagamento
              </button>
            )}
            {activeTab === 'custo-real' && (
              <button onClick={handlePrimaryAction} className="flex items-center gap-1.5 h-8 px-3 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white rounded text-[13px] font-medium transition-colors">
                <span className="text-lg leading-none mb-[2px]">+</span> Registrar custo
              </button>
            )}
            {/* Fluxo e DRE não tem action primary */}
          </div>
        </div>

        {/* CAMADA 2 — Abas card-tab */}
        <div className="bg-[var(--color-background-secondary)] px-[16px] flex gap-[2px] pt-1.5 shrink-0 border-b-[0.5px] border-[var(--color-border-tertiary)]">
          {[
            { id: 'pagamentos', label: 'Pagamentos' },
            { id: 'custo-real', label: 'Custo real' },
            { id: 'fluxo-caixa', label: 'Fluxo de caixa' },
            { id: 'dre', label: 'DRE' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id as Tab)}
                className={cn(
                  "text-[13px] px-[14px] py-[7px] rounded-t-[8px] text-center whitespace-nowrap transition-colors relative top-[0.5px]",
                  isActive 
                    ? "bg-[var(--color-background-primary)] border-[0.5px] border-[var(--color-border-tertiary)] border-b-0 text-[var(--color-text-primary)] font-medium z-10" 
                    : "border-[0.5px] border-transparent border-b-0 text-[var(--color-text-secondary)] bg-transparent hover:text-[var(--color-text-primary)]"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CAMADA 3 — Portal Target para KPIs da aba */}
        <div id="financeiro-kpi-portal" className="shrink-0 bg-[var(--color-background-primary)]" />
      </div>

      {/* Camada 4 + Conteúdo das Abas */}
      <div className="flex-1 bg-[var(--color-background-primary)] min-h-0">
        {activeTab === 'pagamentos' && <PagamentosTab obraId={obra.id} />}
        {activeTab === 'custo-real' && <CustoRealTab obraId={obra.id} />}
        {activeTab === 'fluxo-caixa' && <FluxoCaixaTab obraId={obra.id} />}
        {activeTab === 'dre' && <DRETab obraId={obra.id} />}
      </div>
    </div>
  );
}
