import { useState, useEffect } from 'react';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useEstoque } from '@/contexts/EstoqueContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import {
  Building2, DollarSign, CalendarDays, BookOpen, Package,
  BarChart3, AlertTriangle, TrendingUp, Plus, Clock, CheckCircle2, CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatCurrency, formatDate,
  statusEtapaLabels, statusDiarioLabels, climaLabels
} from '@/data/mockData';

interface DiarioRow {
  id: string;
  data: string;
  clima: string;
  trabalhadores: number;
  servicos_executados: string | null;
  problemas: string | null;
  observacoes: string | null;
  status: string;
  usuario_nome: string;
  obra_id: string;
  user_id: string;
}

function useDiarioRegistros(obraId?: string) {
  const [registros, setRegistros] = useState<DiarioRow[]>([]);
  useEffect(() => {
    if (!obraId) return;
    supabase.from('diario_registros').select('*').eq('obra_id', obraId).order('data', { ascending: false })
      .then(({ data }) => { if (data) setRegistros(data as DiarioRow[]); });
  }, [obraId]);
  return registros;
}

function GestorDashboard() {
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { getMateriaisByObra } = useEstoque();
  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const obra = obras.find(o => o.id === selectedObraId) || obras[0];
  const diarioRegistros = useDiarioRegistros(obra?.id);

  if (!obra) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Nenhuma obra cadastrada. Crie uma obra para começar.
      </div>
    );
  }

  const orcamento = getOrcamento(obra.id);
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);

  const today = new Date();

  // Compute physical progress from cronograma categories
  const computePercentual = (cat: typeof categorias[0]) => {
    if (cat.percentualCronograma != null) return cat.percentualCronograma;
    if (!cat.usaComposicoes || cat.composicoes.length === 0) return 0;
    const totalPeso = cat.composicoes.reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
    if (totalPeso === 0) {
      const done = cat.composicoes.filter(c => c.concluida).length;
      return Math.round((done / cat.composicoes.length) * 100);
    }
    const done = cat.composicoes.filter(c => c.concluida).reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
    return Math.round((done / totalPeso) * 100);
  };

  const andamentoReal = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + computePercentual(c), 0) / categorias.length)
    : obra.percentualAndamento;

  // Andamento Planejado: % of etapas whose dataFimPrevista <= today
  const andamentoPlanejado = (() => {
    if (categorias.length === 0) return 0;
    const withDates = categorias.filter(c => c.dataFimPrevista);
    if (withDates.length === 0) return 0;
    const shouldBeDone = withDates.filter(c => new Date(c.dataFimPrevista!) <= today).length;
    return Math.round((shouldBeDone / categorias.length) * 100);
  })();

  const materiaisObra = getMateriaisByObra(obra.id);
  const materiaisBaixo = materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo).length;
  const etapasAtrasadas = categorias.filter(c => {
    if (c.statusCronograma === 'atrasada') return true;
    if (c.dataFimPrevista && !c.dataFimReal && new Date() > new Date(c.dataFimPrevista)) return true;
    return false;
  }).length;
  const registrosPendentes = diarioRegistros.filter(d => d.status === 'pendente').length;
  const totalAlertas = materiaisBaixo + registrosPendentes + etapasAtrasadas;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral das suas obras</p>
        </div>
        <Select value={selectedObraId} onValueChange={setSelectedObraId}>
          <SelectTrigger className="w-[280px] h-9 text-sm">
            <SelectValue placeholder="Selecionar obra em destaque..." />
          </SelectTrigger>
          <SelectContent>
            {obras.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Orçamento Planejado</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Andamento Planejado</p>
                <p className="text-2xl font-bold text-foreground">{andamentoPlanejado}%</p>
                <Progress value={andamentoPlanejado} className="h-1.5 mt-1 w-24" />
              </div>
              <CalendarCheck className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Andamento Real</p>
                <p className="text-2xl font-bold text-foreground">{andamentoReal}%</p>
                <Progress value={andamentoReal} className="h-1.5 mt-1 w-24" />
                {andamentoPlanejado > 0 && (
                  <p className={`text-[10px] font-medium mt-0.5 ${andamentoReal >= andamentoPlanejado ? 'text-success' : 'text-destructive'}`}>
                    {andamentoReal >= andamentoPlanejado ? 'No prazo' : `${andamentoPlanejado - andamentoReal}% atrasado`}
                  </p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Alertas</p>
                <p className={`text-2xl font-bold ${totalAlertas > 0 ? 'text-warning' : 'text-foreground'}`}>{totalAlertas}</p>
                {totalAlertas > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {[etapasAtrasadas > 0 && `${etapasAtrasadas} atraso(s)`, materiaisBaixo > 0 && `${materiaisBaixo} estoque`, registrosPendentes > 0 && `${registrosPendentes} pendente(s)`].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Obra em destaque */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Obra em Destaque</CardTitle>
            <Badge variant="secondary" className="bg-success/10 text-success border-0 text-xs">{obra.status === 'em_andamento' ? 'Em Andamento' : obra.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold text-foreground">{obra.nome}</h3>
          <p className="text-sm text-muted-foreground mb-3">{obra.endereco}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso Real</span>
              <span className="font-medium text-foreground">{andamentoReal}%</span>
            </div>
            <Progress value={andamentoReal} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Orçamento Previsto</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(totalPrevisto)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Planejado vs Real</p>
              <p className="text-sm font-semibold text-foreground">{andamentoPlanejado}% → {andamentoReal}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pontos de Atenção */}
      {(etapasAtrasadas > 0 || materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo).length > 0 || registrosPendentes > 0) && (
        <Card className="shadow-card border-warning/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categorias.filter(c => {
              if (c.statusCronograma === 'atrasada') return true;
              if (c.dataFimPrevista && !c.dataFimReal && new Date() > new Date(c.dataFimPrevista)) return true;
              return false;
            }).map(c => (
              <p key={c.id} className="text-sm text-foreground">📅 {c.nome} — etapa atrasada ({computePercentual(c)}% concluído)</p>
            ))}
            {materiaisObra.filter(m => m.estoqueAtual < m.estoqueMinimo).map(m => (
              <p key={m.id} className="text-sm text-foreground">📦 {m.nome} — estoque em {m.estoqueAtual} {m.unidade} (mínimo: {m.estoqueMinimo})</p>
            ))}
            {registrosPendentes > 0 && (
              <p className="text-sm text-foreground">📋 {registrosPendentes} registro(s) de diário pendente(s) de aprovação</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick access & recent */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { to: '/orcamento', label: 'Orçamento', icon: DollarSign },
              { to: '/cronograma', label: 'Cronograma', icon: CalendarDays },
              { to: '/diario', label: 'Diário', icon: BookOpen },
              { to: '/estoque', label: 'Estoque', icon: Package },
              { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
              { to: '/obras', label: 'Obras', icon: Building2 },
            ].map(item => (
              <Link key={item.to} to={item.to} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                <item.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Diário Recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diarioRegistros.slice(0, 3).map(d => (
              <div key={d.id} className="flex items-start justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatDate(d.data)} · {climaLabels[d.clima as keyof typeof climaLabels]}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{d.servicos_executados}</p>
                </div>
                <Badge variant={d.status === 'aprovado' ? 'default' : 'secondary'} className={d.status === 'aprovado' ? 'bg-success/10 text-success border-0' : 'bg-warning/10 text-warning border-0'}>
                  {statusDiarioLabels[d.status as keyof typeof statusDiarioLabels]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FuncionarioDashboard() {
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const { user } = useAuth();
  const obra = obras[0];
  const diarioRegistros = useDiarioRegistros(obra?.id);
  const meusRegistros = diarioRegistros.filter(d => d.user_id === user?.id);
  const orcamento = obra ? getOrcamento(obra.id) : null;
  const categorias = orcamento?.categorias || [];
  const etapasAndamento = categorias.filter(c => c.statusCronograma === 'em_andamento');

  if (!obra) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Nenhuma obra disponível.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Bem-vindo de volta, {user?.name || 'Funcionário'}</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground">{obra.nome}</h3>
          <p className="text-sm text-muted-foreground">{obra.endereco}</p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{obra.percentualAndamento}%</span>
            </div>
            <Progress value={obra.percentualAndamento} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/diario">
          <Button className="w-full h-auto py-4 flex-col gap-2">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Novo Diário</span>
          </Button>
        </Link>
        <Link to="/estoque">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
            <Package className="h-5 w-5" />
            <span className="text-xs">Movimentar Estoque</span>
          </Button>
        </Link>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Etapas em Andamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {etapasAndamento.map(e => (
            <div key={e.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">{e.nome}</span>
                <span className="text-muted-foreground">{e.percentualCronograma || 0}%</span>
              </div>
              <Progress value={e.percentualCronograma || 0} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Meus Registros Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {meusRegistros.slice(0, 4).map(d => (
            <div key={d.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{formatDate(d.data)}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{d.servicos_executados}</p>
              </div>
              <Badge variant="secondary" className={d.status === 'aprovado' ? 'bg-success/10 text-success border-0' : 'bg-warning/10 text-warning border-0'}>
                {statusDiarioLabels[d.status as keyof typeof statusDiarioLabels]}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ClienteDashboard() {
  const { obras } = useObras();
  const { getOrcamento } = useOrcamento();
  const obra = obras[0];
  const diarioRegistros = useDiarioRegistros(obra?.id);
  const orcamento = obra ? getOrcamento(obra.id) : null;
  const categorias = orcamento?.categorias || [];
  const totalPrevisto = categorias.reduce((s, c) => s + c.precoTotal, 0);
  const registrosAprovados = diarioRegistros.filter(d => d.status === 'aprovado');
  const proximasEtapas = categorias.filter(c => c.statusCronograma === 'em_andamento' || c.statusCronograma === 'nao_iniciada').slice(0, 3);

  if (!obra) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Nenhuma obra disponível.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Obra</h1>
        <p className="text-muted-foreground text-sm">Acompanhe o andamento da sua obra</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-foreground">{obra.nome}</h3>
          <p className="text-sm text-muted-foreground mb-4">{obra.endereco}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="text-lg font-bold text-primary">{obra.percentualAndamento}%</span>
            </div>
            <Progress value={obra.percentualAndamento} className="h-3" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Previsto</p>
            <p className="text-base font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Andamento</p>
            <p className="text-base font-bold text-foreground">{obra?.percentualAndamento || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Próximas Etapas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proximasEtapas.map(e => (
            <div key={e.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{e.nome}</p>
                <p className="text-xs text-muted-foreground">{e.dataInicioPrevista ? formatDate(e.dataInicioPrevista) : '—'} → {e.dataFimPrevista ? formatDate(e.dataFimPrevista) : '—'}</p>
              </div>
              <Badge variant="secondary" className={
                e.statusCronograma === 'em_andamento' ? 'bg-primary/10 text-primary border-0' :
                'bg-muted text-muted-foreground border-0'
              }>
                {e.statusCronograma ? statusEtapaLabels[e.statusCronograma] : 'Não iniciada'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimas Atualizações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {registrosAprovados.slice(0, 4).map(d => (
            <div key={d.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-foreground">{formatDate(d.data)}</p>
                <span className="text-xs text-muted-foreground">{climaLabels[d.clima as keyof typeof climaLabels]}</span>
              </div>
              <p className="text-sm text-muted-foreground">{d.servicos_executados}</p>
              {d.problemas && <p className="text-xs text-destructive mt-1">⚠ {d.problemas}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'gestor') return <GestorDashboard />;
  if (user.role === 'funcionario') return <FuncionarioDashboard />;
  return <ClienteDashboard />;
}
