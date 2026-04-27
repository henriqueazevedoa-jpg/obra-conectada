import React from 'react';
import PageShell from '@/components/layout/PageShell';
import { Sparkles } from 'lucide-react';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { IntelligencePanel } from '@/components/intelligence/IntelligencePanel';
import { QuantitativosPanel } from '@/components/intelligence/QuantitativosPanel';
import NoObraState from '@/components/obras/NoObraState';

export default function IntelligencePage() {
  const { selectedObraId } = useObraSelection();

  if (!selectedObraId) {
    return (
      <NoObraState 
        title="Nenhuma obra selecionada" 
        description="Selecione uma obra para acessar a base de Inteligência." 
      />
    );
  }

  return (
    <PageShell
      title="Intelligence"
      subtitle="Base de conhecimento e Assistente RAG da Obra"
      icon={<Sparkles className="h-5 w-5" />}
    >
      <div className="max-w-[1280px] w-full mx-auto space-y-6 pb-20 animate-fade-in mt-1 overflow-y-auto h-full px-4 sm:px-6">
        <IntelligencePanel obraId={selectedObraId} />
        <QuantitativosPanel obraId={selectedObraId} />
      </div>
    </PageShell>
  );
}
