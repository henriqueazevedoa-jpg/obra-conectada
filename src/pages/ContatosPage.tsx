/**
 * ContatosPage — /contatos
 * Sprint 14 — Melhorias:
 *  1. Chips de filtro sempre visíveis (mesmo count=0)
 *  2. Campo Especialidade → multi-select vinculado a cotacao_categorias
 *  3. Drawer de detalhes c/ seção "Obras relacionadas" (leitura)
 *  4. Ações rápidas (tel + WhatsApp) no hover do card
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useObras } from '@/contexts/ObrasContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Phone, Mail, MessageCircle, Plus, Search, Pencil, Trash2,
  Users, Building2, Hammer, Truck, HardHat, HelpCircle,
  Loader2, Globe, MapPin, FileText, X, Tag, HardDriveIcon,
  CheckSquare, Square, ExternalLink, Briefcase,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type TipoContato =
  | 'cliente'
  | 'fornecedor_material'
  | 'mao_de_obra'
  | 'parceiro'
  | 'projetista'
  | 'outro';

interface Contato {
  id: string;
  nome: string;
  tipo: TipoContato;
  empresa: string | null;
  especialidade: string | null;
  especialidade_ids: string[];
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  cidade: string | null;
  cnpj: string | null;
  tags: string[];
  observacoes: string | null;
  obra_ids: string[];
  created_at: string;
}

interface CotacaoCategoria {
  id: string;
  nome: string;
  codigo: string;
  emoji: string | null;
}

// ── Config de Tipos ────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoContato, {
  label: string;
  icon: React.ElementType;
  color: string;
  badgeClass: string;
}> = {
  cliente:             { label: 'Cliente',          icon: Building2,  color: 'text-primary',          badgeClass: 'bg-primary/10 text-primary border-primary/20' },
  fornecedor_material: { label: 'Fornecedor Mat.',  icon: Truck,      color: 'text-amber-600',        badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  mao_de_obra:         { label: 'Mão de Obra',      icon: Hammer,     color: 'text-emerald-600',      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
  parceiro:            { label: 'Parceiro',         icon: Users,      color: 'text-purple-600',       badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  projetista:          { label: 'Projetista',       icon: HardHat,    color: 'text-sky-600',          badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20' },
  outro:               { label: 'Outro',            icon: HelpCircle, color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground border-border' },
};

const TIPOS = Object.entries(TIPO_CONFIG) as [TipoContato, typeof TIPO_CONFIG[TipoContato]][];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toTelHref(tel: string | null): string | null {
  if (!tel) return null;
  const digits = tel.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.startsWith('55') && digits.length > 10) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return `+55${digits}`;
}

function toWaHref(wa: string | null): string | null {
  if (!wa) return null;
  const digits = wa.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

function getInitials(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
  'bg-primary/20 text-primary',
  'bg-emerald-500/20 text-emerald-700',
  'bg-amber-500/20 text-amber-700',
  'bg-purple-500/20 text-purple-700',
  'bg-sky-500/20 text-sky-700',
  'bg-rose-500/20 text-rose-700',
];
function avatarColor(nome: string): string {
  let hash = 0;
  for (const ch of nome) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Empty form ─────────────────────────────────────────────────────────────────

const EMPTY: Omit<Contato, 'id' | 'created_at'> = {
  nome: '', tipo: 'outro', empresa: '', especialidade: '', especialidade_ids: [],
  telefone: '', whatsapp: '', email: '', website: '',
  cidade: '', cnpj: '', tags: [], observacoes: '', obra_ids: [],
};

// ── Especialidade Multi-Select ─────────────────────────────────────────────────

function EspecialidadeMultiSelect({
  categorias,
  selected,
  onChange,
}: {
  categorias: CotacaoCategoria[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const selectedCats = categorias.filter(c => selected.includes(c.id));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent/30 transition-colors"
      >
        <span className="flex-1 text-left truncate">
          {selectedCats.length === 0
            ? <span className="text-muted-foreground">Selecionar especialidades...</span>
            : selectedCats.map(c => `${c.emoji ?? ''} ${c.nome}`).join(', ')
          }
        </span>
        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg p-1 max-h-52 overflow-y-auto">
          {categorias.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-2">
              Nenhuma categoria cadastrada. Crie em Cotação &amp; Preços.
            </p>
          ) : (
            categorias.map(cat => {
              const isSelected = selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left',
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-accent/50'
                  )}
                >
                  {isSelected ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="text-base leading-none">{cat.emoji}</span>
                  <span className="flex-1">{cat.nome}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{cat.codigo}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Contact Card ───────────────────────────────────────────────────────────────

function ContatoCard({
  contato,
  categorias,
  onEdit,
  onDelete,
  onView,
}: {
  contato: Contato;
  categorias: CotacaoCategoria[];
  onEdit: (c: Contato) => void;
  onDelete: (c: Contato) => void;
  onView: (c: Contato) => void;
}) {
  const cfg = TIPO_CONFIG[contato.tipo] || TIPO_CONFIG.outro;
  const Icon = cfg.icon;
  const telHref = toTelHref(contato.telefone);
  const waHref = toWaHref(contato.whatsapp || contato.telefone);
  const emailHref = contato.email ? `mailto:${contato.email}` : null;

  // Especialidades via categorias vinculadas
  const espCats = categorias.filter(c => (contato.especialidade_ids || []).includes(c.id));
  const espLabel = espCats.length > 0
    ? espCats.map(c => `${c.emoji ?? ''} ${c.nome}`).join(', ')
    : contato.especialidade || null;

  return (
    <div
      className="group relative flex flex-col bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200 gap-3 cursor-pointer"
      onClick={() => onView(contato)}
    >
      {/* ── Quick actions overlay (hover) ── */}
      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => e.stopPropagation()}
      >
        {telHref && (
          <a
            href={telHref}
            title={`Ligar: ${contato.telefone}`}
            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        )}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no WhatsApp"
            className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={() => onEdit(contato)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(contato)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Header: avatar + nome + tipo */}
      <div className="flex items-start gap-3 pr-24">
        <div className={cn('flex items-center justify-center h-11 w-11 rounded-xl text-base font-bold shrink-0', avatarColor(contato.nome))}>
          {getInitials(contato.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{contato.nome}</p>
          {contato.empresa && (
            <p className="text-xs text-muted-foreground truncate">{contato.empresa}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', cfg.badgeClass)}>
              <Icon className="h-2.5 w-2.5 mr-1" />{cfg.label}
            </Badge>
            {espLabel && (
              <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate max-w-[140px]">
                {espLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info linha */}
      {(contato.cidade || contato.cnpj) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          {contato.cidade && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contato.cidade}</span>}
          {contato.cnpj && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{contato.cnpj}</span>}
        </div>
      )}

      {/* Barra de Ações Rápidas */}
      <div
        className="flex gap-2 pt-1 border-t border-border/60"
        onClick={e => e.stopPropagation()}
      >
        {telHref ? (
          <a
            href={telHref}
            className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
            title={`Ligar para ${contato.telefone}`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ligar</span>
          </a>
        ) : (
          <div className="flex-1 py-1.5 rounded-lg bg-muted/50 flex items-center justify-center">
            <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        )}

        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors text-xs font-medium"
            title="Abrir no WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        ) : (
          <div className="flex-1 py-1.5 rounded-lg bg-muted/50 flex items-center justify-center">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        )}

        {emailHref ? (
          <a
            href={emailHref}
            className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
            title={`Enviar e-mail para ${contato.email}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">E-mail</span>
          </a>
        ) : (
          <div className="flex-1 py-1.5 rounded-lg bg-muted/50 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Tags */}
      {contato.tags && contato.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {contato.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drawer de Detalhes ─────────────────────────────────────────────────────────

function ContatoDetailSheet({
  contato,
  categorias,
  obras,
  open,
  onClose,
  onEdit,
}: {
  contato: Contato | null;
  categorias: CotacaoCategoria[];
  obras: { id: string; nome: string }[];
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!contato) return null;

  const cfg = TIPO_CONFIG[contato.tipo] || TIPO_CONFIG.outro;
  const Icon = cfg.icon;
  const telHref = toTelHref(contato.telefone);
  const waHref = toWaHref(contato.whatsapp || contato.telefone);
  const espCats = categorias.filter(c => (contato.especialidade_ids || []).includes(c.id));
  const obrasRelacionadas = obras.filter(o => (contato.obra_ids || []).includes(o.id));

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={cn('flex items-center justify-center h-14 w-14 rounded-2xl text-xl font-bold shrink-0', avatarColor(contato.nome))}>
              {getInitials(contato.nome)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{contato.nome}</h2>
              {contato.empresa && <p className="text-sm text-muted-foreground">{contato.empresa}</p>}
              <Badge variant="outline" className={cn('text-[10px] mt-1', cfg.badgeClass)}>
                <Icon className="h-2.5 w-2.5 mr-1" />{cfg.label}
              </Badge>
            </div>
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5 shrink-0">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ações rápidas */}
          <div className="flex gap-2">
            {telHref ? (
              <a href={telHref} className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors text-sm font-medium">
                <Phone className="h-4 w-4" /> Ligar
              </a>
            ) : <div className="flex-1 py-2.5 rounded-xl bg-muted/40" />}
            {waHref ? (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 transition-colors text-sm font-medium">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            ) : <div className="flex-1 py-2.5 rounded-xl bg-muted/40" />}
          </div>

          {/* Dados de contato */}
          {(contato.email || contato.website || contato.cidade || contato.cnpj) && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</p>
              {contato.email && (
                <a href={`mailto:${contato.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />{contato.email}
                </a>
              )}
              {contato.website && (
                <a href={contato.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />{contato.website}
                </a>
              )}
              {contato.cidade && (
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{contato.cidade}
                </p>
              )}
              {contato.cnpj && (
                <p className="flex items-center gap-2 text-sm text-foreground font-mono">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />{contato.cnpj}
                </p>
              )}
            </section>
          )}

          {/* Especialidades */}
          {(espCats.length > 0 || contato.especialidade) && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Especialidades</p>
              <div className="flex flex-wrap gap-1.5">
                {espCats.map(cat => (
                  <Badge key={cat.id} variant="secondary" className="gap-1 text-xs">
                    <span>{cat.emoji}</span>{cat.nome}
                  </Badge>
                ))}
                {espCats.length === 0 && contato.especialidade && (
                  <Badge variant="secondary" className="text-xs">{contato.especialidade}</Badge>
                )}
              </div>
            </section>
          )}

          {/* Tags */}
          {contato.tags?.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {contato.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Obras relacionadas */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> Obras relacionadas
            </p>
            {obrasRelacionadas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma obra associada a este contato.</p>
            ) : (
              <div className="space-y-1.5">
                {obrasRelacionadas.map(o => (
                  <div key={o.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted/40">
                    <HardDriveIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{o.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          {contato.observacoes && (
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{contato.observacoes}</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ContatosPage() {
  const { company } = useCompany();
  const { obras } = useObras();

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [categorias, setCategorias] = useState<CotacaoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<TipoContato | 'todos'>('todos');

  // Sheet de edição
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Contato, 'id' | 'created_at'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Sheet de visualização
  const [viewContato, setViewContato] = useState<Contato | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Contato | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchContatos = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('contatos')
      .select('*')
      .eq('company_id', company.id)
      .order('nome', { ascending: true });
    setContatos((data || []) as Contato[]);
    setLoading(false);
  }, [company?.id]);

  const fetchCategorias = useCallback(async () => {
    if (!company?.id) return;
    // Busca categorias da empresa + categorias padrão (is_default)
    const { data } = await (supabase as any)
      .from('cotacao_categorias')
      .select('id, nome, codigo, emoji')
      .or(`company_id.eq.${company.id},is_default.eq.true`)
      .order('nome');
    setCategorias((data || []) as CotacaoCategoria[]);
  }, [company?.id]);

  useEffect(() => { fetchContatos(); fetchCategorias(); }, [fetchContatos, fetchCategorias]);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contatos.filter(c => {
      const matchTipo = filterTipo === 'todos' || c.tipo === filterTipo;
      const matchSearch = !q || c.nome.toLowerCase().includes(q)
        || (c.empresa?.toLowerCase().includes(q) ?? false)
        || (c.especialidade?.toLowerCase().includes(q) ?? false)
        || (c.cidade?.toLowerCase().includes(q) ?? false);
      return matchTipo && matchSearch;
    });
  }, [contatos, search, filterTipo]);

  // ── Contagem por tipo ─────────────────────────────────────────────────────
  const countByTipo = useMemo(() => {
    const counts: Record<string, number> = { todos: contatos.length };
    for (const c of contatos) {
      counts[c.tipo] = (counts[c.tipo] || 0) + 1;
    }
    return counts;
  }, [contatos]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY);
    setTagsInput('');
    setSheetOpen(true);
  };

  const openEdit = (c: Contato) => {
    setEditingId(c.id);
    setForm({
      nome: c.nome, tipo: c.tipo, empresa: c.empresa || '',
      especialidade: c.especialidade || '', especialidade_ids: c.especialidade_ids || [],
      telefone: c.telefone || '', whatsapp: c.whatsapp || '', email: c.email || '',
      website: c.website || '', cidade: c.cidade || '', cnpj: c.cnpj || '',
      tags: c.tags || [], observacoes: c.observacoes || '', obra_ids: c.obra_ids || [],
    });
    setTagsInput((c.tags || []).join(', '));
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: 'Nome é obrigatório.', variant: 'destructive' }); return; }
    if (!company?.id) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        nome: form.nome.trim(), tipo: form.tipo,
        empresa: form.empresa || null, especialidade: form.especialidade || null,
        especialidade_ids: form.especialidade_ids || [],
        telefone: form.telefone || null, whatsapp: form.whatsapp || null,
        email: form.email || null, website: form.website || null,
        cidade: form.cidade || null, cnpj: form.cnpj || null,
        tags, observacoes: form.observacoes || null,
        company_id: company.id,
      };

      if (editingId) {
        const { error } = await (supabase as any).from('contatos').update(payload).eq('id', editingId);
        if (error) { toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Contato atualizado!' });
      } else {
        const { error } = await (supabase as any).from('contatos').insert(payload);
        if (error) { toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' }); return; }
        toast({ title: 'Contato criado!' });
      }
      setSheetOpen(false);
      fetchContatos();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any).from('contatos').delete().eq('id', deleteTarget.id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Contato excluído.' });
    setDeleteTarget(null);
    fetchContatos();
  };

  const obrasSimple = obras.map(o => ({ id: o.id, nome: o.nome }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[var(--color-background-primary)] animate-fade-in">

      {/* ─── STICKY HEADER ───────────────────────────────────────── */}
      <div className="sticky top-0 z-20 shrink-0">
        <div className="flex items-center h-[48px] bg-[var(--color-background-primary)] border-b-[0.5px] border-[var(--color-border-tertiary)] px-[16px] gap-0">
          <div className="flex items-center gap-2 shrink-0 flex-1">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Users className="h-4 w-4" style={{ color: '#15803D' }} />
            </div>
            <span className="text-[14px] font-medium text-[var(--color-text-primary)] whitespace-nowrap">
              Contatos
            </span>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 h-7 px-3 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white rounded-[6px] text-[12px] font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* ─── CONTEÚDO ROLÁVEL ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-5 space-y-4">

        {/* Chips de filtro por tipo — SEMPRE VISÍVEIS (bloco 1) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterTipo('todos')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-all',
              filterTipo === 'todos'
                ? 'bg-primary text-white border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            Todos
            <span className="bg-white/20 rounded-full px-1.5 text-[10px] font-bold">
              {countByTipo.todos ?? 0}
            </span>
          </button>

          {TIPOS.map(([tipo, cfg]) => {
            const TipoIcon = cfg.icon;
            const count = countByTipo[tipo] ?? 0;
            // BLOCO 1: sempre renderiza (sem o return null anterior)
            return (
              <button
                key={tipo}
                onClick={() => setFilterTipo(tipo)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 transition-all',
                  filterTipo === tipo
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                <TipoIcon className="h-3 w-3" />
                {cfg.label}
                <span className={cn('rounded-full px-1.5 text-[10px] font-bold',
                  filterTipo === tipo ? 'bg-white/20' : 'bg-muted'
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, empresa ou especialidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Grid de contatos */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Users className="h-12 w-12 text-muted-foreground/25" />
            <p className="text-base font-semibold text-foreground">
              {contatos.length === 0 ? 'Nenhum contato cadastrado' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {contatos.length === 0
                ? 'Adicione clientes, fornecedores, parceiros e equipes para centralizar seus contatos.'
                : 'Tente buscar por outro termo ou remover os filtros.'}
            </p>
            {contatos.length === 0 && (
              <Button onClick={openCreate} className="gap-2 mt-1">
                <Plus className="h-4 w-4" /> Adicionar primeiro contato
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'contato' : 'contatos'} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(c => (
                <ContatoCard
                  key={c.id}
                  contato={c}
                  categorias={categorias}
                  onEdit={() => openEdit(c)}
                  onDelete={() => setDeleteTarget(c)}
                  onView={() => setViewContato(c)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Drawer detalhes (bloco 3) ── */}
      <ContatoDetailSheet
        contato={viewContato}
        categorias={categorias}
        obras={obrasSimple}
        open={!!viewContato}
        onClose={() => setViewContato(null)}
        onEdit={() => { if (viewContato) { openEdit(viewContato); setViewContato(null); } }}
      />

      {/* ── Sheet de Cadastro/Edição ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar Contato' : 'Novo Contato'}</SheetTitle>
            <SheetDescription>
              {editingId ? 'Atualize as informações do contato.' : 'Preencha os dados do novo contato.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Nome + Tipo */}
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo ou razão social" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as TipoContato }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(([tipo, cfg]) => (
                    <SelectItem key={tipo} value={tipo}>
                      <span className="flex items-center gap-2">
                        <cfg.icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empresa */}
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.empresa || ''} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da empresa" />
            </div>

            {/* Especialidade — multi-select categorias (bloco 2) */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Especialidades
                <span className="text-[10px] text-muted-foreground font-normal">(categorias de cotação)</span>
              </Label>
              <EspecialidadeMultiSelect
                categorias={categorias}
                selected={form.especialidade_ids || []}
                onChange={ids => setForm(f => ({ ...f, especialidade_ids: ids }))}
              />
              <Input
                value={form.especialidade || ''}
                onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
                placeholder="Ou texto livre (ex: Elétrica, Estrutura...)"
                className="mt-1.5"
              />
            </div>

            {/* Contatos */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</p>
              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9" value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="Telefone / Celular" />
                </div>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9" value={form.whatsapp || ''} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="WhatsApp (se diferente)" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="E-mail" />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input className="pl-9" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="Website" />
                </div>
              </div>
            </div>

            {/* Dados adicionais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.cidade || ''} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ / CPF</Label>
                <Input value={form.cnpj || ''} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="Ex: urgente, confiável, obras-sul (separadas por vírgula)"
              />
              <p className="text-[10px] text-muted-foreground">Separe as tags por vírgula</p>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes || ''}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Notas internas sobre este contato..."
                rows={3}
              />
            </div>
          </div>

          <SheetFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar Contato'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirm Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
