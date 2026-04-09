
-- =============================================
-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('gestor', 'funcionario', 'cliente');
CREATE TYPE public.obra_status AS ENUM ('planejamento', 'em_andamento', 'concluida', 'pausada');
CREATE TYPE public.clima_tipo AS ENUM ('sol', 'nublado', 'chuva', 'chuvoso_forte');
CREATE TYPE public.diario_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE public.movimentacao_tipo AS ENUM ('entrada', 'saida');
CREATE TYPE public.cronograma_status AS ENUM ('nao_iniciada', 'em_andamento', 'concluida', 'atrasada');

-- =============================================
-- 2. PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. USER ROLES TABLE (separate from profiles per security best practices)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. OBRAS TABLE
-- =============================================
CREATE TABLE public.obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  endereco TEXT DEFAULT '',
  cliente TEXT DEFAULT '',
  status obra_status NOT NULL DEFAULT 'planejamento',
  percentual_andamento INTEGER NOT NULL DEFAULT 0,
  data_inicio DATE,
  data_previsao_termino DATE,
  responsavel TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. OBRA MEMBERSHIPS
-- =============================================
CREATE TABLE public.obra_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'funcionario',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(obra_id, user_id)
);
ALTER TABLE public.obra_memberships ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. ORCAMENTO CATEGORIAS
-- =============================================
CREATE TABLE public.orcamento_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  preco_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  usa_composicoes BOOLEAN NOT NULL DEFAULT false,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  status_cronograma cronograma_status DEFAULT 'nao_iniciada',
  percentual_cronograma NUMERIC(5,2) DEFAULT 0,
  responsavel TEXT DEFAULT '',
  observacoes_cronograma TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamento_categorias ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orcamento_categorias_obra ON public.orcamento_categorias(obra_id);

-- =============================================
-- 7. ORCAMENTO COMPOSICOES
-- =============================================
CREATE TABLE public.orcamento_composicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.orcamento_categorias(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  unidade TEXT DEFAULT '',
  quantidade NUMERIC(14,4),
  preco_unitario NUMERIC(14,4),
  preco_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  usa_subitens BOOLEAN NOT NULL DEFAULT false,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_inicio_real DATE,
  data_fim_real DATE,
  peso_cronograma NUMERIC(5,2) DEFAULT 0,
  concluida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamento_composicoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orcamento_composicoes_cat ON public.orcamento_composicoes(categoria_id);

-- =============================================
-- 8. ORCAMENTO SUBITENS
-- =============================================
CREATE TABLE public.orcamento_subitens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composicao_id UUID REFERENCES public.orcamento_composicoes(id) ON DELETE CASCADE NOT NULL,
  codigo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  unidade TEXT DEFAULT '',
  quantidade NUMERIC(14,4),
  preco_unitario NUMERIC(14,4),
  preco_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orcamento_subitens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orcamento_subitens_comp ON public.orcamento_subitens(composicao_id);

-- =============================================
-- 9. MATERIAIS (ESTOQUE)
-- =============================================
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT '',
  unidade TEXT NOT NULL DEFAULT 'un',
  estoque_atual NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,4) NOT NULL DEFAULT 0,
  localizacao TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_materiais_obra ON public.materiais(obra_id);

-- =============================================
-- 10. MOVIMENTACOES
-- =============================================
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materiais(id) ON DELETE CASCADE NOT NULL,
  material_nome TEXT NOT NULL DEFAULT '',
  tipo movimentacao_tipo NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  origem_destino TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_movimentacoes_obra ON public.movimentacoes(obra_id);
CREATE INDEX idx_movimentacoes_material ON public.movimentacoes(material_id);

