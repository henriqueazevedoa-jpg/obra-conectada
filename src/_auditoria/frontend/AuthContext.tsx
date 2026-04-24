import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/untyped';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'gestor' | 'engenheiro' | 'admin' | 'funcionario';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatar_url?: string | null;
  obras_ids?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, nome: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (action: string) => boolean;
  modulePermissions: Record<string, boolean>;
  hasModulePermission: (modulo: string) => boolean;
  loadModulePermissions: (userId: string, role: string) => Promise<void>;
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
  engenheiro: [
    'dashboard:operacional', 'obras:view', 'obras:create', 'obras:edit',
    'orcamento:view', 'orcamento:edit',
    'cronograma:view', 'cronograma:edit',
    'diario:create', 'diario:view_own', 'diario:view',
    'estoque:view', 'estoque:movimentar', 'estoque:edit',
  ],
  funcionario: [
    'diario:create', 'diario:view_own',
    'estoque:view',
  ],
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>({});

  const fallbackModulePermissions = (role: UserRole): Record<string, boolean> => {
    const allModules = [
      'financeiro_pagamentos', 'financeiro_custo_real', 'financeiro_fluxo_caixa', 'financeiro_dre',
      'financeiro_recebiveis', 'contratos', 'equipe_gestao', 'relatorios_exportar',
      'relatorios_cliente', 'diario_aprovar', 'configuracoes_obra'
    ];
    const map: Record<string, boolean> = {};

    if (role === 'admin' || role === 'gestor') {
      allModules.forEach(m => map[m] = true);
    } else if (role === 'engenheiro') {
      allModules.forEach(m => map[m] = true);
      map['financeiro_fluxo_caixa'] = false;
      map['financeiro_dre'] = false;
      map['financeiro_recebiveis'] = false;
    } else {
      allModules.forEach(m => map[m] = false);
      map['diario_aprovar'] = true;
    }
    return map;
  };

  const loadModulePermissions = useCallback(async (userId: string, role: string) => {
    const { data } = await supabase
      .from('user_module_permissions')
      .select('modulo, permitido')
      .eq('user_id', userId);

    const fallbacks = fallbackModulePermissions(role as UserRole);
    if (!data || data.length === 0) {
      setModulePermissions(fallbacks);
      return;
    }
    const newMap = { ...fallbacks };
    data.forEach((dbPerm: any) => {
      newMap[dbPerm.modulo] = dbPerm.permitido;
    });
    setModulePermissions(newMap);
  }, []);

  const buildUser = async (su: SupabaseUser): Promise<User> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', su.id)
      .maybeSingle();

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, obras_ids')
      .eq('user_id', su.id)
      .maybeSingle();

    return {
      id: su.id,
      name: profile?.nome || su.user_metadata?.nome || su.email?.split('@')[0] || '',
      email: su.email || '',
      role: (roleData?.role as UserRole) || 'gestor',
      avatar_url: profile?.avatar_url,
      obras_ids: roleData?.obras_ids || [],
    };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return; // Ignore token refresh to prevent state reset loop
        
        if (session?.user) {
          setTimeout(async () => {
            const appUser = await buildUser(session.user);
            await loadModulePermissions(appUser.id, appUser.role);
            setUser((prev) => {
              if (prev && JSON.stringify(prev) === JSON.stringify(appUser)) {
                return prev;
              }
              return appUser;
            });
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
        await loadModulePermissions(appUser.id, appUser.role);
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

  const userRole = user?.role;
  const hasPermission = useCallback((action: string) => {
    if (!userRole) return false;
    return rolePermissions[userRole]?.includes(action) || false;
  }, [userRole]);

  const hasModulePermission = useCallback((modulo: string) => {
    if (!userRole) return false;
    if (userRole === 'gestor' || userRole === 'admin') return true;
    return !!modulePermissions[modulo];
  }, [userRole, modulePermissions]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user, hasPermission, modulePermissions, hasModulePermission, loadModulePermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
