import { useState, useMemo } from 'react';
import { X, Pencil, Link2, Users, DollarSign, Plus, Trash2, AlertTriangle, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CronogramaTarefa, CronogramaDependencia, TipoDep, TipoTarefa } from '@/hooks/useCronograma';
import { RecursoObra, CronogramaAlocacao } from '@/hooks/useRecursos';
import { useOrcamentoParaCronograma } from '@/hooks/useOrcamentoParaCronograma';

type DrawerTab = 'geral' | 'dependencias' | 'recursos' | 'orcamento';

const DEP_TIPOS: { value: TipoDep; label: string; desc: string }[] = [
  { value: 'FS', label: 'FS', desc: 'Fim → Início (padrão)' },
  { value: 'SS', label: 'SS', desc: 'Início → Início' },
  { value: 'FF', label: 'FF', desc: 'Fim → Fim' },
  { value: 'SF', label: 'SF', desc: 'Início → Fim' },
];

function DatePickerField({ label, value, onChange }: { label: string; value?: string | null; onChange: (v: string | undefined) => void }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1">{label}</label>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-8 w-full justify-start text-xs font-normal', !date && 'text-muted-foreground')}>
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar data'}
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={d => onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
          locale={ptBR}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

interface TaskDetailDrawerProps {
  tarefa: CronogramaTarefa;
  obraId?: string;
  dependencias: CronogramaDependencia[];
  todasTarefas: CronogramaTarefa[];
  alocacoes: CronogramaAlocacao[];
  recursos: RecursoObra[];
  recursosSupelalocados: Set<string>;
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<CronogramaTarefa>) => void;
  onAddDependencia: (origemId: string, destinoId: string, tipo: TipoDep, lag: number) => void;
  onRemoveDependencia: (id: string) => void;
  onAddAlocacao: (tarefaId: string, recursoId: string, quantidade: number, horas: number) => void;
  onRemoveAlocacao: (id: string) => void;
}

export default function TaskDetailDrawer({
  tarefa, obraId, dependencias, todasTarefas, alocacoes, recursos, recursosSupelalocados,
  onClose, onUpdate, onAddDependencia, onRemoveDependencia, onAddAlocacao, onRemoveAlocacao,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('geral');
  const [newDepTipo, setNewDepTipo] = useState<TipoDep>('FS');
  const [newDepLag, setNewDepLag] = useState(0);
  const [newDepTargetId, setNewDepTargetId] = useState('');
  const [newAlocRecursoId, setNewAlocRecursoId] = useState('');
  const [newAlocQtd, setNewAlocQtd] = useState(1);
  const [orcBusca, setOrcBusca] = useState('');
  const [orcMode, setOrcMode] = useState<'categoria' | 'composicao'>('composicao');

  const { categorias, composicoes, loading: orcLoading, searchComposicoes, searchCategorias } = useOrcamentoParaCronograma(obraId);

  const filteredComposicoes = useMemo(() => searchComposicoes(orcBusca), [searchComposicoes, orcBusca]);
  const filteredCategorias = useMemo(() => searchCategorias(orcBusca), [searchCategorias, orcBusca]);

  // Find currently linked item names for display
  const linkedCategoria = tarefa.orcamento_categoria_id
    ? categorias.find(c => c.id === tarefa.orcamento_categoria_id)
    : null;
  const linkedComposicao = tarefa.orcamento_composicao_id
    ? composicoes.find(c => c.id === tarefa.orcamento_composicao_id)
    : null;

  // My predecessors and successors
  const predecessoras = dependencias.filter(d => d.tarefa_destino_id === tarefa.id);
  const sucessoras = dependencias.filter(d => d.tarefa_origem_id === tarefa.id);

  const tabs: { key: DrawerTab; icon: React.ReactNode; label: string }[] = [
    { key: 'geral', icon: <Pencil className="h-3.5 w-3.5" />, label: 'Geral' },
    { key: 'dependencias', icon: <Link2 className="h-3.5 w-3.5" />, label: `Dep. (${predecessoras.length + sucessoras.length})` },
    { key: 'recursos', icon: <Users className="h-3.5 w-3.5" />, label: `Recursos (${alocacoes.length})` },
    { key: 'orcamento', icon: <DollarSign className="h-3.5 w-3.5" />, label: 'Orçamento' },
  ];

  const duracao = tarefa.data_inicio && tarefa.data_fim
    ? differenceInDays(parseISO(tarefa.data_fim), parseISO(tarefa.data_inicio)) + 1
    : tarefa.duracao_dias;

  const tarefasDisponiveis = todasTarefas.filter(t => t.id !== tarefa.id && !dependencias.some(d => d.tarefa_origem_id === tarefa.id && d.tarefa_destino_id === t.id));
  const recursosDisponiveis = recursos.filter(r => !alocacoes.some(a => a.recurso_id === r.id));

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[480px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {tarefa.is_critico && <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />Crítico</Badge>}
          <h2 className="text-sm font-semibold text-foreground truncate" title={tarefa.nome}>{tarefa.nome}</h2>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ─── GERAL TAB ─────────────────────────────────────────────── */}
        {activeTab === 'geral' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Nome da Tarefa</label>
              <Input
                value={tarefa.nome}
                onChange={e => onUpdate(tarefa.id, { nome: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Tipo</label>
              <Select value={tarefa.tipo_tarefa} onValueChange={(v: TipoTarefa) => onUpdate(tarefa.id, { tipo_tarefa: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PADRAO" className="text-xs">Padrão</SelectItem>
                  <SelectItem value="MARCO" className="text-xs">♦ Marco (Milestone)</SelectItem>
                  <SelectItem value="RESUMO" className="text-xs">Resumo (Agrupador)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePickerField label="Início Previsto" value={tarefa.data_inicio} onChange={v => onUpdate(tarefa.id, { data_inicio: v ?? null })} />
              <DatePickerField label="Fim Previsto" value={tarefa.data_fim} onChange={v => onUpdate(tarefa.id, { data_fim: v ?? null })} />
            </div>

            {tarefa.baseline_inicio && (
              <div className="grid grid-cols-2 gap-3 opacity-60">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Baseline Início</label>
                  <div className="h-8 flex items-center px-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
                    {tarefa.baseline_inicio ? format(parseISO(tarefa.baseline_inicio), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Baseline Fim</label>
                  <div className="h-8 flex items-center px-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
                    {tarefa.baseline_fim ? format(parseISO(tarefa.baseline_fim), 'dd/MM/yyyy') : '—'}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-muted-foreground mb-2 flex justify-between">
                <span>% de Conclusão</span>
                <span className="font-semibold text-foreground">{tarefa.percentual_concluido}%</span>
              </label>
              <input
                type="range" min={0} max={100} step={5}
                value={tarefa.percentual_concluido}
                onChange={e => onUpdate(tarefa.id, { percentual_concluido: Number(e.target.value) })}
                className="w-full h-2 accent-primary"
              />
              <div className="mt-2">
                <Progress value={tarefa.percentual_concluido} className="h-2" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Observações</label>
              <Textarea
                value={tarefa.nota || ''}
                onChange={e => onUpdate(tarefa.id, { nota: e.target.value })}
                placeholder="Notas, restrições, informações relevantes..."
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">Duração:</span> {duracao} dia{duracao !== 1 ? 's' : ''}</p>
              {tarefa.is_critico && <p className="text-orange-600 font-medium">⚠ Esta tarefa está no Caminho Crítico</p>}
              {tarefa.baseline_locked && <p className="text-emerald-600">🔒 Baseline travado — edição livre das datas reais</p>}
            </div>
          </div>
        )}

        {/* ─── DEPENDÊNCIAS TAB ──────────────────────────────────────── */}
        {activeTab === 'dependencias' && (
          <div className="space-y-4">
            {predecessoras.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Predecessoras</h3>
                <div className="space-y-1">
                  {predecessoras.map(dep => {
                    const origem = todasTarefas.find(t => t.id === dep.tarefa_origem_id);
                    return (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{dep.tipo}</span>
                        <span className="flex-1 truncate text-foreground" title={origem?.nome}>{origem?.nome || '—'}</span>
                        {dep.lag_dias !== 0 && <span className="text-muted-foreground text-[10px]">{dep.lag_dias > 0 ? '+' : ''}{dep.lag_dias}d</span>}
                        <button onClick={() => onRemoveDependencia(dep.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {sucessoras.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sucessoras</h3>
                <div className="space-y-1">
                  {sucessoras.map(dep => {
                    const destino = todasTarefas.find(t => t.id === dep.tarefa_destino_id);
                    return (
                      <div key={dep.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-xs">
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{dep.tipo}</span>
                        <span className="flex-1 truncate text-foreground" title={destino?.nome}>{destino?.nome || '—'}</span>
                        {dep.lag_dias !== 0 && <span className="text-muted-foreground text-[10px]">{dep.lag_dias > 0 ? '+' : ''}{dep.lag_dias}d</span>}
                        <button onClick={() => onRemoveDependencia(dep.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Adicionar Predecessora</h3>
              <div className="space-y-2">
                <Select value={newDepTargetId} onValueChange={setNewDepTargetId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar tarefa predecessora..." /></SelectTrigger>
                  <SelectContent>
                    {tarefasDisponiveis.map(t => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Tipo</label>
                    <Select value={newDepTipo} onValueChange={(v: TipoDep) => setNewDepTipo(v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEP_TIPOS.map(d => (
                          <SelectItem key={d.value} value={d.value} className="text-xs">
                            <span className="font-mono">{d.label}</span> — {d.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Lag (dias)</label>
                    <Input type="number" value={newDepLag} onChange={e => setNewDepLag(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                </div>

                <Button size="sm" className="w-full h-8 gap-1.5 text-xs" disabled={!newDepTargetId}
                  onClick={() => { if (newDepTargetId) { onAddDependencia(newDepTargetId, tarefa.id, newDepTipo, newDepLag); setNewDepTargetId(''); } }}
                >
                  <Plus className="h-3 w-3" />Adicionar Dependência
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── RECURSOS TAB ──────────────────────────────────────────── */}
        {activeTab === 'recursos' && (
          <div className="space-y-4">
            {alocacoes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto opacity-30 mb-2" />
                <p className="text-xs">Nenhum recurso alocado nesta tarefa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alocacoes.map(aloc => {
                  const rec = recursos.find(r => r.id === aloc.recurso_id);
                  const overloaded = rec ? recursosSupelalocados.has(rec.id) : false;
                  return (
                    <div key={aloc.id} className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-xs', overloaded ? 'border-red-200 bg-red-50' : 'border-border bg-muted/20')}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rec?.cor }} />
                      <span className="flex-1 font-medium text-foreground">{rec?.nome || '—'}</span>
                      <span className="text-muted-foreground">{aloc.quantidade} un × {aloc.horas_por_dia}h/dia</span>
                      {overloaded && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      <button onClick={() => onRemoveAlocacao(aloc.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alocar Recurso</h3>
              {recursosDisponiveis.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todos os recursos já foram alocados ou não há recursos cadastrados.</p>
              ) : (
                <div className="space-y-2">
                  <Select value={newAlocRecursoId} onValueChange={setNewAlocRecursoId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar recurso..." /></SelectTrigger>
                    <SelectContent>
                      {recursosDisponiveis.map(r => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: r.cor }} />
                            {r.nome} ({r.tipo})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Quantidade</label>
                      <Input type="number" min={1} value={newAlocQtd} onChange={e => setNewAlocQtd(Number(e.target.value))} className="h-8 text-xs" />
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-8 gap-1.5 text-xs" disabled={!newAlocRecursoId}
                    onClick={() => { if (newAlocRecursoId) { onAddAlocacao(tarefa.id, newAlocRecursoId, newAlocQtd, 8); setNewAlocRecursoId(''); } }}
                  >
                    <Plus className="h-3 w-3" />Alocar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ORÇAMENTO TAB ─────────────────────────────────────────── */}
        {activeTab === 'orcamento' && (
          <div className="space-y-4">

            {/* Currently linked item */}
            {(linkedCategoria || linkedComposicao) && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    {linkedComposicao ? 'Composição Vinculada' : 'Etapa Vinculada'}
                  </p>
                </div>
                {linkedComposicao && (
                  <>
                    <p className="text-xs font-medium text-foreground">{linkedComposicao.descricao}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {linkedComposicao.codigo_referencia_externa && (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{linkedComposicao.codigo_referencia_externa}</span>
                      )}
                      <span>{linkedComposicao.quantidade} {linkedComposicao.unidade}</span>
                      <span>×</span>
                      <span>R$ {linkedComposicao.preco_unitario?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span>=</span>
                      <span className="font-semibold text-foreground">R$ {linkedComposicao.preco_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {linkedComposicao.categoria && (
                      <p className="text-[10px] text-muted-foreground">Etapa: {linkedComposicao.categoria.nome}</p>
                    )}
                  </>
                )}
                {linkedCategoria && !linkedComposicao && (
                  <>
                    <p className="text-xs font-medium text-foreground">{linkedCategoria.nome}</p>
                    <p className="text-[10px] text-muted-foreground">Total: R$ {linkedCategoria.preco_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </>
                )}
                <Button
                  size="sm" variant="outline"
                  className="h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onUpdate(tarefa.id, { orcamento_categoria_id: null, orcamento_composicao_id: null })}
                >
                  <X className="h-3 w-3" />Desvincular
                </Button>
              </div>
            )}

            {/* Selector */}
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {linkedCategoria || linkedComposicao ? 'Alterar Vínculo' : 'Vincular ao Orçamento'}
              </h3>

              {/* Mode toggle */}
              <div className="flex border border-border rounded-md overflow-hidden mb-2">
                {(['composicao', 'categoria'] as const).map(m => (
                  <button key={m} onClick={() => setOrcMode(m)}
                    className={cn('flex-1 h-7 text-[10px] font-medium transition-colors',
                      orcMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {m === 'composicao' ? 'Por Composição (Serviço)' : 'Por Etapa'}
                  </button>
                ))}
              </div>

              {/* Search field */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={orcBusca}
                  onChange={e => setOrcBusca(e.target.value)}
                  placeholder={orcMode === 'composicao' ? 'Buscar por nome, código SINAPI...' : 'Buscar etapa...'}
                  className="h-8 pl-7 text-xs"
                />
              </div>

              {orcLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : orcMode === 'composicao' ? (
                <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-sidebar">
                  {filteredComposicoes.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">Nenhuma composição encontrada</p>
                  ) : filteredComposicoes.map(comp => (
                    <button
                      key={comp.id}
                      onClick={() => onUpdate(tarefa.id, { orcamento_composicao_id: comp.id, orcamento_categoria_id: comp.etapa_id })}
                      className={cn(
                        'w-full text-left p-2.5 rounded-md border text-xs transition-all hover:border-primary hover:bg-primary/5',
                        tarefa.orcamento_composicao_id === comp.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{comp.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {comp.codigo_referencia_externa && (
                              <span className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">
                                {comp.fonte_referencia} {comp.codigo_referencia_externa}
                              </span>
                            )}
                            {comp.categoria && (
                              <span className="text-[10px] text-muted-foreground truncate">{comp.categoria.nome}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-foreground text-[11px]">R$ {comp.preco_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-muted-foreground">{comp.quantidade} {comp.unidade}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-sidebar">
                  {filteredCategorias.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">Nenhuma etapa encontrada</p>
                  ) : filteredCategorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => onUpdate(tarefa.id, { orcamento_categoria_id: cat.id, orcamento_composicao_id: null })}
                      className={cn(
                        'w-full text-left p-2.5 rounded-md border text-xs transition-all hover:border-primary hover:bg-primary/5',
                        tarefa.orcamento_categoria_id === cat.id && !tarefa.orcamento_composicao_id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          {cat.codigo && <span className="font-mono text-[10px] text-muted-foreground mr-1.5">{cat.codigo}</span>}
                          <span className="font-medium text-foreground">{cat.nome}</span>
                        </div>
                        <span className="font-semibold text-foreground text-[11px] shrink-0">
                          R$ {cat.preco_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
