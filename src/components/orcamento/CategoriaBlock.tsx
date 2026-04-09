import { useState } from 'react';
import { OrcamentoCategoria, OrcamentoComposicao } from '@/contexts/OrcamentoContext';
import { InsumoTemplate } from '@/data/catalogoInsumos';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, Plus, ChevronDown, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ComposicaoRow from './ComposicaoRow';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';
interface Props {
  categoria: OrcamentoCategoria;
  unidades: string[];
  onChange: (updated: OrcamentoCategoria) => void;
  onRemove: () => void;
  getSugestaoInsumos: (categoriaNome: string) => InsumoTemplate[];
  generateComposicaoCodigo: (catCode: string, existing: string[]) => string;
  generateSubitemCodigo: (compCode: string, existing: string[]) => string;
  forceExpanded?: boolean;
}

export default function CategoriaBlock({ categoria, unidades, onChange, onRemove, getSugestaoInsumos, generateComposicaoCodigo, generateSubitemCodigo, forceExpanded }: Props) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [forceApplied, setForceApplied] = useState<boolean | undefined>(undefined);

  // Sync with forceExpanded from parent, but allow local override after
  if (forceExpanded !== undefined && forceExpanded !== forceApplied) {
    setLocalExpanded(forceExpanded);
    setForceApplied(forceExpanded);
  }

  const expanded = localExpanded;
  const setExpanded = (v: boolean) => setLocalExpanded(v);
  const [addMode, setAddMode] = useState<'manual' | 'sugestao'>('sugestao');
  const [selectedInsumo, setSelectedInsumo] = useState('');

  const sugestoes = getSugestaoInsumos(categoria.nome);
  const existingDescricoes = categoria.composicoes.map(c => c.descricao);
  const availableSugestoes = sugestoes.filter(s => !existingDescricoes.includes(s.descricao));

  const update = (field: string, value: any) => {
    const next = { ...categoria, [field]: value };
    if (field === 'usaComposicoes' && value && next.composicoes.length === 0) {
      next.composicoes = [makeComposicao()];
    }
    if (!next.usaComposicoes && field === 'precoTotal') {
      next.precoTotal = parseFloat(value) || 0;
    }
    onChange(next);
  };

  const makeComposicao = (descricao?: string, unidade?: string): OrcamentoComposicao => {
    const existingCodes = categoria.composicoes.map(c => c.codigo);
    return {
      id: crypto.randomUUID(),
      codigo: generateComposicaoCodigo(categoria.codigo, existingCodes),
      descricao: descricao || '',
      unidade: unidade || '',
      quantidade: null,
      precoUnitario: null,
      precoTotal: 0,
      subitens: [],
      usaSubitens: false,
    };
  };

  const recalcCategoria = (comps: OrcamentoComposicao[]) => {
    return comps.reduce((s, c) => s + c.precoTotal, 0);
  };

  const updateComposicao = (idx: number, comp: OrcamentoComposicao) => {
    const comps = [...categoria.composicoes];
    comps[idx] = comp;
    onChange({ ...categoria, composicoes: comps, precoTotal: recalcCategoria(comps) });
  };

  const removeComposicao = (idx: number) => {
    const comps = categoria.composicoes.filter((_, i) => i !== idx);
    onChange({ ...categoria, composicoes: comps, precoTotal: recalcCategoria(comps) });
  };

  const addComposicao = () => {
    const comps = [...categoria.composicoes, makeComposicao()];
    onChange({ ...categoria, composicoes: comps });
  };

  const addFromSugestao = () => {
    if (!selectedInsumo) return;
    const insumo = sugestoes.find(s => s.descricao === selectedInsumo);
    if (!insumo) return;
    const comps = [...categoria.composicoes, makeComposicao(insumo.descricao, insumo.unidade)];
    onChange({ ...categoria, composicoes: comps });
    setSelectedInsumo('');
  };

  return (
    <Card className="shadow-card border-l-4 border-l-primary">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{categoria.codigo}</span>
          <span className="text-sm font-semibold text-foreground flex-1">{categoria.nome}</span>
          <span className="text-sm font-bold text-foreground">{formatCurrency(categoria.precoTotal)}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {expanded && (
          <>
            {/* Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Início Previsto</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-7 text-[10px] px-2 justify-start font-normal w-full", !categoria.dataInicioPrevista && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {categoria.dataInicioPrevista ? format(parseISO(categoria.dataInicioPrevista), 'dd/MM/yy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={categoria.dataInicioPrevista ? parseISO(categoria.dataInicioPrevista) : undefined}
                      onSelect={d => update('dataInicioPrevista', d ? format(d, 'yyyy-MM-dd') : undefined)} locale={ptBR}
                      className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Fim Previsto</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-7 text-[10px] px-2 justify-start font-normal w-full", !categoria.dataFimPrevista && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {categoria.dataFimPrevista ? format(parseISO(categoria.dataFimPrevista), 'dd/MM/yy') : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={categoria.dataFimPrevista ? parseISO(categoria.dataFimPrevista) : undefined}
                      onSelect={d => update('dataFimPrevista', d ? format(d, 'yyyy-MM-dd') : undefined)} locale={ptBR}
                      className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch id={`comp-${categoria.id}`} checked={categoria.usaComposicoes} onCheckedChange={v => update('usaComposicoes', v)} className="scale-75" />
                <Label htmlFor={`comp-${categoria.id}`} className="text-xs text-muted-foreground cursor-pointer">Detalhar composições</Label>
              </div>
            </div>

            {!categoria.usaComposicoes ? (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Valor total da categoria:</Label>
                <Input type="number" value={categoria.precoTotal || ''} onChange={e => update('precoTotal', e.target.value)} className="h-8 w-40 text-sm" placeholder="R$ 0,00" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[80px_1fr_80px_80px_100px_100px_36px] gap-1 text-[10px] text-muted-foreground font-medium">
                  <span>Código</span><span>Descrição</span><span>Un</span><span>Qtd</span><span>P. Unit</span><span>P. Total</span><span />
                </div>
                {categoria.composicoes.map((comp, idx) => (
                  <ComposicaoRow
                    key={comp.id}
                    composicao={comp}
                    unidades={unidades}
                    onChange={c => updateComposicao(idx, c)}
                    onRemove={() => removeComposicao(idx)}
                    generateSubitemCodigo={generateSubitemCodigo}
                  />
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <Button variant={addMode === 'sugestao' ? 'default' : 'outline'} size="sm" className="text-[10px] h-6" onClick={() => setAddMode('sugestao')}>Sugerido</Button>
                    <Button variant={addMode === 'manual' ? 'default' : 'outline'} size="sm" className="text-[10px] h-6" onClick={() => setAddMode('manual')}>Manual</Button>
                  </div>
                  {addMode === 'sugestao' && availableSugestoes.length > 0 ? (
                    <>
                      <Select value={selectedInsumo} onValueChange={setSelectedInsumo}>
                        <SelectTrigger className="w-64 h-7 text-xs">
                          <SelectValue placeholder="Selecione um insumo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSugestoes.map(s => (
                            <SelectItem key={s.descricao} value={s.descricao} className="text-xs">
                              {s.descricao} <span className="text-muted-foreground ml-1">({s.unidade})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={addFromSugestao}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </>
                  ) : addMode === 'sugestao' && availableSugestoes.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">Todas as sugestões já foram adicionadas</span>
                  ) : null}
                  {addMode === 'manual' && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={addComposicao}>
                      <Plus className="h-3 w-3 mr-1" /> Composição em branco
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