-- =============================================
-- 11. DIARIO REGISTROS
-- =============================================
CREATE TABLE public.diario_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID REFERENCES public.obras(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  usuario_nome TEXT NOT NULL DEFAULT '',
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  clima clima_tipo NOT NULL DEFAULT 'sol',
  trabalhadores INTEGER NOT NULL DEFAULT 0,
  servicos_executados TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  problemas TEXT DEFAULT '',
  status diario_status NOT NULL DEFAULT 'pendente',
  fotos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_registros ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_diario_registros_obra ON public.diario_registros(obra_id);

-- =============================================
-- 12. DIARIO SERVICOS
-- =============================================
CREATE TABLE public.diario_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID REFERENCES public.diario_registros(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  categoria_id UUID REFERENCES public.orcamento_categorias(id) ON DELETE SET NULL,
  composicao_id UUID REFERENCES public.orcamento_composicoes(id) ON DELETE SET NULL,
  percentual_adicionado NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_servicos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_diario_servicos_registro ON public.diario_servicos(registro_id);

-- =============================================
-- 13. DIARIO MATERIAIS
-- =============================================
CREATE TABLE public.diario_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID REFERENCES public.diario_registros(id) ON DELETE CASCADE NOT NULL,
  material_id UUID REFERENCES public.materiais(id) ON DELETE SET NULL,
  material_nome TEXT NOT NULL DEFAULT '',
  unidade TEXT DEFAULT '',
  quantidade NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_materiais ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_diario_materiais_registro ON public.diario_materiais(registro_id);

-- =============================================
-- 14. HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if current user is member of an obra
CREATE OR REPLACE FUNCTION public.is_obra_member(_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obra_memberships
    WHERE obra_id = _obra_id AND user_id = auth.uid()
  );
$$;

-- Check if current user is gestor of an obra
CREATE OR REPLACE FUNCTION public.is_obra_gestor(_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obra_memberships
    WHERE obra_id = _obra_id AND user_id = auth.uid() AND role = 'gestor'
  );
$$;

-- Check if current user can modify data (gestor or funcionario)
CREATE OR REPLACE FUNCTION public.can_modify_obra(_obra_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.obra_memberships
    WHERE obra_id = _obra_id AND user_id = auth.uid() AND role IN ('gestor', 'funcionario')
  );
$$;

-- Get obra_id from categoria_id
CREATE OR REPLACE FUNCTION public.get_obra_from_categoria(_cat_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT obra_id FROM public.orcamento_categorias WHERE id = _cat_id;
$$;

-- Get obra_id from composicao_id
CREATE OR REPLACE FUNCTION public.get_obra_from_composicao(_comp_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.obra_id FROM public.orcamento_categorias c
  JOIN public.orcamento_composicoes comp ON comp.categoria_id = c.id
  WHERE comp.id = _comp_id;
$$;

-- Get obra_id from registro_id
CREATE OR REPLACE FUNCTION public.get_obra_from_registro(_reg_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT obra_id FROM public.diario_registros WHERE id = _reg_id;
$$;

-- =============================================
-- 15. UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orcamento_categorias_updated_at BEFORE UPDATE ON public.orcamento_categorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orcamento_composicoes_updated_at BEFORE UPDATE ON public.orcamento_composicoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orcamento_subitens_updated_at BEFORE UPDATE ON public.orcamento_subitens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_diario_registros_updated_at BEFORE UPDATE ON public.diario_registros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 16. AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 17. RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- OBRAS
CREATE POLICY "Members can view obras" ON public.obras FOR SELECT TO authenticated USING (public.is_obra_member(id));
CREATE POLICY "Gestores can create obras" ON public.obras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Gestores can update obras" ON public.obras FOR UPDATE TO authenticated USING (public.is_obra_gestor(id));
CREATE POLICY "Gestores can delete obras" ON public.obras FOR DELETE TO authenticated USING (public.is_obra_gestor(id));

-- OBRA MEMBERSHIPS
CREATE POLICY "Members can view memberships" ON public.obra_memberships FOR SELECT TO authenticated USING (public.is_obra_member(obra_id));
CREATE POLICY "Gestores can manage memberships" ON public.obra_memberships FOR INSERT TO authenticated WITH CHECK (public.is_obra_gestor(obra_id) AND invited_by = auth.uid() AND user_id != auth.uid());
CREATE POLICY "Gestores can update memberships" ON public.obra_memberships FOR UPDATE TO authenticated USING (public.is_obra_gestor(obra_id));
CREATE POLICY "Gestores can delete memberships" ON public.obra_memberships FOR DELETE TO authenticated USING (public.is_obra_gestor(obra_id));
-- Allow creator to add themselves
CREATE POLICY "Users can add themselves as gestor on new obras" ON public.obra_memberships FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = 'gestor');

-- ORCAMENTO CATEGORIAS
CREATE POLICY "Members can view categorias" ON public.orcamento_categorias FOR SELECT TO authenticated USING (public.is_obra_member(obra_id));
CREATE POLICY "Gestores can insert categorias" ON public.orcamento_categorias FOR INSERT TO authenticated WITH CHECK (public.is_obra_gestor(obra_id));
CREATE POLICY "Gestores can update categorias" ON public.orcamento_categorias FOR UPDATE TO authenticated USING (public.is_obra_gestor(obra_id));
CREATE POLICY "Gestores can delete categorias" ON public.orcamento_categorias FOR DELETE TO authenticated USING (public.is_obra_gestor(obra_id));

-- ORCAMENTO COMPOSICOES
CREATE POLICY "Members can view composicoes" ON public.orcamento_composicoes FOR SELECT TO authenticated USING (public.is_obra_member(public.get_obra_from_categoria(categoria_id)));
CREATE POLICY "Gestores can insert composicoes" ON public.orcamento_composicoes FOR INSERT TO authenticated WITH CHECK (public.is_obra_gestor(public.get_obra_from_categoria(categoria_id)));
CREATE POLICY "Gestores can update composicoes" ON public.orcamento_composicoes FOR UPDATE TO authenticated USING (public.is_obra_gestor(public.get_obra_from_categoria(categoria_id)));
CREATE POLICY "Gestores can delete composicoes" ON public.orcamento_composicoes FOR DELETE TO authenticated USING (public.is_obra_gestor(public.get_obra_from_categoria(categoria_id)));

-- ORCAMENTO SUBITENS
CREATE POLICY "Members can view subitens" ON public.orcamento_subitens FOR SELECT TO authenticated USING (public.is_obra_member(public.get_obra_from_composicao(composicao_id)));
CREATE POLICY "Gestores can insert subitens" ON public.orcamento_subitens FOR INSERT TO authenticated WITH CHECK (public.is_obra_gestor(public.get_obra_from_composicao(composicao_id)));
CREATE POLICY "Gestores can update subitens" ON public.orcamento_subitens FOR UPDATE TO authenticated USING (public.is_obra_gestor(public.get_obra_from_composicao(composicao_id)));
CREATE POLICY "Gestores can delete subitens" ON public.orcamento_subitens FOR DELETE TO authenticated USING (public.is_obra_gestor(public.get_obra_from_composicao(composicao_id)));

-- MATERIAIS
CREATE POLICY "Members can view materiais" ON public.materiais FOR SELECT TO authenticated USING (public.is_obra_member(obra_id));
CREATE POLICY "Gestor/Func can insert materiais" ON public.materiais FOR INSERT TO authenticated WITH CHECK (public.can_modify_obra(obra_id));
CREATE POLICY "Gestor/Func can update materiais" ON public.materiais FOR UPDATE TO authenticated USING (public.can_modify_obra(obra_id));
CREATE POLICY "Gestores can delete materiais" ON public.materiais FOR DELETE TO authenticated USING (public.is_obra_gestor(obra_id));

-- MOVIMENTACOES
CREATE POLICY "Members can view movimentacoes" ON public.movimentacoes FOR SELECT TO authenticated USING (public.is_obra_member(obra_id));
CREATE POLICY "Gestor/Func can insert movimentacoes" ON public.movimentacoes FOR INSERT TO authenticated WITH CHECK (public.can_modify_obra(obra_id));
CREATE POLICY "Gestor/Func can update movimentacoes" ON public.movimentacoes FOR UPDATE TO authenticated USING (public.can_modify_obra(obra_id));

-- DIARIO REGISTROS
CREATE POLICY "Members can view diario" ON public.diario_registros FOR SELECT TO authenticated USING (public.is_obra_member(obra_id));
CREATE POLICY "Gestor/Func can insert diario" ON public.diario_registros FOR INSERT TO authenticated WITH CHECK (public.can_modify_obra(obra_id));
CREATE POLICY "Gestor/Func can update diario" ON public.diario_registros FOR UPDATE TO authenticated USING (public.can_modify_obra(obra_id));
CREATE POLICY "Gestores can delete diario" ON public.diario_registros FOR DELETE TO authenticated USING (public.is_obra_gestor(obra_id));

-- DIARIO SERVICOS
CREATE POLICY "Members can view diario servicos" ON public.diario_servicos FOR SELECT TO authenticated USING (public.is_obra_member(public.get_obra_from_registro(registro_id)));
CREATE POLICY "Gestor/Func can insert diario servicos" ON public.diario_servicos FOR INSERT TO authenticated WITH CHECK (public.can_modify_obra(public.get_obra_from_registro(registro_id)));
CREATE POLICY "Gestor/Func can update diario servicos" ON public.diario_servicos FOR UPDATE TO authenticated USING (public.can_modify_obra(public.get_obra_from_registro(registro_id)));

-- DIARIO MATERIAIS
CREATE POLICY "Members can view diario materiais" ON public.diario_materiais FOR SELECT TO authenticated USING (public.is_obra_member(public.get_obra_from_registro(registro_id)));
CREATE POLICY "Gestor/Func can insert diario materiais" ON public.diario_materiais FOR INSERT TO authenticated WITH CHECK (public.can_modify_obra(public.get_obra_from_registro(registro_id)));
CREATE POLICY "Gestor/Func can update diario materiais" ON public.diario_materiais FOR UPDATE TO authenticated USING (public.can_modify_obra(public.get_obra_from_registro(registro_id)));

-- =============================================
-- 18. STOCK UPDATE TRIGGER (auto-update estoque_atual on movimentacao)
-- =============================================
CREATE OR REPLACE FUNCTION public.update_estoque_on_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.materiais SET estoque_atual = estoque_atual + NEW.quantidade WHERE id = NEW.material_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.materiais SET estoque_atual = estoque_atual - NEW.quantidade WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_movimentacao_insert
AFTER INSERT ON public.movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_estoque_on_movimentacao();
