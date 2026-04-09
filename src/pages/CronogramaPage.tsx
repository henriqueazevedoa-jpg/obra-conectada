import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { useOrcamento, OrcamentoCategoria, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, AlertTriangle, CheckCircle2, Clock, Plus, Save, ChevronDown, ChevronRight, BarChart3, List, CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import VoiceInputButton from '@/components/voice/VoiceInputButton';
import { formatDate, statusEtapaLabels } from '@/data/mockData';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  nao_iniciada: 'bg-muted text-muted-foreground border-0',
  em_andamento: 'bg-primary/10 text-primary border-0',
  concluida: 'bg-success/10 text-success border-0',
  atrasada: 'bg-destructive/10 text-destructive border-0',
};

const statusIcons: Record<string, React.ReactNode> = {
  nao_iniciada: <Clock className="h-4 w-4 text-muted-foreground" />,
  em_andamento: <CalendarDays className="h-4 w-4 text-primary" />,
  concluida: <CheckCircle2 className="h-4 w-4 text-success" />,
  atrasada: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

function computeStatus(cat: OrcamentoCategoria): string {
  if (cat.statusCronograma) return cat.statusCronograma;
  if ((cat.percentualCronograma ?? 0) >= 100) return 'concluida';
  if (cat.dataInicioReal) {
    if (cat.dataFimPrevista && !cat.dataFimReal && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
    return 'em_andamento';
  }
  if (cat.dataFimPrevista && isAfter(new Date(), parseISO(cat.dataFimPrevista))) return 'atrasada';
  return 'nao_iniciada';
}

function computePercentual(cat: OrcamentoCategoria): number {
  if (cat.percentualCronograma != null) return cat.percentualCronograma;
  if (!cat.usaComposicoes || cat.composicoes.length === 0) return 0;
  const totalPeso = cat.composicoes.reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  if (totalPeso === 0) {
    const concluidas = cat.composicoes.filter(c => c.concluida).length;
    return Math.round((concluidas / cat.composicoes.length) * 100);
  }
  const done = cat.composicoes.filter(c => c.concluida).reduce((s, c) => s + (c.pesoCronograma ?? 0), 0);
  return Math.round((done / totalPeso) * 100);
}

function DatePicker({ value, onChange, placeholder }: { value?: string; onChange: (v: string | undefined) => void; placeholder: string }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-7 text-[10px] px-2 justify-start font-normal w-full", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-3 w-3 mr-1" />
          {date ? format(date, 'dd/MM/yy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

// --- Gantt Chart ---
function GanttChart({ categorias }: { categorias: OrcamentoCategoria[] }) {
  const allDates = categorias.flatMap(c => [c.dataInicioPrevista, c.dataFimPrevista, c.dataInicioReal, c.dataFimReal].filter(Boolean) as string[]);
  if (allDates.length === 0) return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma data definida para exibir o Gantt.</div>;

  const minDate = parseISO(allDates.sort()[0]);
  const maxDate = parseISO(allDates.sort().reverse()[0]);
  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 1);

  const getBar = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const s = parseISO(start);
    const e = parseISO(end);
    const left = (differenceInDays(s, minDate) / totalDays) * 100;
    const width = Math.max(((differenceInDays(e, s) + 1) / totalDays) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  // Month markers
  const months: { label: string; left: string }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (isBefore(cur, maxDate) || cur.getMonth() === maxDate.getMonth()) {
    const dayOffset = differenceInDays(cur, minDate);
    if (dayOffset >= 0) {
      months.push({ label: format(cur, 'MMM yy', { locale: ptBR }), left: `${(dayOffset / totalDays) * 100}%` });
    }
    cur.setMonth(cur.getMonth() + 1);
    if (months.length > 24) break;
  }

  return (
    <div className="space-y-1">
      {/* Month headers */}
      <div className="relative h-6 border-b border-border ml-[200px]">
        {months.map((m, i) => (
          <span key={i} className="absolute text-[9px] text-muted-foreground top-0" style={{ left: m.left }}>{m.label}</span>
        ))}
      </div>
      {categorias.map(cat => {
        const prevBar = getBar(cat.dataInicioPrevista, cat.dataFimPrevista);
        const realBar = getBar(cat.dataInicioReal, cat.dataFimReal || (cat.dataInicioReal ? format(new Date(), 'yyyy-MM-dd') : undefined));
        const status = computeStatus(cat);
        return (
          <div key={cat.id} className="flex items-center h-10 group hover:bg-muted/30">
            <div className="w-[200px] shrink-0 pr-2 truncate text-xs font-medium text-foreground" title={cat.nome}>
              {cat.nome}
            </div>
            <div className="flex-1 relative h-full">
              {prevBar && (
                <div className="absolute top-1 h-3 rounded-sm bg-primary/20 border border-primary/30" style={prevBar} title="Previsto" />
              )}
              {realBar && (
                <div
                  className={cn(
                    "absolute top-5 h-3 rounded-sm",
                    status === 'concluida' ? 'bg-success/60' :
                    status === 'atrasada' ? 'bg-destructive/60' :
                    'bg-primary/60'
                  )}
                  style={realBar}
                  title="Real"
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 ml-[200px] pt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/20 border border-primary/30 inline-block" /> Previsto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary/60 inline-block" /> Real</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-success/60 inline-block" /> Concluído</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-destructive/60 inline-block" /> Atrasado</span>
      </div>
    </div>
  );
}

// --- Composição row in cronograma ---
function CompCronRow({ comp, onChange }: { comp: OrcamentoComposicao; onChange: (c: OrcamentoComposicao) => void }) {
  return (
    <div className="grid grid-cols-[1fr_90px_90px_90px_90px_60px_40px] gap-1 items-center text-[10px] pl-10 py-1 border-b border-border/50 last:border-0">
      <span className="text-foreground truncate" title={comp.descricao}>{comp.descricao || comp.codigo}</span>
      <DatePicker value={comp.dataInicioPrevista} onChange={v => onChange({ ...comp, dataInicioPrevista: v })} placeholder="Início P." />
      <DatePicker value={comp.dataFimPrevista} onChange={v => onChange({ ...comp, dataFimPrevista: v })} placeholder="Fim P." />
      <DatePicker value={comp.dataInicioReal} onChange={v => onChange({ ...comp, dataInicioReal: v })} placeholder="Início R." />
      <DatePicker value={comp.dataFimReal} onChange={v => onChange({ ...comp, dataFimReal: v, concluida: !!v })} placeholder="Fim R." />
      <Input
        type="number"
        value={comp.pesoCronograma ?? ''}
        onChange={e => onChange({ ...comp, pesoCronograma: e.target.value ? parseFloat(e.target.value) : undefined })}
        className="h-6 text-[10px] px-1 w-14"
        placeholder="Peso%"
        min={0}
        max={100}
      />
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={comp.concluida ?? false}
          onChange={e => onChange({ ...comp, concluida: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-input accent-primary"
        />
      </div>
    </div>
  );
}

export default function CronogramaPage() {
  const { user } = useAuth();
  const { obras } = useObras();
  const { getOrcamento, saveOrcamento, catalogoCategorias, generateCategoriaCodigo } = useOrcamento();

  const { selectedObraId, setSelectedObraId } = useObraSelection();
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState('');

  const obra = obras.find(o => o.id === selectedObraId);
  const orcamento = selectedObraId ? getOrcamento(selectedObraId) : undefined;
  const categorias = orcamento?.categorias ?? [];

  const isGestor = user?.role === 'gestor';

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateCategoria = (idx: number, cat: OrcamentoCategoria) => {
    if (!orcamento) return;
    const cats = [...categorias];
    cats[idx] = cat;
    saveOrcamento({ obraId: selectedObraId, categorias: cats });
  };

  const updateComposicao = (catIdx: number, compIdx: number, comp: OrcamentoComposicao) => {
    const cat = { ...categorias[catIdx] };
    const comps = [...cat.composicoes];
    comps[compIdx] = comp;
    cat.composicoes = comps;
    cat.percentualCronograma = undefined; // will recompute
    updateCategoria(catIdx, cat);
  };

  const addEtapa = () => {
    if (!newCatName.trim() || !selectedObraId) return;
    const existing = categorias.find(c => c.nome === newCatName.trim());
    if (existing) {
      toast({ title: 'Etapa já existe', variant: 'destructive' });
      return;
    }
    const cat: OrcamentoCategoria = {
      id: crypto.randomUUID(),
      codigo: generateCategoriaCodigo(),
      nome: newCatName.trim(),
      precoTotal: 0,
      usaComposicoes: false,
      composicoes: [],
    };
    saveOrcamento({ obraId: selectedObraId, categorias: [...categorias, cat] });
    setNewCatName('');
    toast({ title: `Etapa "${cat.nome}" adicionada. Preencha o orçamento na aba Orçamento.` });
  };

  // Summary stats
  const concluidas = categorias.filter(c => computeStatus(c) === 'concluida').length;
  const atrasadas = categorias.filter(c => computeStatus(c) === 'atrasada').length;
  const progressoGeral = categorias.length > 0
    ? Math.round(categorias.reduce((s, c) => s + computePercentual(c), 0) / categorias.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cronograma</h1>
          <p className="text-muted-foreground text-sm">Acompanhamento das etapas da obra</p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceInputButton
            module="cronograma"
            obraId={selectedObraId}
            onResult={(parsed) => {
              toast({ title: 'Dados de voz recebidos', description: `Etapa: ${parsed.etapa || '?'}, Progresso: ${parsed.progresso || '?'}%` });
            }}
          />
          <Select value={selectedObraId} onValueChange={setSelectedObraId}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Selecione a obra" />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 rounded-r-none" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'gantt' ? 'default' : 'ghost'} size="sm" className="h-8 rounded-l-none" onClick={() => setViewMode('gantt')}>
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {!obra && <div className="text-center py-12 text-muted-foreground">Selecione uma obra.</div>}

      {obra && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Progresso Geral</p>
                <p className="text-2xl font-bold text-foreground">{progressoGeral}%</p>
                <Progress value={progressoGeral} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-success">{concluidas}/{categorias.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Atrasadas</p>
                <p className={`text-2xl font-bold ${atrasadas > 0 ? 'text-destructive' : 'text-foreground'}`}>{atrasadas}</p>
              </CardContent>
            </Card>
          </div>

          {/* Expand/Collapse all */}
          {viewMode === 'list' && categorias.some(c => c.usaComposicoes && c.composicoes.length > 0) && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setExpandedCats(new Set(categorias.filter(c => c.usaComposicoes && c.composicoes.length > 0).map(c => c.id)))}>
                <ChevronDown className="h-3 w-3 mr-1" /> Abrir Todas
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setExpandedCats(new Set())}>
                <ChevronRight className="h-3 w-3 mr-1" /> Fechar Todas
              </Button>
            </div>
          )}

          {/* Add etapa */}
          {isGestor && (
            <Card className="shadow-card">
              <CardContent className="p-3 flex items-center gap-2">
                <Input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nova etapa (será adicionada ao orçamento)"
                  className="h-8 text-sm flex-1"
                  list="cat-suggestions"
                />
                <datalist id="cat-suggestions">
                  {catalogoCategorias.filter(c => !categorias.some(cat => cat.nome === c.nome)).map(c => (
                    <option key={c.codigo} value={c.nome} />
                  ))}
                </datalist>
                <Button size="sm" className="h-8 gap-1" onClick={addEtapa}>
                  <Plus className="h-3 w-3" /> Adicionar Etapa
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Gantt view */}
          {viewMode === 'gantt' && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Gráfico de Gantt</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <GanttChart categorias={categorias} />
              </CardContent>
            </Card>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Etapas da Obra</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {categorias.map((cat, catIdx) => {
                    const status = computeStatus(cat);
                    const percentual = computePercentual(cat);
                    const isExpanded = expandedCats.has(cat.id);
                    const hasComps = cat.usaComposicoes && cat.composicoes.length > 0;

                    return (
                      <div key={cat.id} className="flex gap-4 pb-4 last:pb-0">
                        {/* Timeline */}
                        <div className="flex flex-col items-center">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            status === 'concluida' ? 'bg-success/10' :
                            status === 'atrasada' ? 'bg-destructive/10' :
                            status === 'em_andamento' ? 'bg-primary/10' : 'bg-muted'
                          )}>
                            {statusIcons[status]}
                          </div>
                          {catIdx < categorias.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {hasComps && (
                                <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground hover:text-foreground">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              )}
                              <h3 className="text-sm font-semibold text-foreground">{cat.nome}</h3>
                              <span className="text-[10px] font-mono text-muted-foreground">{cat.codigo}</span>
                            </div>
                            <Badge variant="secondary" className={statusColors[status]}>{statusEtapaLabels[status]}</Badge>
                          </div>

                          {/* Date inputs */}
                          {isGestor ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Início Previsto</label>
                                <DatePicker value={cat.dataInicioPrevista} onChange={v => updateCategoria(catIdx, { ...cat, dataInicioPrevista: v })} placeholder="Selecionar" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Fim Previsto</label>
                                <DatePicker value={cat.dataFimPrevista} onChange={v => updateCategoria(catIdx, { ...cat, dataFimPrevista: v })} placeholder="Selecionar" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Início Real</label>
                                <DatePicker value={cat.dataInicioReal} onChange={v => updateCategoria(catIdx, { ...cat, dataInicioReal: v })} placeholder="Selecionar" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Fim Real</label>
                                <DatePicker value={cat.dataFimReal} onChange={v => updateCategoria(catIdx, { ...cat, dataFimReal: v })} placeholder="Selecionar" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                              {cat.dataInicioPrevista && <span>Previsto: {formatDate(cat.dataInicioPrevista)} → {cat.dataFimPrevista ? formatDate(cat.dataFimPrevista) : '...'}</span>}
                              {cat.dataInicioReal && <span>Real: {formatDate(cat.dataInicioReal)}{cat.dataFimReal ? ` → ${formatDate(cat.dataFimReal)}` : ' → ...'}</span>}
                            </div>
                          )}

                          {/* Percentual / Responsavel */}
                          <div className="flex items-center gap-4 mt-2">
                            {isGestor && !hasComps ? (
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] text-muted-foreground">Progresso %</label>
                                <Input
                                  type="number"
                                  min={0} max={100}
                                  value={cat.percentualCronograma ?? ''}
                                  onChange={e => updateCategoria(catIdx, { ...cat, percentualCronograma: e.target.value ? parseInt(e.target.value) : undefined })}
                                  className="h-7 w-16 text-xs"
                                />
                              </div>
                            ) : null}
                            <div className="flex-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium text-foreground">{percentual}%</span>
                              </div>
                              <Progress value={percentual} className="h-1.5" />
                            </div>
                          </div>

                          {/* Expanded composições */}
                          {isExpanded && hasComps && (
                            <div className="mt-2 border border-border rounded-md bg-muted/20">
                              <div className="grid grid-cols-[1fr_90px_90px_90px_90px_60px_40px] gap-1 text-[9px] text-muted-foreground font-medium px-2 py-1 border-b border-border pl-10">
                                <span>Composição</span>
                                <span>Início P.</span>
                                <span>Fim P.</span>
                                <span>Início R.</span>
                                <span>Fim R.</span>
                                <span>Peso%</span>
                                <span>✓</span>
                              </div>
                              {cat.composicoes.map((comp, compIdx) => (
                                <CompCronRow
                                  key={comp.id}
                                  comp={comp}
                                  onChange={c => updateComposicao(catIdx, compIdx, c)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {categorias.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma etapa cadastrada. Crie etapas aqui ou na aba Orçamento.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
