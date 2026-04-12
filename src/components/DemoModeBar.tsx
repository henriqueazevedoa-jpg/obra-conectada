import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useObras } from '@/contexts/ObrasContext';
import { useObraSelection } from '@/contexts/ObraSelectionContext';
import { seedDemoData, clearDemoData } from '@/data/demoSeeder';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Trash2, Loader2, ChevronDown } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

export default function DemoModeBar() {
  const { user } = useAuth();
  const { company } = useCompany();
  const { obras } = useObras();
  const { setSelectedObraId } = useObraSelection();
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [open, setOpen] = useState(false);

  if (!user || !company) return null;

  const hasDemoData = obras.some((obra) => obra.nome.startsWith('[DEMO]'));

  const handleSeed = async () => {
    setLoading(true);
    try {
      if (hasDemoData) {
        await clearDemoData(company.id);
      }

      const seeded = await seedDemoData(user.id, company.id);
      setSelectedObraId(seeded.obra1Id);

      toast({
        title: hasDemoData ? '🔄 Dados demo atualizados!' : '🎉 Dados demo criados!',
        description: '3 obras com dados variados foram carregadas e selecionadas automaticamente.',
      });
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast({ title: 'Erro ao criar dados demo', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setConfirmClear(false);
    try {
      await clearDemoData(company.id);
      toast({ title: '🧹 Dados demo removidos!', description: 'Todas as obras demo foram excluídas.' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast({ title: 'Erro ao limpar dados demo', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">Modo Demo</div>
              <div className="text-[11px] text-muted-foreground">
                {hasDemoData ? 'Dados demo prontos para uso' : 'Carregar obras de teste'}
              </div>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="space-y-2 border-t border-border px-3 py-3">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Preenche o sistema com 3 obras completas e variadas para testar todas as telas.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full justify-start gap-2 text-xs"
              onClick={handleSeed}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {hasDemoData ? 'Recarregar dados demo' : 'Preencher com demo'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full justify-start gap-2 text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmClear(true)}
              disabled={loading || !hasDemoData}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar dados demo
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Limpar Dados Demo</DialogTitle>
            <DialogDescription>
              Isso removerá todas as obras com prefixo [DEMO] e todos os dados vinculados (pagamentos, pendências, fornecedores, diário, estoque, orçamento). Dados reais não serão afetados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClear}>Limpar Tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
