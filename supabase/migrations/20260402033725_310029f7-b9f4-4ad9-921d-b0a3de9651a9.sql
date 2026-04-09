
-- Allow delete on diario_servicos for gestor/func
CREATE POLICY "Gestor/Func can delete diario servicos"
ON public.diario_servicos
FOR DELETE
TO authenticated
USING (can_modify_obra(get_obra_from_registro(registro_id)));

-- Allow delete on diario_materiais for gestor/func
CREATE POLICY "Gestor/Func can delete diario materiais"
ON public.diario_materiais
FOR DELETE
TO authenticated
USING (can_modify_obra(get_obra_from_registro(registro_id)));
