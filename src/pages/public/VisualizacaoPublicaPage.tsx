/**
 * VisualizacaoPublicaPage — /v/:token
 * Página pública (sem login) para clientes/stakeholders visualizarem dados da obra.
 * Permissões granulares configuradas pelo gestor ao criar o link.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Calendar, TrendingUp, Eye, AlertTriangle, Loader2,
  Link2Off, Clock, CheckCircle2, Circle, ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

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
}

type ErrorType = 'not_found' | 'expired' | 'disabled' | 'unknown';

const SUPABASE_URL = 'https://ehmdwwuhhumgxhsjvvrr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Helpers ────────────────────────────────────────────────────────────────────

function hasPermission(permissoes: LinkInfo['permissoes'], secao: string, indicador?: string): boolean {
  const s = permissoes[secao];
  if (!s?.ativo) return false;
  if (!indicador) return true;
  return (s.indicadores || []).includes(indicador);
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    em_andamento:  { label: 'Em andamento',  cls: 'bg-primary/10 text-primary border-primary/20' },
    planejamento:  { label: 'Planejamento',  cls: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    concluida:     { label: 'Concluída',     cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
    paralisada:    { label: 'Paralisada',    cls: 'bg-red-500/10 text-red-700 border-red-200' },
  };
  const cfg = map[status || ''] || { label: status || '—', cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={cn('text-xs', cfg.cls)}>{cfg.label}</Badge>;
}

// ── Section: Painel ────────────────────────────────────────────────────────────

function PainelSection({ obra, permissoes, data }: { obra: ObraInfo; permissoes: LinkInfo['permissoes']; data: any }) {
  const showAndamento = hasPermission(permissoes, 'painel', 'andamento');
  const showCronograma = hasPermission(permissoes, 'painel', 'cronograma_mini');
  const showFotos = hasPermission(permissoes, 'painel', 'fotos');
  const showKpis = hasPermission(permissoes, 'painel', 'kpis_financeiros');

  const pct = obra.percentual_andamento ?? 0;

  return (
    <div className="space-y-5">
      {/* Card principal da obra */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">{obra.nome}</h2>
            {obra.codigo && <p className="text-xs text-muted-foreground">Código: {obra.codigo}</p>}
            {obra.cliente && <p className="text-sm text-muted-foreground mt-0.5">{obra.cliente}</p>}
          </div>
          <StatusBadge status={obra.status} />
        </div>

        {obra.endereco && (
          <p className="text-xs text-muted-foreground">{obra.endereco}</p>
        )}

        {(obra.data_inicio || obra.data_previsao_termino) && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {obra.data_inicio && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Início: {format(new Date(obra.data_inicio), "dd/MM/yyyy")}
              </span>
            )}
            {obra.data_previsao_termino && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Previsão: {format(new Date(obra.data_previsao_termino), "dd/MM/yyyy")}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Andamento */}
      {showAndamento && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Andamento Geral</p>
            <span className="text-2xl font-bold text-primary">{pct}%</span>
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {pct < 25 ? 'Obra em fase inicial' : pct < 60 ? 'Obra em andamento' : pct < 90 ? 'Fase avançada de execução' : 'Próxima da conclusão'}
          </p>
        </div>
      )}

      {/* KPIs financeiros (se permitido) */}
      {showKpis && data?.financeiro && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Orçado', value: data.financeiro.orcado },
            { label: 'Pago', value: data.financeiro.pago },
            { label: 'Saldo', value: data.financeiro.saldo },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className="text-sm font-bold text-foreground mt-1">
                {k.value != null ? `R$ ${(k.value / 1000).toFixed(0)}k` : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Mini-cronograma */}
      {showCronograma && data?.cronograma && data.cronograma.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Etapas</p>
          <div className="space-y-2">
            {data.cronograma.slice(0, 6).map((e: any) => {
              const statusIcons: Record<string, JSX.Element> = {
                concluida:    <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                em_andamento: <TrendingUp className="h-4 w-4 text-primary" />,
                atrasada:     <AlertTriangle className="h-4 w-4 text-red-500" />,
              };
              const Icon = statusIcons[e.statusCronograma] || <Circle className="h-4 w-4 text-muted-foreground/40" />;
              return (
                <div key={e.id} className="flex items-center gap-3">
                  {Icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{e.nome}</p>
                    <Progress value={e.percentualCronograma || 0} className="h-1 mt-1" />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {e.percentualCronograma || 0}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fotos recentes */}
      {showFotos && data?.fotos && data.fotos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Fotos Recentes</p>
          <div className="grid grid-cols-3 gap-2">
            {data.fotos.slice(0, 6).map((url: string, i: number) => (
              <img key={i} src={url} alt={`Foto ${i + 1}`} className="rounded-lg aspect-square object-cover w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Diário ────────────────────────────────────────────────────────────

function DiarioSection({ permissoes, data }: { permissoes: LinkInfo['permissoes']; data: any }) {
  const showRegistros = hasPermission(permissoes, 'diario', 'registros');
  const showFotos = hasPermission(permissoes, 'diario', 'fotos');
  const showTrab = hasPermission(permissoes, 'diario', 'trabalhadores');

  const registros = data?.diario || [];

  if (!showRegistros && !showFotos) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">Diário de Obra</h3>
      {registros.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro de diário disponível.</p>
      ) : (
        registros.slice(0, 5).map((r: any) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{format(new Date(r.data), "dd 'de' MMMM", { locale: ptBR })}</p>
              {showTrab && r.trabalhadores && (
                <span className="text-xs text-muted-foreground">{r.trabalhadores} trabalhadores</span>
              )}
            </div>
            {showRegistros && r.servicos_executados && (
              <p className="text-sm text-muted-foreground">{r.servicos_executados}</p>
            )}
            {showFotos && r.fotos && r.fotos.length > 0 && (
              <div className="grid grid-cols-4 gap-1">
                {r.fotos.slice(0, 4).map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="rounded aspect-square object-cover w-full" />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Error Page ─────────────────────────────────────────────────────────────────

function ErrorPage({ type }: { type: ErrorType }) {
  const msgs: Record<ErrorType, { title: string; desc: string }> = {
    not_found: { title: 'Link não encontrado', desc: 'Este link não existe ou foi removido. Entre em contato com quem enviou o link.' },
    expired: { title: 'Link expirado', desc: 'Este link de acesso expirou. Solicite um novo link ao responsável pela obra.' },
    disabled: { title: 'Link desativado', desc: 'O acesso a este link foi temporariamente desativado. Aguarde e tente novamente.' },
    unknown: { title: 'Erro de acesso', desc: 'Ocorreu um erro ao carregar este link. Tente novamente em alguns instantes.' },
  };
  const m = msgs[type];
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Link2Off className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.desc}</p>
        <p className="text-xs text-muted-foreground/60">ObraConectada · Gestão de Obras</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function VisualizacaoPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType | null>(null);
  const [info, setInfo] = useState<VerifyResponse | null>(null);
  const [obraData, setObraData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  // ── Verifica token ─────────────────────────────────────────────────────────
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

        // Determina primeira aba ativa
        const primeiraAtiva = Object.entries(res.link.permissoes as Record<string, any>)
          .find(([, v]) => v.ativo)?.[0] || 'painel';
        setActiveTab(primeiraAtiva);

        // Busca dados necessários para as seções permitidas
        await fetchObraData(res.link, res.obra.id);
        setLoading(false);
      })
      .catch(() => { setError('unknown'); setLoading(false); });
  }, [token]);

  const fetchObraData = async (link: LinkInfo, obraId: string) => {
    const data: Record<string, any> = {};

    if (link.permissoes.painel?.ativo || link.permissoes.cronograma?.ativo) {
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
        .select('id, data, clima, trabalhadores, servicos_executados, fotos, problemas')
        .eq('obra_id', obraId)
        .eq('status', 'aprovado')
        .order('data', { ascending: false })
        .limit(10);
      data.diario = diario || [];

      // Fotos do diário para o painel
      const fotos = (diario || []).flatMap((r: any) => r.fotos || []);
      data.fotos = fotos;
    }

    setObraData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) return <ErrorPage type={error} />;
  if (!info) return <ErrorPage type="unknown" />;

  const { link, obra } = info;
  const secoesAtivas = Object.entries(link.permissoes).filter(([, v]) => v.ativo).map(([k]) => k);
  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  const TAB_LABELS: Record<string, string> = {
    painel: 'Painel', cronograma: 'Cronograma',
    financeiro: 'Financeiro', diario: 'Diário', relatorio: 'Relatório',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header público */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{obra.nome}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{hoje}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Visualização</span>
          </div>
        </div>

        {/* Tabs */}
        {secoesAtivas.length > 1 && (
          <div className="max-w-2xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0 scrollbar-none">
            {secoesAtivas.map(s => (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={cn(
                  'px-3 py-2.5 text-xs font-medium border-b-2 shrink-0 transition-colors',
                  activeTab === s
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {TAB_LABELS[s] || s}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {activeTab === 'painel' && (
          <PainelSection obra={obra} permissoes={link.permissoes} data={obraData} />
        )}
        {activeTab === 'cronograma' && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Cronograma</h3>
            {(obraData?.cronograma || []).map((e: any) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{e.nome}</p>
                  <span className="text-xs text-muted-foreground">{e.percentualCronograma || 0}%</span>
                </div>
                <Progress value={e.percentualCronograma || 0} className="h-2" />
              </div>
            ))}
          </div>
        )}
        {activeTab === 'diario' && (
          <DiarioSection permissoes={link.permissoes} data={obraData} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            Powered by <strong>ObraConectada</strong> · Acesso compartilhado · Somente leitura
          </p>
        </div>
      </footer>
    </div>
  );
}
