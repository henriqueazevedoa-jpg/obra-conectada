import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/untyped';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, Loader2, ClipboardList, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
  etapaNome: string;
}

interface CotacaoLink {
  id: string;
  token: string;
  obra_id: string;
  fornecedor_nome: string;
  fornecedor_email: string | null;
  itens: MapaItem[];
  respostas: Record<string, number>;
  status: string;
  expires_at: string | null;
}

type PageState = 'loading' | 'not_found' | 'expired' | 'form' | 'success';

export default function CotacaoPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [link, setLink] = useState<CotacaoLink | null>(null);
  const [precos, setPrecos] = useState<Record<string, string>>({}); // key -> string input value
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) { setPageState('not_found'); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('cotacao_links')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) { setPageState('not_found'); return; }

      const cotacao = data as unknown as CotacaoLink;

      // Verificar expiração
      if (cotacao.expires_at && new Date(cotacao.expires_at) < new Date()) {
        setPageState('expired'); return;
      }

      // FIX BUG-2: mesmo já respondido, mostramos o form com valores pre-preenchidos
      // Pré-preencher com respostas existentes (pendente ou respondido)
      const inicial: Record<string, string> = {};
      for (const item of cotacao.itens || []) {
        if (cotacao.respostas?.[item.key]) {
          inicial[item.key] = String(cotacao.respostas[item.key]);
        }
      }
      setPrecos(inicial);
      setLink(cotacao);
      setPageState('form');
    };

    load();
  }, [token]);

  const handleSubmit = async () => {
    if (!link) return;

    // Validar que pelo menos um item foi preenchido
    const respostas: Record<string, number> = {};
    const newErrors: Record<string, boolean> = {};
    let hasAny = false;

    for (const item of link.itens || []) {
      const val = precos[item.key];
      if (val && parseFloat(val) > 0) {
        respostas[item.key] = parseFloat(val);
        hasAny = true;
      }
    }

    if (!hasAny) {
      // Mark all as errored to give feedback
      for (const item of link.itens || []) {
        newErrors[item.key] = true;
      }
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('cotacao_links')
        .update({
          respostas,
          status: 'respondido',
          responded_at: new Date().toISOString(),
        })
        .eq('id', link.id);

      if (!error) {
        setPageState('success');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (v: number | null) => {
    if (!v) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Carregando cotação...</p>
        </div>
      </div>
    );
  }

  // ── NOT FOUND / EXPIRED ──────────────────────────────────────────────────────
  if (pageState === 'not_found' || pageState === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {pageState === 'expired' ? 'Link Expirado' : 'Link Não Encontrado'}
          </h1>
          <p className="text-sm text-slate-500">
            {pageState === 'expired'
              ? 'Este link de cotação expirou. Entre em contato com a empresa para solicitar um novo link.'
              : 'Este link de cotação não existe ou foi removido.'}
          </p>
        </div>
      </div>
    );
  }

  // ── ALREADY RESPONDED — removido: agora exibe form com banner ─────────────

  // ── SUCCESS ──────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="h-20 w-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto animate-in zoom-in duration-300">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Cotação Enviada!</h1>
            <p className="text-sm text-slate-500">
              Seus preços foram registrados com sucesso. A equipe de obra receberá os dados automaticamente.
            </p>
          </div>
          <p className="text-xs text-slate-400">Você já pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  // ── FORM ─────────────────────────────────────────────────────────────────────
  if (pageState === 'form' && link) {
    // Agrupar por etapa
    const byEtapa = (link.itens || []).reduce<Record<string, MapaItem[]>>((acc, item) => {
      if (!acc[item.etapaNome]) acc[item.etapaNome] = [];
      acc[item.etapaNome].push(item);
      return acc;
    }, {});

    const preenchidos = Object.values(precos).filter((v) => v && parseFloat(v) > 0).length;
    const total = link.itens?.length ?? 0;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            {/* FIX BUG-2: banner de re-envio quando já foi respondido */}
            {link.status === 'respondido' && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">
                  Cotação já enviada — você pode alterar os preços e <strong>reenviar</strong>.
                </p>
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-900 leading-tight">Cotação de Preços</h1>
                    <p className="text-xs text-slate-500">Obra Conectada</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Olá, <strong>{link.fornecedor_nome}</strong>! Preencha os preços unitários dos itens abaixo.
                </p>
              </div>
              {/* Progress */}
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-primary">{preenchidos}/{total}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">itens</div>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (preenchidos / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Items por etapa */}
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {Object.entries(byEtapa).map(([etapaNome, items]) => (
            <div key={etapaNome} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Cabeçalho da etapa */}
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{etapaNome}</span>
              </div>

              {/* Itens */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const val = precos[item.key] || '';
                  const filled = val && parseFloat(val) > 0;
                  const hasError = errors[item.key];

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'px-4 py-3 transition-colors',
                        filled ? 'bg-emerald-50/30' : ''
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={cn(
                              'h-2 w-2 rounded-full shrink-0 transition-colors',
                              filled ? 'bg-emerald-500' : 'bg-slate-300'
                            )} />
                            <p className="text-sm font-medium text-slate-800 leading-tight">{item.descricao}</p>
                          </div>
                          {/* FIX 4.3.B: label de unidade mais explícito */}
                          <div className="flex items-center gap-3 text-xs text-slate-400 ml-3.5">
                            <span className="font-medium text-slate-500">
                              Preço unitário{item.unidade ? ` por ${item.unidade}` : ''}
                            </span>
                            {item.quantidade && <span>Qtd referência: <strong className="text-slate-600">{item.quantidade} {item.unidade}</strong></span>}
                          </div>
                        </div>

                        {/* Campo de preço */}
                        <div className="shrink-0 w-32">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 select-none">R$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={val}
                              onChange={(e) => {
                                setPrecos((prev) => ({ ...prev, [item.key]: e.target.value }));
                                if (errors[item.key]) setErrors((prev) => ({ ...prev, [item.key]: false }));
                              }}
                              placeholder="0,00"
                              className={cn(
                                'pl-8 h-9 text-right text-sm font-medium transition-colors',
                                filled
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus-visible:ring-emerald-300'
                                  : hasError
                                  ? 'border-red-300 bg-red-50 focus-visible:ring-red-300'
                                  : ''
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Botão Enviar */}
          <div className="pb-8">
            <Button
              className="w-full h-12 text-base font-semibold gap-2 shadow-lg"
              onClick={handleSubmit}
              disabled={submitting || preenchidos === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Cotação {preenchidos > 0 && `(${preenchidos} item${preenchidos !== 1 ? 's' : ''})`}
                </>
              )}
            </Button>
            <p className="text-center text-xs text-slate-400 mt-3">
              Você pode preencher apenas os itens que tiver disponíveis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
