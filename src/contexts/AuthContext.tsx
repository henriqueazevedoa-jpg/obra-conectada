import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'gestor' | 'funcionario' | 'cliente' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, nome: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (action: string) => boolean;
}

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'dashboard:full', 'obras:create', 'obras:edit', 'obras:view',
    'orcamento:edit', 'orcamento:view', 'cronograma:edit', 'cronograma:view',
    'diario:view', 'diario:approve', 'diario:create',
    'estoque:view', 'estoque:edit', 'estoque:movimentar',
    'relatorios:view', 'usuarios:manage', 'admin:platform',
  ],
  gestor: [
    'dashboard:full', 'obras:create', 'obras:edit', 'obras:view',
    'orcamento:edit', 'orcamento:view', 'cronograma:edit', 'cronograma:view',
    'diario:view', 'diario:approve', 'diario:create',
    'estoque:view', 'estoque:edit', 'estoque:movimentar',
    'relatorios:view', 'usuarios:manage',
  ],
  funcionario: [
    'dashboard:operacional', 'obras:view',
    'cronograma:view',
    'diario:create', 'diario:view_own',
    'estoque:view', 'estoque:movimentar',
  ],
  cliente: [
    'dashboard:resumo', 'obras:view',
    'orcamento:view_resumo', 'cronograma:view',
    'diario:view_aprovados',
    'relatorios:view_resumo',
  ],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const buildUser = async (su: SupabaseUser): Promise<User> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, avatar_url')
      .eq('user_id', su.id)
      .single();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', su.id)
      .single();

    return {
      id: su.id,
      name: profile?.nome || su.user_metadata?.nome || su.email?.split('@')[0] || '',
      email: su.email || '',
      role: (roleData?.role as UserRole) || 'gestor',
      avatar: profile?.avatar_url || undefined,
    };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const appUser = await buildUser(session.user);
            setUser(appUser);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await buildUser(session.user);
        setUser(appUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const hasPermission = useCallback((action: string) => {
    if (!user) return false;
    return rolePermissions[user.role]?.includes(action) || false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
