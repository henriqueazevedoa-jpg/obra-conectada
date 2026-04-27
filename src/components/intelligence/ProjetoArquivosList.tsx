import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/untyped";
import { FileText, Trash2, Calendar, FileBox, Loader2, Target, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

interface ArquivoListProps {
  obraId: string;
  refreshTrigger: number;
}

export function ProjetoArquivosList({ obraId, refreshTrigger }: ArquivoListProps) {
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [chunksInfo, setChunksInfo] = useState<Record<string, { total: number, disciplina: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArquivosEChunks();
  }, [obraId, refreshTrigger]);

  const fetchArquivosEChunks = async () => {
    setLoading(true);
    
    // 1. Busca os arquivos
    const { data: arquivosData, error: arquivosError } = await supabase
      .from('projeto_arquivos')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    // 2. Busca o agregado de chunks para toda a obra
    const { data: chunksData, error: chunksError } = await supabase
      .from('projeto_chunks')
      .select('arquivo_id, disciplina')
      .eq('obra_id', obraId);

    if (!arquivosError && arquivosData) {
      setArquivos(arquivosData);
    }

    if (!chunksError && chunksData) {
      // Agrupar chunks por arquivo
      const agregacao: Record<string, { [disc: string]: number }> = {};
      
      chunksData.forEach(chunk => {
        const fileId = chunk.arquivo_id;
        if (!agregacao[fileId]) agregacao[fileId] = {};
        const disc = chunk.disciplina || 'indeterminado';
        agregacao[fileId][disc] = (agregacao[fileId][disc] || 0) + 1;
      });

      // Compilar resultados (total e disciplina predominante)
      const compiled: Record<string, { total: number, disciplina: string }> = {};
      for (const [fileId, counts] of Object.entries(agregacao)) {
        let total = 0;
        let maxDisc = 'indeterminado';
        let maxCount = 0;
        
        for (const [disc, count] of Object.entries(counts)) {
          total += count;
          if (count > maxCount) {
            maxCount = count;
            maxDisc = disc;
          }
        }
        
        compiled[fileId] = { total, disciplina: maxDisc };
      }
      setChunksInfo(compiled);
    }
    
    setLoading(false);
  };

  const handleRemove = async (id: string, storagePath: string) => {
    if (!window.confirm("Deseja realmente excluir este arquivo? Toda a indexação de IA vinculada a ele será perdida.")) return;
    
    // Remove DB
    const { error: dbError } = await supabase.from('projeto_arquivos').delete().eq('id', id);
    if (dbError) {
      toast.error("Erro ao remover do banco.");
      return;
    }

    // Remove Storage
    const { error: stError } = await supabase.storage.from('projetos').remove([storagePath]);
    if (stError) {
      console.warn("Falha ao limpar storage object, mas arquivo foi removido do DB.", stError);
    }

    toast.success("Arquivo removido com sucesso.");
    fetchArquivosEChunks();
  };

  const getStatusBadge = (arq: any) => {
    if (arq.status === 'erro') return <Badge variant="destructive" className="h-5 text-[10px]">Falhou</Badge>;
    if (arq.status === 'aguardando') return <Badge variant="secondary" className="h-5 text-[10px] bg-amber-500/10 text-amber-600 border-none">Aguardando Extração</Badge>;
    if (arq.status === 'processando') return <Badge variant="secondary" className="h-5 text-[10px] bg-primary/10 text-primary border-none">Extraindo...</Badge>;
    if (arq.status === 'concluido' && !arq.classificado) return <Badge variant="secondary" className="h-5 text-[10px] bg-blue-500/10 text-blue-600 border-none">Classificando IA...</Badge>;
    if (arq.status === 'concluido' && arq.classificado) return <Badge variant="default" className="h-5 text-[10px] bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Indexado</Badge>;
    
    return <Badge variant="outline" className="h-5 text-[10px]">Pendente</Badge>;
  };

  if (loading) {
    return <div className="py-8 text-center flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando base de conhecimento...</div>;
  }

  if (arquivos.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl bg-muted/20">
        <FileBox className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-medium text-foreground">Base de Inteligência Vazia</h3>
        <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
          Faça o upload do projeto em PDF acima para que a inteligência artificial possa entender e analisar os detalhes da obra.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {arquivos.map((arq) => {
        const info = chunksInfo[arq.id];
        return (
          <div key={arq.id} className="flex flex-col p-4 bg-card border border-border rounded-xl hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col min-w-0 w-full">
                  <span className="text-sm font-medium text-foreground truncate pr-4" title={arq.nome_original}>
                    {arq.nome_original}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {getStatusBadge(arq)}
                    
                    {arq.classificado && info && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">
                        {info.disciplina}
                      </span>
                    )}

                    <span className="flex items-center text-[11px] text-muted-foreground ml-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(arq.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 ml-4 flex items-center gap-4">
                <button
                  onClick={() => handleRemove(arq.id, arq.storage_path)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Excluir arquivo e indexação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segunda linha informativa */}
            {arq.classificado && info && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center text-[11px] text-muted-foreground">
                  <Target className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <strong>{info.total} páginas úteis</strong> &nbsp;extraídas de {arq.total_paginas} páginas totais.
                </div>
              </div>
            )}
            
            {(!arq.classificado && arq.status === 'concluido') && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center text-[11px] text-muted-foreground animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Claude Sonnet avaliando relevância e agrupando entidades...
                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
