import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from './AuthContext';
import { useObras } from './ObrasContext';
import { CotacaoLote, CotacaoResposta, ItemParaCotacao, CotacaoLoteStatus, CotacaoFase } from '@/types/suprimentos';
import { toast } from '@/hooks/use-toast';

interface SuprimentosContextType {
  lotes: CotacaoLote[];
  respostas: CotacaoResposta[];
  loading: boolean;
  fetchLotes: (obraId: string) => Promise<void>;
  fetchRespostas: (loteId: string) => Promise<void>;
  fetchItensDoLote: (loteId: string) => Promise<any[]>;
  criarLote: (titulo: string, itens: string[], fase: CotacaoFase, obraId: string) => Promise<string | null>;
  importarRespostas: (loteId: string, fornecedorNome: string, respostas: Partial<CotacaoResposta>[]) => Promise<void>;
  finalizarLote: (loteId: string) => Promise<void>;
  excluirLote: (loteId: string) => Promise<void>;
  vencerResposta: (respostaId: string) => Promise<void>;
  aplicarPrecosDecididos: (loteId: string, selecoes: Record<string, string>) => Promise<void>;
}

const SuprimentosContext = createContext<SuprimentosContextType | undefined>(undefined);

export function SuprimentosProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lotes, setLotes] = useState<CotacaoLote[]>([]);
  const [respostas, setRespostas] = useState<CotacaoResposta[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLotes = useCallback(async (obraId: string) => {
    if (!obraId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cotacao_lotes')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar lotes:', error);
    } else {
      setLotes(data as CotacaoLote[]);
    }
    setLoading(false);
  }, []);

  const fetchRespostas = useCallback(async (loteId: string) => {
    // Busca todas as respostas de fornecedores para um lote específico
    const { data, error } = await supabase
      .from('cotacao_respostas')
      .select('*')
      .eq('lote_id', loteId);

    if (error) {
       console.error('Erro ao buscar respostas:', error);
    } else {
       setRespostas(data as CotacaoResposta[]);
    }
  }, []);

  const fetchItensDoLote = useCallback(async (loteId: string) => {
    // Busca os itens originais vinculados ao lote
    const { data: links } = await supabase.from('cotacao_lote_itens').select('item_origem_id').eq('lote_id', loteId);
    if (!links || links.length === 0) return [];

    const ids = links.map(l => l.item_origem_id);
    const { data: itens } = await supabase.from('insumos_pendentes_cotacao').select('*').in('id', ids);
    return itens || [];
  }, []);

  const criarLote = useCallback(async (titulo: string, itensIds: string[], fase: CotacaoFase, obraId: string) => {
    if (!user?.company_id) return null;

    // 1. Cria o lote
    const { data: lote, error: loteErr } = await supabase
      .from('cotacao_lotes')
      .insert({
        titulo,
        obra_id: obraId,
        company_id: user.company_id,
        fase,
        status: 'aberto'
      })
      .select()
      .single();

    if (loteErr || !lote) {
      toast({ title: 'Erro ao criar lote', variant: 'destructive' });
      return null;
    }

    // 2. Vincula os itens ao lote
    if (itensIds.length > 0) {
      await supabase.from('cotacao_lote_itens').insert(
        itensIds.map(id => ({ lote_id: lote.id, item_origem_id: id }))
      );

      // 3. Atualiza o status dos itens pendentes para 'em_cotacao'
      await supabase
        .from('insumos_pendentes_cotacao')
        .update({ status: 'em_cotacao' })
        .in('id', itensIds);
    }

    fetchLotes(obraId);
    return (lote as CotacaoLote).id;
  }, [user, fetchLotes]);

  const importarRespostas = useCallback(async (loteId: string, fornecedorNome: string, dados: Partial<CotacaoResposta>[]) => {
    const payloads = dados.map(d => ({
      lote_id: loteId,
      item_origem_id: d.item_origem_id,
      fornecedor_nome: fornecedorNome,
      preco_unitario: d.preco_unitario,
      prazo_entrega_dias: d.prazo_entrega_dias,
      observacoes: d.observacoes
    }));

    const { error } = await supabase.from('cotacao_respostas').insert(payloads);

    if (error) {
      toast({ title: 'Erro ao importar respostas', variant: 'destructive' });
    } else {
      toast({ title: '✅ Respostas importadas', description: `${dados.length} itens registrados para ${fornecedorNome}.` });
      fetchRespostas(loteId);
    }
  }, [fetchRespostas]);

  const finalizarLote = useCallback(async (loteId: string) => {
    const { error } = await supabase
      .from('cotacao_lotes')
      .update({ status: 'finalizado' })
      .eq('id', loteId);

    if (error) {
      toast({ title: 'Erro ao finalizar lote', variant: 'destructive' });
    } else {
      setLotes(prev => prev.map(l => l.id === loteId ? { ...l, status: 'finalizado' } : l));
    }
  }, []);

  const excluirLote = useCallback(async (loteId: string) => {
    const { error } = await supabase
      .from('cotacao_lotes')
      .delete()
      .eq('id', loteId);

    if (error) {
      toast({ title: 'Erro ao excluir lote', variant: 'destructive' });
    } else {
      setLotes(prev => prev.filter(l => l.id !== loteId));
      toast({ title: 'Lote excluído' });
    }
  }, []);

  const vencerResposta = useCallback(async (respostaId: string) => {
    // Lógica para marcar uma resposta específica como vencedora
    // Precisa desmarcar outros vencedores do mesmo item no mesmo lote?
    // Opcional dependendo da lógica da matriz
    const { data: resp } = await supabase.from('cotacao_respostas').select('lote_id, item_origem_id').eq('id', respostaId).single();
    
    if (resp) {
      // Desmarca outros
      await supabase.from('cotacao_respostas').update({ is_vencedor: false }).eq('lote_id', resp.lote_id).eq('item_origem_id', resp.item_origem_id);
      // Marca este
      await supabase.from('cotacao_respostas').update({ is_vencedor: true }).eq('id', respostaId);
      
      fetchRespostas(resp.lote_id);
    }
  }, [fetchRespostas]);

  const aplicarPrecosDecididos = useCallback(async (loteId: string, selecoes: Record<string, string>) => {
    // 1. Busca o lote para saber a fase (planejamento ou execucao)
    const { data: lote } = await supabase.from('cotacao_lotes').select('*').eq('id', loteId).single();
    if (!lote) return;

    // 2. Busca todas as respostas vinculadas para pegar os valores exatos
    const { data: respData } = await supabase.from('cotacao_respostas').select('*').eq('lote_id', loteId);
    if (!respData) return;

    setLoading(true);
    try {
      for (const [pendenteId, fornecedor] of Object.entries(selecoes)) {
        const resposta = respData.find(r => r.item_origem_id === pendenteId && r.fornecedor_nome === fornecedor);
        if (!resposta) continue;

        // Busca o item pendente para saber o subitem_id ou custo_real_id
        const { data: pendente } = await supabase.from('insumos_pendentes_cotacao').select('*').eq('id', pendenteId).single();
        if (!pendente) continue;

        if (lote.fase === 'planejamento' && pendente.subitem_id) {
          // Atualiza o orçamento
          const { data: si } = await supabase.from('orcamento_subitens').select('quantidade').eq('id', pendente.subitem_id).single();
          const qtd = (si as any)?.quantidade || 1;
          
          await supabase.from('orcamento_subitens').update({
            preco_unitario: resposta.preco_unitario,
            preco_total: resposta.preco_unitario * qtd
          }).eq('id', pendente.subitem_id);
        }

        // Marca a resposta como vencedora para histórico
        await supabase.from('cotacao_respostas').update({ is_vencedor: true }).eq('id', resposta.id);
        
        // Resolve o item pendente
        await supabase.from('insumos_pendentes_cotacao').update({ status: 'resolvido' }).eq('id', pendenteId);
      }

      await finalizarLote(loteId);
      toast({ title: '✅ Preços aplicados com sucesso!', description: 'O orçamento foi atualizado com as seleções da matriz.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao aplicar preços', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [finalizarLote]);

  return (
    <SuprimentosContext.Provider value={{
      lotes, respostas, loading,
      fetchLotes, fetchRespostas, fetchItensDoLote, criarLote, importarRespostas, finalized: finalizarLote, excluirLote, vencerResposta,
      finalizarLote, aplicarPrecosDecididos
    }}>
      {children}
    </SuprimentosContext.Provider>
  );
}

export function useSuprimentos() {
  const context = useContext(SuprimentosContext);
  if (context === undefined) {
    throw new Error('useSuprimentos must be used within a SuprimentosProvider');
  }
  return context;
}
