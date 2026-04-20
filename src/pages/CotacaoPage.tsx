import { useSearchParams } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import CotacaoCentral from '@/components/orcamento/CotacaoCentral';
import PageShell from '@/components/layout/PageShell';
import type { PageTab } from '@/components/layout/PageShell';

// Ícone da página — tag de cotação
const CotacaoIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="2" fill="#AFA9EC"/>
    <path d="M4 8h8M4 5.5h5M4 10.5h6" stroke="#26215C" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const tabs: PageTab[] = [
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'compra',    label: 'Compras'   },
];

export default function CotacaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  const obra = obras.find(o => o.id === selectedObraId);
  const contexto = (searchParams.get('origem') ?? 'orcamento') as 'orcamento' | 'compra';
  const initialSearch = searchParams.get('q') ?? '';

  const handleContextoChange = (c: 'orcamento' | 'compra') => {
    setSearchParams({ origem: c }, { replace: true });
  };

  return (
    <PageShell
      icon={CotacaoIcon}
      title="Cotação"
      tabs={tabs}
      activeTab={contexto}
      onTabChange={(id) => handleContextoChange(id as 'orcamento' | 'compra')}
    >
      {!obra ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Nenhuma obra selecionada</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Selecione uma obra para acessar a Central de Cotações.
            </p>
          </div>
        </div>
      ) : (
        <CotacaoCentral
          obra={obra}
          contexto={contexto}
          onContextoChange={handleContextoChange}
          onBack={() => window.history.back()}
          initialSearch={initialSearch}
          onClearInitialSearch={() => {}}
        />
      )}
    </PageShell>
  );
}
