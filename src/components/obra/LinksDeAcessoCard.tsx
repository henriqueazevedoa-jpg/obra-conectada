/**
 * LinksDeAcessoCard — Gerenciamento de links públicos por obra
 * Tipos: 'visualizacao' (read-only, permissões granulares) | 'operacao' (write, funcionário campo)
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Link2, Eye, Wrench, Plus, Copy, Power, PowerOff, Trash2,
  Loader2, ChevronDown, ChevronUp, Lock, Zap, Clock,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type LinkTipo = 'visualizacao' | 'operacao';

interface ObraLink {
  id: string;
  token: string;
  tipo: LinkTipo;
  nome_label: string;
  permissoes: Record<string, { ativo: boolean; indicadores?: string[] }>;
  permite_estoque: boolean;
  ativo: boolean;
  expires_at: string | null;
  views_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

// ── Permissões disponíveis por seção ─────────────────────────────────────────

const SECOES = [
  {
    key: 'painel',
    label: 'Painel da Obra',
    indicadores: [
      { key: 'andamento',      label: 'Andamento (%)' },
      { key: 'cronograma_mini',label: 'Cronograma resumido' },
      { key: 'fotos',          label: 'Fotos recentes' },
      { key: 'kpis_financeiros',label: 'KPIs financeiros' },
      { key: 'alertas',        label: 'Alertas e pendências' },
    ],
  },
  {
    key: 'cronograma',
    label: 'Cronograma',
    indicadores: [
      { key: 'status_etapas',  label: 'Status das etapas' },
      { key: 'datas',          label: 'Datas previstas/reais' },
      { key: 'valores_etapa',  label: 'Valores por etapa' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    indicadores: [
      { key: 'resumo_pagamentos', label: 'Resumo de pagamentos' },
      { key: 'custo_real',        label: 'Custo real vs. orçado' },
      { key: 'fluxo_caixa',       label: 'Fluxo de caixa' },
      { key: 'dre',               label: 'DRE da obra' },
    ],
  },
  {
    key: 'diario',
    label: 'Diário de Obra',
    indicadores: [
      { key: 'registros',     label: 'Registros e texto' },
      { key: 'fotos',         label: 'Fotos do dia' },
      { key: 'trabalhadores', label: 'Nº de trabalhadores' },
      { key: 'problemas',     label: 'Problemas e ocorrências' },
    ],
  },
  {
    key: 'relatorio',
    label: 'Relatório',
    indicadores: [
      { key: 'andamento',         label: 'Andamento e cronograma' },
      { key: 'dados_financeiros', label: 'Dados financeiros' },
    ],
  },
];

// Default seguro: painel básico + cronograma sem valores financeiros
const DEFAULT_PERMISSOES: Record<string, { ativo: boolean; indicadores: string[] }> = {
  painel:      { ativo: true,  indicadores: ['andamento', 'cronograma_mini', 'fotos'] },
  cronograma:  { ativo: true,  indicadores: ['status_etapas', 'datas'] },
  financeiro:  { ativo: false, indicadores: [] },
  diario:      { ativo: true,  indicadores: ['registros', 'fotos'] },
  relatorio:   { ativo: false, indicadores: [] },
};

const APP_ORIGIN = window.location.origin;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildLink(tipo: LinkTipo, token: string) {
  return `${APP_ORIGIN}/${tipo === 'visualizacao' ? 'v' : 'o'}/${token}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: 'Link copiado!', description: 'Cole e envie para quem precisar.' });
  });
}

// ── Permissions Tree ───────────────────────────────────────────────────────────

function PermissionsTree({
  permissoes,
  onChange,
}: {
  permissoes: typeof DEFAULT_PERMISSOES;
  onChange: (p: typeof DEFAULT_PERMISSOES) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>(['painel', 'cronograma', 'diario']);

  const toggleSecao = (key: string, ativo: boolean) => {
    const next = { ...permissoes, [key]: { ...permissoes[key], ativo } };
    onChange(next);
  };

  const toggleIndicador = (secao: string, ind: string, checked: boolean) => {
    const prev = permissoes[secao]?.indicadores || [];
    const next = checked ? [...prev, ind] : prev.filter(i => i !== ind);
    onChange({ ...permissoes, [secao]: { ...permissoes[secao], indicadores: next } });
  };

  return (
    <div className="space-y-2">
      {SECOES.map(s => {
        const isAtivo = permissoes[s.key]?.ativo ?? false;
        const isExpanded = expanded.includes(s.key);
        const indicadores = permissoes[s.key]?.indicadores || [];
        return (
          <div key={s.key} className={cn('rounded-lg border transition-colors', isAtivo ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30')}>
            {/* Header da seção */}
            <div className="flex items-center gap-3 p-3">
              <Switch
                checked={isAtivo}
                onCheckedChange={v => toggleSecao(s.key, v)}
              />
              <span className={cn('font-medium text-sm flex-1', isAtivo ? 'text-foreground' : 'text-muted-foreground')}>
                {s.label}
              </span>
              {isAtivo && (
                <button
                  onClick={() => setExpanded(e => isExpanded ? e.filter(k => k !== s.key) : [...e, s.key])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            {/* Indicadores */}
            {isAtivo && isExpanded && (
              <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                {s.indicadores.map(ind => (
                  <label key={ind.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={indicadores.includes(ind.key)}
                      onChange={e => toggleIndicador(s.key, ind.key, e.target.checked)}
                    />
                    <span className="text-xs text-foreground">{ind.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Link Card ──────────────────────────────────────────────────────────────────

function LinkCard({
  link,
  onToggle,
  onDelete,
}: {
  link: ObraLink;
  onToggle: (id: string, ativo: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const href = buildLink(link.tipo, link.token);
  const isViz = link.tipo === 'visualizacao';

  return (
    <div className={cn(
      'flex flex-col gap-2 rounded-xl border p-3 transition-all',
      link.ativo ? 'border-border bg-card' : 'border-dashed border-border/50 bg-muted/30 opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('flex items-center justify-center h-7 w-7 rounded-lg shrink-0',
            isViz ? 'bg-sky-500/10 text-sky-600' : 'bg-amber-500/10 text-amber-600')}>
            {isViz ? <Eye className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{link.nome_label}</p>
            <p className="text-[10px] text-muted-foreground">
              {isViz ? 'Visualização' : 'Operação'} · {link.views_count} visualizações
            </p>
            {link.last_accessed_at && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                Último acesso: {format(parseISO(link.last_accessed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(link.id, !link.ativo)}
            className={cn('p-1.5 rounded-lg transition-colors',
              link.ativo ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-600' : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
            )}
            title={link.ativo ? 'Desativar link' : 'Ativar link'}
          >
            {link.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
            title="Excluir link"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* URL + botão copiar */}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[10px] text-muted-foreground bg-muted rounded px-2 py-1 truncate">
          {href}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(href)}
          className="h-7 px-2 text-xs gap-1 shrink-0"
        >
          <Copy className="h-3 w-3" />
          Copiar
        </Button>
      </div>

      {/* Tags de permissão */}
      {isViz && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(link.permissoes).filter(([, v]) => v.ativo).map(([k]) => (
            <Badge key={k} variant="outline" className="text-[9px] px-1.5 py-0 capitalize">
              {SECOES.find(s => s.key === k)?.label}
            </Badge>
          ))}
        </div>
      )}
      {!isViz && link.permite_estoque && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 w-fit">
          Estoque habilitado
        </Badge>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LinksDeAcessoCard({ obraId }: { obraId: string }) {
  const { company, plan } = useCompany();

  // Plans that include public links: pro, enterprise, or no plan (dev/admin)
  const canUseLinks = !plan || ['pro', 'enterprise', 'professional'].includes(plan.slug ?? '');
  const [links, setLinks] = useState<ObraLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form state
  const [tipo, setTipo] = useState<LinkTipo>('visualizacao');
  const [nomeLabel, setNomeLabel] = useState('');
  const [permissoes, setPermissoes] = useState<typeof DEFAULT_PERMISSOES>(structuredClone(DEFAULT_PERMISSOES));
  const [permiteEstoque, setPermiteEstoque] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('obra_links')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });
    setLinks((data as unknown as ObraLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, [obraId]);

  // ── Criar link ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!nomeLabel.trim()) { toast({ title: 'Informe um nome/rótulo para o link.', variant: 'destructive' }); return; }
    if (!company?.id) return;
    setSaving(true);
    const payload = {
      obra_id: obraId,
      company_id: company.id,
      tipo,
      nome_label: nomeLabel.trim(),
      permissoes: tipo === 'visualizacao' ? permissoes : {},
      permite_estoque: tipo === 'operacao' ? permiteEstoque : false,
    };
    const { error } = await supabase.from('obra_links').insert(payload);
    if (error) { toast({ title: 'Erro ao criar link', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Link criado!', description: 'Copie e compartilhe.' }); setDialogOpen(false); fetchLinks(); }
    setSaving(false);
  };

  // ── Toggle ativo ───────────────────────────────────────────────────────────
  const handleToggle = async (id: string, ativo: boolean) => {
    await supabase.from('obra_links').update({ ativo }).eq('id', id);
    setLinks(ls => ls.map(l => l.id === id ? { ...l, ativo } : l));
    toast({ title: ativo ? 'Link ativado.' : 'Link desativado.' });
  };

  // ── Excluir ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('obra_links').delete().eq('id', deleteTarget);
    toast({ title: 'Link excluído.' });
    setDeleteTarget(null);
    fetchLinks();
  };

  const openCreate = (t: LinkTipo) => {
    setTipo(t);
    setNomeLabel('');
    setPermissoes(structuredClone(DEFAULT_PERMISSOES));
    setPermiteEstoque(false);
    setDialogOpen(true);
  };

  const vizLinks = links.filter(l => l.tipo === 'visualizacao');
  const opLinks = links.filter(l => l.tipo === 'operacao');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary/80" />
          <h3 className="font-semibold text-sm">Links de Acesso</h3>
        </div>
        {canUseLinks && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openCreate('visualizacao')} className="h-7 text-xs gap-1">
              <Eye className="h-3 w-3" />
              Visualização
            </Button>
            <Button size="sm" variant="outline" onClick={() => openCreate('operacao')} className="h-7 text-xs gap-1">
              <Wrench className="h-3 w-3" />
              Operação
            </Button>
          </div>
        )}
      </div>

      {/* Banner de upgrade quando plano não permite */}
      {!canUseLinks && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Links públicos — Plano Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compartilhe esta obra com clientes e funcionários de campo sem necessidade de login.
              Disponível nos planos Pro e Enterprise.
            </p>
            <button
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              onClick={() => window.location.href = '/perfil?tab=plano'}
            >
              <Zap className="h-3 w-3" />
              Ver planos e fazer upgrade
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          {canUseLinks ? 'Nenhum link criado. Crie um link para compartilhar esta obra.' : 'Nenhum link criado ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {vizLinks.length > 0 && (
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-0.5">Visualização</p>
          )}
          {vizLinks.map(l => <LinkCard key={l.id} link={l} onToggle={handleToggle} onDelete={setDeleteTarget} />)}
          {opLinks.length > 0 && (
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-0.5 pt-1">Operação</p>
          )}
          {opLinks.map(l => <LinkCard key={l.id} link={l} onToggle={handleToggle} onDelete={setDeleteTarget} />)}
        </div>
      )}

      {/* Botão criar quando vazio e plano permite */}
      {links.length === 0 && canUseLinks && (
        <Button onClick={() => openCreate('visualizacao')} variant="outline" className="w-full gap-2">
          <Plus className="h-4 w-4" /> Criar primeiro link
        </Button>
      )}

      {/* Modal Criar Link */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tipo === 'visualizacao' ? <Eye className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
              Novo Link de {tipo === 'visualizacao' ? 'Visualização' : 'Operação'}
            </DialogTitle>
            <DialogDescription>
              {tipo === 'visualizacao'
                ? 'Configure quais informações esta pessoa pode ver. Sem necessidade de login.'
                : 'Link para funcionário registrar o diário e estoque no campo. Sem necessidade de login.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo toggle */}
            <div className="flex rounded-lg bg-muted p-1 gap-1">
              {(['visualizacao', 'operacao'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    tipo === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'visualizacao' ? <Eye className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                  {t === 'visualizacao' ? 'Visualização (cliente)' : 'Operação (funcionário)'}
                </button>
              ))}
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label>
                {tipo === 'visualizacao'
                  ? 'Rótulo do link'
                  : 'Nome do funcionário / encarregado que usará este link'}
                {' '}*
              </Label>
              <Input
                value={nomeLabel}
                onChange={e => setNomeLabel(e.target.value)}
                placeholder={tipo === 'visualizacao' ? 'Ex: Banco Bradesco, Cliente João Silva' : 'Ex: João Encarregado, Maria Mestra'}
              />
              <p className="text-[10px] text-muted-foreground">
                {tipo === 'visualizacao'
                  ? 'Aparece para você na lista de links — o receptor não vê este nome.'
                  : 'Aparece em todos os registros feitos por este link.'}
              </p>
            </div>

            {/* Vincular a membro da Equipe (operação) */}
            {tipo === 'operacao' && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Vincular a membro da Equipe
                  <span className="text-[10px] font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">
                    Disponível após cadastrar membros na aba Equipe da obra.
                  </p>
                </div>
              </div>
            )}

            {/* Permissões — Visualização */}
            {tipo === 'visualizacao' && (
              <div className="space-y-2">
                <Label>Permissões de visualização</Label>
                <PermissionsTree permissoes={permissoes} onChange={setPermissoes} />
              </div>
            )}

            {/* Opções — Operação */}
            {tipo === 'operacao' && (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Permitir registro de estoque</p>
                  <p className="text-[11px] text-muted-foreground">Funcionário pode enviar foto de nota fiscal de recebimento de material</p>
                </div>
                <Switch checked={permiteEstoque} onCheckedChange={setPermiteEstoque} />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gerar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Link</DialogTitle>
            <DialogDescription>
              O link será permanentemente excluído e quem tiver o URL não conseguirá mais acessar. Esta ação não pode ser desfeita.
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
