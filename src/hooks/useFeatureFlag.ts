import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Verifica se um add-on está ativo para a empresa do usuário logado.
 * Admins sempre têm acesso a todos os add-ons (bypass para desenvolvimento).
 *
 * Uso:
 *   const hasIA = useFeatureFlag('ia_documentos');
 */
export function useFeatureFlag(addonCode: string): boolean {
  const { user } = useAuth();
  const { hasAddon } = useCompany();

  // Admin sempre tem acesso sem verificar add-on
  if (user?.role === 'admin') return true;

  // Verifica no CompanyContext (carregado do banco em company_addons)
  return hasAddon(addonCode);
}
