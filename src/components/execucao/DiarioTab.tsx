import { useState, useEffect, useCallback } from 'react';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useOrcamento } from '@/contexts/OrcamentoContext';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';
import { enviarNotificacaoDedup } from '@/lib/notificationDedup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, CalendarIcon, CheckCircle2,
  XCircle, Pencil, Filter, Square, CheckSquare,
  BookOpen, Sun, CloudRain, Cloud, Loader2, Wrench, ChevronDown, Users, Package, AlertTriangle, GitBranch,
} from 'lucide-react';
import DiarioFotoUpload, { FotoPendente } from '@/components/diario/DiarioFotoUpload';
import { createNotification } from '@/lib/createNotification';
import { formatDate, climaLabels, statusDiarioLabels, DiarioRegistro, DiarioServico } from '@/data/mockData';

// ─── DB row shapes (Supabase query results) ──────────────────────────────────
type DiarioRegistroRow = {
  id: string; obra_id: string; user_id: string | null; usuario_nome: string;
  data: string; clima: string; trabalhadores: number;
  servicos_executados: string | null; observacoes: string | null;
  problemas: string | null; fotos: string[] | null; status: string;
  link_id: string | null;
  membros_presentes: string[] | null;
};

interface MembroEquipe { id: string; nome: string; funcao?: string; }
type DiarioServicoRow = {
  id: string; registro_id: string; descricao: string;
  tarefa_id: string | null; etapa_id: string | null;
  composicao_id: string | null; percentual_adicionado: number | null;
};
type DiarioFotoRow = {
  id: string; registro_id: string; storage_path: string; legenda: string | null;
};

// ─── Tipo local para Material Faltante ───────────────────────────────────────
interface MaterialFaltante {
  id: string;
  nome: string;
  unidade: string;
  quantidade_estimada: number;
  observacao: string;
}

// ─── Icons de clima ─────────────────────────────────────────────────────────
const climaIcons: Record<string, React.ElementType> = {
  sol: Sun, nublado: Cloud, chuva: CloudRain, chuvoso_forte: CloudRain,
};

// ─── Status badge ────────────────────────────────────────────────────────────
const statusStyles: Record<string, string> = {
  aprovado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pendente:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  rejeitado: 'bg-red-500/15 text-red-400 border-red-500/30',
};

