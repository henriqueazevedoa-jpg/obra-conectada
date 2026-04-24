import { useState } from 'react';
import { useOrcamento, OrcamentoVersao, VersaoTipo } from '@/contexts/OrcamentoContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  TrendingUp,
  Loader2,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mockData';
import { toast } from '@/hooks/use-toast';

// ── helpers ───────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<VersaoTipo, string> = {
  estimativo: 'Estimativo',
  analitico: 'Analítico',
  revisao: 'Revisão',
};

const STATUS_BADGE = {
  ativo: { label: 'Ativo', class: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  rascunho: { label: 'Rascunho', class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  arquivado: { label: 'Arquivado', class: 'bg-muted text-muted-foreground border-border' },
};

const TIPO_BADGE = {
  estimativo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  analitico: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  revisao: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface VersaoSeletorProps {
  obraId: string;
  versaoAtiva: OrcamentoVersao | null;
  onVersaoChange: (versao: OrcamentoVersao | null) => void;
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VersaoSeletor({ obraId, versaoAtiva, onVersaoChange, readOnly }: VersaoSeletorProps) {
  const {
    getVersoes,
    criarVersao,
    ativarVersao,
    evoluirParaAnalitico,
    removerVersao,
  } = useOrcamento();

  const versoes = getVersoes(obraId);

  // ── Dialog novo versão ─────────────────────────────────────────────────────
  const [novaVersaoOpen, setNovaVersaoOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState<VersaoTipo>('analitico');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [copiarDe, setCopiarDe] = useState<string>('');
  const [criando, setCriando] = useState(false);

  // ── Evoluir dialog ─────────────────────────────────────────────────────────
  const [evoluirOpen, setEvoluirOpen] = useState(false);
  const [evoluindo, setEvoluindo] = useState(false);

  const handleCriarVersao = async () => {
    setCriando(true);
    try {
      const nova = await criarVersao(obraId, {
        tipo: novoTipo,
        descricao: novaDescricao || undefined,
        copiarDeVersaoId: copiarDe || undefined,
      });
      toast({ title: `✅ ${nova.numeroVersao} criado`, description: `Versão ${TIPO_LABELS[nova.tipo]} em rascunho.` });
      await ativarVersao(nova.id, obraId);
      onVersaoChange({ ...nova, status: 'ativo' });
      setNovaVersaoOpen(false);
      setNovaDescricao('');
      setCopiarDe('');
    } catch (err) {
      toast({ title: 'Erro ao criar versão', description: String(err), variant: 'destructive' });
    } finally {
      setCriando(false);
    }
  };

  const handleEvoluir = async () => {
    if (!versaoAtiva) return;
    setEvoluindo(true);
    try {
      const nova = await evoluirParaAnalitico(versaoAtiva.id);
      toast({ title: `✅ ${nova.numeroVersao} — Analítico criado`, description: 'Etapas copiadas com valor estimado como referência.' });
      onVersaoChange(nova);
      setEvoluirOpen(false);
    } catch (err) {
      toast({ title: 'Erro ao evoluir', description: String(err), variant: 'destructive' });
    } finally {
      setEvoluindo(false);
    }
  };

  const handleSelectVersao = async (versao: OrcamentoVersao) => {
    if (versao.id === versaoAtiva?.id) return;
    await ativarVersao(versao.id, obraId);
    onVersaoChange({ ...versao, status: 'ativo' });
  };

  const handleRemoverVersao = async (id: string) => {
    try {
      await removerVersao(id);
      toast({ title: 'Versão apagada com sucesso' });
      if (id === versaoAtiva?.id) {
        const remaining = getVersoes(obraId).filter(v => v.id !== id);
        if (remaining.length > 0) {
          await ativarVersao(remaining[0].id, obraId);
          onVersaoChange({ ...remaining[0], status: 'ativo' });
        } else {
          onVersaoChange(null);
        }
      }
    } catch (err) {
      toast({ title: 'Erro ao apagar versão', description: String(err), variant: 'destructive' });
    }
  };

  const podeEvoluir = versaoAtiva?.tipo === 'estimativo';

  if (versoes.length === 0) {
    if (readOnly) return <span className="text-muted-foreground text-xs italic">Sem versões cadastradas</span>;
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-dashed text-muted-foreground hover:text-foreground"
          onClick={() => setNovaVersaoOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Criar 1ª Versão</span>
        </Button>
        {/* Render dialog to allow creation */}
        <Dialog open={novaVersaoOpen} onOpenChange={setNovaVersaoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova versão do orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</Label>
                <RadioGroup value={novoTipo} onValueChange={v => setNovoTipo(v as VersaoTipo)} className="grid grid-cols-3 gap-2">
                  {(['estimativo', 'analitico', 'revisao'] as VersaoTipo[]).map(t => (
                    <div key={t}>
                      <RadioGroupItem value={t} id={`tipo-first-${t}`} className="sr-only" />
                      <Label
                        htmlFor={`tipo-first-${t}`}
                        className={cn(
                          'flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all text-center',
                          novoTipo === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                        )}
                      >
                        {TIPO_LABELS[t]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nova-descricao-first" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Descrição <span className="font-normal normal-case">(opcional)</span>
                </Label>
                <Input
                  id="nova-descricao-first"
                  placeholder="ex: Orçamento Base"
                  value={novaDescricao}
                  onChange={e => setNovaDescricao(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNovaVersaoOpen(false)} disabled={criando}>Cancelar</Button>
              <Button onClick={handleCriarVersao} disabled={criando}>
                {criando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : 'Criar versão'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Seletor principal */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-2 px-3 h-8 rounded-lg border text-sm font-medium transition-all',
                'bg-background hover:bg-muted/50 border-border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {/* Tipo badge */}
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', TIPO_BADGE[versaoAtiva?.tipo || 'estimativo'])}>
                {TIPO_LABELS[versaoAtiva?.tipo || 'estimativo']}
              </span>
              <span className="text-foreground">
                {versaoAtiva?.numeroVersao || versoes[0]?.numeroVersao || 'v1.0'}
              </span>
              {versaoAtiva?.descricao && (
                <span className="text-muted-foreground text-xs hidden md:inline truncate max-w-32">
                  — {versaoAtiva.descricao}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-80 p-1">
            {/* Lista de versões */}
            {versoes.map(v => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => handleSelectVersao(v)}
                className={cn(
                  'flex items-start gap-3 p-2.5 rounded-md cursor-pointer group',
                  v.id === versaoAtiva?.id && 'bg-primary/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{v.numeroVersao}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', TIPO_BADGE[v.tipo])}>
                      {TIPO_LABELS[v.tipo]}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', STATUS_BADGE[v.status].class)}>
                      {STATUS_BADGE[v.status].label}
                    </span>
                  </div>
                  {v.descricao && <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.descricao}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {formatCurrency(v.valorTotal)}
                  </p>
                </div>
                {!readOnly && (
                  <div className="flex flex-col items-end justify-center h-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja apagar a versão ${v.numeroVersao}? Essa ação não pode ser desfeita.`)) {
                          handleRemoverVersao(v.id);
                        }
                      }}
                      className="text-destructive hover:bg-destructive/10 p-1.5 rounded"
                      title="Apagar versão"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {v.id === versaoAtiva?.id && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 group-hover:hidden" />}
                {v.status === 'rascunho' && <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 group-hover:hidden" />}
                {v.status === 'arquivado' && <Archive className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:hidden" />}
              </DropdownMenuItem>
            ))}

            {!readOnly && (
              <>
                <DropdownMenuSeparator />
                {/* Nova versão */}
                <DropdownMenuItem
                  onClick={() => setNovaVersaoOpen(true)}
                  className="flex items-center gap-2 text-sm px-2.5 py-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Nova versão
                </DropdownMenuItem>

                {/* Evoluir para Analítico */}
                {podeEvoluir && (
                  <DropdownMenuItem
                    onClick={() => setEvoluirOpen(true)}
                    className="flex items-center gap-2 text-sm px-2.5 py-2 cursor-pointer text-violet-700 dark:text-violet-400"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Evoluir para Analítico
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botão rápido "+ Nova versão" */}
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setNovaVersaoOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova versão</span>
          </Button>
        )}
      </div>

      {/* ── Dialog: Nova versão ────────────────────────────────────────── */}
      <Dialog open={novaVersaoOpen} onOpenChange={setNovaVersaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova versão do orçamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</Label>
              <RadioGroup value={novoTipo} onValueChange={v => setNovoTipo(v as VersaoTipo)} className="grid grid-cols-3 gap-2">
                {(['estimativo', 'analitico', 'revisao'] as VersaoTipo[]).map(t => (
                  <div key={t}>
                    <RadioGroupItem value={t} id={`tipo-${t}`} className="sr-only" />
                    <Label
                      htmlFor={`tipo-${t}`}
                      className={cn(
                        'flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer transition-all text-center',
                        novoTipo === t
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'
                      )}
                    >
                      {TIPO_LABELS[t]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="nova-descricao" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Descrição <span className="font-normal normal-case">(opcional)</span>
              </Label>
              <Input
                id="nova-descricao"
                placeholder="ex: Revisão com novo fornecedor de aço"
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Copiar de */}
            {versoes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Copiar estrutura de
                </Label>
                <div className="space-y-1">
                  <div
                    onClick={() => setCopiarDe('')}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors',
                      copiarDe === '' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Começar do zero</span>
                  </div>
                  {versoes.map(v => (
                    <div
                      key={v.id}
                      onClick={() => setCopiarDe(v.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm transition-colors',
                        copiarDe === v.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                      )}
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{v.numeroVersao}</span>
                      <span className={cn('text-[10px] font-semibold px-1 rounded', TIPO_BADGE[v.tipo])}>
                        {TIPO_LABELS[v.tipo]}
                      </span>
                      <span className="text-muted-foreground text-xs ml-auto">{formatCurrency(v.valorTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaVersaoOpen(false)} disabled={criando}>
              Cancelar
            </Button>
            <Button onClick={handleCriarVersao} disabled={criando}>
              {criando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : 'Criar versão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Evoluir para Analítico ────────────────────────────── */}
      <Dialog open={evoluirOpen} onOpenChange={setEvoluirOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              Evoluir para Analítico
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Isso irá criar uma nova versão <strong>Analítica</strong> baseada em{' '}
              <strong>{versaoAtiva?.numeroVersao}</strong>, copiando todas as composições como ponto de partida.
            </p>
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-3 text-xs space-y-1">
              <p className="font-medium text-violet-800 dark:text-violet-300">O que acontece:</p>
              <ul className="text-violet-700 dark:text-violet-400 space-y-0.5 list-disc list-inside">
                <li>Nova versão <strong>{`v${getVersoes(obraId).length + 1}.0`} — Analítico</strong> é criada</li>
                <li>Etapas copiadas com valor estimativo como referência</li>
                <li>Composições copiadas como ponto de partida editável</li>
                <li>Versão estimativa é arquivada</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvoluirOpen(false)} disabled={evoluindo}>
              Cancelar
            </Button>
            <Button
              onClick={handleEvoluir}
              disabled={evoluindo}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {evoluindo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Evoluindo...</> : 'Evoluir para Analítico'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
