/**
 * Untyped Supabase helpers.
 * The auto-generated types.ts is empty because the schema lives in an external
 * Supabase project. These wrappers bypass the generic constraint so every
 * .from() / .rpc() call compiles without `as any` scattered everywhere.
 */
import { supabase } from './client';

/** supabase.from(table) without type checking */
export const db = supabase.from.bind(supabase) as (table: string) => ReturnType<typeof supabase.from>;

/** supabase.rpc(fn, params) without type checking */
export const rpc = supabase.rpc.bind(supabase) as (fn: string, params?: Record<string, any>) => ReturnType<typeof supabase.rpc>;

/** Re-export the raw client for auth / storage / realtime */
export { supabase };