// ─── Registro Card ───────────────────────────────────────────────────────────
function RegistroCard({
  registro, selected, canApprove, fotos, linkId, onSelect, onEdit, onApprove, onReject, onDelete,
}: {
  registro: DiarioRegistro;
  selected: boolean;
  canApprove: boolean;
  fotos: { id: string; storage_path: string; legenda: string }[];
  linkId?: string | null;
  onSelect: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const { usuario_nome } = registro;
  const ClimaIcon = climaIcons[registro.clima] || Sun;
  const getFotoUrl = (path: string) => {
    const { data } = supabase.storage.from('diario-fotos').getPublicUrl(path);
    return data?.publicUrl || '';
  };

  // Extrair badges extras (urgente + faltantes) do campo extras passado via registro
  const urgente = (registro as any).urgente as boolean | undefined;
  const faltantesCount = Array.isArray((registro as any).materiais_faltantes)
    ? (registro as any).materiais_faltantes.length
    : 0;

  return (
    <div className={cn(
      'border rounded-xl p-4 bg-card transition-all duration-150',
      selected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border/80',
      urgente && 'border-amber-500/40'
    )}>
      <div className="flex items-start gap-3">
        <button onClick={onSelect} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
          {selected ? <CheckSquare className="h-4 w-4 text-primary/80" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-foreground text-sm">{formatDate(registro.data)}</span>
            <Badge className={cn('text-[10px] border', statusStyles[registro.status])}>
              {statusDiarioLabels[registro.status]}
            </Badge>
            {urgente && (
              <Badge className="text-[10px] border border-amber-500/40 bg-amber-500/10 text-amber-500 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Urgente
              </Badge>
            )}
            {faltantesCount > 0 && (
              <Badge className="text-[10px] border border-orange-500/40 bg-orange-500/10 text-orange-500 gap-0.5">
                <Package className="h-2.5 w-2.5" /> {faltantesCount} faltante{faltantesCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {linkId && (
              <Badge variant="outline" className="text-[10px] border-sky-500/30 bg-sky-500/10 text-sky-500 gap-0.5">
                <Wrench className="h-2.5 w-2.5" /> Via link
              </Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClimaIcon className="h-3.5 w-3.5" /><span>{climaLabels[registro.clima]}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              👷 {registro.trabalhadores} trabalhador{registro.trabalhadores !== 1 ? 'es' : ''}
            </span>
          </div>
          {registro.servicos?.length > 0 && (
            <div className="mt-2 space-y-1">
              {registro.servicos.slice(0, 3).map(s => (
                <div key={s.id} className="flex items-start gap-1.5 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{s.descricao}</span>
                </div>
              ))}
              {registro.servicos.length > 3 && (
                <p className="text-[11px] text-muted-foreground ml-5">+{registro.servicos.length - 3} serviços...</p>
              )}
            </div>
          )}
          {registro.problemas && (
            <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-red-400 font-medium">⚠ Problema registrado</p>
              <p className="text-xs text-foreground/80 mt-0.5 line-clamp-2">{registro.problemas}</p>
            </div>
          )}
          {fotos.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              {fotos.slice(0, 5).map(f => (
                <img key={f.id} src={getFotoUrl(f.storage_path)} alt={f.legenda || 'Foto'}
                  className="h-14 w-14 rounded-lg object-cover shrink-0 border border-border" />
              ))}
              {fotos.length > 5 && (
                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border">
                  <span className="text-xs font-medium text-muted-foreground">+{fotos.length - 5}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {canApprove && registro.status === 'pendente' && (
            <>
              <button
                onClick={onApprove}
                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                title="Revisar e aprovar"
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button onClick={onReject} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Rejeitar">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Aceite Sheet (G5) ───────────────────────────────────────────────────────
function AceiteDiarioDrawer({
  registro, obraId, open, onClose, onApproved,
}: {
  registro: DiarioRegistro | null;
  obraId: string;
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [etapas, setEtapas] = useState<{ id: string; nome: string }[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEtapas, setShowEtapas] = useState(false);

  // Detecção responsiva
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!open || !obraId) return;
    setSelecionadas([]);
    setShowEtapas(false);
    supabase
      .from('orcamento_categorias')
      .select('id, nome')
      .eq('obra_id', obraId)
      .order('ordem')
      .then(({ data }) => setEtapas((data as { id: string; nome: string }[]) || []));
  }, [open, obraId]);

  const toggleEtapa = (id: string) =>
    setSelecionadas(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleApprove = async () => {
    if (!registro) return;
    setSaving(true);
    await supabase.from('diario_registros').update({
      status: 'aprovado',
      etapas_vinculadas: selecionadas.length > 0 ? selecionadas : null,
    }).eq('id', registro.id);
    setSaving(false);
    onApproved();
    onClose();
  };

  const handleReject = async () => {
    if (!registro) return;
    setSaving(true);
    await supabase.from('diario_registros').update({ status: 'rejeitado' }).eq('id', registro.id);
    setSaving(false);
    onApproved();
    onClose();
  };

  if (!registro) return null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col p-0',
          isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-[480px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Revisar registro — {formatDate(registro.data)}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enviado por <strong>{registro.usuario}</strong>
              {' · '}{registro.trabalhadores} trabalhadores{' · '}
              {climaLabels[registro.clima]}
            </p>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Atividades */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atividades reportadas</label>
            <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {registro.servicosExecutados || '(sem descrição)'}
              </p>
            </div>
          </div>

          {/* Problema, se houver */}
          {registro.problemas && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-xs font-semibold text-red-400 mb-0.5">Ocorrência reportada</p>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{registro.problemas}</p>
            </div>
          )}

          {/* Vinculação a etapas */}
          <div className="space-y-2">
            <button
              onClick={() => setShowEtapas(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground w-full text-left"
            >
              <GitBranch className="h-4 w-4 text-primary/80" />
              Vincular a etapas do cronograma
              {selecionadas.length > 0 && (
                <Badge variant="outline" className="text-[10px] ml-1">{selecionadas.length} selecionadas</Badge>
              )}
              <ChevronDown className={cn('h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform', showEtapas && 'rotate-180')} />
            </button>
            <p className="text-xs text-muted-foreground">Opcional — ajuda a rastrear progresso por etapa.</p>

            {showEtapas && (
              <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-56 overflow-y-auto">
                {etapas.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma etapa cadastrada.</p>
                ) : etapas.map(e => (
                  <label key={e.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selecionadas.includes(e.id)}
                      onChange={() => toggleEtapa(e.id)}
                    />
                    <span className="text-sm text-foreground">{e.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer fixo */}
        <div className="border-t border-border px-5 py-4 flex flex-col gap-2 shrink-0">
          <Button
            onClick={handleApprove}
            disabled={saving}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Aprovar registro
          </Button>
          <Button
            onClick={handleReject}
            disabled={saving}
            variant="outline"
            className="w-full h-11 text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <XCircle className="h-4 w-4 mr-2" /> Rejeitar
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">Cancelar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}


// ─── Tipo estendido para serviço com vínculo ao novo cronograma ──────────────
interface ServicoForm extends DiarioServico {
  /** ID da tarefa em cronograma_tarefas (novo cronograma) */
  tarefaId?: string;
  /** ID da etapa legada (categorias do orçamento) */
  etapaId?: string;
  /** ID da composição legada */
  composicaoId?: string;
  /** Percentual de conclusão adicionado neste registro */
  percentualAdicionado?: number;
}

// ─── Formulário (Drawer bottom sheet) ────────────────────────────────────────
function RegistroFormDrawer({
  open, editingId, obraId, onClose, onSaved,
}: {
  open: boolean;
  editingId: string | null;
  obraId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { getOrcamento } = useOrcamento();
  const { company } = useCompany();

  // Detecção responsiva
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const orcamento = getOrcamento(obraId);

  const [saving, setSaving] = useState(false);
  const [dataRegistro, setDataRegistro] = useState<Date>(new Date());
  const [clima, setClima] = useState<DiarioRegistro['clima']>('sol');
  const [trabalhadores, setTrabalhadores] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [problemas, setProblemas] = useState('');
  const [servicos, setServicos] = useState<ServicoForm[]>([]);
  const [materiaisFaltantes, setMateriaisFaltantes] = useState<MaterialFaltante[]>([]);
  const [urgente, setUrgente] = useState(false);
  const [fotosPendentes, setFotosPendentes] = useState<FotoPendente[]>([]);

  // ── Equipe da obra (opcional) ──
  const [membrosDisponiveis, setMembrosDisponiveis] = useState<MembroEquipe[]>([]);
  const [membrosPresentes, setMembrosPresentes] = useState<string[]>([]);
  const [showMembros, setShowMembros] = useState(false);

  const reset = () => {
    setDataRegistro(new Date()); setClima('sol'); setTrabalhadores('');
    setObservacoes(''); setProblemas(''); setServicos([]); setMateriaisFaltantes([]);
    setUrgente(false); setFotosPendentes([]); setMembrosPresentes([]); setShowMembros(false);
  };

  useEffect(() => {
    if (!open) return;
    // Buscar equipe da obra (sempre, para o toggle)
    (supabase.from('equipe_colaboradores') as any)
      .select('id, nome, funcao')
      .eq('obra_id', obraId)
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }: { data: MembroEquipe[] | null }) => setMembrosDisponiveis(data || []));

    if (!editingId) { reset(); return; }
    (async () => {
      const { data: reg } = await supabase.from('diario_registros').select('*').eq('id', editingId).single();
      if (!reg) return;
      const regRow = reg as DiarioRegistroRow;
      const { data: svcs } = await supabase.from('diario_servicos').select('*').eq('registro_id', editingId);
      setDataRegistro(new Date(regRow.data + 'T12:00:00'));
      setClima(regRow.clima as DiarioRegistro['clima']);
      setTrabalhadores(String(regRow.trabalhadores || ''));
      setObservacoes(regRow.observacoes || '');
      setProblemas(regRow.problemas || '');
      const mp = regRow.membros_presentes || [];
      setMembrosPresentes(mp);
      if (mp.length > 0) setShowMembros(true);
      setServicos(((svcs || []) as DiarioServicoRow[]).map((s) => ({
        id: s.id, descricao: s.descricao,
      })));
      const regAny = reg as any;
      setMateriaisFaltantes(Array.isArray(regAny.materiais_faltantes) ? regAny.materiais_faltantes : []);
      setUrgente(regAny.urgente === true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingId]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const hoje = format(dataRegistro, 'yyyy-MM-dd');
    const descGeral = servicos.map(s => s.descricao).filter(Boolean).join('. ') || 'Sem descrição';
    const filteredServicos = servicos.filter(s => s.descricao.trim());

    try {
      let registroId = editingId;

      const qtdTrabalhadores = membrosPresentes.length > 0
        ? membrosPresentes.length
        : parseInt(trabalhadores) || 0;

      if (editingId) {
        await supabase.from('diario_registros').update({
          data: hoje, clima, trabalhadores: qtdTrabalhadores,
          servicos_executados: descGeral, observacoes, problemas,
          membros_presentes: membrosPresentes.length > 0 ? membrosPresentes : [],
          urgente,
          materiais_faltantes: materiaisFaltantes,
        }).eq('id', editingId);
        await supabase.from('diario_servicos').delete().eq('registro_id', editingId);
      } else {
        const { data: newReg, error } = await supabase.from('diario_registros').insert({
          obra_id: obraId, user_id: user.id, data: hoje, clima,
          trabalhadores: qtdTrabalhadores,
          servicos_executados: descGeral, observacoes, problemas,
          usuario_nome: user.name, status: 'pendente',
          membros_presentes: membrosPresentes.length > 0 ? membrosPresentes : [],
          urgente,
          materiais_faltantes: materiaisFaltantes,
        }).select().single();
        if (error || !newReg) throw error;
        registroId = (newReg as DiarioRegistroRow).id;
      }

      if (filteredServicos.length > 0) {
        await supabase.from('diario_servicos').insert(
          filteredServicos.map(s => ({
            registro_id: registroId,
            descricao: s.descricao,
            tarefa_id: null,
            etapa_id: null,
            composicao_id: null,
            percentual_adicionado: 0,
          }))
        );
      }

      // Entradas pendentes para cada material faltante
      const faltantesFiltrados = materiaisFaltantes.filter(m => m.nome.trim());
      if (faltantesFiltrados.length > 0 && registroId) {
        await (supabase as any).from('entradas_pendentes').insert(
          faltantesFiltrados.map(m => ({
            obra_id: obraId,
            nome: m.nome.trim(),
            unidade: m.unidade || 'un',
            quantidade: m.quantidade_estimada || 0,
            observacoes: m.observacao || null,
            origem: 'diario',
            diario_registro_id: registroId,
          }))
        );
        if (company?.id) {
          await createNotification({
            company_id: company.id,
            obra_id: obraId,
            tipo: 'material_faltante',
            prioridade: 'importante',
            titulo: `${faltantesFiltrados.length} material(is) faltante(s) reportado(s)`,
            mensagem: faltantesFiltrados.map(m => m.nome).join(', '),
            acao_url: '/compras',
            acao_label: 'Ver compras',
          });
        }
      }

      if (urgente && company?.id) {
        await createNotification({
          company_id: company.id,
          obra_id: obraId,
          tipo: 'item_urgente_diario',
          prioridade: 'critica',
          titulo: 'Registro do diário marcado como urgente',
          mensagem: `Diário de ${hoje} requer atenção imediata`,
          acao_url: '/execucao',
          acao_label: 'Ver diário',
        });
      }

      // Fotos
      for (const foto of fotosPendentes) {
        const ext = foto.file.name.split('.').pop();
        const path = `${obraId}/${registroId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('diario-fotos').upload(path, foto.file);
        if (!upErr) await supabase.from('diario_fotos').insert({ registro_id: registroId, storage_path: path, legenda: foto.legenda });
      }

      toast({ title: editingId ? 'Registro atualizado!' : 'Registro criado!' });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'flex flex-col p-0',
          isMobile ? 'h-[88vh] rounded-t-2xl' : 'w-[520px]'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            {editingId ? 'Editar Registro' : 'Novo Registro do Diário'}
          </h2>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Data + clima */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 justify-start text-left text-sm font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(dataRegistro, 'dd/MM/yy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataRegistro}
                    onSelect={(d) => d && setDataRegistro(d)}
                    disabled={(date) => date > new Date()} initialFocus locale={ptBR}
                    className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Clima</label>
              <Select value={clima} onValueChange={v => setClima(v as DiarioRegistro['clima'])}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sol">☀️ Sol</SelectItem>
                  <SelectItem value="nublado">⛅ Nublado</SelectItem>
                  <SelectItem value="chuva">🌧️ Chuva</SelectItem>
                  <SelectItem value="chuvoso_forte">⛈️ Forte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trabalhadores */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Trabalhadores no canteiro</label>
            <Input type="number" min={0} placeholder="0" className="h-10"
              value={membrosPresentes.length > 0 ? String(membrosPresentes.length) : trabalhadores}
              onChange={e => { setTrabalhadores(e.target.value); setMembrosPresentes([]); }}
              disabled={membrosPresentes.length > 0}
            />
          </div>


          {/* ── Presença de membros (opcional, colapsável) ─────────────── */}
          {membrosDisponiveis.length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMembros(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-foreground/80">
                  <Users className="h-3.5 w-3.5 text-primary/70" />
                  Marcar presença de membros
                  {membrosPresentes.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {membrosPresentes.length} selecionado{membrosPresentes.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  showMembros && 'rotate-180',
                )} />
              </button>
              {showMembros && (
                <div className="border-t border-border/60 divide-y divide-border/40 max-h-48 overflow-y-auto">
                  {membrosDisponiveis.map(m => {
                    const checked = membrosPresentes.includes(m.id);
                    return (
                      <label key={m.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors">
                        <input
                          type="checkbox"
                          className="accent-primary h-4 w-4"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? membrosPresentes.filter(id => id !== m.id)
                              : [...membrosPresentes, m.id];
                            setMembrosPresentes(next);
                            if (next.length > 0) setTrabalhadores(String(next.length));
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{m.nome}</p>
                          {m.funcao && <p className="text-xs text-muted-foreground truncate">{m.funcao}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Serviços */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Serviços Executados</label>
              <Button variant="outline" size="sm" className="h-8" onClick={() =>
                setServicos([...servicos, { id: `svc-${Date.now()}`, descricao: '' }])
              }>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {servicos.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum serviço adicionado.</p>
            )}
            {servicos.map((svc, idx) => (
              <div key={svc.id} className="flex items-start gap-2">
                <Input placeholder="Descrição do serviço..."
                  value={svc.descricao}
                  onChange={e => setServicos(servicos.map((s, i) => i === idx ? { ...s, descricao: e.target.value } : s))}
                  className="h-10 flex-1" />
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0"
                  onClick={() => setServicos(servicos.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Observações</label>
            <Textarea placeholder="Anotações gerais do dia..." rows={2} value={observacoes}
              onChange={e => setObservacoes(e.target.value)} className="resize-none" />
          </div>

          {/* Problemas */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <span className="text-amber-400">⚠</span> Problemas / Ocorrências
            </label>
            <Textarea placeholder="Descreva problemas, atrasos ou acidentes..." rows={2} value={problemas}
              onChange={e => setProblemas(e.target.value)} className="resize-none" />
          </div>

          {/* Material Faltante */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-amber-400" />
                Material Faltante
              </label>
              <Button variant="outline" size="sm" className="h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() =>
                setMateriaisFaltantes([...materiaisFaltantes, { id: `falt-${Date.now()}`, nome: '', unidade: 'un', quantidade_estimada: 0, observacao: '' }])
              }>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {materiaisFaltantes.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum material faltante. (Opcional)</p>
            )}
            {materiaisFaltantes.map((mat, idx) => (
              <div key={mat.id} className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Nome do material..." className="h-9 flex-1"
                    value={mat.nome}
                    onChange={e => setMateriaisFaltantes(materiaisFaltantes.map((m, i) => i === idx ? { ...m, nome: e.target.value } : m))} />
                  <Input type="number" min={0} step={0.01} className="w-20 h-9 text-xs" placeholder="Qtd"
                    value={mat.quantidade_estimada || ''}
                    onChange={e => setMateriaisFaltantes(materiaisFaltantes.map((m, i) => i === idx ? { ...m, quantidade_estimada: parseFloat(e.target.value) || 0 } : m))} />
                  <Select value={mat.unidade} onValueChange={v => setMateriaisFaltantes(materiaisFaltantes.map((m, i) => i === idx ? { ...m, unidade: v } : m))}>
                    <SelectTrigger className="w-20 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['un', 'kg', 'g', 'm', 'm²', 'm³', 'L', 'cx', 'sc', 'pc', 'bd'].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setMateriaisFaltantes(materiaisFaltantes.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Input placeholder="Observação (opcional)..." className="h-8 text-xs"
                  value={mat.observacao}
                  onChange={e => setMateriaisFaltantes(materiaisFaltantes.map((m, i) => i === idx ? { ...m, observacao: e.target.value } : m))} />
              </div>
            ))}
          </div>

          {/* Fotos */}
          <DiarioFotoUpload fotos={fotosPendentes} onChange={setFotosPendentes} />

        </div>

        {/* Footer fixo */}
        <div className="border-t border-border px-5 py-4 flex flex-col gap-2 shrink-0">
          {/* Toggle urgente */}
          <button
            type="button"
            onClick={() => setUrgente(v => !v)}
            className={cn(
              'flex items-center gap-2.5 text-sm font-medium transition-colors w-full py-2',
              urgente ? 'text-amber-500' : 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              urgente ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40'
            )}>
              {urgente && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            Marcar como urgente — notificar gestor
          </button>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editingId ? 'Salvar Alterações' : 'Criar Registro'}
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full h-11">
            Cancelar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── DiarioTab (main export) ─────────────────────────────────────────────────

export default function DiarioTab({ obraId, onKpiChange }: { obraId: string; onKpiChange?: () => void }) {
  const { user, hasPermission } = useAuth();
  const { company } = useCompany();
  const canCreate = hasPermission('diario:create');
  const canApprove = hasPermission('diario:approve');

  const [registros, setRegistros] = useState<DiarioRegistro[]>([]);
  const [registroFotos, setRegistroFotos] = useState<Map<string, { id: string; storage_path: string; legenda: string }[]>>(new Map());
  const [registroLinkIds, setRegistroLinkIds] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('_all');
  const [aceiteRegistro, setAceiteRegistro] = useState<DiarioRegistro | null>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const { data: regs } = await supabase.from('diario_registros')
      .select('*').eq('obra_id', obraId).order('data', { ascending: false });
    if (!regs) { setLoading(false); return; }
    
    // Verificação de diário vazio
    if (company?.id && regs.length > 0) {
      const dataMaisRecente = parseISO(regs[0].data);
      if (differenceInBusinessDays(new Date(), dataMaisRecente) >= 3) {
        enviarNotificacaoDedup({
          company_id: company.id,
          obra_id: obraId,
          tipo: 'diario_nao_preenchido',
          titulo: 'Diário de Obra Desatualizado',
          mensagem: `O diário de obra não constata nenhum preenchimento há mais de 3 dias úteis. Último: ${format(dataMaisRecente, 'dd/MM/yyyy')}`,
          prioridade: 'importante',
          acao_url: `/execucao?tab=diario`,
          acao_label: 'Preencher Diário',
          metadataKey: 'diario_obra_id',
          metadataValue: obraId,
        }, 1);
      }
    }

    const regRows = regs as DiarioRegistroRow[];
    const regIds = regRows.map((r) => r.id);
    const { data: svcs } = await supabase
      .from('diario_servicos')
      .select('*')
      .in('registro_id', regIds.length > 0 ? regIds : ['_none']);
    const svcRows = (svcs || []) as DiarioServicoRow[];
    const mapped: DiarioRegistro[] = regRows.map((r) => ({
      id: r.id, obraId: r.obra_id, data: r.data, usuario: r.usuario_nome, usuarioId: r.user_id ?? undefined,
      clima: r.clima as DiarioRegistro['clima'], trabalhadores: r.trabalhadores, servicosExecutados: r.servicos_executados || '',
      servicos: svcRows.filter((s) => s.registro_id === r.id).map((s) => ({
        id: s.id, descricao: s.descricao,
      })),
      materiaisUtilizados: [],
      observacoes: r.observacoes || '', problemas: r.problemas || '',
      fotos: r.fotos || [], status: r.status as DiarioRegistro['status'],
      urgente: (r as any).urgente,
      materiais_faltantes: (r as any).materiais_faltantes,
    }));
    // Mapeia link_ids por registro
    const linkMap = new Map<string, string | null>();
    regRows.forEach((r) => linkMap.set(r.id, r.link_id || null));
    setRegistroLinkIds(linkMap);
    if (regIds.length > 0) {
      const { data: fotosData } = await supabase.from('diario_fotos').select('*').in('registro_id', regIds);
      if (fotosData) {
        const fotoMap = new Map<string, { id: string; storage_path: string; legenda: string }[]>();
        (fotosData as DiarioFotoRow[]).forEach((f) => {
          const arr = fotoMap.get(f.registro_id) || [];
          arr.push({ id: f.id, storage_path: f.storage_path, legenda: f.legenda || '' });
          fotoMap.set(f.registro_id, arr);
        });
        setRegistroFotos(fotoMap);
      }
    }
    setRegistros(mapped);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const handleSaved = () => { fetchRegistros(); onKpiChange?.(); };

  const filtered = registros.filter(r => {
    if (user?.role === 'cliente' && r.status !== 'aprovado') return false;
    if (filterStatus !== '_all' && r.status !== filterStatus) return false;
    return true;
  });

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleDelete = async (id: string) => {
    await supabase.from('diario_registros').delete().eq('id', id);
    toast({ title: 'Registro excluído.' });
    fetchRegistros(); onKpiChange?.();
  };

  return (
    <div className="space-y-4 p-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="rejeitado">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">{selectedIds.size} selecionado(s)</span>
          )}
        </div>
        {canCreate && (
          <Button size="sm" className="h-9 sm:h-10 shrink-0"
            onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Novo Registro</span>
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl animate-pulse bg-muted/40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
          {canCreate && (
            <Button size="sm" onClick={() => { setEditingId(null); setDrawerOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro registro
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <RegistroCard
              key={r.id} registro={r}
              selected={selectedIds.has(r.id)} canApprove={canApprove}
              fotos={registroFotos.get(r.id) || []}
              linkId={registroLinkIds.get(r.id)}
              onSelect={() => toggleSelect(r.id)}
              onEdit={() => { setEditingId(r.id); setDrawerOpen(true); }}
              onApprove={() => setAceiteRegistro(r)}
              onReject={async () => {
                await supabase.from('diario_registros').update({ status: 'rejeitado' }).eq('id', r.id);
                fetchRegistros();
              }}
              onDelete={() => setDeleteConfirmId(r.id)}
            />
          ))}
        </div>
      )}

      <RegistroFormDrawer
        open={drawerOpen} editingId={editingId} obraId={obraId}
        onClose={() => setDrawerOpen(false)} onSaved={handleSaved}
      />

      <AceiteDiarioDrawer
        registro={aceiteRegistro}
        obraId={obraId}
        open={!!aceiteRegistro}
        onClose={() => setAceiteRegistro(null)}
        onApproved={() => { fetchRegistros(); onKpiChange?.(); }}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); setDeleteConfirmId(null); }}
              className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
