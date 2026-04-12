/**
 * Re-export the Supabase client as `any` to bypass the empty auto-generated
 * types.ts. The real schema lives in an external Supabase project
 * (ehmdwwuhhumgxhsjvvrr) that Lovable cannot introspect.
 */
import { supabase as _supabase } from './client';

export const supabase: any = _supabase;
