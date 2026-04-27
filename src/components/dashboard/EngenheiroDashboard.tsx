import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { supabase } from '@/integrations/supabase/untyped';
import {
  Building2, AlertTriangle, CheckCircle2, BookOpen,
  CalendarDays, Construction, ArrowRight, Lightbulb, Clock, FileSignature
} from 'lucide-react';
import PageShell, { PageKPI } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isBefore, isAfter, addDays, startOfDay, startOfWeek, endOfWeek, differenceInDays, startOfMonth, endOfMonth, differenceInBusinessDays } from 'date-fns';

interface ObraSignals {
  tarefasAtrasadas: number;
  impedimentosAbertos: number;
  impedimentosUrge: number;
  impedimentosVelhos: number;
  diarioHoje: boolean;
  diarioSemana: number;
  pagamentosVencidos: number;
  etapasVencendoSemana: number;
  etapasIniciandoMes: number;
  contratosSemMedicao: number;
  spi: number;
  andamentoReal: number;
}

export default function EngenheiroDashboard() {
  const { obras } = useObras();
  const { setSelectedObraId } = useObraSelection();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState({
    tarefas: [] as any[],
    impedimentos: [] as any[],
    diario: [] as any[],
    pagamentos: [] as any[],
    contratos: [] as any[]
  });

  const obraIds = useMemo(() => obras.map(o => o.id), [obras]);
  const obraIdsKey = obraIds.join(',');

  useEffect(() => {
    if (obraIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      supabase.from('cronograma_tarefas').select('id, obra_id, percentual_concluido, data_fim, data_inicio').in('obra_id', obraIds),
      supabase.from('cronograma_impedimentos').select('id, obra_id, resolvido, created_at').in('obra_id', obraIds),
      supabase.from('diario_registros').select('id, obra_id, data').in('obra_id', obraIds).order('data', { ascending: false }),
      supabase.from('pagamentos').select('id, obra_id, status, data_vencimento').in('obra_id', obraIds),
      supabase.from('contratos').select('id, obra_id, contratos_medicoes!contratos_medicoes_contrato_id_fkey(data_referencia, status)').in('obra_id', obraIds)
    ]).then(([resT, resI, resD, resP, resC]) => {
      setDbData({
        tarefas: resT.data || [],
        impedimentos: resI.data || [],
        diario: resD.data || [],
        pagamentos: resP.data || [],
        contratos: resC.data || []
      });
      setLoading(false);
    });
  }, [obraIdsKey]);

  if (obraIds.length === 0) {
    return (
      <PageShell title="Minhas Obras" subtitle="Cockpit de engajamento do engenheiro">
        <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in text-center px-4">
          <div className="bg-muted p-6 rounded-full mb-6 relative">
            <Building2 className="h-16 w-16 text-muted-foreground/50" />
            <AlertTriangle className="h-6 w-6 text-warning absolute bottom-4 right-4 bg-background rounded-full overflow-hidden" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nenhuma obra vinculada</h2>
          <p className="text-muted-foreground max-w-sm mb-6">Você não possui permissão de acesso a nenhuma obra do sistema. Solicite ao gestor a alocação de seu perfil nas obras ativas.</p>
        </div>
      </PageShell>
    );
  }

  const hoje = startOfDay(new Date());
  const strHoje = format(hoje, 'yyyy-MM-dd');
  const inicioSem = startOfWeek(hoje, { weekStartsOn: 1 });
  const fimSem = endOfWeek(hoje, { weekStartsOn: 1 });
  const incioMs = startOfMonth(hoje);
  const fimMs = endOfMonth(hoje);

  const mapSignals = useMemo(() => {
    const signals: Record<string, ObraSignals> = {};

    obraIds.forEach(id => {
      const tarefas = dbData.tarefas.filter(t => t.obra_id === id);
      const impedimentos = dbData.impedimentos.filter(i => i.obra_id === id);
      const diario = dbData.diario.filter(d => d.obra_id === id);
      const pagamentos = dbData.pagamentos.filter(p => p.obra_id === id);
      const contratos = dbData.contratos.filter(c => c.obra_id === id);

      const activeTs = tarefas.filter(t => t.data_fim);
      const atrasadas = activeTs.filter(t => t.percentual_concluido < 100 && isBefore(parseISO(t.data_fim), hoje)).length;
      const vencSemana = activeTs.filter(t => t.percentual_concluido < 100 && isAfter(parseISO(t.data_fim), addDays(hoje, -1)) && isBefore(parseISO(t.data_fim), addDays(fimSem, 1))).length;
      const inicioMes = tarefas.filter(t => t.data_inicio && (t.percentual_concluido || 0) === 0 && isAfter(parseISO(t.data_inicio), addDays(incioMs, -1)) && isBefore(parseISO(t.data_inicio), addDays(fimMs, 1))).length;

      const andReal = activeTs.length > 0 ? (activeTs.reduce((s, c) => s + c.percentual_concluido, 0) / activeTs.length) : 0;
      const scheduledDone = activeTs.filter(t => isBefore(parseISO(t.data_fim), hoje)).length;
      const andPlan = activeTs.length > 0 ? ((scheduledDone / activeTs.length) * 100) : 0;
      const spi = andPlan > 0 ? andReal / andPlan : 1.0;

      const abertos = impedimentos.filter(i => !i.resolvido);
      const velhos = abertos.filter(i => differenceInBusinessDays(hoje, parseISO(i.created_at)) >= 3).length;
      const urgentes = abertos.filter(i => differenceInBusinessDays(hoje, parseISO(i.created_at)) < 3).length;

      const dHoje = diario.some(d => d.data === strHoje);
      const dSemana = diario.filter(d => isAfter(parseISO(d.data), addDays(inicioSem, -1)) && isBefore(parseISO(d.data), addDays(fimSem, 1))).length;

      const vencidos = pagamentos.filter(p => p.status === 'atrasado' || (p.status === 'previsto' && isBefore(parseISO(p.data_vencimento), hoje))).length;

      const contrSemMed = contratos.filter(c => {
        const purs = c.contratos_medicoes || [];
        if (purs.length === 0) return true;
        const last = [...purs].sort((a: any, b: any) => new Date(b.data_referencia).getTime() - new Date(a.data_referencia).getTime())[0];
        return differenceInDays(hoje, parseISO(last.data_referencia)) >= 25 && last.status !== 'concluida';
      }).length;

      signals[id] = {
        tarefasAtrasadas: atrasadas,
        impedimentosAbertos: abertos.length,
        impedimentosUrge: urgentes,
        impedimentosVelhos: velhos,
        diarioHoje: dHoje,
        diarioSemana: dSemana,
        pagamentosVencidos: vencidos,
        etapasVencendoSemana: vencSemana,
        etapasIniciandoMes: inicioMes,
        contratosSemMedicao: contrSemMed,
        spi,
        andamentoReal: andReal
      };
    });
    return signals;
  }, [dbData, obraIds, hoje, strHoje, inicioSem, fimSem, incioMs, fimMs]);

  const totais = useMemo(() => {
    let etapasAtraso = 0;
    let impedimentosOb = 0;
    let diarioPendentes = 0;
    let pagsVencendo = 0;
    let diariosSemanaGeral = 0;

    obraIds.forEach(id => {
      const s = mapSignals[id];
      if (s) {
        etapasAtraso += s.tarefasAtrasadas;
        impedimentosOb += s.impedimentosAbertos;
        if (!s.diarioHoje) diarioPendentes++;
        pagsVencendo += s.pagamentosVencidos;
        diariosSemanaGeral += s.diarioSemana;
      }
    });
    return { etapasAtraso, impedimentosOb, diarioPendentes, pagsVencendo, diariosSemanaGeral };
  }, [mapSignals, obraIds]);

  const kpis: PageKPI[] = [
    {
      id: 'kpi-obras', label: 'Obras Ativas', value: String(obras.length),
      icon: <Building2 size={18} className="text-primary" />,
      main: true, tint: '#fdfbfe', valueColor: 'var(--color-primary)', labelColor: '#6b7280',
    },
    {
      id: 'kpi-atrasos', label: 'Etapas em Atraso Global', value: String(totais.etapasAtraso),
      icon: <AlertTriangle size={18} className="text-orange-500" />,
      tint: '#fafafa', valueColor: totais.etapasAtraso > 0 ? '#f97316' : '#6b7280', labelColor: '#6b7280',
    },
    {
      id: 'kpi-diarios', label: 'Diários desta Semana', value: String(totais.diariosSemanaGeral),
      icon: <BookOpen size={18} className="text-blue-500" />,
      tint: '#f0f9ff', valueColor: '#3b82f6', labelColor: '#6b7280',
    }
  ];

  const handleOpenObra = (id: string) => {
    setSelectedObraId(id);
    navigate('/painel');
  };

  return (
    <PageShell title="Minhas Obras" subtitle="Controle gerencial de portfólio e ações prioritárias" kpis={kpis}>
      {loading ? (
        <div className="flex h-64 items-center justify-center animate-pulse"><p className="text-muted-foreground">Consolidando dados do seu portfólio...</p></div>
      ) : (
        <div className="max-w-[1280px] mx-auto w-full space-y-6 pb-20 animate-fade-in mt-1 px-4 sm:px-6 h-full overflow-y-auto">
          
          <section className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-5 pb-6 text-slate-100 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Briefing Operacional Consolidado
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">{obras.length} obras sob sua tutoria · {totais.etapasAtraso} etapas requerem atenção hoje.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 rounded border border-slate-700/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Etapas Atrasadas</p>
                <p className={`text-xl font-bold ${totais.etapasAtraso > 0 ? 'text-orange-400' : 'text-slate-300'}`}>{totais.etapasAtraso}</p>
              </div>
              <div className="bg-slate-800/80 rounded border border-slate-700/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Impedimentos Ativos</p>
                <p className={`text-xl font-bold ${totais.impedimentosOb > 0 ? 'text-red-400' : 'text-slate-300'}`}>{totais.impedimentosOb}</p>
              </div>
              <div className="bg-slate-800/80 rounded border border-slate-700/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Diários não Preenchidos</p>
                <p className={`text-xl font-bold ${totais.diarioPendentes > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{totais.diarioPendentes}</p>
              </div>
              <div className="bg-slate-800/80 rounded border border-slate-700/50 p-3">
                <p className="text-xs text-slate-400 mb-1">Pagamentos Vencidos/Hoje</p>
                <p className={`text-xl font-bold ${totais.pagsVencendo > 0 ? 'text-red-400' : 'text-slate-300'}`}>{totais.pagsVencendo}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2"><Lightbulb className="h-4 w-4" /> Radar Hoje</h4>
              <ul className="space-y-2 text-sm bg-card p-3 rounded-lg border">
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Obras s/ diário:</span>
                  <span className="font-semibold text-amber-600">{totais.diarioPendentes}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Impedimentos urgentes:</span>
                  <span className="font-semibold text-red-600">{obras.reduce((s,o) => s + mapSignals[o.id].impedimentosUrge, 0)}</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2"><Clock className="h-4 w-4" /> Radar Semanal</h4>
              <ul className="space-y-2 text-sm bg-card p-3 rounded-lg border">
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Etapas no limite (7d):</span>
                  <span className="font-semibold text-orange-600">{obras.reduce((s,o) => s + mapSignals[o.id].etapasVencendoSemana, 0)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Saúde Diários:</span>
                  <span className="font-semibold">{totais.diariosSemanaGeral} validados</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2"><CalendarDays className="h-4 w-4" /> Visão Mensal</h4>
              <ul className="space-y-2 text-sm bg-card p-3 rounded-lg border">
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Contratos pendentes (BM):</span>
                  <span className="font-semibold text-blue-600">{obras.reduce((s,o) => s + mapSignals[o.id].contratosSemMedicao, 0)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground text-xs font-medium">Etapas a iniciar:</span>
                  <span className="font-semibold">{obras.reduce((s,o) => s + mapSignals[o.id].etapasIniciandoMes, 0)}</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="pt-2">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Construction className="h-5 w-5 text-muted-foreground" /> Seus Projetos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {obras.map(o => {
                const s = mapSignals[o.id];
                if (!s) return null;

                const spiColor = s.spi >= 0.95 ? 'text-emerald-600' : s.spi >= 0.8 ? 'text-amber-600' : 'text-red-500';

                return (
                  <Card key={o.id} className="shadow-card flex flex-col justify-between overflow-hidden">
                    <div>
                      <div className="h-2 w-full bg-slate-100 relative">
                        <div className="h-full bg-primary" style={{ width: `${s.andamentoReal}%` }} />
                      </div>
                      <CardHeader className="pb-3 border-b border-border/40">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">{o.codigo}</span>
                            <CardTitle className="text-base truncate leading-tight mt-0.5">{o.nome}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-3 pb-4 space-y-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Progresso</p>
                            <p className="font-bold">{s.andamentoReal.toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-muted-foreground uppercase font-semibold">SPI</p>
                            <p className={`font-bold ${spiColor}`}>{s.spi.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {!s.diarioHoje && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                              <BookOpen className="h-3.5 w-3.5" /> <span>Diário não feito hoje</span>
                            </div>
                          )}
                          {s.tarefasAtrasadas > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-1.5 rounded">
                              <AlertTriangle className="h-3.5 w-3.5" /> <span>{s.tarefasAtrasadas} tarefa(s) atrasada(s)</span>
                            </div>
                          )}
                          {s.impedimentosVelhos > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-1.5 rounded">
                              <AlertTriangle className="h-3.5 w-3.5" /> <span>{s.impedimentosVelhos} impedimento(s) parado(s)</span>
                            </div>
                          )}
                          {s.contratosSemMedicao > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-1.5 rounded">
                              <FileSignature className="h-3.5 w-3.5" /> <span>{s.contratosSemMedicao} contrato(s) sem boletim</span>
                            </div>
                          )}
                          
                          {s.diarioHoje && s.tarefasAtrasadas === 0 && s.impedimentosAbertos === 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 p-1.5 rounded">
                              <CheckCircle2 className="h-3.5 w-3.5" /> <span>Obra sem irregularidades</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </div>
                    <div className="p-4 pt-0">
                      <Button className="w-full bg-slate-900 border-0" variant="default" onClick={() => handleOpenObra(o.id)}>
                        Abrir Obra <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </PageShell>
  );
}
