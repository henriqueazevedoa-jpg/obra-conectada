import React, { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { ProjetoUpload } from './ProjetoUpload';
import { ProjetoArquivosList } from './ProjetoArquivosList';
import { Sparkles } from 'lucide-react';

interface Props {
  obraId: string;
}

export function IntelligencePanel({ obraId }: Props) {
  const { company } = useCompany();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (!company) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ProjetoUpload 
            obraId={obraId} 
            companyId={company.id} 
            onUploadSuccess={() => setRefreshTrigger(t => t + 1)} 
          />
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Base de Conhecimento da Obra</h3>
            <ProjetoArquivosList obraId={obraId} refreshTrigger={refreshTrigger} />
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Placeholder Chat Intelligence */}
          <div className="p-6 bg-muted/20 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-2">Assistente de Projetos</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Em breve: consulte qualquer informação técnica, quantitativos e detalhes do projeto fazendo perguntas ao chat baseado no RAG (Retrieval-Augmented Generation).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
