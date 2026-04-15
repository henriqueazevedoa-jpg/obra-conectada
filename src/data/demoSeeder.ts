import { supabase } from '@/integrations/supabase/untyped';

/**
 * Popula todas as obras demo chamando a Edge Function `apply-demo-data`.
 * A função roda server-side com a service role key (sem RLS).
 */
export async function seedDemoData(userId: string, companyId: string) {
  const { data, error } = await (supabase.functions as any).invoke('apply-demo-data', {
    body: { userId, companyId },
  });

  // Log raw response for debugging
  console.log('[seedDemoData] response:', { data, error });
  if (error) throw new Error(`apply-demo-data: ${error.message}${data ? ' | ' + JSON.stringify(data) : ''}`);
  if (data && !data.success) throw new Error(data.error ?? 'Erro desconhecido ao popular demo');
}

/**
 * Remove todas as obras demo via RPC server-side (SECURITY DEFINER).
 */
export async function removeDemoData(userId: string, companyId: string) {
  const { error } = await (supabase as any).rpc('remove_demo_data', {
    p_user_id: userId,
    p_company_id: companyId,
  });
  if (error) throw new Error(`remove_demo_data: ${error.message}`);
}
