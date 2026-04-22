import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import type { ContratoMedicao, ContratoComMetricas, MedicaoStatus } from '@/types/contrato';
import { ChevronDown, ChevronUp, FileText, SendHorizonal, CheckCircle, XCircle, RefreshCw, Download, Copy, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { gerarBoletimMedicaoPDF } from '@/lib/gerarBoletimMedicao';
import { criarPagamentoDeMedicao } from '@/lib/criarPagamentoDeMedicao';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function statusConfig(s: MedicaoStatus): { label: string; className: string } {
  switch (s) {
    case 'rascunho':   return { label: 'Rascunho',   className: 'bg-muted text-muted-foreground' };
    case 'emitido':    return { label: 'Emitido',    className: 'bg-blue-100 text-blue-700' };
    case 'aprovado':   return { label: 'Aprovado',   className: 'bg-emerald-100 text-emerald-700' };
    case 'contestado': return { label: 'Contestado', className: 'bg-amber-100 text-amber-700' };
    case 'pago':       return { label: 'Pago',       className: 'bg-violet-100 text-violet-700' };
    default:           return { label: s,             className: 'bg-muted text-muted-foreground' };
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MedicaoHistoricoProps {
  contratoId: string;
  contrato: ContratoComMetricas;
  obra: { nome: string; codigo?: string; endereco?: string };
  valorContrato: number;
  open: boolean;
  onRequestNovaMedicao: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MedicaoHistorico({
  contratoId,
  contrato,
  obra,
  valorContrato,
  open,
  onRequestNovaMedicao,
}: MedicaoHistoricoProps) {
  const [medicoes, setMedicoes] = useState<ContratoMedicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [urlDialog, setUrlDialog] = useState<{ open: boolean; url: string }>({ open: false, url: '' });

  const fetchMedicoes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('contratos_medicoes')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('numero_medicao', { ascending: false });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setMedicoes(data || []);
    }
    setLoading(false);
  }, [contratoId]);

  useEffect(() => {
    if (open) fetchMedicoes();
  }, [open, fetchMedicoes]);

  const handleStatusChange = async (med: ContratoMedicao, novoStatus: MedicaoStatus) => {
    setActionLoading(med.id);
    try {
      const payload: Partial<ContratoMedicao> = { status: novoStatus };
      if (novoStatus === 'emitido' && !med.data_emissao) {
        payload.data_emissao = new Date().toISOString().slice(0, 10);
      }

      const { error } = await (supabase as any)
        .from('contratos_medicoes')
        .update(payload)
        .eq('id', med.id);

      if (error) throw error;
      toast({ title: 'Atualizado', description: `Medição #${med.numero_medicao} marcada como ${novoStatus}.` });

      // Quando empreiteiro emite → criar pagamento previsto
      if (novoStatus === 'emitido' && contrato.tipo === 'empreiteiro') {
        await criarPagamentoDeMedicao({
          obraId:         contrato.obra_id,
          contratoId:     contrato.id,
          medicaoId:      med.id,
          contratoNumero: contrato.numero,
          contratado:     contrato.contratado,
          valorPeriodo:   Number(med.valor_periodo),
          dataReferencia: med.data_referencia || new Date().toISOString().slice(0, 10),
        });
      }

      fetchMedicoes();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGerarBM = async (med: ContratoMedicao) => {
    setActionLoading(med.id + '_pdf');
    try {
      const { data: itens } = await (supabase as any)
        .from('contratos_medicao_itens')
        .select('*')
        .eq('medicao_id', med.id);

      await gerarBoletimMedicaoPDF({
        obra: { nome: obra.nome, codigo: obra.codigo, endereco: obra.endereco },
        contrato: {
          numero: contrato.numero,
          contratado: contrato.contratado,
          descricao: contrato.descricao,
          modalidade_medicao: contrato.modalidade_medicao,
          valor_atual: Number(contrato.valor_atual),
          tipo: contrato.tipo,
        },
        medicao: {
          numero_medicao: med.numero_medicao,
          data_referencia: med.data_referencia,
          data_emissao: med.data_emissao,
          status: med.status,
          percentual_acumulado_anterior: Number(med.percentual_acumulado_anterior ?? 0),
          percentual_periodo: Number(med.percentual_periodo ?? 0),
          percentual_acumulado: Number(med.percentual_acumulado ?? 0),
          valor_periodo: Number(med.valor_periodo),
          valor_acumulado: Number(med.valor_acumulado),
          observacoes: med.observacoes,
        },
        itens: itens || [],
      });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnviarAprovacao = async (med: ContratoMedicao) => {
    setActionLoading(med.id + '_token');
    try {
      const newToken = crypto.randomUUID();
      const { data: updated, error } = await (supabase as any)
        .from('contratos_medicoes')
        .update({ aprovacao_token: newToken })
        .eq('id', med.id)
        .select('aprovacao_token')
        .single();

      if (error) throw error;

      const token = updated?.aprovacao_token || newToken;
      const url = `${window.location.origin}/bm/${token}`;

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // fallback silencioso
      }

      setUrlDialog({ open: true, url });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Dialog de link de aprovação */}
      <Dialog open={urlDialog.open} onOpenChange={o => setUrlDialog(s => ({ ...s, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-4 w-4 text-[#534AB7]" /> Link de Aprovação Gerado
            </DialogTitle>
            <DialogDescription>
              Envie este link para o contratante. Ele pode aprovar ou contestar sem login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Input value={urlDialog.url} readOnly className="text-xs font-mono" />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(urlDialog.url).catch(() => {});
                toast({ title: 'Copiado!', description: 'URL copiada para a área de transferência.' });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Já copiada automaticamente.</p>
        </DialogContent>
      </Dialog>

      {/* Painel de histórico */}
      <div className="border-t border-border/40 bg-background/50">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-7 py-3 border-b border-border/30">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Histórico de Medições {medicoes.length > 0 && `(${medicoes.length})`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={fetchMedicoes}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button size="sm" className="h-7 px-3 gap-1.5 text-xs" onClick={onRequestNovaMedicao}>
              <FileText className="h-3 w-3" /> Nova Medição
            </Button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2].map(i => <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />)}
          </div>
        ) : medicoes.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma medição registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {medicoes.map(med => {
              const { label, className: badgeCls } = statusConfig(med.status as MedicaoStatus);
              const isExpanded = expandedId === med.id;
              const pct = valorContrato > 0
                ? ((Number(med.valor_acumulado) / valorContrato) * 100).toFixed(1)
                : '—';

              return (
                <div key={med.id} className="bg-card hover:bg-muted/20 transition-colors">

                  {/* Row — clicável */}
                  <button
                    className="w-full flex items-center justify-between px-7 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : med.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center w-8">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nº</span>
                        <span className="font-bold text-sm">{med.numero_medicao}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{fmt(Number(med.valor_periodo))}</span>
                          <Badge className={cn('text-[10px] px-1.5 py-0 h-4 font-medium border-0', badgeCls)}>
                            {label}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {med.data_referencia
                            ? format(new Date(med.data_referencia + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
                            : '—'}
                          {' · '}Acumulado: {pct}%
                        </p>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  {/* Detalhe expandido */}
                  {isExpanded && (
                    <div className="px-7 pb-4 space-y-3">

                      {/* KPIs */}
                      <div className="grid grid-cols-3 gap-3 bg-muted/30 rounded-xl p-3">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Período</p>
                          <p className="text-sm font-bold text-primary">{fmt(Number(med.valor_periodo))}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Acumulado</p>
                          <p className="text-sm font-bold">{fmt(Number(med.valor_acumulado))}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">% Acum.</p>
                          <p className="text-sm font-bold">{pct}%</p>
                        </div>
                      </div>

                      {/* Observações */}
                      {med.observacoes && (
                        <p className="text-xs text-muted-foreground italic">{med.observacoes}</p>
                      )}

                      {/* Botões de ação condicionais por status */}
                      <div className="flex gap-2 flex-wrap">

                        {/* Gerar BM (todo status exceto pago) */}
                        {med.status !== 'pago' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8"
                            disabled={actionLoading === med.id + '_pdf'}
                            onClick={() => handleGerarBM(med)}
                          >
                            <Download className="h-3 w-3" />
                            {actionLoading === med.id + '_pdf' ? 'Gerando...' : 'Gerar BM'}
                          </Button>
                        )}

                        {/* Enviar para aprovação (somente emitido) */}
                        {med.status === 'emitido' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8 border-[#534AB7]/40 text-[#534AB7] hover:bg-[#534AB7]/10"
                            disabled={actionLoading === med.id + '_token'}
                            onClick={() => handleEnviarAprovacao(med)}
                          >
                            <Link className="h-3 w-3" />
                            {actionLoading === med.id + '_token' ? 'Gerando link...' : 'Enviar para Aprovação'}
                          </Button>
                        )}

                        {/* rascunho → emitir */}
                        {med.status === 'rascunho' && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs h-8"
                            disabled={actionLoading === med.id}
                            onClick={() => handleStatusChange(med, 'emitido')}
                          >
                            <SendHorizonal className="h-3 w-3" />
                            {actionLoading === med.id ? 'Emitindo...' : 'Emitir'}
                          </Button>
                        )}

                        {/* emitido → aprovar ou contestar */}
                        {med.status === 'emitido' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              disabled={actionLoading === med.id}
                              onClick={() => handleStatusChange(med, 'aprovado')}
                            >
                              <CheckCircle className="h-3 w-3" />
                              {actionLoading === med.id ? '...' : 'Aprovar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                              disabled={actionLoading === med.id}
                              onClick={() => handleStatusChange(med, 'contestado')}
                            >
                              <XCircle className="h-3 w-3" />
                              {actionLoading === med.id ? '...' : 'Contestar'}
                            </Button>
                          </>
                        )}

                        {/* contestado → voltar para revisão */}
                        {med.status === 'contestado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8"
                            disabled={actionLoading === med.id}
                            onClick={() => handleStatusChange(med, 'rascunho')}
                          >
                            <RefreshCw className="h-3 w-3" />
                            {actionLoading === med.id ? '...' : 'Voltar para Revisão'}
                          </Button>
                        )}

                        {/* aprovado → marcar como pago */}
                        {med.status === 'aprovado' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8 border-violet-300 text-violet-700 hover:bg-violet-50"
                            disabled={actionLoading === med.id}
                            onClick={() => handleStatusChange(med, 'pago')}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {actionLoading === med.id ? '...' : 'Marcar como Pago'}
                          </Button>
                        )}

                        {/* pago → sem ações */}
                        {med.status === 'pago' && (
                          <span className="text-xs text-muted-foreground italic py-1">Medição finalizada.</span>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
