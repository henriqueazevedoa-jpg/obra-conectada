/**
 * BoletimPublicoPage.tsx
 * Rota pública /bm/:token — acessível sem autenticação.
 * Exibe o Boletim de Medição e permite Aprovar ou Contestar.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultadoState = 'aprovado' | 'contestado' | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoletimPublicoPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [medicao, setMedicao]     = useState<any>(null);
  const [contrato, setContrato]   = useState<any>(null);
  const [obra, setObra]           = useState<any>(null);
  const [itens, setItens]         = useState<any[]>([]);

  const [resultado, setResultado] = useState<ResultadoState>(null);
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Token inválido.'); setLoading(false); return; }

    async function load() {
      try {
        // 1. Buscar medição pelo token
        const { data: med, error: medErr } = await (supabase as any)
          .from('contratos_medicoes')
          .select('*')
          .eq('aprovacao_token', token)
          .single();

        if (medErr || !med) { setError('Boletim não encontrado ou link expirado.'); setLoading(false); return; }
        setMedicao(med);

        // 2. Buscar contrato
        const { data: ctr } = await (supabase as any)
          .from('contratos')
          .select('*')
          .eq('id', med.contrato_id)
          .single();
        setContrato(ctr);

        // 3. Buscar obra
        if (ctr?.obra_id) {
          const { data: obraDat } = await (supabase as any)
            .from('obras')
            .select('id, nome, codigo, endereco')
            .eq('id', ctr.obra_id)
            .single();
          setObra(obraDat);
        }

        // 4. Buscar itens
        const { data: itensDat } = await (supabase as any)
          .from('contratos_medicao_itens')
          .select('*')
          .eq('medicao_id', med.id);
        setItens(itensDat || []);

      } catch (e: any) {
        setError(e.message || 'Erro ao carregar boletim.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!resultado) return;
    if (resultado === 'contestado' && !comentario.trim()) return;

    setSubmitting(true);
    try {
      // Chamar edge function bm-aprovacao
      const { error: fnErr } = await (supabase as any).functions.invoke('bm-aprovacao', {
        body: {
          token,
          resultado,
          comentario: comentario.trim() || null,
        },
      });

      if (fnErr) throw new Error(fnErr.message || 'Erro na edge function.');
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#534AB7]" />
        <p className="text-sm text-slate-500">Carregando boletim…</p>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (error || !medicao || !contrato) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <h1 className="text-xl font-bold text-slate-800">Boletim não encontrado</h1>
        <p className="text-sm text-slate-500 text-center max-w-sm">{error || 'O link pode ter expirado ou sido utilizado.'}</p>
      </div>
    );
  }

  // ── Render: resultado final ────────────────────────────────────────────────
  if (submitted) {
    const isAprovado = resultado === 'aprovado';
    return (
      <div className={cn(
        'min-h-screen flex flex-col items-center justify-center gap-6 px-4 transition-colors',
        isAprovado ? 'bg-emerald-50' : 'bg-red-50'
      )}>
        <div className={cn(
          'rounded-full p-5',
          isAprovado ? 'bg-emerald-100' : 'bg-red-100'
        )}>
          {isAprovado
            ? <CheckCircle className="h-12 w-12 text-emerald-600" />
            : <XCircle className="h-12 w-12 text-red-500" />
          }
        </div>
        <div className="text-center">
          <h1 className={cn('text-2xl font-bold', isAprovado ? 'text-emerald-800' : 'text-red-800')}>
            {isAprovado ? 'Medição Aprovada!' : 'Medição Contestada'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-sm">
            {isAprovado
              ? 'A medição foi aprovada e o gestor foi notificado. Um recebível foi registrado no financeiro.'
              : 'Sua contestação foi registrada e o responsável será notificado para revisão.'
            }
          </p>
          {comentario && (
            <div className="mt-4 bg-white border border-border rounded-xl p-4 text-left max-w-sm text-sm text-slate-700">
              <p className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-1">Seu comentário</p>
              <p>{comentario}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Render: BM principal ───────────────────────────────────────────────────
  const valorContrato = Number(contrato.valor_atual);
  const pctAcum = Number(medicao.percentual_acumulado ?? 0);
  const isFinalStatus = ['aprovado', 'contestado', 'pago'].includes(medicao.status);

  const modalidade = contrato.modalidade_medicao;
  const modalidadeLabel: Record<string, string> = {
    percentual: 'Percentual por Etapa',
    quantidade: 'Preço Unitário',
    livre: 'Livre',
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* HEADER */}
      <div className="bg-[#0f172a] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Obra Conectada</p>
          <h1 className="text-2xl font-bold">Boletim de Medição #{medicao.numero_medicao}</h1>
          <p className="text-slate-400 text-sm mt-1">{contrato.numero} · {contrato.contratado}</p>
          <div className="flex items-center gap-3 mt-3">
            <Badge className="bg-[#534AB7] text-white border-0 text-xs capitalize px-2.5">
              {modalidadeLabel[modalidade] || modalidade}
            </Badge>
            <Badge className={cn('text-xs border-0 capitalize px-2.5', {
              'bg-slate-600 text-white':     medicao.status === 'rascunho',
              'bg-blue-600 text-white':      medicao.status === 'emitido',
              'bg-emerald-600 text-white':   medicao.status === 'aprovado',
              'bg-amber-500 text-white':     medicao.status === 'contestado',
              'bg-violet-600 text-white':    medicao.status === 'pago',
            })}>
              {medicao.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* DADOS DO CONTRATO */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#534AB7]" />
            <h2 className="font-bold text-sm text-slate-800">Dados do Contrato</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            {[
              ['Obra',        obra?.nome || '—'],
              ['Código',      obra?.codigo || '—'],
              ['Contratado',  contrato.contratado],
              ['Tipo',        contrato.tipo === 'cliente' ? 'Cliente' : 'Empreiteiro'],
              ['Período',     fmtDate(medicao.data_referencia)],
              ['Emissão',     fmtDate(medicao.data_emissao)],
              ['Modalidade',  modalidadeLabel[modalidade] || modalidade],
              ['Nº Medição',  String(medicao.numero_medicao)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          {contrato.descricao && (
            <div className="px-5 pb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objeto</p>
              <p className="text-sm text-slate-700 mt-0.5">{contrato.descricao}</p>
            </div>
          )}
        </section>

        {/* TABELA DE ITENS */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-800">Itens da Medição</h2>
          </div>
          {itens.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">Detalhamento por item não disponível.</p>
          ) : (
            <div className="overflow-x-auto">
              {modalidade === 'percentual' && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#534AB7] text-white">
                      <th className="text-left p-3 font-semibold">Etapa</th>
                      <th className="text-center p-3 font-semibold">Ant. %</th>
                      <th className="text-center p-3 font-semibold">Per. %</th>
                      <th className="text-center p-3 font-semibold">Acum. %</th>
                      <th className="text-right p-3 font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-3 font-medium text-slate-800">{it.descricao}</td>
                        <td className="p-3 text-center text-slate-500">{Number(it.percentual_anterior ?? 0).toFixed(1)}%</td>
                        <td className="p-3 text-center font-semibold text-[#534AB7]">{Number(it.percentual_periodo ?? 0).toFixed(1)}%</td>
                        <td className="p-3 text-center text-slate-700">{Number(it.percentual_acumulado ?? 0).toFixed(1)}%</td>
                        <td className="p-3 text-right font-semibold">{fmt(Number(it.valor_periodo ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {modalidade === 'quantidade' && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#534AB7] text-white">
                      <th className="text-left p-3 font-semibold">Descrição</th>
                      <th className="text-center p-3 font-semibold">Un.</th>
                      <th className="text-right p-3 font-semibold">Preço Unit.</th>
                      <th className="text-right p-3 font-semibold">Qtd. Per.</th>
                      <th className="text-right p-3 font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-3 font-medium text-slate-800">{it.descricao}</td>
                        <td className="p-3 text-center text-slate-500">{it.unidade ?? 'un'}</td>
                        <td className="p-3 text-right text-slate-700">{fmt(Number(it.preco_unitario ?? 0))}</td>
                        <td className="p-3 text-right font-semibold text-[#534AB7]">{it.quantidade_periodo ?? 0}</td>
                        <td className="p-3 text-right font-semibold">{fmt(Number(it.valor_periodo ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {modalidade === 'livre' && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#534AB7] text-white">
                      <th className="text-left p-3 font-semibold">Descrição</th>
                      <th className="text-center p-3 font-semibold">Un.</th>
                      <th className="text-right p-3 font-semibold">Qtd.</th>
                      <th className="text-right p-3 font-semibold">Preço Unit.</th>
                      <th className="text-right p-3 font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-3 font-medium text-slate-800">{it.descricao}</td>
                        <td className="p-3 text-center text-slate-500">{it.unidade ?? 'un'}</td>
                        <td className="p-3 text-right">{it.quantidade_periodo ?? 0}</td>
                        <td className="p-3 text-right">{fmt(Number(it.preco_unitario ?? 0))}</td>
                        <td className="p-3 text-right font-semibold">{fmt(Number(it.valor_periodo ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* RESUMO FINANCEIRO */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-slate-800">Resumo Financeiro</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor do Contrato</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{fmt(valorContrato)}</p>
              </div>
              <div className="bg-[#534AB7]/10 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#534AB7]">Valor desta Medição</p>
                <p className="text-lg font-bold text-[#534AB7] mt-1">{fmt(Number(medicao.valor_periodo))}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acumulado Anterior</p>
                <p className="text-base font-bold text-slate-700 mt-1">{fmt(Number(medicao.valor_acumulado) - Number(medicao.valor_periodo))}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acumulado Total</p>
                <p className="text-base font-bold text-slate-700 mt-1">{fmt(Number(medicao.valor_acumulado))}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Acumulado: {pctAcum.toFixed(1)}% do contrato</span>
                <span>Saldo: {fmt(Math.max(0, valorContrato - Number(medicao.valor_acumulado)))}</span>
              </div>
              <Progress value={pctAcum} className="h-2" />
            </div>
          </div>
          {medicao.observacoes && (
            <div className="px-5 pb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observações</p>
              <p className="text-sm text-slate-600 italic">{medicao.observacoes}</p>
            </div>
          )}
        </section>

        {/* AÇÕES (somente se status = emitido) */}
        {medicao.status === 'emitido' && !isFinalStatus && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-800">Sua Decisão</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aprove ou conteste esta medição. A contestação requer um comentário obrigatório.</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Escolha */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setResultado('aprovado')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    resultado === 'aprovado'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-emerald-300'
                  )}
                >
                  <CheckCircle className={cn('h-8 w-8', resultado === 'aprovado' ? 'text-emerald-600' : 'text-slate-300')} />
                  <span className={cn('font-bold text-sm', resultado === 'aprovado' ? 'text-emerald-700' : 'text-slate-500')}>Aprovar</span>
                </button>
                <button
                  onClick={() => setResultado('contestado')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    resultado === 'contestado'
                      ? 'border-red-500 bg-red-50'
                      : 'border-slate-200 bg-white hover:border-red-300'
                  )}
                >
                  <XCircle className={cn('h-8 w-8', resultado === 'contestado' ? 'text-red-500' : 'text-slate-300')} />
                  <span className={cn('font-bold text-sm', resultado === 'contestado' ? 'text-red-600' : 'text-slate-500')}>Contestar</span>
                </button>
              </div>

              {/* Comentário (obrigatório se contestar) */}
              {resultado && (
                <div className="space-y-2">
                  <Label htmlFor="comentario">
                    Comentário {resultado === 'contestado' ? <span className="text-red-500">*</span> : '(opcional)'}
                  </Label>
                  <Textarea
                    id="comentario"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    placeholder={resultado === 'contestado'
                      ? 'Descreva o motivo da contestação...'
                      : 'Observações adicionais (opcional)...'
                    }
                    className="resize-none h-24"
                  />
                  {resultado === 'contestado' && !comentario.trim() && (
                    <p className="text-xs text-red-500">Comentário obrigatório para contestação.</p>
                  )}
                </div>
              )}

              {/* Confirmar */}
              {resultado && (
                <Button
                  className={cn(
                    'w-full gap-2',
                    resultado === 'aprovado'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  )}
                  disabled={submitting || (resultado === 'contestado' && !comentario.trim())}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : resultado === 'aprovado' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {submitting
                    ? 'Processando...'
                    : resultado === 'aprovado'
                      ? 'Confirmar Aprovação'
                      : 'Confirmar Contestação'
                  }
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Status já definido */}
        {isFinalStatus && (
          <div className={cn(
            'rounded-2xl p-5 text-center font-semibold text-sm',
            medicao.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' :
            medicao.status === 'pago'     ? 'bg-violet-100 text-violet-800' :
            'bg-amber-100 text-amber-800'
          )}>
            Este boletim já foi <strong>{medicao.status}</strong> e não pode ser alterado.
          </div>
        )}

        {/* Rodapé */}
        <p className="text-center text-xs text-slate-400 pb-4">
          Obra Conectada · Boletim de Medição Nº {medicao.numero_medicao} · {contrato.numero}
        </p>
      </div>
    </div>
  );
}
