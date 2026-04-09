
CREATE TABLE public.custo_real_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  categoria_id uuid NOT NULL,
  tipo_insumo text NOT NULL DEFAULT 'Material',
  descricao text NOT NULL DEFAULT '',
  unidade text DEFAULT '',
  quantidade numeric DEFAULT 0,
  fornecedor text DEFAULT '',
  preco_unitario numeric DEFAULT 0,
  preco_total numeric NOT NULL DEFAULT 0,
  movimentacao_id uuid,
  nota_fiscal_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custo_real_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custo real" ON public.custo_real_itens FOR SELECT TO authenticated USING (is_obra_member(obra_id));
CREATE POLICY "Gestores can insert custo real" ON public.custo_real_itens FOR INSERT TO authenticated WITH CHECK (is_obra_gestor(obra_id));
CREATE POLICY "Gestores can update custo real" ON public.custo_real_itens FOR UPDATE TO authenticated USING (is_obra_gestor(obra_id));
CREATE POLICY "Gestores can delete custo real" ON public.custo_real_itens FOR DELETE TO authenticated USING (is_obra_gestor(obra_id));

CREATE TRIGGER update_custo_real_itens_updated_at BEFORE UPDATE ON public.custo_real_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
