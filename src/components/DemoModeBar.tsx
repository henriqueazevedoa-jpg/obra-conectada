import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { seedDemoData, clearDemoData } from '@/data/demoSeeder';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';

export default function DemoModeBar() {
  const { user } = useAuth();
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!user || !company) return null;

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedDemoData(user.id, company.id);
      toast({ title: '🎉 Dados demo criados!', description: '3 obras com dados completos foram adicionadas.' });
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
      <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-primary/30 rounded-lg bg-primary/5">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground hidden lg:inline">Modo Demo</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={handleSeed}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Preencher
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
          onClick={() => setConfirmClear(true)}
          disabled={loading}
        >
          <Trash2 className="h-3 w-3" />
          Limpar
        </Button>
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
