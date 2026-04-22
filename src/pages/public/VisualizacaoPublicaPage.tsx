import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import {
  Link2Off, Loader2, Send, CheckCircle2,
  CalendarDays, Download, HardHat, TrendingUp,
  CloudSun, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────

interface LinkInfo {
  id: string;
  tipo: 'visualizacao';
  nome_label: string;
  permissoes: Record<string, { ativo: boolean; indicadores?: string[] }>;
  permite_estoque: boolean;
}

interface ObraInfo {
  id: string;
  nome: string;
  codigo?: string;
  cliente?: string;
  responsavel?: string;
  status?: string;
  percentual_andamento?: number;
  data_inicio?: string;
  data_previsao_termino?: string;
  endereco?: string;
}

interface VerifyResponse {
  link: LinkInfo;
  obra: ObraInfo;
  empresa?: { nome: string }; // Injected se houver
}

interface ObraMensagem {
  id: string;
  texto: string;
  de_cliente: boolean;
  created_at: string;
}

type ErrorType = 'not_found' | 'expired' | 'disabled' | 'unknown';

const SUPABASE_URL = 'https://ehmdwwuhhumgxhsjvvrr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Shared Helpers ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; tw: string }> = {
    em_andamento:  { label: 'Em andamento',  tw: 'bg-blue-100 text-blue-800 border-blue-200' },
    planejamento:  { label: 'Planejamento',  tw: 'bg-slate-100 text-slate-700 border-slate-200' },
    concluida:     { label: 'Concluída',     tw: 'bg-green-100 text-green-800 border-green-200' },
    paralisada:    { label: 'Paralisada',    tw: 'bg-red-100 text-red-800 border-red-200' },
  };
  const cfg = map[status || ''] || { label: status || '—', tw: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.tw}`}>
      {cfg.label}
    </span>
  );
}

// ── Error Page ────────────────────────────────────────────────────────────

function ErrorPage({ type }: { type: ErrorType }) {
  const msgs: Record<ErrorType, { title: string; desc: string }> = {
    not_found: { title: 'Página não encontrada', desc: 'Este link não existe ou foi removido. Verifique se o endereço está correto.' },
    expired: { title: 'Link expirado', desc: 'O prazo de validade deste acesso terminou. Solicite um novo link.' },
    disabled: { title: 'Acesso suspenso', desc: 'O acesso a esta visualização foi desativado temporariamente.' },
    unknown: { title: 'Erro de conexão', desc: 'Não conseguimos carregar os dados. Tente novamente mais tarde.' },
  };
  const m = msgs[type];
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Link2Off className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">{m.title}</h1>
        <p className="text-sm text-slate-500">{m.desc}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function VisualizacaoPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType | null>(null);
  
  const [info, setInfo] = useState<VerifyResponse | null>(null);
  const [obraData, setObraData] = useState<any>({});
  
  const [mensagens, setMensagens] = useState<ObraMensagem[]>([]);
  const [novaMsg, setNovaMsg] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);

  // Inicialização e Fetch Principal
  useEffect(() => {
    if (!token) { setError('not_found'); setLoading(false); return; }

    fetch(`${SUPABASE_URL}/functions/v1/verify-link?token=${token}`, {
      headers: { 'apikey': SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(async (res) => {
        if (res.error) {
          if (res.error.includes('expirado')) setError('expired');
          else if (res.error.includes('desativado')) setError('disabled');
          else if (res.error.includes('não encontrado')) setError('not_found');
          else setError('unknown');
          setLoading(false);
          return;
        }

        setInfo(res);
        await Promise.all([
          fetchObraData(res.link, res.obra.id),
          fetchMensagens(res.link.id)
        ]);
        setLoading(false);
      })
      .catch(() => { setError('unknown'); setLoading(false); });
  }, [token]);

  // Consulta de Dados Granulares
  const fetchObraData = async (link: LinkInfo, obraId: string) => {
    const data: Record<string, any> = {};

    if (link.permissoes.cronograma?.ativo) {
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nome, statusCronograma, percentualCronograma')
        .eq('obra_id', obraId)
        .order('ordem');
      data.cronograma = cats || [];
    }

    if (link.permissoes.diario?.ativo) {
      const { data: diario } = await supabase
        .from('diario_registros')
        .select('id, data, clima, trabalhadores, servicos_executados')
        .eq('obra_id', obraId)
        .eq('status', 'aprovado')
        .order('data', { ascending: false })
        .limit(5);
      data.diario = diario || [];
    }

    if (link.permissoes.financeiro?.ativo) {
      const [{ data: orcado }, { data: real }] = await Promise.all([
        supabase.from('orcamento_categorias').select('preco_total').eq('obra_id', obraId),
        supabase.from('custo_real').select('valor').eq('obra_id', obraId)
      ]);
      const totalOrcado = orcado?.reduce((acc, curr) => acc + (curr.preco_total || 0), 0) || 0;
      const totalReal = real?.reduce((acc, curr) => acc + (curr.valor || 0), 0) || 0;
      data.financeiro = { orcado: totalOrcado, executado: totalReal };
    }

    setObraData(data);
  };

  // Histórico de Mensagens
  const fetchMensagens = async (linkId: string) => {
    const { data } = await supabase
      .from('obra_link_mensagens')
      .select('*')
      .eq('link_id', linkId)
      .order('created_at', { ascending: true })
      .limit(10);
    if (data) setMensagens(data);
  };

  // Envio de nova Mensagem
  const handleSendMsg = async (e: FormEvent) => {
    e.preventDefault();
    if (!novaMsg.trim() || !info?.link.id) return;
    
    setMsgLoading(true);
    const { error } = await supabase
      .from('obra_link_mensagens')
      .insert({
        link_id: info.link.id,
        texto: novaMsg.trim(),
        de_cliente: true
      });
      
    if (!error) {
      setNovaMsg('');
      await fetchMensagens(info.link.id);
    }
    setMsgLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) return <ErrorPage type={error} />;
  if (!info) return <ErrorPage type="unknown" />;

  const { link, obra } = info;
  const p = link.permissoes;
  const construtoraNome = info.empresa?.nome || "nossa equipe";

  // Cálculos de Entrega
  let diasTexto = '';
  if (obra.data_previsao_termino) {
    const hoje = parseISO(new Date().toISOString().split('T')[0]);
    const fim = parseISO(obra.data_previsao_termino);
    const dias = differenceInDays(fim, hoje);
    
    if (dias === 0) diasTexto = "Entrega hoje";
    else if (dias > 0) diasTexto = `Faltam ${dias} dias`;
    else diasTexto = `${Math.abs(dias)} dias de atraso`;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* ── HEADER WHITE-LABEL ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between">
              <h1 className="text-xl font-bold text-slate-800 leading-tight">
                {obra.nome}
              </h1>
              <StatusBadge status={obra.status} />
            </div>
            {/* Ocultando branding corporativo e reforçando white-label amigável */}
            <p className="text-sm text-slate-500 font-medium">
              Acompanhamento por {construtoraNome}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* ── META / PROGRESSO ── */}
        <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Progresso Geral
              </h2>
              <div className="text-4xl font-bold text-slate-800">
                {obra.percentual_andamento || 0}%
              </div>
            </div>
            {obra.data_previsao_termino && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-slate-500 mb-1">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Entrega Prevista</span>
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {format(parseISO(obra.data_previsao_termino), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </div>
                <Badge variant={diasTexto.includes('atraso') ? 'destructive' : 'secondary'} className="mt-1 shadow-none">
                  {diasTexto}
                </Badge>
              </div>
            )}
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              className="h-full bg-slate-800 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${obra.percentual_andamento || 0}%` }}
            />
          </div>
        </section>

        {/* ── CRONOGRAMA ── */}
        {p.cronograma?.ativo && obraData.cronograma && obraData.cronograma.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  Etapas do Projeto
                </h3>
             </div>
             <div className="p-4 sm:p-5 flex flex-col gap-3">
               {obraData.cronograma.map((et: any) => {
                 const isDone = et.statusCronograma === 'concluida';
                 const isDoing = et.statusCronograma === 'em_andamento';
                 return (
                   <div key={et.id} className={`p-3 rounded-xl border flex items-center gap-4 ${isDone ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-semibold ${isDone ? 'text-slate-500' : 'text-slate-700'}`}>{et.nome}</span>
                          <span className="text-xs font-bold text-slate-500">{et.percentualCronograma || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full w-full overflow-hidden">
                          <div className={`h-full rounded-full ${isDone ? 'bg-green-500' : isDoing ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${et.percentualCronograma || 0}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 w-6 h-6 flex justify-center items-center">
                        {isDone && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {isDoing && <Clock className="w-4 h-4 text-blue-500" />}
                      </div>
                   </div>
                 )
               })}
             </div>
          </section>
        )}

        {/* ── DIÁRIOS ── */}
        {p.diario?.ativo && obraData.diario && obraData.diario.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-slate-500" />
                  Últimos Dias em Campo
                </h3>
             </div>
             <div className="divide-y divide-slate-100">
               {obraData.diario.map((d: any) => (
                 <div key={d.id} className="p-4 sm:p-5">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-bold text-slate-700">
                         {format(parseISO(d.data), "EEEE, dd/MM", { locale: ptBR })}
                       </span>
                       <div className="flex gap-3 text-xs font-medium text-slate-500">
                          {d.clima && (
                            <span className="flex items-center gap-1"><CloudSun className="w-3.5 h-3.5" /> Clima {d.clima}</span>
                          )}
                       </div>
                    </div>
                    {d.servicos_executados && (
                      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {d.servicos_executados}
                      </p>
                    )}
                 </div>
               ))}
             </div>
          </section>
        )}

        {/* ── FINANCEIRO RESUMO ── */}
        {p.financeiro?.ativo && obraData.financeiro && (
          <section className="grid grid-cols-2 gap-3 sm:gap-4">
             <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Orçado</span>
               <span className="text-2xl font-bold text-slate-800">
                 R$ {(obraData.financeiro.orcado / 1000).toFixed(0)}k
               </span>
             </div>
             <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Executado</span>
               <span className="text-2xl font-bold text-slate-800">
                 R$ {(obraData.financeiro.executado / 1000).toFixed(0)}k
               </span>
             </div>
          </section>
        )}

        {/* ── RELATÓRIOS ── */}
        {p.relatorio?.ativo && (
           <Button variant="outline" className="w-full h-14 rounded-xl border-slate-200 shadow-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
             <Download className="w-5 h-5" />
             Baixar Relatório PDF de Progresso
           </Button>
        )}

        {/* ── MENSAGENS (CHAT ASSIMÉTRICO) ── */}
        <section className="bg-slate-800 rounded-2xl overflow-hidden shadow-md mt-8">
           <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50">
              <h3 className="font-bold text-white">Comunicação</h3>
              <p className="text-sm text-slate-400">Deixe uma observação ou tire dúvidas com nossa equipe.</p>
           </div>
           <div className="p-4 sm:p-5 flex flex-col gap-4">
              
              {/* Histórico */}
              {mensagens.length > 0 && (
                <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 pb-2">
                  {mensagens.map(m => (
                    <div key={m.id} className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.de_cliente ? 'bg-blue-600 text-white self-end rounded-tr-sm' : 'bg-slate-700 text-slate-200 self-start rounded-tl-sm'}`}>
                      {m.texto}
                      <div className={`text-[10px] mt-1 text-right opacity-70`}>
                        {format(parseISO(m.created_at), "dd/MM 'às' HH:mm")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleSendMsg} className="flex gap-2 relative">
                 <textarea
                   rows={2}
                   className="w-full bg-slate-700 border-none text-white placeholder-slate-400 rounded-xl resize-none py-3 pl-4 pr-12 focus:ring-2 focus:ring-blue-500 text-sm"
                   placeholder="Digite sua mensagem aqui..."
                   value={novaMsg}
                   onChange={e => setNovaMsg(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMsg(e); }
                   }}
                 />
                 <Button 
                   type="submit" 
                   disabled={msgLoading || !novaMsg.trim()} 
                   className="absolute right-2 bottom-2 rounded-lg bg-blue-600 hover:bg-blue-500 w-10 h-10 p-0 flex items-center justify-center shrink-0"
                 >
                   {msgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                 </Button>
              </form>
           </div>
        </section>

      </main>

      <footer className="mt-4 pb-8 text-center px-4">
         <p className="text-xs text-slate-400">
           Informações atualizadas constantemente. Propriedade de <strong>{construtoraNome}</strong>.
         </p>
      </footer>
    </div>
  );
}
