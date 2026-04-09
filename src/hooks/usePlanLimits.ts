import { useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

export function usePlanLimits() {
  const { checkLimit, plan } = useCompany();

  const canCreate = useCallback(async (resource: 'obras' | 'gestores' | 'funcionarios' | 'clientes'): Promise<boolean> => {
    const result = await checkLimit(resource);
    if (!result.allowed) {
      const resourceLabels: Record<string, string> = {
        obras: 'obras ativas',
        gestores: 'gestores',
        funcionarios: 'funcionários',
        clientes: 'clientes',
      };
      toast({
        title: 'Limite do plano atingido',
        description: `Seu plano ${result.plan} permite até ${result.limit} ${resourceLabels[resource]}. Considere fazer upgrade para um plano superior.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [checkLimit]);

  return { canCreate, plan };
}
