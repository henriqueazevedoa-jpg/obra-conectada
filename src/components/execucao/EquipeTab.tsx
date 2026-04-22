import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Phone, AlertTriangle, 
  FileText, Plus, Trash2, Loader2, Upload, 
  ChevronDown, ChevronUp, Edit2, UserX, UserCheck,
  CalendarClock, X, BarChart2, Download, CalendarDays,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Colaborador {
  id: string;
  nome: string;
  funcao?: string;
  telefone?: string;
  whatsapp?: string;
  foto_url?: string;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  created_at: string;
}

interface Documento {
  id: string;
  colaborador_id: string;
  categoria: string;
  descricao?: string;
  data_emissao?: string;
  data_validade?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  created_at: string;
}

type DocStatus = 'ok' | 'expirando' | 'vencido';

// ── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS_DOC: { value: string; label: string }[] = [
  { value: 'contrato_trabalho', label: 'Contrato de trabalho' },
  { value: 'rg',                label: 'RG' },
  { value: 'cpf',               label: 'CPF' },
  { value: 'ctps',              label: 'CTPS' },
  { value: 'aso',               label: 'ASO (Atestado de Saúde Ocupacional)' },
  { value: 'outros',            label: 'Outros' },
];

const FUNCOES_SUGERIDAS = [
  'Mestre de obras', 'Encarregado', 'Pedreiro', 'Servente',
  'Armador', 'Carpinteiro', 'Eletricista', 'Encanador',
  'Pintor', 'Azulejista', 'Gesseiro', 'Vidraceiro',
  'Operador de máquina', 'Engenheiro', 'Arquiteto', 'Técnico',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function docStatus(data_validade?: string): DocStatus {
  if (!data_validade) return 'ok';
  const dias = differenceInDays(parseISO(data_validade), new Date());
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'expirando';
  return 'ok';
}

function piorStatusDocs(docs: Documento[]): DocStatus {
  const statuses = docs.map(d => docStatus(d.data_validade));
  if (statuses.includes('vencido')) return 'vencido';
  if (statuses.includes('expirando')) return 'expirando';
  return 'ok';
}

function whatsappUrl(tel: string) {
  const clean = tel.replace(/\D/g, '');
  const num = clean.startsWith('55') ? clean : `55${clean}`;
  return `https://wa.me/${num}`;
}

// ── Modal: Novo/Editar Colaborador ───────────────────────────────────────────

function ColaboradorModal({
  open, onClose, onSaved, colaborador, obraId, companyId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  colaborador?: Colaborador | null;
  obraId: string;
  companyId: string;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '', funcao: '', telefone: '', whatsapp: '', observacoes: '',
  });
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (colaborador) {
        setForm({
          nome: colaborador.nome,
          funcao: colaborador.funcao || '',
          telefone: colaborador.telefone || '',
          whatsapp: colaborador.whatsapp || '',
          observacoes: colaborador.observacoes || '',
        });
        setFotoPreview(colaborador.foto_url || null);
      } else {
        setForm({ nome: '', funcao: '', telefone: '', whatsapp: '', observacoes: '' });
        setFotoPreview(null);
      }
      setFotoFile(null);
    }
  }, [open, colaborador]);

  const set = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let foto_url = colaborador?.foto_url || null;

      // Upload de foto se houver
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const path = `${companyId}/${obraId}/${Date.now()}.${ext}`;
        const { error: upErr } = await (supabase.storage as any)
          .from('equipe-documentos')
          .upload(`fotos/${path}`, fotoFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = (supabase.storage as any)
            .from('equipe-documentos')
            .getPublicUrl(`fotos/${path}`);
          foto_url = urlData?.publicUrl || null;
        }
      }

      const payload = {
        company_id: companyId,
        obra_id: obraId,
        nome: form.nome.trim(),
        funcao: form.funcao || null,
        telefone: form.telefone || null,
        whatsapp: form.whatsapp || null,
        observacoes: form.observacoes || null,
        foto_url,
        updated_at: new Date().toISOString(),
      };

      let err: unknown;
      if (colaborador) {
        const res = await (supabase.from('equipe_colaboradores') as any)
          .update(payload)
          .eq('id', colaborador.id);
        err = res.error;
      } else {
        const res = await (supabase.from('equipe_colaboradores') as any)
          .insert({ ...payload, status: 'ativo' });
        err = res.error;
      }

      if (err) throw err;
      toast({ title: colaborador ? '✅ Membro atualizado' : '✅ Membro adicionado', description: form.nome });
      onSaved();
      onClose();
    } catch {
      toast({ title: 'Erro ao salvar membro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {colaborador ? 'Editar membro' : 'Adicionar membro à equipe'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fotoRef.current?.click()}
              className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors cursor-pointer shrink-0"
            >
              {fotoPreview
                ? <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                : <Users className="h-6 w-6 text-primary/40" />
              }
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                <Upload className="h-4 w-4 text-white" />
              </div>
            </button>
            <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Foto opcional</p>
              <p className="text-[11px] text-muted-foreground/60">Clique para selecionar</p>
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo do membro" className="h-8 text-sm" />
          </div>

          {/* Função */}
          <div className="space-y-1">
            <Label className="text-xs">Função / Cargo</Label>
            <Input
              value={form.funcao}
              onChange={e => set('funcao', e.target.value)}
              placeholder="Ex: Pedreiro, Mestre de obras…"
              list="funcoes-list"
              className="h-8 text-sm"
            />
            <datalist id="funcoes-list">
              {FUNCOES_SUGERIDAS.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                placeholder="(11) 99999-9999" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">WhatsApp</Label>
              <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                placeholder="(11) 99999-9999" className="h-8 text-sm" />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              placeholder="Notas opcionais…" className="text-sm min-h-[60px] resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {colaborador ? 'Salvar alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal: Documento ─────────────────────────────────────────────────────────

function DocumentoModal({
  open, onClose, onSaved, colaboradorId, companyId, documento,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  colaboradorId: string;
  companyId: string;
  documento?: Documento | null;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoria: '', descricao: '', data_emissao: '', data_validade: '',
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (documento) {
        setForm({
          categoria: documento.categoria,
          descricao: documento.descricao || '',
          data_emissao: documento.data_emissao || '',
          data_validade: documento.data_validade || '',
        });
      } else {
        setForm({ categoria: '', descricao: '', data_emissao: '', data_validade: '' });
      }
      setArquivo(null);
    }
  }, [open, documento]);

  const set = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.categoria) {
      toast({ title: 'Categoria obrigatória', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let arquivo_url = documento?.arquivo_url || null;
      let arquivo_nome = documento?.arquivo_nome || null;

      if (arquivo) {
        const path = `${companyId}/${colaboradorId}/${Date.now()}_${arquivo.name}`;
        const { error: upErr } = await (supabase.storage as any)
          .from('equipe-documentos')
          .upload(`docs/${path}`, arquivo, { upsert: true });
        if (!upErr) {
          const { data: signed } = await (supabase.storage as any)
            .from('equipe-documentos')
            .createSignedUrl(`docs/${path}`, 60 * 60 * 24 * 365);
          arquivo_url = signed?.signedUrl || null;
          arquivo_nome = arquivo.name;
        }
      }

      const payload = {
        company_id: companyId,
        colaborador_id: colaboradorId,
        categoria: form.categoria,
        descricao: form.descricao || null,
        data_emissao: form.data_emissao || null,
        data_validade: form.data_validade || null,
        arquivo_url,
        arquivo_nome,
      };

      let err: unknown;
      if (documento) {
        const res = await (supabase.from('equipe_documentos') as any)
          .update(payload).eq('id', documento.id);
        err = res.error;
      } else {
        const res = await (supabase.from('equipe_documentos') as any).insert(payload);
        err = res.error;
      }

      if (err) throw err;
      toast({ title: documento ? '✅ Documento atualizado' : '✅ Documento adicionado' });
      onSaved();
      onClose();
    } catch {
      toast({ title: 'Erro ao salvar documento', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const categoriaLabel = CATEGORIAS_DOC.find(c => c.value === form.categoria)?.label || 'documento';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {documento ? 'Editar documento' : 'Adicionar documento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Categoria *</Label>
            <Select value={form.categoria} onValueChange={v => set('categoria', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecionar categoria…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_DOC.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder={`Ex: ${categoriaLabel} do João`} className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Data de emissão</Label>
              <Input type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)}
                className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data de validade</Label>
              <Input type="date" value={form.data_validade} onChange={e => set('data_validade', e.target.value)}
                className="h-8 text-sm" />
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-1">
            <Label className="text-xs">Arquivo (opcional)</Label>
            <div
              onClick={() => arquivoRef.current?.click()}
              className={cn(
                'flex items-center gap-3 rounded-lg border border-dashed p-3 cursor-pointer transition-colors',
                'hover:border-primary/60 hover:bg-primary/5',
                arquivo ? 'border-primary/40 bg-primary/5' : 'border-border',
              )}
            >
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {arquivo ? arquivo.name : (documento?.arquivo_nome || 'Clique para selecionar arquivo…')}
              </span>
              {arquivo && (
                <button type="button" onClick={e => { e.stopPropagation(); setArquivo(null); }}
                  className="ml-auto shrink-0">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <input ref={arquivoRef} type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => setArquivo(e.target.files?.[0] || null)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            {documento ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card de Colaborador ───────────────────────────────────────────────────────

function ColaboradorCard({
  colaborador,
  documentos,
  companyId,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddDoc,
  onEditDoc,
  onDeleteDoc,
}: {
  colaborador: Colaborador;
  documentos: Documento[];
  companyId: string;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  onAddDoc: () => void;
  onEditDoc: (doc: Documento) => void;
  onDeleteDoc: (doc: Documento) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = piorStatusDocs(documentos);
  const ativo = colaborador.status === 'ativo';

  return (
    <div className={cn(
      'rounded-xl border bg-card transition-all',
      !ativo && 'opacity-60',
    )}>
      {/* Header do card */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div className="relative h-10 w-10 rounded-full overflow-hidden bg-primary/10 shrink-0 flex items-center justify-center">
          {colaborador.foto_url
            ? <img src={colaborador.foto_url} alt="" className="h-full w-full object-cover" />
            : <span className="text-sm font-semibold text-primary/70">
                {colaborador.nome.charAt(0).toUpperCase()}
              </span>
          }
          {/* Badge de status dos documentos */}
          {status !== 'ok' && (
            <div className={cn(
              'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center border-2 border-card',
              status === 'vencido' ? 'bg-red-500' : 'bg-amber-500',
            )}>
              <AlertTriangle className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{colaborador.nome}</p>
            {!ativo && (
              <Badge variant="secondary" className="text-[10px] h-4 shrink-0">Inativo</Badge>
            )}
          </div>
          {colaborador.funcao && (
            <p className="text-xs text-muted-foreground truncate">{colaborador.funcao}</p>
          )}
          {/* Contatos inline */}
          <div className="flex items-center gap-3 mt-0.5">
            {colaborador.telefone && (
              <a href={`tel:${colaborador.telefone}`}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                onClick={e => e.stopPropagation()}>
                <Phone className="h-3 w-3" />
                {colaborador.telefone}
              </a>
            )}
            {colaborador.whatsapp && (
              <a href={whatsappUrl(colaborador.whatsapp)} target="_blank" rel="noreferrer"
                className="text-[11px] text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                onClick={e => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.133.558 4.133 1.535 5.867L0 24l6.335-1.658A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.805 9.805 0 01-5.003-1.368l-.358-.214-3.724.976.993-3.628-.234-.373A9.785 9.785 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Editar membro">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onToggleStatus}
            className={cn(
              'h-7 w-7 rounded-lg flex items-center justify-center transition-colors',
              ativo
                ? 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10',
            )}
            title={ativo ? 'Marcar como inativo' : 'Reativar membro'}>
            {ativo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDelete}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remover membro">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setExpanded(p => !p)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors ml-1"
            title="Ver documentos"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Seção de Documentos */}
      {expanded && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Documentos
              {documentos.length > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                  {documentos.length}
                </span>
              )}
            </p>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={onAddDoc}>
              <Plus className="h-3 w-3" />Adicionar
            </Button>
          </div>

          {documentos.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-3">
              Nenhum documento cadastrado
            </p>
          ) : (
            <div className="space-y-1.5">
              {documentos.map(doc => {
                const st = docStatus(doc.data_validade);
                const catLabel = CATEGORIAS_DOC.find(c => c.value === doc.categoria)?.label || doc.categoria;
                return (
                  <div key={doc.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg p-2 text-sm',
                      st === 'vencido'   ? 'bg-red-500/8 border border-red-500/20' :
                      st === 'expirando' ? 'bg-amber-500/8 border border-amber-500/20' :
                      'bg-muted/30 border border-transparent',
                    )}>
                    <FileText className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      st === 'vencido' ? 'text-red-400' :
                      st === 'expirando' ? 'text-amber-400' : 'text-muted-foreground',
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{catLabel}</p>
                      {doc.descricao && (
                        <p className="text-[11px] text-muted-foreground truncate">{doc.descricao}</p>
                      )}
                      {doc.data_validade && (
                        <p className={cn(
                          'text-[11px] flex items-center gap-1',
                          st === 'vencido' ? 'text-red-400' :
                          st === 'expirando' ? 'text-amber-400' : 'text-muted-foreground',
                        )}>
                          <CalendarClock className="h-3 w-3" />
                          Válido até {format(parseISO(doc.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                          {st === 'vencido' && ' · Vencido'}
                          {st === 'expirando' && ` · ${differenceInDays(parseISO(doc.data_validade), new Date())} dias`}
                        </p>
                      )}
                    </div>
                    {st !== 'ok' && (
                      <Badge className={cn(
                        'text-[10px] h-5 shrink-0',
                        st === 'vencido'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                      )}>
                        {st === 'vencido' ? 'Vencido' : 'Expirando'}
                      </Badge>
                    )}
                    {doc.arquivo_url && (
                      <a href={doc.arquivo_url} target="_blank" rel="noreferrer"
                        className="shrink-0 text-[11px] text-primary hover:underline">
                        Ver
                      </a>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => onEditDoc(doc)}
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => onDeleteDoc(doc)}
                        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bloco 4: Relatório de Presença ──────────────────────────────────────────

interface PresencaRow {
  id: string;
  nome: string;
  funcao?: string;
  diasPresente: number;
  totalDias: number;
  percentual: number;
}

type PeriodoPreset = '7' | '30' | '90' | 'custom';

function PresencaView({ obraId, colaboradores }: {
  obraId: string;
  colaboradores: Colaborador[];
}) {
  const [periodo, setPeriodo] = useState<PeriodoPreset>('30');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim]     = useState('');
  const [rows, setRows] = useState<PresencaRow[]>([]);
  const [totalDias, setTotalDias] = useState(0);
  const [carregando, setCarregando] = useState(false);

  // Calcula datas do período
  const getRange = useCallback((): { inicio: string; fim: string } => {
    const hoje = new Date();
    const fim  = format(hoje, 'yyyy-MM-dd');
    if (periodo === 'custom') {
      return { inicio: dataInicio || fim, fim: dataFim || fim };
    }
    const dias = parseInt(periodo);
    const ini = new Date(hoje);
    ini.setDate(hoje.getDate() - dias + 1);
    return { inicio: format(ini, 'yyyy-MM-dd'), fim };
  }, [periodo, dataInicio, dataFim]);

  const fetchPresenca = useCallback(async () => {
    if (colaboradores.length === 0) { setRows([]); return; }
    setCarregando(true);
    const { inicio, fim } = getRange();

    // Busca diários do período com membros_presentes
    const { data: registros } = await (supabase.from('diario_registros') as any)
      .select('data, membros_presentes')
      .eq('obra_id', obraId)
      .gte('data', inicio)
      .lte('data', fim)
      .not('membros_presentes', 'is', null);

    const regs = (registros || []) as { data: string; membros_presentes: string[] }[];

    // Dias únicos com registro
    const diasUnicos = new Set(regs.map(r => r.data));
    const total = diasUnicos.size;
    setTotalDias(total);

    // Contar presenças por membro
    const contagem = new Map<string, Set<string>>();
    for (const reg of regs) {
      for (const memId of (reg.membros_presentes || [])) {
        if (!contagem.has(memId)) contagem.set(memId, new Set());
        contagem.get(memId)!.add(reg.data);
      }
    }

    const rowsCalc: PresencaRow[] = colaboradores.map(c => {
      const dias = contagem.get(c.id)?.size || 0;
      return {
        id: c.id,
        nome: c.nome,
        funcao: c.funcao,
        diasPresente: dias,
        totalDias: total,
        percentual: total > 0 ? Math.round((dias / total) * 100) : 0,
      };
    }).sort((a, b) => b.diasPresente - a.diasPresente);

    setRows(rowsCalc);
    setCarregando(false);
  }, [colaboradores, obraId, getRange]);

  useEffect(() => { fetchPresenca(); }, [fetchPresenca]);

  // CSV export (client-side)
  const exportCSV = () => {
    const { inicio, fim } = getRange();
    const header = 'Nome,Função,Dias Presentes,Total Dias Período,% Presença';
    const lines = rows.map(r =>
      `"${r.nome}","${r.funcao || ''}",${r.diasPresente},${r.totalDias},${r.percentual}%`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presenca_${inicio}_${fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { inicio, fim } = getRange();

  return (
    <div className="space-y-4">
      {/* Controles de período */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {([['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['custom', 'Período']] as [PeriodoPreset, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setPeriodo(v)}
                className={cn(
                  'px-3 py-1.5 transition-colors',
                  periodo === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}>{l}</button>
            ))}
          </div>
          {periodo === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs" />
              <span className="text-xs text-muted-foreground">à</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs" />
            </div>
          )}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportCSV}
          disabled={rows.length === 0 || carregando}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {/* Resumo do período */}
      {!carregando && inicio && fim && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>
            {format(parseISO(inicio), 'dd/MM/yyyy', { locale: ptBR })}
            {' — '}
            {format(parseISO(fim), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>{totalDias} dia{totalDias !== 1 ? 's' : ''} com registro de presença</span>
        </div>
      )}

      {/* Conteúdo */}
      {carregando ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse bg-muted/40" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm text-muted-foreground">
              {colaboradores.length === 0
                ? 'Adicione membros à equipe para ver o relatório.'
                : 'Nenhum registro de presença no período.'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              Marque membros no Diário de Obra para gerar o relatório.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Membro</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Dias presentes</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Total dias</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">% Presença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-medium truncate max-w-[160px]">{r.nome}</p>
                    {r.funcao && <p className="text-xs text-muted-foreground truncate">{r.funcao}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn(
                      'font-semibold tabular-nums',
                      r.diasPresente === 0 ? 'text-muted-foreground/40' : 'text-foreground',
                    )}>{r.diasPresente}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground hidden sm:table-cell">{r.totalDias}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            r.percentual >= 80 ? 'bg-emerald-500' :
                            r.percentual >= 50 ? 'bg-amber-500' : 'bg-red-400',
                          )}
                          style={{ width: `${r.percentual}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-xs font-semibold tabular-nums w-8 text-right',
                        r.percentual >= 80 ? 'text-emerald-400' :
                        r.percentual >= 50 ? 'text-amber-400' : 'text-red-400',
                      )}>{r.percentual}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EquipeTab({ obraId }: { obraId: string }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();
  const companyId = company?.id || '';
  const editing = user?.role === 'gestor' || user?.role === 'admin';

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'ativo' | 'inativo' | 'todos'>('ativo');
  const [activeView, setActiveView] = useState<'membros' | 'presenca'>('membros');

  // Modal states
  const [colabModal, setColabModal] = useState<{ open: boolean; colab?: Colaborador | null }>({ open: false });
  const [docModal, setDocModal] = useState<{ open: boolean; colaboradorId: string; doc?: Documento | null }>({
    open: false, colaboradorId: '',
  });
  const [deleteColab, setDeleteColab] = useState<Colaborador | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Documento | null>(null);

  const fetchData = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const [{ data: colabs }, { data: docs }] = await Promise.all([
      (supabase.from('equipe_colaboradores') as any)
        .select('*')
        .eq('obra_id', obraId)
        .order('nome'),
      (supabase.from('equipe_documentos') as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at'),
    ]);
    setColaboradores((colabs || []) as Colaborador[]);
    setDocumentos((docs || []) as Documento[]);
    setLoading(false);
  }, [obraId, companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleStatus = async (colab: Colaborador) => {
    const novoStatus = colab.status === 'ativo' ? 'inativo' : 'ativo';
    await (supabase.from('equipe_colaboradores') as any)
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', colab.id);
    fetchData();
  };

  const handleDeleteColab = async () => {
    if (!deleteColab) return;
    await (supabase.from('equipe_colaboradores') as any).delete().eq('id', deleteColab.id);
    toast({ title: 'Membro removido', description: deleteColab.nome });
    setDeleteColab(null);
    fetchData();
  };

  const handleDeleteDoc = async () => {
    if (!deleteDoc) return;
    await (supabase.from('equipe_documentos') as any).delete().eq('id', deleteDoc.id);
    toast({ title: 'Documento removido' });
    setDeleteDoc(null);
    fetchData();
  };

  const colaboradoresFiltrados = colaboradores.filter(c =>
    filtroStatus === 'todos' ? true : c.status === filtroStatus
  );

  const docsPorColab = (id: string) => documentos.filter(d => d.colaborador_id === id);

  // Alertas: quantos membros com docs vencidos/expirando
  const alertasVencido   = colaboradores.filter(c => piorStatusDocs(docsPorColab(c.id)) === 'vencido').length;
  const alertasExpirando = colaboradores.filter(c => piorStatusDocs(docsPorColab(c.id)) === 'expirando').length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-muted/40" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">

      {/* Sub-tabs: Membros / Presença */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs w-fit">
        <button
          onClick={() => setActiveView('membros')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 transition-colors',
            activeView === 'membros'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
          )}>
          <Users className="h-3 w-3" /> Membros
        </button>
        <button
          onClick={() => setActiveView('presenca')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 transition-colors',
            activeView === 'presenca'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
          )}>
          <BarChart2 className="h-3 w-3" /> Presença
        </button>
      </div>

      {/* View: Presença */}
      {activeView === 'presenca' && (
        <PresencaView obraId={obraId} colaboradores={colaboradores} />
      )}

      {/* View: Membros */}
      {activeView === 'membros' && <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {colaboradores.filter(c => c.status === 'ativo').length} membro{colaboradores.filter(c => c.status === 'ativo').length !== 1 ? 's' : ''} ativos
          </p>
          {/* Alertas de documentos */}
          {alertasVencido > 0 && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alertasVencido} doc{alertasVencido > 1 ? 's' : ''} vencido{alertasVencido > 1 ? 's' : ''}
            </Badge>
          )}
          {alertasExpirando > 0 && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alertasExpirando} expirando
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filtro de status */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(['ativo', 'inativo', 'todos'] as const).map(s => (
              <button key={s}
                onClick={() => setFiltroStatus(s)}
                className={cn(
                  'px-3 py-1.5 transition-colors capitalize',
                  filtroStatus === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}>
                {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : 'Inativos'}
              </button>
            ))}
          </div>
          {editing && (
            <Button size="sm" className="h-8 gap-1.5 text-xs"
              onClick={() => setColabModal({ open: true, colab: null })}>
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar membro
            </Button>
          )}
        </div>
      </div>

      {/* Lista vazia */}
      {colaboradoresFiltrados.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="h-14 w-14 rounded-full bg-muted/40 flex items-center justify-center">
            <Users className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {filtroStatus === 'inativo'
                ? 'Nenhum membro inativo'
                : 'Equipe ainda não cadastrada'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {filtroStatus === 'ativo' && editing && 'Adicione membros para registrar a equipe desta obra.'}
            </p>
          </div>
          {editing && filtroStatus !== 'inativo' && (
            <Button size="sm" variant="outline" className="gap-1.5"
              onClick={() => setColabModal({ open: true, colab: null })}>
              <UserPlus className="h-3.5 w-3.5" />
              Adicionar primeiro membro
            </Button>
          )}
        </div>
      )}

      {/* Cards */}
      <div className="space-y-2">
        {colaboradoresFiltrados.map(c => (
          <ColaboradorCard
            key={c.id}
            colaborador={c}
            documentos={docsPorColab(c.id)}
            companyId={companyId}
            onEdit={() => setColabModal({ open: true, colab: c })}
            onToggleStatus={() => handleToggleStatus(c)}
            onDelete={() => setDeleteColab(c)}
            onAddDoc={() => setDocModal({ open: true, colaboradorId: c.id, doc: null })}
            onEditDoc={doc => setDocModal({ open: true, colaboradorId: c.id, doc })}
            onDeleteDoc={doc => setDeleteDoc(doc)}
          />
        ))}
      </div>

      {/* Modais */}
      <ColaboradorModal
        open={colabModal.open}
        onClose={() => setColabModal({ open: false })}
        onSaved={fetchData}
        colaborador={colabModal.colab}
        obraId={obraId}
        companyId={companyId}
      />

      <DocumentoModal
        open={docModal.open}
        onClose={() => setDocModal({ open: false, colaboradorId: '' })}
        onSaved={fetchData}
        colaboradorId={docModal.colaboradorId}
        companyId={companyId}
        documento={docModal.doc}
      />

      {/* Confirm delete colaborador */}
      <AlertDialog open={!!deleteColab} onOpenChange={v => !v && setDeleteColab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{deleteColab?.nome}</strong> e todos os seus documentos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColab} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete documento */}
      <AlertDialog open={!!deleteDoc} onOpenChange={v => !v && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>} {/* end view membros */}
    </div>
  );
}
