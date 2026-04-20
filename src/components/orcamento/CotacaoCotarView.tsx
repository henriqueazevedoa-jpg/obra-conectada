import React, { useState } from 'react';
import {
  Link2, PenLine, Send, Eye, RotateCcw, User, RefreshCw,
  Brain, ClipboardList, AlertCircle, ChevronRight, Check,
  UserPlus, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCotacaoListas, ListaStatus } from '@/hooks/useCotacaoListas';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapaItem {
  key: string;
  descricao: string;
  unidade: string;
  quantidade: number | null;
  precoAtual: number | null;
}

interface CotacaoLinkItem {
  id: string;
  fornecedor_nome: string;
  status: 'pendente' | 'respondido' | 'expirado';
  respostas: Record<string, number>;
  itens?: { key: string }[];
}

interface Props {
  obraId: string;
  companyId: string | undefined;
  links: CotacaoLinkItem[];
  itens: MapaItem[];
  // Handlers que abrem os fluxos existentes em CotacaoCentral
  onEnviarLink: (itemKeys: string[]) => void;
  onInserirPrecos: (itemKeys: string[]) => void;
  onVerLinks: () => void;
  // SINAPI IA
  onRunSinapiAssistente: () => void;
  sinapiRunning: boolean;
  sinapiProgress: number;
  // Navegação
  onGoToListas: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_META: Record<ListaStatus, {
  label: string;
  color: string;
  icon: React.ElementType;
}> = {
  rascunho:   { label: 'Rascunho',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',          icon: ClipboardList },
  pronto:     { label: 'Pronto p/ envio',color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',           icon: Check },
  enviada:    { label: 'Enviada',         color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',   icon: Send },
  respondida: { label: 'Respondida',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Check },
  parcial:    { label: 'Parcial',         color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',       icon: AlertCircle },
};

function calcProgress(itemKeys: string[], itens: MapaItem[]) {
  const listaItems = itemKeys
    .map(k => itens.find(i => i.key === k))
    .filter(Boolean) as MapaItem[];
  const withPrice = listaItems.filter(i => i.precoAtual && i.precoAtual > 0).length;
  return {
    total: listaItems.length,
    withPrice,
    pct: listaItems.length > 0 ? Math.round((withPrice / listaItems.length) * 100) : 0,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CotacaoCotarView({
  obraId,
  companyId,
  links,
  itens,
  onEnviarLink,
  onInserirPrecos,
  onVerLinks,
  onRunSinapiAssistente,
  sinapiRunning,
  sinapiProgress,
  onGoToListas,
}: Props) {

  const { listas, loading: loadingListas, atualizarStatus } = useCotacaoListas(obraId, companyId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!loadingListas && listas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Package className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma lista criada ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Crie listas de itens na Etapa 1 para organizar sua cotação.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onGoToListas}>
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Ir para Montar Listas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Toolbar da etapa ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20 shrink-0">

        {/* Resumo */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {loadingListas
            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            : <span>{listas.length} lista{listas.length !== 1 ? 's' : ''}</span>
          }
          {listas.filter(l => l.status === 'respondida').length > 0 && (
            <span className="text-emerald-600 font-medium">
              {listas.filter(l => l.status === 'respondida').length} respondida{listas.filter(l => l.status === 'respondida').length !== 1 ? 's' : ''}
            </span>
          )}
          {listas.filter(l => l.status === 'parcial').length > 0 && (
            <span className="text-amber-600 font-medium">
              {listas.filter(l => l.status === 'parcial').length} parcial
            </span>
          )}
          {listas.filter(l => l.status === 'enviada').length > 0 && (
            <span className="text-violet-600">
              {listas.filter(l => l.status === 'enviada').length} aguardando resposta
            </span>
          )}
        </div>

        {/* SINAPI IA — sempre visível conforme spec Seção 4 */}
        <div className="ml-auto flex items-center gap-2">
          {sinapiRunning && (
            <span className="text-xs text-violet-600 tabular-nums">{sinapiProgress}%</span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
            onClick={onRunSinapiAssistente}
            disabled={sinapiRunning}
          >
            {sinapiRunning
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <Brain className="h-3.5 w-3.5" />}
            Vincular SINAPI com IA
          </Button>
        </div>
      </div>

      {/* ── Cards de listas ───────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 max-w-4xl">

          {loadingListas ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando listas...
            </div>
          ) : (
            listas.map(lista => {
              const statusMeta = STATUS_META[lista.status];
              const StatusIcon = statusMeta.icon;
              const progress = calcProgress(lista.item_keys, itens);

              // Correlate linked cotacao_links with this lista's item_keys
              const linkedLinks = links.filter(l =>
                lista.item_keys.some(k =>
                  l.itens?.some((i: any) => (typeof i === 'string' ? i === k : i.key === k))
                )
              );
              const isExpanded = expandedId === lista.id;

              return (
                <div
                  key={lista.id}
                  className={cn(
                    'rounded-xl border bg-card shadow-sm transition-all overflow-hidden',
                    isExpanded && 'ring-1 ring-primary/20 shadow-md'
                  )}
                >
                  {/* ── Card header (clicável) ── */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors select-none"
                    onClick={() => setExpandedId(isExpanded ? null : lista.id)}
                  >
                    {/* Status icon bubble */}
                    <div className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      lista.status === 'respondida' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                      lista.status === 'enviada'    ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400' :
                      lista.status === 'parcial'    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' :
                      lista.status === 'pronto'     ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400' :
                      'bg-muted text-muted-foreground'
                    )}>
                      <StatusIcon className="h-4 w-4" />
                    </div>

                    {/* Name + metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{lista.nome}</span>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border-0', statusMeta.color)}>
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {lista.item_keys.length} item{lista.item_keys.length !== 1 ? 's' : ''}
                        </span>
                        {lista.fornecedores.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {lista.fornecedores.map(f => f.nome).join(', ')}
                          </span>
                        )}
                        {progress.withPrice > 0 && (
                          <span className={cn(
                            'text-xs font-medium',
                            progress.pct === 100 ? 'text-emerald-600' :
                            progress.pct >= 50   ? 'text-amber-600'  : 'text-muted-foreground'
                          )}>
                            {progress.withPrice}/{progress.total} precificados
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mini progress bar */}
                    {progress.total > 0 && (
                      <div className="w-24 shrink-0">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              progress.pct === 100 ? 'bg-emerald-500' :
                              progress.pct >= 50   ? 'bg-amber-400'   : 'bg-primary/40'
                            )}
                            style={{ width: `${progress.pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                          {progress.pct}%
                        </p>
                      </div>
                    )}

                    {/* Chevron */}
                    <ChevronRight className={cn(
                      'h-4 w-4 text-muted-foreground/40 shrink-0 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>

                  {/* ── Ações contextuais ── */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-2 animate-in slide-in-from-top-1 duration-150">

                      {/* Rascunho / Pronto → enviar link ou inserir preços */}
                      {(lista.status === 'rascunho' || lista.status === 'pronto') && (
                        <>
                          {lista.fornecedores.length === 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>Sem fornecedor vinculado —</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
                            onClick={async () => {
                              await atualizarStatus(lista.id, 'enviada');
                              onEnviarLink(lista.item_keys);
                            }}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Enviar link de cotação
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => onInserirPrecos(lista.item_keys)}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Inserir preços manualmente
                          </Button>
                        </>
                      )}

                      {/* Enviada → aguardando, pode reenviar */}
                      {lista.status === 'enviada' && (
                        <>
                          <span className="text-xs text-muted-foreground italic">
                            Aguardando resposta do fornecedor
                          </span>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
                            onClick={async () => {
                              await atualizarStatus(lista.id, 'enviada');
                              onEnviarLink(lista.item_keys);
                            }}>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reenviar link
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                            onClick={() => onInserirPrecos(lista.item_keys)}>
                            <PenLine className="h-3.5 w-3.5" />
                            Inserir manualmente
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
                            onClick={onVerLinks}>
                            <Eye className="h-3.5 w-3.5" />
                            Ver links enviados
                          </Button>
                        </>
                      )}

                      {/* Respondida → todos os preços chegaram */}
                      {lista.status === 'respondida' && (
                        <>
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5" />
                            Todos os preços recebidos
                          </span>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
                            onClick={onVerLinks}>
                            <Eye className="h-3.5 w-3.5" />
                            Ver respostas
                          </Button>
                        </>
                      )}

                      {/* Parcial → faltam alguns */}
                      {lista.status === 'parcial' && (
                        <>
                          <span className="text-xs text-amber-600 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {progress.total - progress.withPrice} item{(progress.total - progress.withPrice) !== 1 ? 's' : ''} sem preço
                          </span>
                          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                            onClick={() => onInserirPrecos(lista.item_keys)}>
                            <PenLine className="h-3.5 w-3.5" />
                            Inserir faltantes
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"
                            onClick={onVerLinks}>
                            <Eye className="h-3.5 w-3.5" />
                            Ver respostas
                          </Button>
                        </>
                      )}

                      {/* Links já enviados desta lista */}
                      {linkedLinks.length > 0 && (
                        <div className="w-full mt-1 pt-2 border-t flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Links:</span>
                          {linkedLinks.map(link => (
                            <Badge
                              key={link.id}
                              variant="outline"
                              className={cn(
                                'text-[10px] gap-1 cursor-pointer hover:opacity-80',
                                link.status === 'respondido' ? 'border-emerald-300 text-emerald-700' :
                                link.status === 'expirado'   ? 'border-red-200 text-red-500'         :
                                'border-violet-200 text-violet-700'
                              )}
                              onClick={onVerLinks}
                            >
                              <Send className="h-2.5 w-2.5" />
                              {link.fornecedor_nome} — {link.status}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
