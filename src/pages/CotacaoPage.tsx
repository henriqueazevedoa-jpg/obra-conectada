import { useSearchParams } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import CotacaoCentral from '@/components/orcamento/CotacaoCentral';
import NoObraState from '@/components/obras/NoObraState';

export default function CotacaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { obras } = useObras();
  const { selectedObraId } = useObraSelection();

  const obra = obras.find(o => o.id === selectedObraId);
  const contexto = (searchParams.get('origem') ?? 'orcamento') as 'orcamento' | 'compra';
  const initialSearch = searchParams.get('q') ?? '';

  if (!obra) {
    return (
      <NoObraState
        title="Nenhuma obra selecionada"
        description="Selecione uma obra para acessar a Central de Cotações."
      />
    );
  }

  return (
    <CotacaoCentral
      obra={obra}
      contexto={contexto}
      onContextoChange={(c) => setSearchParams({ origem: c }, { replace: true })}
      onBack={() => window.history.back()}
      initialSearch={initialSearch}
      onClearInitialSearch={() => {}}
    />
  );
}
