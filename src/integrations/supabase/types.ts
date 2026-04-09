export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addon_catalog: {
        Row: {
          ativo: boolean
          code: string
          created_at: string
          descricao: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean
          code: string
          created_at?: string
          descricao?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean
          code?: string
          created_at?: string
          descricao?: string | null
          nome?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          plan_id: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          plan_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          plan_id?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_addons: {
        Row: {
          addon_code: string
          company_id: string
          created_at: string
          id: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          addon_code: string
          company_id: string
          created_at?: string
          id?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          addon_code?: string
          company_id?: string
          created_at?: string
          id?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addons_addon_code_fkey"
            columns: ["addon_code"]
            isOneToOne: false
            referencedRelation: "addon_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "company_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_permission_overrides: {
        Row: {
          company_id: string
          created_at: string
          id: string
          ilimitado: boolean
          max_clientes: number | null
          max_funcionarios: number | null
          max_gestores: number | null
          max_obras: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          ilimitado?: boolean
          max_clientes?: number | null
          max_funcionarios?: number | null
          max_gestores?: number | null
          max_obras?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          ilimitado?: boolean
          max_clientes?: number | null
          max_funcionarios?: number | null
          max_gestores?: number | null
          max_obras?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_permission_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_real_itens: {
        Row: {
          categoria_id: string
          created_at: string
          descricao: string
          fornecedor: string | null
          id: string
          movimentacao_id: string | null
          nota_fiscal_url: string | null
          obra_id: string
          preco_total: number
          preco_unitario: number | null
          quantidade: number | null
          tipo_insumo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria_id: string
          created_at?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          movimentacao_id?: string | null
          nota_fiscal_url?: string | null
          obra_id: string
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          tipo_insumo?: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          created_at?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          movimentacao_id?: string | null
          nota_fiscal_url?: string | null
          obra_id?: string
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          tipo_insumo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diario_materiais: {
        Row: {
          created_at: string
          id: string
          material_id: string | null
          material_nome: string
          quantidade: number
          registro_id: string
          unidade: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id?: string | null
          material_nome?: string
          quantidade?: number
          registro_id: string
          unidade?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string | null
          material_nome?: string
          quantidade?: number
          registro_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_materiais_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "diario_registros"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_registros: {
        Row: {
          clima: Database["public"]["Enums"]["clima_tipo"]
          created_at: string
          data: string
          fotos: string[] | null
          id: string
          obra_id: string
          observacoes: string | null
          problemas: string | null
          servicos_executados: string | null
          status: Database["public"]["Enums"]["diario_status"]
          trabalhadores: number
          updated_at: string
          user_id: string
          usuario_nome: string
        }
        Insert: {
          clima?: Database["public"]["Enums"]["clima_tipo"]
          created_at?: string
          data?: string
          fotos?: string[] | null
          id?: string
          obra_id: string
          observacoes?: string | null
          problemas?: string | null
          servicos_executados?: string | null
          status?: Database["public"]["Enums"]["diario_status"]
          trabalhadores?: number
          updated_at?: string
          user_id: string
          usuario_nome?: string
        }
        Update: {
          clima?: Database["public"]["Enums"]["clima_tipo"]
          created_at?: string
          data?: string
          fotos?: string[] | null
          id?: string
          obra_id?: string
          observacoes?: string | null
          problemas?: string | null
          servicos_executados?: string | null
          status?: Database["public"]["Enums"]["diario_status"]
          trabalhadores?: number
          updated_at?: string
          user_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_registros_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_servicos: {
        Row: {
          categoria_id: string | null
          composicao_id: string | null
          created_at: string
          descricao: string
          id: string
          percentual_adicionado: number | null
          registro_id: string
        }
        Insert: {
          categoria_id?: string | null
          composicao_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          percentual_adicionado?: number | null
          registro_id: string
        }
        Update: {
          categoria_id?: string | null
          composicao_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          percentual_adicionado?: number | null
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_servicos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_servicos_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_servicos_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "diario_registros"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          categoria: string | null
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          localizacao: string | null
          nome: string
          obra_id: string
          observacoes: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome: string
          obra_id: string
          observacoes?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          localizacao?: string | null
          nome?: string
          obra_id?: string
          observacoes?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          data: string
          id: string
          material_id: string
          material_nome: string
          obra_id: string
          observacoes: string | null
          origem_destino: string | null
          quantidade: number
          responsavel: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          material_id: string
          material_nome?: string
          obra_id: string
          observacoes?: string | null
          origem_destino?: string | null
          quantidade?: number
          responsavel?: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          material_id?: string
          material_nome?: string
          obra_id?: string
          observacoes?: string | null
          origem_destino?: string | null
          quantidade?: number
          responsavel?: string | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          obra_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          obra_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          obra_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_memberships_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente: string | null
          codigo: string
          company_id: string | null
          created_at: string
          data_inicio: string | null
          data_previsao_termino: string | null
          descricao: string | null
          endereco: string | null
          id: string
          nome: string
          percentual_andamento: number
          responsavel: string | null
          status: Database["public"]["Enums"]["obra_status"]
          updated_at: string
        }
        Insert: {
          cliente?: string | null
          codigo?: string
          company_id?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao_termino?: string | null
          descricao?: string | null
          endereco?: string | null
          id?: string
          nome: string
          percentual_andamento?: number
          responsavel?: string | null
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Update: {
          cliente?: string | null
          codigo?: string
          company_id?: string | null
          created_at?: string
          data_inicio?: string | null
          data_previsao_termino?: string | null
          descricao?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          percentual_andamento?: number
          responsavel?: string | null
          status?: Database["public"]["Enums"]["obra_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_categorias: {
        Row: {
          codigo: string
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          id: string
          nome: string
          obra_id: string
          observacoes_cronograma: string | null
          percentual_cronograma: number | null
          preco_total: number
          responsavel: string | null
          status_cronograma:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at: string
          usa_composicoes: boolean
        }
        Insert: {
          codigo?: string
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          id?: string
          nome: string
          obra_id: string
          observacoes_cronograma?: string | null
          percentual_cronograma?: number | null
          preco_total?: number
          responsavel?: string | null
          status_cronograma?:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at?: string
          usa_composicoes?: boolean
        }
        Update: {
          codigo?: string
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes_cronograma?: string | null
          percentual_cronograma?: number | null
          preco_total?: number
          responsavel?: string | null
          status_cronograma?:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at?: string
          usa_composicoes?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_categorias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_composicoes: {
        Row: {
          categoria_id: string
          codigo: string
          concluida: boolean
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          descricao: string
          id: string
          peso_cronograma: number | null
          preco_total: number
          preco_unitario: number | null
          quantidade: number | null
          unidade: string | null
          updated_at: string
          usa_subitens: boolean
        }
        Insert: {
          categoria_id: string
          codigo?: string
          concluida?: boolean
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string
          id?: string
          peso_cronograma?: number | null
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string
          usa_subitens?: boolean
        }
        Update: {
          categoria_id?: string
          codigo?: string
          concluida?: boolean
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string
          id?: string
          peso_cronograma?: number | null
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string
          usa_subitens?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_composicoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_subitens: {
        Row: {
          codigo: string
          composicao_id: string
          created_at: string
          descricao: string
          id: string
          preco_total: number
          preco_unitario: number | null
          quantidade: number | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string
          composicao_id: string
          created_at?: string
          descricao?: string
          id?: string
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          composicao_id?: string
          created_at?: string
          descricao?: string
          id?: string
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_subitens_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          features: Json | null
          id: string
          ilimitado: boolean
          limite_clientes: number
          limite_funcionarios: number
          limite_gestores: number
          limite_obras: number
          nome_comercial: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          features?: Json | null
          id?: string
          ilimitado?: boolean
          limite_clientes?: number
          limite_funcionarios?: number
          limite_gestores?: number
          limite_obras?: number
          nome_comercial: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          features?: Json | null
          id?: string
          ilimitado?: boolean
          limite_clientes?: number
          limite_funcionarios?: number
          limite_gestores?: number
          limite_obras?: number
          nome_comercial?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_extras: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          quantidade: number | null
          subscription_id: string
          tipo: string
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          quantidade?: number | null
          subscription_id: string
          tipo: string
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          quantidade?: number | null
          subscription_id?: string
          tipo?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_extras_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ciclo: string
          company_id: string
          created_at: string
          data_inicio: string
          data_vencimento: string | null
          gateway_id: string | null
          id: string
          moeda: string | null
          observacoes: string | null
          plan_id: string
          status: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          valor_base: number | null
        }
        Insert: {
          ciclo?: string
          company_id: string
          created_at?: string
          data_inicio?: string
          data_vencimento?: string | null
          gateway_id?: string | null
          id?: string
          moeda?: string | null
          observacoes?: string | null
          plan_id: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          valor_base?: number | null
        }
        Update: {
          ciclo?: string
          company_id?: string
          created_at?: string
          data_inicio?: string
          data_vencimento?: string | null
          gateway_id?: string | null
          id?: string
          moeda?: string | null
          observacoes?: string | null
          plan_id?: string
          status?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          valor_base?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_inputs: {
        Row: {
          audio_path: string | null
          company_id: string
          confidence: number | null
          created_at: string
          id: string
          module_origin: string
          obra_id: string | null
          parsed_json: Json | null
          status: string
          transcription: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          module_origin: string
          obra_id?: string | null
          parsed_json?: Json | null
          status?: string
          transcription?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          module_origin?: string
          obra_id?: string | null
          parsed_json?: Json | null
          status?: string
          transcription?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_inputs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_inputs_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_modify_obra: { Args: { _obra_id: string }; Returns: boolean }
      check_plan_limit: {
        Args: { _company_id: string; _resource: string }
        Returns: Json
      }
      get_obra_from_categoria: { Args: { _cat_id: string }; Returns: string }
      get_obra_from_composicao: { Args: { _comp_id: string }; Returns: string }
      get_obra_from_registro: { Args: { _reg_id: string }; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      is_obra_gestor: { Args: { _obra_id: string }; Returns: boolean }
      is_obra_member: { Args: { _obra_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "gestor" | "funcionario" | "cliente" | "admin"
      clima_tipo: "sol" | "nublado" | "chuva" | "chuvoso_forte"
      cronograma_status:
        | "nao_iniciada"
        | "em_andamento"
        | "concluida"
        | "atrasada"
      diario_status: "pendente" | "aprovado" | "rejeitado"
      movimentacao_tipo: "entrada" | "saida"
      obra_status: "planejamento" | "em_andamento" | "concluida" | "pausada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "funcionario", "cliente", "admin"],
      clima_tipo: ["sol", "nublado", "chuva", "chuvoso_forte"],
      cronograma_status: [
        "nao_iniciada",
        "em_andamento",
        "concluida",
        "atrasada",
      ],
      diario_status: ["pendente", "aprovado", "rejeitado"],
      movimentacao_tipo: ["entrada", "saida"],
      obra_status: ["planejamento", "em_andamento", "concluida", "pausada"],
    },
  },
} as const
