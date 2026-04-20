import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type DocTipo = 'foto_nf' | 'pdf_nf' | 'xml_nfe' | 'romaneio' | 'boleto' | 'audio';

export interface DocItem {
  descricao_doc: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number | null;
  tipo_item: 'material' | 'servico' | 'frete' | 'desconto' | 'taxa';
  material_id_sugerido: string | null;
  material_nome_sugerido: string | null;
  confianca_match: number;
  aceito: boolean | null;
  // campos para edição manual:
  material_id_final?: string | null;
  material_nome_final?: string | null;
  quantidade_final?: number;
}

export interface DocResultado {
  id: string;
  tipo_resultado: string;
  fornecedor_nome: string | null;
  numero_doc: string | null;
  data_doc: string | null;
  valor_total: number | null;
  confianca: number | null;
  itens: DocItem[];
  transcricao_voz?: string;
}

export type ProcessingState = 'idle' | 'uploading' | 'processing' | 'review' | 'confirming' | 'done' | 'error';

export function useIADocumentos(obraId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<ProcessingState>('idle');
  const [resultado, setResultado] = useState<DocResultado | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setResultado(null);
    setUploadId(null);
    setErrorMsg(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // ─── 1. Upload do arquivo ──────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File, tipo: DocTipo): Promise<string | null> => {
    if (!user) return null;
    setState('uploading');

    try {
      // Get company_id
      const { data: profile } = await (supabase as any)
        .from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile) throw new Error('Perfil não encontrado');

      const ext = file.name.split('.').pop() || 'bin';
      const bucket = tipo === 'audio' ? 'voice-recordings' : 'nf-uploads';
      const path = `${profile.company_id}/${obraId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
      if (upErr) throw new Error(upErr.message);

      // Insert doc_upload record
      const { data: uploadRecord, error: insErr } = await (supabase as any)
        .from('doc_uploads')
        .insert({
          company_id: profile.company_id,
          obra_id: obraId,
          user_id: user.id,
          tipo,
          storage_path: path,
          status: 'aguardando',
        })
        .select().single();

      if (insErr || !uploadRecord) throw new Error(insErr?.message || 'Falha ao registrar upload');
      setUploadId(uploadRecord.id);
      return uploadRecord.id;
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message);
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [user, obraId]);

  // ─── 2. Chamar Edge Function ────────────────────────────────────────────────
  const processDoc = useCallback(async (uid: string): Promise<void> => {
    setState('processing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const { data: fnUrl } = supabase.functions.buildUrl('process-doc');
      const response = await fetch(fnUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-doc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upload_id: uid, obra_id: obraId }),
      });

      const json = await response.json();

      if (!response.ok) {
        if (json.code === 'ADDON_INACTIVE') {
          setState('error');
          setErrorMsg('ADDON_INACTIVE');
          return;
        }
        throw new Error(json.error || 'Falha no processamento');
      }

      // Enriquecer itens com campos de edição
      const res: DocResultado = {
        ...json.resultado,
        itens: (json.resultado.itens || []).map((item: DocItem) => ({
          ...item,
          material_id_final: item.material_id_sugerido,
          material_nome_final: item.material_nome_sugerido,
          quantidade_final: item.quantidade,
        }))
      };

      setResultado(res);
      setState('review');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message);
      toast({ title: 'Erro no processamento', description: err.message, variant: 'destructive' });
    }
  }, [obraId]);

  // ─── 3. Iniciar fluxo completo ─────────────────────────────────────────────
  const startProcessing = useCallback(async (file: File, tipo: DocTipo) => {
    const uid = await uploadFile(file, tipo);
    if (!uid) return;
    await processDoc(uid);
  }, [uploadFile, processDoc]);

  // ─── 4. Confirmar itens aceitos ────────────────────────────────────────────
  const confirmarRecebimento = useCallback(async (
    itensRevisados: DocItem[],
    destino: 'estoque' | 'pagamentos' | 'diario',
    registrarMovimentacao?: (mov: any) => Promise<void>
  ): Promise<boolean> => {
    if (!resultado || !user) return false;
    setState('confirming');

    try {
      const { data: profile } = await (supabase as any)
        .from('profiles').select('company_id').eq('id', user.id).single();

      const itensAceitos = itensRevisados.filter(i => i.aceito === true && i.tipo_item === 'material');
      const hoje = new Date().toISOString().split('T')[0];

      const movimentacoesIds: string[] = [];

      // Registrar entradas no estoque
      if (destino === 'estoque' && registrarMovimentacao) {
        for (const item of itensAceitos) {
          const matId = item.material_id_final || item.material_id_sugerido;
          if (!matId) continue;
          const movId = crypto.randomUUID();
          await registrarMovimentacao({
            id: movId,
            obraId,
            materialId: matId,
            materialNome: item.material_nome_final || item.descricao_doc,
            tipo: 'entrada',
            data: resultado.data_doc || hoje,
            quantidade: item.quantidade_final ?? item.quantidade,
            origemDestino: resultado.fornecedor_nome || 'NF s/ identificação',
            responsavel: user.name,
            observacoes: `NF ${resultado.numero_doc || ''} — lançado via IA`,
          });
          movimentacoesIds.push(movId);
        }
      }

      // Salvar recebimento auditável
      await (supabase as any).from('doc_recebimentos').insert({
        resultado_id: resultado.id,
        company_id: profile.company_id,
        obra_id: obraId,
        tipo: resultado.tipo_resultado,
        destino,
        fornecedor_nome: resultado.fornecedor_nome,
        numero_doc: resultado.numero_doc,
        data_recebimento: resultado.data_doc || hoje,
        itens_confirmados: itensRevisados,
        registros_gerados: { movimentacoes: movimentacoesIds },
      });

      const ignorados = itensRevisados.filter(i => i.aceito === false).length;
      toast({
        title: `✅ ${itensAceitos.length} item(s) lançado(s)`,
        description: ignorados > 0 ? `${ignorados} item(s) ignorado(s).` : undefined,
      });

      setState('done');
      return true;
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message);
      toast({ title: 'Erro ao confirmar', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [resultado, user, obraId]);

  return {
    state, resultado, uploadId, errorMsg,
    startProcessing, confirmarRecebimento, reset,
    isProcessing: state === 'uploading' || state === 'processing' || state === 'confirming',
  };
}
