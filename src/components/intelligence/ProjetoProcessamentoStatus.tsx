import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface StatusProps {
  arquivoId: string;
}

interface ProjetoArquivo {
  id: string;
  nome_original: string;
  status: 'aguardando' | 'processando' | 'concluido' | 'erro';
  total_paginas: number | null;
  paginas_processadas: number;
  erro_mensagem: string | null;
}

export function ProjetoProcessamentoStatus({ arquivoId }: StatusProps) {
  const [arquivo, setArquivo] = useState<ProjetoArquivo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch initial status
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('projeto_arquivos')
        .select('*')
        .eq('id', arquivoId)
        .maybeSingle();
      
      if (data) setArquivo(data as ProjetoArquivo);
      setLoading(false);
    };

    fetchStatus();

    // 2. Subscribe to realtime updates
    const channel = supabase
      .channel(`arquivo-status-${arquivoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projeto_arquivos',
          filter: `id=eq.${arquivoId}`
        },
        (payload) => {
          setArquivo(payload.new as ProjetoArquivo);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [arquivoId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" /> Verificando status...
      </div>
    );
  }

  if (!arquivo) return null;

  const getStatusDisplay = () => {
    switch (arquivo.status) {
      case 'aguardando':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-amber-500" />,
          text: "Na fila de processamento...",
          color: "text-amber-600 dark:text-amber-400"
        };
      case 'processando':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
          text: `Extraindo texto — página ${arquivo.paginas_processadas} de ${arquivo.total_paginas || '?'}`,
          color: "text-primary"
        };
      case 'concluido':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-success" />,
          text: `Pronto — ${arquivo.paginas_processadas} páginas processadas`,
          color: "text-success"
        };
      case 'erro':
        return {
          icon: <AlertCircle className="w-4 h-4 text-destructive" />,
          text: arquivo.erro_mensagem || "Erro ao processar arquivo.",
          color: "text-destructive"
        };
    }
  };

  const display = getStatusDisplay();
  const progressValue = arquivo.total_paginas 
    ? Math.round((arquivo.paginas_processadas / arquivo.total_paginas) * 100) 
    : (arquivo.status === 'aguardando' ? 0 : 100);

  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {display.icon}
          <span className={`text-sm font-medium ${display.color}`}>{display.text}</span>
        </div>
        {arquivo.status === 'processando' && (
          <span className="text-xs font-semibold text-muted-foreground">{progressValue}%</span>
        )}
      </div>
      
      {arquivo.status !== 'erro' && arquivo.status !== 'concluido' && (
        <Progress 
          value={progressValue} 
          className="h-1.5 mt-2" 
          indicatorClassName={arquivo.status === 'aguardando' ? 'bg-amber-500' : 'bg-primary'}
        />
      )}
    </div>
  );
}
