import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useObras } from '@/contexts/ObrasContext';
import { seedDemoData, removeDemoData } from '@/data/demoSeeder';
import { toast } from '@/hooks/use-toast';
import {
  Sparkles, Trash2, Loader2, RefreshCw,
  CheckCircle2, ChevronDown, Info,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ── Mensagens de progresso exibidas durante o seed ──────────────────────────
const SEED_STEPS = [
  'Criando obras de demonstração…',
  'Gerando orçamentos e categorias…',
  'Inserindo pagamentos e fornecedores…',
  'Populando diário e pendências…',
  'Finalizando estoque e custos reais…',
];

export default function DemoModeBar() {
  const { user } = useAuth();
  const { company } = useCompany();
  const { obras, refreshObras } = useObras() as any;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [open, setOpen] = useState(false);

  if (!user || !company) return null;

  // Demo está ativo quando existem obras marcadas com is_demo=true ou com prefixo [DEMO]
  const hasDemoData = obras.some(
    (o: any) => o.is_demo === true || o.nome?.startsWith('[DEMO]')
  );

  const demoObras = obras.filter(
    (o: any) => o.is_demo === true || o.nome?.startsWith('[DEMO]')
  );

  // ── Avança o step de progresso periodicamente ────────────────────────────
  const startProgressCycle = useCallback(() => {
    setStep(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      if (i < SEED_STEPS.length) {
        setStep(i);
      } else {
        clearInterval(iv);
      }
    }, 1400);
    return iv;
  }, []);

  // ── Aplicar / Reaplicar demo ──────────────────────────────────────────────
  const handleSeed = async () => {
    setLoading(true);
    const iv = startProgressCycle();
    try {
      await seedDemoData(user.id, company.id);
      clearInterval(iv);
      toast({
        title: hasDemoData ? '🔄 Demo atualizado!' : '🎉 Demo aplicado!',
        description: '4 obras completas com dados variados foram carregadas.',
      });
      // Refresh sem recarregar a página
      if (typeof refreshObras === 'function') {
        await refreshObras();
      } else {
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err: any) {
      clearInterval(iv);
      toast({
        title: 'Erro ao aplicar demo',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setStep(0);
    }
  };

  // ── Remover demo ─────────────────────────────────────────────────────────
  const handleRemove = async () => {
    setConfirmRemove(false);
    setLoading(true);
    try {
      await removeDemoData(user.id, company.id);
      toast({
        title: '🧹 Dados demo removidos!',
        description: 'Todas as obras e dados fictícios foram excluídos.',
      });
      if (typeof refreshObras === 'function') {
        await refreshObras();
      } else {
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao remover demo',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">Modo Demo</span>
                    {hasDemoData ? (
                      <Badge className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground font-medium">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {loading
                      ? SEED_STEPS[step]
                      : hasDemoData
                      ? `${demoObras.length} obra${demoObras.length !== 1 ? 's' : ''} demo carregada${demoObras.length !== 1 ? 's' : ''}`
                      : 'Carregar obras fictícias para teste'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Body */}
          <CollapsibleContent>
            <div className="border-t border-border px-3 py-3 space-y-3">

              {/* Info */}
              <div className="flex gap-2 text-[10px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-2">
                <Info className="h-3.5 w-3.5 shrink-0 mt-px text-primary" />
                <span className="leading-relaxed">
                  Preenche 4 obras completas (reforma, residência, galpão, praia)
                  com orçamento, pagamentos, pendências, diário e fornecedores.
                  Dados reais <strong>não são afetados</strong>.
                </span>
              </div>

              {/* Obras demo list */}
              {hasDemoData && (
                <div className="space-y-0.5">
                  {demoObras.slice(0, 4).map((o: any) => (
                    <div key={o.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{o.nome.replace('[DEMO] ', '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant={hasDemoData ? 'outline' : 'default'}
                  className="h-8 w-full justify-start gap-2 text-xs"
                  onClick={handleSeed}
                  disabled={loading}
                >
                  {loading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : hasDemoData
                    ? <RefreshCw className="h-3.5 w-3.5" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  {hasDemoData ? 'Reaplicar demo' : 'Aplicar demo'}
                </Button>

                {hasDemoData && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full justify-start gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/30"
                    onClick={() => setConfirmRemove(true)}
                    disabled={loading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover demo
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Confirm Remove Dialog */}
      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Remover Dados Demo
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              Isso removerá <strong>permanentemente</strong> todas as obras demo
              e seus dados vinculados (orçamento, pagamentos, pendências,
              fornecedores, diário, estoque).
              <br /><br />
              Seus dados reais <strong>não serão afetados</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remover Tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
