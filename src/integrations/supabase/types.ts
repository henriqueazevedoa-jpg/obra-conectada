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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      addon_catalog: {
        Row: {
          ativo: boolean
          code: string
          created_at: string
          descricao: string | null
          id: string
          nome: string | null
        }
        Insert: {
          ativo?: boolean
          code: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string | null
        }
        Update: {
          ativo?: boolean
          code?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          company_id: string | null
          created_at: string | null
          creditos: number | null
          custo_usd: number | null
          feature: string
          id: string
          metadata: Json | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          creditos?: number | null
          custo_usd?: number | null
          feature: string
          id?: string
          metadata?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          creditos?: number | null
          custo_usd?: number | null
          feature?: string
          id?: string
          metadata?: Json | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      amdahl_grupos: {
        Row: {
          amdahl_f: number
          amdahl_p: number
          company_id: string | null
          composicoes_sinapi: Json | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          amdahl_f?: number
          amdahl_p?: number
          company_id?: string | null
          composicoes_sinapi?: Json | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          amdahl_f?: number
          amdahl_p?: number
          company_id?: string | null
          composicoes_sinapi?: Json | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amdahl_grupos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      amdahl_params: {
        Row: {
          amdahl_f: number
          amdahl_p: number
          categoria: string
          company_id: string | null
          created_at: string
          descricao: string | null
          id: string
        }
        Insert: {
          amdahl_f?: number
          amdahl_p?: number
          categoria: string
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
        }
        Update: {
          amdahl_f?: number
          amdahl_p?: number
          categoria?: string
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amdahl_params_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_configuracoes: {
        Row: {
          atualizacao_automatica_cub: boolean | null
          bdi_padrao: number | null
          company_id: string
          contingencia_padrao: number | null
          created_at: string
          fator_seguranca_padrao: number | null
          updated_at: string
        }
        Insert: {
          atualizacao_automatica_cub?: boolean | null
          bdi_padrao?: number | null
          company_id: string
          contingencia_padrao?: number | null
          created_at?: string
          fator_seguranca_padrao?: number | null
          updated_at?: string
        }
        Update: {
          atualizacao_automatica_cub?: boolean | null
          bdi_padrao?: number | null
          company_id?: string
          contingencia_padrao?: number | null
          created_at?: string
          fator_seguranca_padrao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculadora_configuracoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_contas: {
        Row: {
          company_id: string
          created_at: string
          data_renovacao: string
          estimativas_geradas_mes: number | null
          id: string
          limite_estimativas_mes: number | null
          permite_exportar_pdf: boolean | null
          permite_metodo_c: boolean | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data_renovacao: string
          estimativas_geradas_mes?: number | null
          id?: string
          limite_estimativas_mes?: number | null
          permite_exportar_pdf?: boolean | null
          permite_metodo_c?: boolean | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data_renovacao?: string
          estimativas_geradas_mes?: number | null
          id?: string
          limite_estimativas_mes?: number | null
          permite_exportar_pdf?: boolean | null
          permite_metodo_c?: boolean | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculadora_contas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_cub: {
        Row: {
          company_id: string | null
          created_at: string
          estado: string
          id: string
          mes_referencia: string
          padrao: Database["public"]["Enums"]["calculadora_padrao_acabamento"]
          tipo_uso: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at: string
          valor_m2: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          estado: string
          id?: string
          mes_referencia: string
          padrao: Database["public"]["Enums"]["calculadora_padrao_acabamento"]
          tipo_uso: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at?: string
          valor_m2: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          mes_referencia?: string
          padrao?: Database["public"]["Enums"]["calculadora_padrao_acabamento"]
          tipo_uso?: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at?: string
          valor_m2?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculadora_cub_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_eap_template: {
        Row: {
          company_id: string | null
          created_at: string
          etapa_nome: string
          id: string
          ordem: number
          percentual_base: number
          percentual_maximo: number | null
          percentual_minimo: number | null
          tipo_uso: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          etapa_nome: string
          id?: string
          ordem: number
          percentual_base: number
          percentual_maximo?: number | null
          percentual_minimo?: number | null
          tipo_uso: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          etapa_nome?: string
          id?: string
          ordem?: number
          percentual_base?: number
          percentual_maximo?: number | null
          percentual_minimo?: number | null
          tipo_uso?: Database["public"]["Enums"]["calculadora_tipo_uso"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculadora_eap_template_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_estimativas: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metodo_utilizado: Database["public"]["Enums"]["calculadora_metodo"]
          obra_id: string | null
          parametros: Json
          resultados: Json
          usuario_id: string
          valor_total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metodo_utilizado: Database["public"]["Enums"]["calculadora_metodo"]
          obra_id?: string | null
          parametros: Json
          resultados: Json
          usuario_id: string
          valor_total: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metodo_utilizado?: Database["public"]["Enums"]["calculadora_metodo"]
          obra_id?: string | null
          parametros?: Json
          resultados?: Json
          usuario_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculadora_estimativas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculadora_estimativas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      calculadora_planos_config: {
        Row: {
          id: string
          limite_mensal: number | null
          metodo_a: boolean | null
          metodo_b: boolean | null
          metodo_c: boolean | null
          pdf: boolean | null
          plano: string
          preco_mensal: number | null
          salvar_estimativa: boolean | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          limite_mensal?: number | null
          metodo_a?: boolean | null
          metodo_b?: boolean | null
          metodo_c?: boolean | null
          pdf?: boolean | null
          plano: string
          preco_mensal?: number | null
          salvar_estimativa?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          limite_mensal?: number | null
          metodo_a?: boolean | null
          metodo_b?: boolean | null
          metodo_c?: boolean | null
          pdf?: boolean | null
          plano?: string
          preco_mensal?: number | null
          salvar_estimativa?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      catalogo_composicao_insumos: {
        Row: {
          codigo: string | null
          company_id: string
          composicao_id: string
          created_at: string | null
          descricao: string
          id: string
          ordem: number | null
          preco_unitario: number | null
          quantidade: number | null
          tipo_item: string | null
          unidade: string | null
        }
        Insert: {
          codigo?: string | null
          company_id: string
          composicao_id: string
          created_at?: string | null
          descricao?: string
          id?: string
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          tipo_item?: string | null
          unidade?: string | null
        }
        Update: {
          codigo?: string | null
          company_id?: string
          composicao_id?: string
          created_at?: string | null
          descricao?: string
          id?: string
          ordem?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          tipo_item?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_composicao_insumos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_composicao_insumos_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "catalogo_composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_composicoes: {
        Row: {
          categoria: string | null
          codigo: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          insumos: Json | null
          is_modelo: boolean | null
          nome: string
          obra_origem_id: string | null
          origem: string | null
          preco_medio: number | null
          unidade: string | null
          updated_at: string | null
          usos: number | null
        }
        Insert: {
          categoria?: string | null
          codigo?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          insumos?: Json | null
          is_modelo?: boolean | null
          nome: string
          obra_origem_id?: string | null
          origem?: string | null
          preco_medio?: number | null
          unidade?: string | null
          updated_at?: string | null
          usos?: number | null
        }
        Update: {
          categoria?: string | null
          codigo?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          insumos?: Json | null
          is_modelo?: boolean | null
          nome?: string
          obra_origem_id?: string | null
          origem?: string | null
          preco_medio?: number | null
          unidade?: string | null
          updated_at?: string | null
          usos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_composicoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_composicoes_obra_origem_id_fkey"
            columns: ["obra_origem_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      checagem_material: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          itens: Json
          modo: string
          obra_id: string
          observacoes: string | null
          responsavel_id: string | null
          semana_fim: string
          semana_inicio: string
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          itens?: Json
          modo?: string
          obra_id: string
          observacoes?: string | null
          responsavel_id?: string | null
          semana_fim: string
          semana_inicio: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          itens?: Json
          modo?: string
          obra_id?: string
          observacoes?: string | null
          responsavel_id?: string | null
          semana_fim?: string
          semana_inicio?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checagem_material_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checagem_material_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_credits_extra: number | null
          ai_credits_included: number | null
          ai_credits_used_month: number | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          nome: string
          plan_id: string | null
          preco_criterio: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ai_credits_extra?: number | null
          ai_credits_included?: number | null
          ai_credits_used_month?: number | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plan_id?: string | null
          preco_criterio?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_credits_extra?: number | null
          ai_credits_included?: number | null
          ai_credits_used_month?: number | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plan_id?: string | null
          preco_criterio?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      company_calendar: {
        Row: {
          company_id: string
          created_at: string
          dias_uteis: number[]
          horas_por_dia: number
          id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dias_uteis?: number[]
          horas_por_dia?: number
          id?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dias_uteis?: number[]
          horas_por_dia?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_calendar_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_calendar_holidays: {
        Row: {
          company_id: string
          created_at: string
          data: string
          descricao: string
          id: string
          recorrente: boolean
        }
        Insert: {
          company_id: string
          created_at?: string
          data: string
          descricao?: string
          id?: string
          recorrente?: boolean
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          recorrente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "company_calendar_holidays_company_id_fkey"
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
      company_user_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          nome: string | null
          obras_ids: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          nome?: string | null
          obras_ids?: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          nome?: string | null
          obras_ids?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_user_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          cidade: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          email: string | null
          empresa: string | null
          especialidade: string | null
          especialidade_ids: string[] | null
          id: string
          nome: string
          obra_ids: string[] | null
          observacoes: string | null
          tags: string[] | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_contato"]
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          empresa?: string | null
          especialidade?: string | null
          especialidade_ids?: string[] | null
          id?: string
          nome: string
          obra_ids?: string[] | null
          observacoes?: string | null
          tags?: string[] | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          empresa?: string | null
          especialidade?: string | null
          especialidade_ids?: string[] | null
          id?: string
          nome?: string
          obra_ids?: string[] | null
          observacoes?: string | null
          tags?: string[] | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          cnpj: string | null
          contratado: string
          contratado_id: string | null
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio: string | null
          descricao: string
          id: string
          modalidade_medicao: string
          moeda: string
          numero: string
          obra_id: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor_atual: number
          valor_inicial: number
          versao_orcamento_id: string | null
        }
        Insert: {
          cnpj?: string | null
          contratado?: string
          contratado_id?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          modalidade_medicao?: string
          moeda?: string
          numero?: string
          obra_id: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_atual?: number
          valor_inicial?: number
          versao_orcamento_id?: string | null
        }
        Update: {
          cnpj?: string | null
          contratado?: string
          contratado_id?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          modalidade_medicao?: string
          moeda?: string
          numero?: string
          obra_id?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_atual?: number
          valor_inicial?: number
          versao_orcamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_contratado_id_fkey"
            columns: ["contratado_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_versao_orcamento_id_fkey"
            columns: ["versao_orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamento_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_aditivos: {
        Row: {
          contrato_id: string
          created_at: string
          data_assinatura: string | null
          delta_prazo_dias: number | null
          delta_valor: number | null
          id: string
          justificativa: string
          numero_aditivo: number
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          created_at?: string
          data_assinatura?: string | null
          delta_prazo_dias?: number | null
          delta_valor?: number | null
          id?: string
          justificativa?: string
          numero_aditivo: number
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          created_at?: string
          data_assinatura?: string | null
          delta_prazo_dias?: number | null
          delta_valor?: number | null
          id?: string
          justificativa?: string
          numero_aditivo?: number
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_escopo: {
        Row: {
          cobertura_insumos: string[] | null
          composicao_id: string | null
          contrato_id: string
          created_at: string | null
          descricao: string
          id: string
          obra_id: string
          preco_unitario_contratado: number | null
          preco_unitario_orcado: number | null
          quantidade_contratada: number | null
          quantidade_orcada: number | null
          unidade: string | null
          updated_at: string | null
        }
        Insert: {
          cobertura_insumos?: string[] | null
          composicao_id?: string | null
          contrato_id: string
          created_at?: string | null
          descricao: string
          id?: string
          obra_id: string
          preco_unitario_contratado?: number | null
          preco_unitario_orcado?: number | null
          quantidade_contratada?: number | null
          quantidade_orcada?: number | null
          unidade?: string | null
          updated_at?: string | null
        }
        Update: {
          cobertura_insumos?: string[] | null
          composicao_id?: string | null
          contrato_id?: string
          created_at?: string | null
          descricao?: string
          id?: string
          obra_id?: string
          preco_unitario_contratado?: number | null
          preco_unitario_orcado?: number | null
          quantidade_contratada?: number | null
          quantidade_orcada?: number | null
          unidade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_escopo_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_escopo_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_escopo_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_medicao_itens: {
        Row: {
          created_at: string
          descricao: string
          escopo_id: string | null
          id: string
          medicao_id: string
          percentual_acumulado: number | null
          percentual_anterior: number | null
          percentual_periodo: number | null
          preco_unitario: number | null
          quantidade_acumulada: number | null
          quantidade_contrato: number | null
          quantidade_periodo: number | null
          unidade: string | null
          valor_periodo: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string
          escopo_id?: string | null
          id?: string
          medicao_id: string
          percentual_acumulado?: number | null
          percentual_anterior?: number | null
          percentual_periodo?: number | null
          preco_unitario?: number | null
          quantidade_acumulada?: number | null
          quantidade_contrato?: number | null
          quantidade_periodo?: number | null
          unidade?: string | null
          valor_periodo?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          escopo_id?: string | null
          id?: string
          medicao_id?: string
          percentual_acumulado?: number | null
          percentual_anterior?: number | null
          percentual_periodo?: number | null
          preco_unitario?: number | null
          quantidade_acumulada?: number | null
          quantidade_contrato?: number | null
          quantidade_periodo?: number | null
          unidade?: string | null
          valor_periodo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_medicao_itens_escopo_id_fkey"
            columns: ["escopo_id"]
            isOneToOne: false
            referencedRelation: "contratos_escopo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_medicao_itens_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "contratos_medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_medicoes: {
        Row: {
          aprovacao_token: string | null
          contrato_id: string
          created_at: string
          data_emissao: string | null
          data_referencia: string
          id: string
          numero_medicao: number
          obra_id: string
          observacoes: string | null
          percentual_acumulado: number | null
          percentual_acumulado_anterior: number | null
          percentual_periodo: number | null
          responsavel_id: string | null
          status: string
          updated_at: string
          valor_acumulado: number | null
          valor_periodo: number | null
        }
        Insert: {
          aprovacao_token?: string | null
          contrato_id: string
          created_at?: string
          data_emissao?: string | null
          data_referencia: string
          id?: string
          numero_medicao: number
          obra_id: string
          observacoes?: string | null
          percentual_acumulado?: number | null
          percentual_acumulado_anterior?: number | null
          percentual_periodo?: number | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          valor_acumulado?: number | null
          valor_periodo?: number | null
        }
        Update: {
          aprovacao_token?: string | null
          contrato_id?: string
          created_at?: string
          data_emissao?: string | null
          data_referencia?: string
          id?: string
          numero_medicao?: number
          obra_id?: string
          observacoes?: string | null
          percentual_acumulado?: number | null
          percentual_acumulado_anterior?: number | null
          percentual_periodo?: number | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
          valor_acumulado?: number | null
          valor_periodo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_medicoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_medicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_categorias: {
        Row: {
          codigo: string
          company_id: string | null
          emoji: string | null
          id: string
          is_default: boolean | null
          keywords: string[] | null
          nome: string
        }
        Insert: {
          codigo: string
          company_id?: string | null
          emoji?: string | null
          id?: string
          is_default?: boolean | null
          keywords?: string[] | null
          nome: string
        }
        Update: {
          codigo?: string
          company_id?: string | null
          emoji?: string | null
          id?: string
          is_default?: boolean | null
          keywords?: string[] | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_categorias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_fornecedor_listas: {
        Row: {
          fornecedor_id: string
          lista_id: string
        }
        Insert: {
          fornecedor_id: string
          lista_id: string
        }
        Update: {
          fornecedor_id?: string
          lista_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_fornecedor_listas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_fornecedor_listas_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "cotacao_listas"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_links: {
        Row: {
          company_id: string
          contexto: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          fornecedor_email: string | null
          fornecedor_nome: string | null
          id: string
          itens: Json
          obra_id: string
          responded_at: string | null
          respostas: Json | null
          status: string | null
          token: string
        }
        Insert: {
          company_id: string
          contexto?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          fornecedor_email?: string | null
          fornecedor_nome?: string | null
          id?: string
          itens?: Json
          obra_id: string
          responded_at?: string | null
          respostas?: Json | null
          status?: string | null
          token?: string
        }
        Update: {
          company_id?: string
          contexto?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          fornecedor_email?: string | null
          fornecedor_nome?: string | null
          id?: string
          itens?: Json
          obra_id?: string
          responded_at?: string | null
          respostas?: Json | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_links_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_listas: {
        Row: {
          company_id: string
          config: Json
          contexto: string
          created_at: string
          id: string
          is_template: boolean
          item_keys: string[]
          nome: string
          obra_id: string | null
          status: string
          tipo: string
        }
        Insert: {
          company_id: string
          config?: Json
          contexto?: string
          created_at?: string
          id?: string
          is_template?: boolean
          item_keys?: string[]
          nome: string
          obra_id?: string | null
          status?: string
          tipo?: string
        }
        Update: {
          company_id?: string
          config?: Json
          contexto?: string
          created_at?: string
          id?: string
          is_template?: boolean
          item_keys?: string[]
          nome?: string
          obra_id?: string | null
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_listas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_listas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_lote_itens: {
        Row: {
          created_at: string | null
          id: string
          item_origem_id: string
          lote_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_origem_id: string
          lote_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_origem_id?: string
          lote_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_lote_itens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "cotacao_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_lotes: {
        Row: {
          company_id: string | null
          created_at: string | null
          fase: string
          id: string
          obra_id: string | null
          status: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          fase?: string
          id?: string
          obra_id?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          fase?: string
          id?: string
          obra_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_lotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_lotes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_precos: {
        Row: {
          company_id: string
          created_at: string | null
          fornecedor_id: string | null
          fornecedor_nome: string
          id: string
          item_key: string
          link_id: string | null
          obra_id: string
          preco_unitario: number | null
          sub_origem: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          fornecedor_id?: string | null
          fornecedor_nome: string
          id?: string
          item_key: string
          link_id?: string | null
          obra_id: string
          preco_unitario?: number | null
          sub_origem?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string
          id?: string
          item_key?: string
          link_id?: string | null
          obra_id?: string
          preco_unitario?: number | null
          sub_origem?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_precos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_precos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_precos_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "cotacao_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_precos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_precos_manuais: {
        Row: {
          company_id: string
          created_at: string | null
          fornecedor_nome: string
          id: string
          item_key: string
          obra_id: string
          observacao: string | null
          preco_unitario: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          fornecedor_nome: string
          id?: string
          item_key: string
          obra_id: string
          observacao?: string | null
          preco_unitario: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          fornecedor_nome?: string
          id?: string
          item_key?: string
          obra_id?: string
          observacao?: string | null
          preco_unitario?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cotacao_respostas: {
        Row: {
          created_at: string | null
          fornecedor_nome: string
          id: string
          is_vencedor: boolean | null
          item_origem_id: string
          lote_id: string | null
          observacoes: string | null
          prazo_entrega_dias: number | null
          preco_unitario: number
        }
        Insert: {
          created_at?: string | null
          fornecedor_nome: string
          id?: string
          is_vencedor?: boolean | null
          item_origem_id: string
          lote_id?: string | null
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
        }
        Update: {
          created_at?: string | null
          fornecedor_nome?: string
          id?: string
          is_vencedor?: boolean | null
          item_origem_id?: string
          lote_id?: string | null
          observacoes?: string | null
          prazo_entrega_dias?: number | null
          preco_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_respostas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "cotacao_lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_alocacoes: {
        Row: {
          created_at: string | null
          horas_por_dia: number | null
          id: string
          quantidade: number
          recurso_id: string
          tarefa_id: string
        }
        Insert: {
          created_at?: string | null
          horas_por_dia?: number | null
          id?: string
          quantidade?: number
          recurso_id: string
          tarefa_id: string
        }
        Update: {
          created_at?: string | null
          horas_por_dia?: number | null
          id?: string
          quantidade?: number
          recurso_id?: string
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_alocacoes_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_alocacoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_dependencias: {
        Row: {
          id: string
          lag_dias: number | null
          obra_id: string | null
          tarefa_destino_id: string | null
          tarefa_origem_id: string | null
          tipo: string | null
        }
        Insert: {
          id?: string
          lag_dias?: number | null
          obra_id?: string | null
          tarefa_destino_id?: string | null
          tarefa_origem_id?: string | null
          tipo?: string | null
        }
        Update: {
          id?: string
          lag_dias?: number | null
          obra_id?: string | null
          tarefa_destino_id?: string | null
          tarefa_origem_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_dependencias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_dependencias_tarefa_destino_id_fkey"
            columns: ["tarefa_destino_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_dependencias_tarefa_origem_id_fkey"
            columns: ["tarefa_origem_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_historico: {
        Row: {
          alterado_em: string | null
          campo: string | null
          id: string
          tarefa_id: string | null
          usuario_id: string | null
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_em?: string | null
          campo?: string | null
          id?: string
          tarefa_id?: string | null
          usuario_id?: string | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_em?: string | null
          campo?: string | null
          id?: string
          tarefa_id?: string | null
          usuario_id?: string | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_historico_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_impedimentos: {
        Row: {
          categoria: string
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dias_perdidos: number
          id: string
          impacto_prazo: number
          obra_id: string
          resolvido: boolean
          tarefa_id: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string
          dias_perdidos?: number
          id?: string
          impacto_prazo?: number
          obra_id: string
          resolvido?: boolean
          tarefa_id?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dias_perdidos?: number
          id?: string
          impacto_prazo?: number
          obra_id?: string
          resolvido?: boolean
          tarefa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_impedimentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_impedimentos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_marcos: {
        Row: {
          company_id: string
          concluido: boolean
          contrato_id: string | null
          created_at: string
          data_prevista: string
          data_real: string | null
          id: string
          nome: string
          obra_id: string
          parcela_id: string | null
          tipo: string
        }
        Insert: {
          company_id: string
          concluido?: boolean
          contrato_id?: string | null
          created_at?: string
          data_prevista: string
          data_real?: string | null
          id?: string
          nome?: string
          obra_id: string
          parcela_id?: string | null
          tipo?: string
        }
        Update: {
          company_id?: string
          concluido?: boolean
          contrato_id?: string | null
          created_at?: string
          data_prevista?: string
          data_real?: string | null
          id?: string
          nome?: string
          obra_id?: string
          parcela_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_marcos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_marcos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_marcos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_medicao_itens: {
        Row: {
          id: string
          medicao_id: string
          observacao: string | null
          percentual_anterior: number
          percentual_novo: number
          quantidade_executada: number | null
          tarefa_id: string
        }
        Insert: {
          id?: string
          medicao_id: string
          observacao?: string | null
          percentual_anterior?: number
          percentual_novo: number
          quantidade_executada?: number | null
          tarefa_id: string
        }
        Update: {
          id?: string
          medicao_id?: string
          observacao?: string | null
          percentual_anterior?: number
          percentual_novo?: number
          quantidade_executada?: number | null
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_medicao_itens_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "cronograma_medicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_medicao_itens_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_medicoes: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          obra_id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          obra_id: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          obra_id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_medicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_tarefas: {
        Row: {
          amdahl_confianca: number | null
          amdahl_equipe: number | null
          amdahl_f: number | null
          amdahl_grupo_id: string | null
          amdahl_metodo: string | null
          amdahl_p: number | null
          baseline_fim: string | null
          baseline_inicio: string | null
          baseline_locked: boolean | null
          company_id: string | null
          cor: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          dias_impedidos: number | null
          duracao_dias: number | null
          duracao_sugerida_dias: number | null
          etapa: string | null
          id: string
          is_critico: boolean | null
          nivel: number | null
          nome: string | null
          nota: string | null
          obra_id: string | null
          orcamento_categoria_id: string | null
          orcamento_composicao_id: string | null
          ordem: number | null
          parent_tarefa_id: string | null
          percentual_concluido: number | null
          peso_orcamento: number | null
          pode_editar_datas: boolean | null
          quantidade_executada: number | null
          quantidade_prevista: number | null
          responsavel_id: string | null
          status: string | null
          tipo_tarefa: string | null
          unidade: string | null
          updated_at: string | null
          versao_id: string | null
        }
        Insert: {
          amdahl_confianca?: number | null
          amdahl_equipe?: number | null
          amdahl_f?: number | null
          amdahl_grupo_id?: string | null
          amdahl_metodo?: string | null
          amdahl_p?: number | null
          baseline_fim?: string | null
          baseline_inicio?: string | null
          baseline_locked?: boolean | null
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_impedidos?: number | null
          duracao_dias?: number | null
          duracao_sugerida_dias?: number | null
          etapa?: string | null
          id?: string
          is_critico?: boolean | null
          nivel?: number | null
          nome?: string | null
          nota?: string | null
          obra_id?: string | null
          orcamento_categoria_id?: string | null
          orcamento_composicao_id?: string | null
          ordem?: number | null
          parent_tarefa_id?: string | null
          percentual_concluido?: number | null
          peso_orcamento?: number | null
          pode_editar_datas?: boolean | null
          quantidade_executada?: number | null
          quantidade_prevista?: number | null
          responsavel_id?: string | null
          status?: string | null
          tipo_tarefa?: string | null
          unidade?: string | null
          updated_at?: string | null
          versao_id?: string | null
        }
        Update: {
          amdahl_confianca?: number | null
          amdahl_equipe?: number | null
          amdahl_f?: number | null
          amdahl_grupo_id?: string | null
          amdahl_metodo?: string | null
          amdahl_p?: number | null
          baseline_fim?: string | null
          baseline_inicio?: string | null
          baseline_locked?: boolean | null
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          dias_impedidos?: number | null
          duracao_dias?: number | null
          duracao_sugerida_dias?: number | null
          etapa?: string | null
          id?: string
          is_critico?: boolean | null
          nivel?: number | null
          nome?: string | null
          nota?: string | null
          obra_id?: string | null
          orcamento_categoria_id?: string | null
          orcamento_composicao_id?: string | null
          ordem?: number | null
          parent_tarefa_id?: string | null
          percentual_concluido?: number | null
          peso_orcamento?: number | null
          pode_editar_datas?: boolean | null
          quantidade_executada?: number | null
          quantidade_prevista?: number | null
          responsavel_id?: string | null
          status?: string | null
          tipo_tarefa?: string | null
          unidade?: string | null
          updated_at?: string | null
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_tarefas_amdahl_grupo_id_fkey"
            columns: ["amdahl_grupo_id"]
            isOneToOne: false
            referencedRelation: "amdahl_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_orcamento_categoria_id_fkey"
            columns: ["orcamento_categoria_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_orcamento_composicao_id_fkey"
            columns: ["orcamento_composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_tarefas_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "cronograma_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_versoes: {
        Row: {
          company_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          obra_id: string
          status: string
          tipo: string
          updated_at: string | null
          versao_pai_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          obra_id: string
          status?: string
          tipo?: string
          updated_at?: string | null
          versao_pai_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          obra_id?: string
          status?: string
          tipo?: string
          updated_at?: string | null
          versao_pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_versoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_versoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_versoes_versao_pai_id_fkey"
            columns: ["versao_pai_id"]
            isOneToOne: false
            referencedRelation: "cronograma_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_real_itens: {
        Row: {
          categoria: string | null
          company_id: string
          composicao_id: string | null
          created_at: string | null
          data: string | null
          descricao: string
          etapa_id: string | null
          etapa_nome: string | null
          fornecedor: string | null
          id: string
          obra_id: string
          observacoes: string | null
          origem: string | null
          pagamento_id: string | null
          quantidade: number | null
          valor: number | null
          valor_unitario: number | null
        }
        Insert: {
          categoria?: string | null
          company_id: string
          composicao_id?: string | null
          created_at?: string | null
          data?: string | null
          descricao: string
          etapa_id?: string | null
          etapa_nome?: string | null
          fornecedor?: string | null
          id?: string
          obra_id: string
          observacoes?: string | null
          origem?: string | null
          pagamento_id?: string | null
          quantidade?: number | null
          valor?: number | null
          valor_unitario?: number | null
        }
        Update: {
          categoria?: string | null
          company_id?: string
          composicao_id?: string | null
          created_at?: string | null
          data?: string | null
          descricao?: string
          etapa_id?: string | null
          etapa_nome?: string | null
          fornecedor?: string | null
          id?: string
          obra_id?: string
          observacoes?: string | null
          origem?: string | null
          pagamento_id?: string | null
          quantidade?: number | null
          valor?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custo_real_itens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_real_itens_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_real_itens_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_real_itens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_real_itens_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_fotos: {
        Row: {
          created_at: string | null
          id: string
          legenda: string | null
          registro_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          legenda?: string | null
          registro_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          legenda?: string | null
          registro_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_fotos_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "diario_registros"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_materiais: {
        Row: {
          created_at: string | null
          id: string
          material_id: string | null
          material_nome: string
          quantidade: number
          registro_id: string
          unidade: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          material_nome: string
          quantidade?: number
          registro_id: string
          unidade?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          material_nome?: string
          quantidade?: number
          registro_id?: string
          unidade?: string
        }
        Relationships: [
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
          etapas_vinculadas: string[] | null
          fotos: string[] | null
          id: string
          link_id: string | null
          materiais_faltantes: Json | null
          membros_presentes: string[] | null
          obra_id: string
          observacoes: string | null
          problemas: string | null
          servicos_executados: string | null
          status: Database["public"]["Enums"]["diario_status"]
          trabalhadores: number
          updated_at: string
          urgente: boolean | null
          user_id: string | null
          usuario_nome: string
        }
        Insert: {
          clima?: Database["public"]["Enums"]["clima_tipo"]
          created_at?: string
          data?: string
          etapas_vinculadas?: string[] | null
          fotos?: string[] | null
          id?: string
          link_id?: string | null
          materiais_faltantes?: Json | null
          membros_presentes?: string[] | null
          obra_id: string
          observacoes?: string | null
          problemas?: string | null
          servicos_executados?: string | null
          status?: Database["public"]["Enums"]["diario_status"]
          trabalhadores?: number
          updated_at?: string
          urgente?: boolean | null
          user_id?: string | null
          usuario_nome?: string
        }
        Update: {
          clima?: Database["public"]["Enums"]["clima_tipo"]
          created_at?: string
          data?: string
          etapas_vinculadas?: string[] | null
          fotos?: string[] | null
          id?: string
          link_id?: string | null
          materiais_faltantes?: Json | null
          membros_presentes?: string[] | null
          obra_id?: string
          observacoes?: string | null
          problemas?: string | null
          servicos_executados?: string | null
          status?: Database["public"]["Enums"]["diario_status"]
          trabalhadores?: number
          updated_at?: string
          urgente?: boolean | null
          user_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_registros_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "obra_links"
            referencedColumns: ["id"]
          },
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
          composicao_id: string | null
          created_at: string | null
          descricao: string
          etapa_id: string | null
          id: string
          percentual_adicionado: number | null
          registro_id: string
          tarefa_id: string | null
        }
        Insert: {
          composicao_id?: string | null
          created_at?: string | null
          descricao: string
          etapa_id?: string | null
          id?: string
          percentual_adicionado?: number | null
          registro_id: string
          tarefa_id?: string | null
        }
        Update: {
          composicao_id?: string | null
          created_at?: string | null
          descricao?: string
          etapa_id?: string | null
          id?: string
          percentual_adicionado?: number | null
          registro_id?: string
          tarefa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_servicos_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "diario_registros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_servicos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "cronograma_tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_recebimentos: {
        Row: {
          company_id: string
          created_at: string | null
          data_recebimento: string | null
          destino: string
          fornecedor_nome: string | null
          id: string
          itens_confirmados: Json | null
          numero_doc: string | null
          obra_id: string | null
          registros_gerados: Json | null
          resultado_id: string
          tipo: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_recebimento?: string | null
          destino: string
          fornecedor_nome?: string | null
          id?: string
          itens_confirmados?: Json | null
          numero_doc?: string | null
          obra_id?: string | null
          registros_gerados?: Json | null
          resultado_id: string
          tipo: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_recebimento?: string | null
          destino?: string
          fornecedor_nome?: string | null
          id?: string
          itens_confirmados?: Json | null
          numero_doc?: string | null
          obra_id?: string | null
          registros_gerados?: Json | null
          resultado_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_recebimentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_recebimentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_recebimentos_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "doc_resultados"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_resultados: {
        Row: {
          company_id: string
          confianca: number | null
          created_at: string | null
          data_doc: string | null
          fornecedor_nome: string | null
          id: string
          itens: Json | null
          numero_doc: string | null
          obra_id: string | null
          raw_response: Json | null
          tipo_resultado: string
          transcricao_voz: string | null
          upload_id: string
          valor_total: number | null
        }
        Insert: {
          company_id: string
          confianca?: number | null
          created_at?: string | null
          data_doc?: string | null
          fornecedor_nome?: string | null
          id?: string
          itens?: Json | null
          numero_doc?: string | null
          obra_id?: string | null
          raw_response?: Json | null
          tipo_resultado: string
          transcricao_voz?: string | null
          upload_id: string
          valor_total?: number | null
        }
        Update: {
          company_id?: string
          confianca?: number | null
          created_at?: string | null
          data_doc?: string | null
          fornecedor_nome?: string | null
          id?: string
          itens?: Json | null
          numero_doc?: string | null
          obra_id?: string | null
          raw_response?: Json | null
          tipo_resultado?: string
          transcricao_voz?: string | null
          upload_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_resultados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_resultados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_resultados_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "doc_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_uploads: {
        Row: {
          company_id: string
          created_at: string | null
          erro_msg: string | null
          id: string
          obra_id: string | null
          status: string
          storage_path: string
          tipo: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          erro_msg?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          storage_path: string
          tipo: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          erro_msg?: string | null
          id?: string
          obra_id?: string | null
          status?: string
          storage_path?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_uploads_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_obra: {
        Row: {
          arquivo_nome: string | null
          categoria: string | null
          company_id: string
          created_at: string
          data_documento: string | null
          emitente: string | null
          id: string
          nome: string
          obra_id: string
          observacoes: string | null
          tamanho: number | null
          tipo: string | null
          updated_at: string
          url: string | null
          url_arquivo: string | null
          validade: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          categoria?: string | null
          company_id: string
          created_at?: string
          data_documento?: string | null
          emitente?: string | null
          id?: string
          nome: string
          obra_id: string
          observacoes?: string | null
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string
          url?: string | null
          url_arquivo?: string | null
          validade?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          categoria?: string | null
          company_id?: string
          created_at?: string
          data_documento?: string | null
          emitente?: string | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes?: string | null
          tamanho?: number | null
          tipo?: string | null
          updated_at?: string
          url?: string | null
          url_arquivo?: string | null
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_obra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      entradas_pendentes: {
        Row: {
          created_at: string
          dados_extraidos: Json | null
          diario_registro_id: string | null
          foto_urls: string[]
          id: string
          link_id: string | null
          nome_responsavel: string
          obra_id: string
          observacao: string | null
          origem: string | null
          processado_por: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados_extraidos?: Json | null
          diario_registro_id?: string | null
          foto_urls?: string[]
          id?: string
          link_id?: string | null
          nome_responsavel: string
          obra_id: string
          observacao?: string | null
          origem?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados_extraidos?: Json | null
          diario_registro_id?: string | null
          foto_urls?: string[]
          id?: string
          link_id?: string | null
          nome_responsavel?: string
          obra_id?: string
          observacao?: string | null
          origem?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entradas_pendentes_diario_registro_id_fkey"
            columns: ["diario_registro_id"]
            isOneToOne: false
            referencedRelation: "diario_registros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_pendentes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "obra_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entradas_pendentes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_colaboradores: {
        Row: {
          company_id: string
          created_at: string
          foto_url: string | null
          funcao: string | null
          id: string
          nome: string
          obra_id: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          foto_url?: string | null
          funcao?: string | null
          id?: string
          nome: string
          obra_id: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          foto_url?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_colaboradores_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          categoria: string
          colaborador_id: string
          company_id: string
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria: string
          colaborador_id: string
          company_id: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          categoria?: string
          colaborador_id?: string
          company_id?: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "equipe_colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_modelos_grupo: {
        Row: {
          company_id: string | null
          created_at: string | null
          etapas: Json
          id: string
          is_sistema: boolean | null
          nome: string
          tipo_obra: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          etapas?: Json
          id?: string
          is_sistema?: boolean | null
          nome: string
          tipo_obra?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          etapas?: Json
          id?: string
          is_sistema?: boolean | null
          nome?: string
          tipo_obra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapa_modelos_grupo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          company_id: string | null
          contato: string | null
          created_at: string
          email_resposta: string | null
          id: string
          lido: boolean | null
          mensagem: string
          nota_interna: string | null
          pagina_contexto: string | null
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          url_origem: string | null
          usuario_id: string | null
        }
        Insert: {
          company_id?: string | null
          contato?: string | null
          created_at?: string
          email_resposta?: string | null
          id?: string
          lido?: boolean | null
          mensagem: string
          nota_interna?: string | null
          pagina_contexto?: string | null
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          url_origem?: string | null
          usuario_id?: string | null
        }
        Update: {
          company_id?: string | null
          contato?: string | null
          created_at?: string
          email_resposta?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string
          nota_interna?: string | null
          pagina_contexto?: string | null
          tipo?: Database["public"]["Enums"]["feedback_tipo"]
          url_origem?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          categoria: string | null
          cidade: string | null
          cnpj: string | null
          company_id: string | null
          contato: string | null
          created_at: string
          email: string | null
          especialidades: string[] | null
          id: string
          nome: string
          obra_id: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_id?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome: string
          obra_id: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          cidade?: string | null
          cnpj?: string | null
          company_id?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos_pendentes_cotacao: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          material_id: string | null
          nome_insumo: string
          obra_id: string
          observacoes: string | null
          status: string
          subitem_id: string | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          nome_insumo: string
          obra_id: string
          observacoes?: string | null
          status?: string
          subitem_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          nome_insumo?: string
          obra_id?: string
          observacoes?: string | null
          status?: string
          subitem_id?: string | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumos_pendentes_cotacao_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_pendentes_cotacao_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_pendentes_cotacao_subitem_id_fkey"
            columns: ["subitem_id"]
            isOneToOne: false
            referencedRelation: "orcamento_subitens"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_compra: {
        Row: {
          company_id: string
          created_at: string | null
          criado_por: string | null
          id: string
          nome: string
          obra_id: string
          pedido_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
          obra_id: string
          pedido_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
          obra_id?: string
          pedido_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_compra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "material_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_compra_itens: {
        Row: {
          created_at: string | null
          fornecedor_sugerido: string | null
          id: string
          lista_id: string
          nome: string
          obra_id: string
          origem: string
          origem_ref_id: string | null
          preco_unitario: number | null
          quantidade: number | null
          unidade: string | null
        }
        Insert: {
          created_at?: string | null
          fornecedor_sugerido?: string | null
          id?: string
          lista_id: string
          nome: string
          obra_id: string
          origem?: string
          origem_ref_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
        }
        Update: {
          created_at?: string | null
          fornecedor_sugerido?: string | null
          id?: string
          lista_id?: string
          nome?: string
          obra_id?: string
          origem?: string
          origem_ref_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_compra_itens_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "lista_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_compra_itens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          categoria: string | null
          company_id: string
          created_at: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          id: string
          localizacao: string | null
          nome: string
          obra_id: string
          observacoes: string | null
          unidade: string | null
        }
        Insert: {
          categoria?: string | null
          company_id: string
          created_at?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string | null
          nome: string
          obra_id: string
          observacoes?: string | null
          unidade?: string | null
        }
        Update: {
          categoria?: string | null
          company_id?: string
          created_at?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string | null
          nome?: string
          obra_id?: string
          observacoes?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      material_pedidos: {
        Row: {
          agenda_evento_id: string | null
          company_id: string
          created_at: string
          criado_por: string | null
          data_entrega_prevista: string | null
          data_recebimento: string | null
          descricao: string
          etapa_id: string | null
          fornecedor: string | null
          fornecedor_id: string | null
          id: string
          itens: Json
          obra_id: string
          observacoes: string | null
          pagamento_grupo_id: string | null
          recebimento_id: string | null
          status: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          agenda_evento_id?: string | null
          company_id: string
          created_at?: string
          criado_por?: string | null
          data_entrega_prevista?: string | null
          data_recebimento?: string | null
          descricao: string
          etapa_id?: string | null
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          itens?: Json
          obra_id: string
          observacoes?: string | null
          pagamento_grupo_id?: string | null
          recebimento_id?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          agenda_evento_id?: string | null
          company_id?: string
          created_at?: string
          criado_por?: string | null
          data_entrega_prevista?: string | null
          data_recebimento?: string | null
          descricao?: string
          etapa_id?: string | null
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          itens?: Json
          obra_id?: string
          observacoes?: string | null
          pagamento_grupo_id?: string | null
          recebimento_id?: string | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_pedidos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_pedidos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      material_recebimentos: {
        Row: {
          atualizar_estoque: boolean
          company_id: string | null
          created_at: string
          dados_ia: Json | null
          data_documento: string | null
          data_recebimento: string
          fornecedor: string | null
          foto_urls: string[]
          id: string
          itens: Json
          link_id: string | null
          nome_responsavel: string | null
          numero_documento: string | null
          obra_id: string
          observacao_interna: string | null
          origem: string
          pedido_id: string | null
          processado_por: string | null
          status: string
          tipo: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          atualizar_estoque?: boolean
          company_id?: string | null
          created_at?: string
          dados_ia?: Json | null
          data_documento?: string | null
          data_recebimento?: string
          fornecedor?: string | null
          foto_urls?: string[]
          id?: string
          itens?: Json
          link_id?: string | null
          nome_responsavel?: string | null
          numero_documento?: string | null
          obra_id: string
          observacao_interna?: string | null
          origem?: string
          pedido_id?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          atualizar_estoque?: boolean
          company_id?: string | null
          created_at?: string
          dados_ia?: Json | null
          data_documento?: string | null
          data_recebimento?: string
          fornecedor?: string | null
          foto_urls?: string[]
          id?: string
          itens?: Json
          link_id?: string | null
          nome_responsavel?: string | null
          numero_documento?: string | null
          obra_id?: string
          observacao_interna?: string | null
          origem?: string
          pedido_id?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_recebimentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "material_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          company_id: string
          created_at: string | null
          data: string | null
          id: string
          material_id: string
          material_nome: string | null
          obra_id: string
          observacoes: string | null
          origem_destino: string | null
          quantidade: number
          responsavel: string | null
          tipo: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data?: string | null
          id?: string
          material_id: string
          material_nome?: string | null
          obra_id: string
          observacoes?: string | null
          origem_destino?: string | null
          quantidade?: number
          responsavel?: string | null
          tipo: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data?: string | null
          id?: string
          material_id?: string
          material_nome?: string | null
          obra_id?: string
          observacoes?: string | null
          origem_destino?: string | null
          quantidade?: number
          responsavel?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      notifications: {
        Row: {
          acao_label: string | null
          acao_url: string | null
          company_id: string
          created_at: string | null
          id: string
          lida: boolean
          mensagem: string | null
          metadata: Json | null
          obra_id: string | null
          prioridade: string
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          acao_label?: string | null
          acao_url?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          metadata?: Json | null
          obra_id?: string | null
          prioridade?: string
          tipo: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          acao_label?: string | null
          acao_url?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          lida?: boolean
          mensagem?: string | null
          metadata?: Json | null
          obra_id?: string | null
          prioridade?: string
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_agenda: {
        Row: {
          alerta_ativo: boolean
          antecedencia_alerta_em_dias: number | null
          company_id: string
          cor: string | null
          created_at: string
          data_fim: string | null
          data_finalizacao: string | null
          data_inicio: string | null
          data_limite: string | null
          data_programada: string | null
          descricao: string | null
          hora_programada: string | null
          id: string
          local: string | null
          obra_id: string
          observacoes: string | null
          origem: string | null
          prioridade: string
          responsavel: string | null
          responsavel_id: string | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          alerta_ativo?: boolean
          antecedencia_alerta_em_dias?: number | null
          company_id: string
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          data_programada?: string | null
          descricao?: string | null
          hora_programada?: string | null
          id?: string
          local?: string | null
          obra_id: string
          observacoes?: string | null
          origem?: string | null
          prioridade?: string
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          alerta_ativo?: boolean
          antecedencia_alerta_em_dias?: number | null
          company_id?: string
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_finalizacao?: string | null
          data_inicio?: string | null
          data_limite?: string | null
          data_programada?: string | null
          descricao?: string | null
          hora_programada?: string | null
          id?: string
          local?: string | null
          obra_id?: string
          observacoes?: string | null
          origem?: string | null
          prioridade?: string
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_agenda_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_agenda_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_calendarios: {
        Row: {
          created_at: string | null
          dias_uteis: number[] | null
          horas_por_dia: number | null
          obra_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dias_uteis?: number[] | null
          horas_por_dia?: number | null
          obra_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dias_uteis?: number[] | null
          horas_por_dia?: number | null
          obra_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_calendarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: true
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_calendarios_holidays: {
        Row: {
          created_at: string | null
          data: string
          descricao: string
          id: string
          obra_id: string
          recorrente: boolean | null
        }
        Insert: {
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          obra_id: string
          recorrente?: boolean | null
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          obra_id?: string
          recorrente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_calendarios_holidays_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_link_mensagens: {
        Row: {
          created_at: string | null
          de_cliente: boolean | null
          id: string
          link_id: string | null
          texto: string
        }
        Insert: {
          created_at?: string | null
          de_cliente?: boolean | null
          id?: string
          link_id?: string | null
          texto: string
        }
        Update: {
          created_at?: string | null
          de_cliente?: boolean | null
          id?: string
          link_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_link_mensagens_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "obra_links"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_links: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          nome_label: string
          obra_id: string
          permissoes: Json
          permite_estoque: boolean
          tipo: Database["public"]["Enums"]["obra_link_tipo"]
          token: string
          updated_at: string
          views_count: number
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          nome_label: string
          obra_id: string
          permissoes?: Json
          permite_estoque?: boolean
          tipo: Database["public"]["Enums"]["obra_link_tipo"]
          token?: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          nome_label?: string
          obra_id?: string
          permissoes?: Json
          permite_estoque?: boolean
          tipo?: Database["public"]["Enums"]["obra_link_tipo"]
          token?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "obra_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_links_obra_id_fkey"
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
          area_construida: number | null
          cliente: string | null
          codigo: string | null
          company_id: string | null
          created_at: string | null
          data_inicio: string | null
          data_inicio_real: string | null
          data_previsao_termino: string | null
          descricao: string | null
          endereco: string | null
          id: string
          is_demo: boolean | null
          nome: string | null
          observacao_interna: string | null
          observacoes_implantacao: string | null
          orcamento_bdi_config: Json | null
          origem_dados: Database["public"]["Enums"]["origem_dados"] | null
          percentual_andamento: number | null
          percentual_inicial: number | null
          prazo_semanas: number | null
          responsavel: string | null
          status: string | null
          tipo_implantacao:
            | Database["public"]["Enums"]["tipo_implantacao"]
            | null
          valor_gasto_anterior: number | null
        }
        Insert: {
          area_construida?: number | null
          cliente?: string | null
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_inicio_real?: string | null
          data_previsao_termino?: string | null
          descricao?: string | null
          endereco?: string | null
          id?: string
          is_demo?: boolean | null
          nome?: string | null
          observacao_interna?: string | null
          observacoes_implantacao?: string | null
          orcamento_bdi_config?: Json | null
          origem_dados?: Database["public"]["Enums"]["origem_dados"] | null
          percentual_andamento?: number | null
          percentual_inicial?: number | null
          prazo_semanas?: number | null
          responsavel?: string | null
          status?: string | null
          tipo_implantacao?:
            | Database["public"]["Enums"]["tipo_implantacao"]
            | null
          valor_gasto_anterior?: number | null
        }
        Update: {
          area_construida?: number | null
          cliente?: string | null
          codigo?: string | null
          company_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_inicio_real?: string | null
          data_previsao_termino?: string | null
          descricao?: string | null
          endereco?: string | null
          id?: string
          is_demo?: boolean | null
          nome?: string | null
          observacao_interna?: string | null
          observacoes_implantacao?: string | null
          orcamento_bdi_config?: Json | null
          origem_dados?: Database["public"]["Enums"]["origem_dados"] | null
          percentual_andamento?: number | null
          percentual_inicial?: number | null
          prazo_semanas?: number | null
          responsavel?: string | null
          status?: string | null
          tipo_implantacao?:
            | Database["public"]["Enums"]["tipo_implantacao"]
            | null
          valor_gasto_anterior?: number | null
        }
        Relationships: []
      }
      orcamento_categorias: {
        Row: {
          codigo: string
          company_id: string | null
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          estimado_valor: number | null
          id: string
          nome: string
          obra_id: string
          observacoes_cronograma: string | null
          parent_id: string | null
          percentual_cronograma: number | null
          preco_total: number
          responsavel: string | null
          status_cronograma:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at: string
          usa_composicoes: boolean
          versao_id: string | null
        }
        Insert: {
          codigo?: string
          company_id?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          estimado_valor?: number | null
          id?: string
          nome: string
          obra_id: string
          observacoes_cronograma?: string | null
          parent_id?: string | null
          percentual_cronograma?: number | null
          preco_total?: number
          responsavel?: string | null
          status_cronograma?:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at?: string
          usa_composicoes?: boolean
          versao_id?: string | null
        }
        Update: {
          codigo?: string
          company_id?: string | null
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          estimado_valor?: number | null
          id?: string
          nome?: string
          obra_id?: string
          observacoes_cronograma?: string | null
          parent_id?: string | null
          percentual_cronograma?: number | null
          preco_total?: number
          responsavel?: string | null
          status_cronograma?:
            | Database["public"]["Enums"]["cronograma_status"]
            | null
          updated_at?: string
          usa_composicoes?: boolean
          versao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_categorias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_categorias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_categorias_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_categorias_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_composicoes: {
        Row: {
          amdahl_grupo_id: string | null
          codigo: string
          codigo_referencia_externa: string | null
          company_id: string | null
          concluida: boolean
          created_at: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          data_inicio_prevista: string | null
          data_inicio_real: string | null
          descricao: string
          etapa_id: string
          fonte_referencia: string | null
          id: string
          peso_cronograma: number | null
          preco_total: number
          preco_unitario: number | null
          quantidade: number | null
          referencia_competencia: string | null
          regime_mo: string | null
          regime_referencia: string | null
          sinapi_codigo: number | null
          sinapi_confidence: string | null
          sinapi_confirmado: boolean | null
          sinapi_fonte: string | null
          tipo: string | null
          tipo_item: string | null
          uf_referencia: string | null
          unidade: string | null
          updated_at: string
          usa_subitens: boolean
        }
        Insert: {
          amdahl_grupo_id?: string | null
          codigo?: string
          codigo_referencia_externa?: string | null
          company_id?: string | null
          concluida?: boolean
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string
          etapa_id: string
          fonte_referencia?: string | null
          id?: string
          peso_cronograma?: number | null
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          referencia_competencia?: string | null
          regime_mo?: string | null
          regime_referencia?: string | null
          sinapi_codigo?: number | null
          sinapi_confidence?: string | null
          sinapi_confirmado?: boolean | null
          sinapi_fonte?: string | null
          tipo?: string | null
          tipo_item?: string | null
          uf_referencia?: string | null
          unidade?: string | null
          updated_at?: string
          usa_subitens?: boolean
        }
        Update: {
          amdahl_grupo_id?: string | null
          codigo?: string
          codigo_referencia_externa?: string | null
          company_id?: string | null
          concluida?: boolean
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          data_inicio_prevista?: string | null
          data_inicio_real?: string | null
          descricao?: string
          etapa_id?: string
          fonte_referencia?: string | null
          id?: string
          peso_cronograma?: number | null
          preco_total?: number
          preco_unitario?: number | null
          quantidade?: number | null
          referencia_competencia?: string | null
          regime_mo?: string | null
          regime_referencia?: string | null
          sinapi_codigo?: number | null
          sinapi_confidence?: string | null
          sinapi_confirmado?: boolean | null
          sinapi_fonte?: string | null
          tipo?: string | null
          tipo_item?: string | null
          uf_referencia?: string | null
          unidade?: string | null
          updated_at?: string
          usa_subitens?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_composicoes_amdahl_grupo_id_fkey"
            columns: ["amdahl_grupo_id"]
            isOneToOne: false
            referencedRelation: "amdahl_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_composicoes_categoria_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_composicoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_etapa_dependencias: {
        Row: {
          created_at: string
          etapa_destino_id: string
          etapa_origem_id: string
          id: string
          lag_dias: number
          obra_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          etapa_destino_id: string
          etapa_origem_id: string
          id?: string
          lag_dias?: number
          obra_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          etapa_destino_id?: string
          etapa_origem_id?: string
          id?: string
          lag_dias?: number
          obra_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_etapa_dependencias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_subitens: {
        Row: {
          categoria_id: string
          codigo: string | null
          codigo_referencia_externa: string | null
          company_id: string
          composicao_id: string | null
          created_at: string | null
          custo_total: number | null
          custo_unitario: number | null
          descricao: string | null
          id: string
          nome: string
          observacoes: string | null
          origem_composicao_codigo: string | null
          origem_composicao_descricao: string | null
          origem_grupo_titulo: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number | null
          sinapi_codigo: number | null
          sinapi_confidence: string | null
          sinapi_confirmado: boolean | null
          sinapi_fonte: string | null
          unidade: string | null
        }
        Insert: {
          categoria_id: string
          codigo?: string | null
          codigo_referencia_externa?: string | null
          company_id: string
          composicao_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          descricao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem_composicao_codigo?: string | null
          origem_composicao_descricao?: string | null
          origem_grupo_titulo?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          sinapi_codigo?: number | null
          sinapi_confidence?: string | null
          sinapi_confirmado?: boolean | null
          sinapi_fonte?: string | null
          unidade?: string | null
        }
        Update: {
          categoria_id?: string
          codigo?: string | null
          codigo_referencia_externa?: string | null
          company_id?: string
          composicao_id?: string | null
          created_at?: string | null
          custo_total?: number | null
          custo_unitario?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem_composicao_codigo?: string | null
          origem_composicao_descricao?: string | null
          origem_grupo_titulo?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          sinapi_codigo?: number | null
          sinapi_confidence?: string | null
          sinapi_confirmado?: boolean | null
          sinapi_fonte?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_subitens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_subitens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_subitens_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_versoes: {
        Row: {
          calculadora_estimativa_id: string | null
          company_id: string | null
          created_at: string
          descricao: string | null
          id: string
          numero_versao: string
          obra_id: string
          origem: Database["public"]["Enums"]["orcamento_origem"] | null
          parametros_calculadora: Json | null
          status: string
          tipo: string
          updated_at: string
          valor_total: number
          versao_pai_id: string | null
        }
        Insert: {
          calculadora_estimativa_id?: string | null
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_versao?: string
          obra_id: string
          origem?: Database["public"]["Enums"]["orcamento_origem"] | null
          parametros_calculadora?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number
          versao_pai_id?: string | null
        }
        Update: {
          calculadora_estimativa_id?: string | null
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          numero_versao?: string
          obra_id?: string
          origem?: Database["public"]["Enums"]["orcamento_origem"] | null
          parametros_calculadora?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_total?: number
          versao_pai_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_versoes_calculadora_estimativa_id_fkey"
            columns: ["calculadora_estimativa_id"]
            isOneToOne: false
            referencedRelation: "calculadora_estimativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_versoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_versoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_versoes_versao_pai_id_fkey"
            columns: ["versao_pai_id"]
            isOneToOne: false
            referencedRelation: "orcamento_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamento_anexos: {
        Row: {
          company_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          pagamento_id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          pagamento_id: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          pagamento_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamento_anexos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamento_anexos_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamento_itens: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          material_id: string | null
          nome_material_informado: string
          nome_material_normalizado: string
          obra_id: string
          observacoes: string | null
          pagamento_id: string
          preco_unitario: number
          quantidade: number
          unidade: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          nome_material_informado: string
          nome_material_normalizado: string
          obra_id: string
          observacoes?: string | null
          pagamento_id: string
          preco_unitario?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          material_id?: string | null
          nome_material_informado?: string
          nome_material_normalizado?: string
          obra_id?: string
          observacoes?: string | null
          pagamento_id?: string
          preco_unitario?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamento_itens_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamento_itens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamento_itens_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          categoria_id: string | null
          categoria_indireta: string | null
          composicao_id: string | null
          created_at: string
          cronograma_task_id: string | null
          custo_real_id: string | null
          data_compra: string | null
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          etapa_id: string | null
          etapa_orcamento: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          fornecedor: string | null
          fornecedor_id: string | null
          grupo_parcelas_id: string | null
          id: string
          numero_parcela: number | null
          obra_id: string
          observacao_interna: string | null
          observacoes: string | null
          origem_dados: Database["public"]["Enums"]["origem_dados"] | null
          pedido_id: string | null
          status: Database["public"]["Enums"]["pagamento_status"]
          tipo_pagamento: Database["public"]["Enums"]["pagamento_tipo"]
          total_parcelas: number | null
          updated_at: string
          valor_pago: number | null
          valor_parcela: number | null
          valor_previsto: number
        }
        Insert: {
          categoria_id?: string | null
          categoria_indireta?: string | null
          composicao_id?: string | null
          created_at?: string
          cronograma_task_id?: string | null
          custo_real_id?: string | null
          data_compra?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string
          etapa_id?: string | null
          etapa_orcamento?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          fornecedor?: string | null
          fornecedor_id?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          numero_parcela?: number | null
          obra_id: string
          observacao_interna?: string | null
          observacoes?: string | null
          origem_dados?: Database["public"]["Enums"]["origem_dados"] | null
          pedido_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          tipo_pagamento?: Database["public"]["Enums"]["pagamento_tipo"]
          total_parcelas?: number | null
          updated_at?: string
          valor_pago?: number | null
          valor_parcela?: number | null
          valor_previsto?: number
        }
        Update: {
          categoria_id?: string | null
          categoria_indireta?: string | null
          composicao_id?: string | null
          created_at?: string
          cronograma_task_id?: string | null
          custo_real_id?: string | null
          data_compra?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          etapa_id?: string | null
          etapa_orcamento?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          fornecedor?: string | null
          fornecedor_id?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          numero_parcela?: number | null
          obra_id?: string
          observacao_interna?: string | null
          observacoes?: string | null
          origem_dados?: Database["public"]["Enums"]["origem_dados"] | null
          pedido_id?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          tipo_pagamento?: Database["public"]["Enums"]["pagamento_tipo"]
          total_parcelas?: number | null
          updated_at?: string
          valor_pago?: number | null
          valor_parcela?: number | null
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_composicao_id_fkey"
            columns: ["composicao_id"]
            isOneToOne: false
            referencedRelation: "orcamento_composicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "orcamento_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "material_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          features: Json | null
          id: string
          ilimitado: boolean | null
          limite_clientes: number | null
          limite_funcionarios: number | null
          limite_gestores: number | null
          limite_obras: number | null
          nome_comercial: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          features?: Json | null
          id?: string
          ilimitado?: boolean | null
          limite_clientes?: number | null
          limite_funcionarios?: number | null
          limite_gestores?: number | null
          limite_obras?: number | null
          nome_comercial?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          features?: Json | null
          id?: string
          ilimitado?: boolean | null
          limite_clientes?: number | null
          limite_funcionarios?: number | null
          limite_gestores?: number | null
          limite_obras?: number | null
          nome_comercial?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      preco_historico: {
        Row: {
          company_id: string
          created_at: string | null
          data_referencia: string
          descricao_insumo: string
          descricao_normalizada: string
          editado_por: string | null
          fornecedor_nome: string | null
          id: string
          link_id: string | null
          obra_id: string | null
          origem: string
          preco_unitario: number
          sub_origem: string | null
          unidade: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          data_referencia?: string
          descricao_insumo: string
          descricao_normalizada: string
          editado_por?: string | null
          fornecedor_nome?: string | null
          id?: string
          link_id?: string | null
          obra_id?: string | null
          origem?: string
          preco_unitario: number
          sub_origem?: string | null
          unidade?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          data_referencia?: string
          descricao_insumo?: string
          descricao_normalizada?: string
          editado_por?: string | null
          fornecedor_nome?: string | null
          id?: string
          link_id?: string | null
          obra_id?: string | null
          origem?: string
          preco_unitario?: number
          sub_origem?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preco_historico_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preco_historico_editado_por_fkey"
            columns: ["editado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preco_historico_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "cotacao_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preco_historico_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      precos_fornecedores: {
        Row: {
          categoria: string | null
          created_at: string
          data_referencia: string
          descricao_item_snapshot: string | null
          fornecedor_id: string
          id: string
          material_id: string | null
          obra_id: string | null
          observacoes: string | null
          origem_preco: Database["public"]["Enums"]["origem_preco"]
          preco_unitario: number
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_referencia?: string
          descricao_item_snapshot?: string | null
          fornecedor_id: string
          id?: string
          material_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          origem_preco?: Database["public"]["Enums"]["origem_preco"]
          preco_unitario: number
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_referencia?: string
          descricao_item_snapshot?: string | null
          fornecedor_id?: string
          id?: string
          material_id?: string | null
          obra_id?: string | null
          observacoes?: string | null
          origem_preco?: Database["public"]["Enums"]["origem_preco"]
          preco_unitario?: number
          unidade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "precos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_fornecedores_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precos_fornecedores_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          conselho_tipo: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          profissao: string | null
          registro_conselho: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          conselho_tipo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          profissao?: string | null
          registro_conselho?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          conselho_tipo?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          profissao?: string | null
          registro_conselho?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recebiveis: {
        Row: {
          contrato_id: string | null
          created_at: string
          data_emissao: string | null
          data_recebimento: string | null
          data_vencimento: string | null
          descricao: string
          forma_recebimento: string | null
          grupo_parcelas_id: string | null
          id: string
          medicao_id: string | null
          numero_nf: string | null
          numero_parcela: number | null
          obra_id: string
          observacoes: string | null
          status: string
          total_parcelas: number | null
          updated_at: string
          valor_faturado: number
          valor_recebido: number
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_recebimento?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          medicao_id?: string | null
          numero_nf?: string | null
          numero_parcela?: number | null
          obra_id: string
          observacoes?: string | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor_faturado?: number
          valor_recebido?: number
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_recebimento?: string | null
          grupo_parcelas_id?: string | null
          id?: string
          medicao_id?: string | null
          numero_nf?: string | null
          numero_parcela?: number | null
          obra_id?: string
          observacoes?: string | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor_faturado?: number
          valor_recebido?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebiveis_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebiveis_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "contratos_medicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebiveis_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_obra: {
        Row: {
          capacidade_diaria: number | null
          company_id: string | null
          cor: string | null
          created_at: string | null
          custo_hora: number | null
          id: string
          nome: string
          obra_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          capacidade_diaria?: number | null
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          custo_hora?: number | null
          id?: string
          nome: string
          obra_id: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          capacidade_diaria?: number | null
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          custo_hora?: number | null
          id?: string
          nome?: string
          obra_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recursos_obra_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_composicao_custos: {
        Row: {
          composicao_codigo: number
          created_at: string
          custo: number | null
          id: string
          percentual_as: number | null
          referencia_id: string
          regime: string
          uf: string
        }
        Insert: {
          composicao_codigo: number
          created_at?: string
          custo?: number | null
          id?: string
          percentual_as?: number | null
          referencia_id: string
          regime: string
          uf: string
        }
        Update: {
          composicao_codigo?: number
          created_at?: string
          custo?: number | null
          id?: string
          percentual_as?: number | null
          referencia_id?: string
          regime?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_composicao_custos_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "sinapi_referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_composicao_itens: {
        Row: {
          codigo_item: number
          coeficiente: number | null
          composicao_codigo: number
          created_at: string
          descricao_item: string
          id: string
          ordem: number
          referencia_id: string
          situacao: string | null
          tipo_item: string
          unidade: string | null
        }
        Insert: {
          codigo_item: number
          coeficiente?: number | null
          composicao_codigo: number
          created_at?: string
          descricao_item: string
          id?: string
          ordem: number
          referencia_id: string
          situacao?: string | null
          tipo_item: string
          unidade?: string | null
        }
        Update: {
          codigo_item?: number
          coeficiente?: number | null
          composicao_codigo?: number
          created_at?: string
          descricao_item?: string
          id?: string
          ordem?: number
          referencia_id?: string
          situacao?: string | null
          tipo_item?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_composicao_itens_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "sinapi_referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_composicoes: {
        Row: {
          codigo: number
          created_at: string
          descricao: string
          grupo: string | null
          id: string
          referencia_id: string
          situacao: string | null
          unidade: string | null
        }
        Insert: {
          codigo: number
          created_at?: string
          descricao: string
          grupo?: string | null
          id?: string
          referencia_id: string
          situacao?: string | null
          unidade?: string | null
        }
        Update: {
          codigo?: number
          created_at?: string
          descricao?: string
          grupo?: string | null
          id?: string
          referencia_id?: string
          situacao?: string | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_composicoes_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "sinapi_referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_insumo_precos: {
        Row: {
          created_at: string
          id: string
          insumo_codigo: number
          preco: number | null
          referencia_id: string
          regime: string
          uf: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_codigo: number
          preco?: number | null
          referencia_id: string
          regime: string
          uf: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_codigo?: number
          preco?: number | null
          referencia_id?: string
          regime?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_insumo_precos_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "sinapi_referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_insumos: {
        Row: {
          classificacao: string | null
          codigo: number
          created_at: string
          descricao: string
          id: string
          origem_preco: string | null
          referencia_id: string
          unidade: string | null
        }
        Insert: {
          classificacao?: string | null
          codigo: number
          created_at?: string
          descricao: string
          id?: string
          origem_preco?: string | null
          referencia_id: string
          unidade?: string | null
        }
        Update: {
          classificacao?: string | null
          codigo?: number
          created_at?: string
          descricao?: string
          id?: string
          origem_preco?: string | null
          referencia_id?: string
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinapi_insumos_referencia_id_fkey"
            columns: ["referencia_id"]
            isOneToOne: false
            referencedRelation: "sinapi_referencias"
            referencedColumns: ["id"]
          },
        ]
      }
      sinapi_referencias: {
        Row: {
          arquivo_nome: string
          competencia: string
          created_at: string
          fonte: string
          id: string
        }
        Insert: {
          arquivo_nome: string
          competencia: string
          created_at?: string
          fonte?: string
          id?: string
        }
        Update: {
          arquivo_nome?: string
          competencia?: string
          created_at?: string
          fonte?: string
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          ciclo: string | null
          company_id: string | null
          created_at: string | null
          id: string
          plan_id: string | null
          status: string | null
          trial_end: string | null
          trial_start: string | null
        }
        Insert: {
          ciclo?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
        }
        Update: {
          ciclo?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          modulo: string
          permitido: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          modulo: string
          permitido?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          modulo?: string
          permitido?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          id: string
          obras_ids: string[] | null
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          id?: string
          obras_ids?: string[] | null
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          id?: string
          obras_ids?: string[] | null
          role?: Database["public"]["Enums"]["app_role"] | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _cleanup_demo_data_for_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      bootstrap_demo_obras: {
        Args: { p_company_id: string; p_obras: Json; p_user_id: string }
        Returns: undefined
      }
      buscar_precos_historicos: {
        Args: {
          p_company_id: string
          p_descricoes: string[]
          p_obra_id: string
        }
        Returns: {
          descricao_norm: string
          ocorrencias: number
          preco_medio: number
        }[]
      }
      can_modify_obra: { Args: { _obra_id: string }; Returns: boolean }
      check_plan_limit: {
        Args: { _company_id: string; _resource: string }
        Returns: Json
      }
      complete_onboarding: {
        Args: {
          _cnpj: string
          _email: string
          _nome: string
          _plan_slug: string
          _telefone: string
        }
        Returns: {
          company_id: string
        }[]
      }
      expandir_composicao_sinapi: {
        Args: {
          p_codigo: number
          p_referencia_id: string
          p_regime: string
          p_uf: string
        }
        Returns: {
          codigo: number
          descricao: string
          grupo_origem_codigo: number
          grupo_origem_descricao: string
          preco_unitario: number
          quantidade: number
          unidade: string
        }[]
      }
      get_my_role_and_company: {
        Args: never
        Returns: {
          company_id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_obra_from_aditivo: { Args: { _aditivo_id: string }; Returns: string }
      get_obra_from_fornecedor: {
        Args: { _fornecedor_id: string }
        Returns: string
      }
      get_obra_from_medicao_contrato: {
        Args: { _medicao_id: string }
        Returns: string
      }
      get_sinapi_grupos: {
        Args: { p_referencia_id: string }
        Returns: {
          grupo: string
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      insert_feedback_anonimo: { Args: { payload: Json }; Returns: undefined }
      is_obra_gestor: { Args: { _obra_id: string }; Returns: boolean }
      is_obra_member: { Args: { _obra_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      match_sinapi_item: {
        Args: {
          p_descricao: string
          p_limit?: number
          p_regime?: string
          p_uf?: string
          p_unidade?: string
        }
        Returns: {
          codigo: number
          confidence: string
          descricao: string
          fonte: string
          n_tokens: number
          preco: number
          score: number
          unidade: string
        }[]
      }
      remove_demo_data: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      search_sinapi: {
        Args: { lim?: number; query: string }
        Returns: {
          codigo: number
          descricao: string
          grupo: string
          unidade: string
        }[]
      }
      update_company_user_role:
        | {
            Args: {
              _new_role: Database["public"]["Enums"]["app_role"]
              _target_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _new_role: Database["public"]["Enums"]["app_role"]
              _obras_ids?: string[]
              _target_user_id: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "gestor" | "funcionario" | "cliente" | "admin" | "engenheiro"
      calculadora_cobertura:
        | "aparente_ceramica"
        | "aparente_fibrocimento"
        | "embutida_metalica"
        | "laje_impermeabilizada"
      calculadora_construcao_existente: "nenhuma" | "parcial" | "total"
      calculadora_estrutura:
        | "alvenaria_estrutural"
        | "concreto_armado"
        | "estrutura_metalica"
        | "wood_frame"
        | "steel_frame"
      calculadora_fundacao: "radier" | "sapata" | "estaca"
      calculadora_metodo:
        | "a_cub_simplificado"
        | "b_hibrido"
        | "c_sinapi_quantitativos"
      calculadora_padrao_acabamento: "baixo" | "normal" | "alto"
      calculadora_tipo_uso:
        | "residencial_unifamiliar"
        | "residencial_multifamiliar"
        | "comercial"
        | "galpao_industrial"
        | "reforma_interiores"
      calculadora_topografia:
        | "plano"
        | "aclive_leve"
        | "aclive_forte"
        | "declive_leve"
        | "declive_forte"
      clima_tipo: "sol" | "nublado" | "chuva" | "chuvoso_forte"
      cronograma_status:
        | "nao_iniciada"
        | "em_andamento"
        | "concluida"
        | "atrasada"
      diario_status: "pendente" | "aprovado" | "rejeitado"
      feedback_tipo: "sugestao" | "problema" | "elogio" | "outro"
      forma_pagamento:
        | "boleto"
        | "pix"
        | "cartao"
        | "transferencia"
        | "dinheiro"
        | "outro"
      movimentacao_tipo: "entrada" | "saida"
      obra_link_tipo: "visualizacao" | "operacao"
      obra_status: "planejamento" | "em_andamento" | "concluida" | "pausada"
      orcamento_origem: "manual" | "importacao_excel" | "calculadora_estimativa"
      origem_dados:
        | "real"
        | "estimado"
        | "importado"
        | "verbal"
        | "pendente_validacao"
      origem_preco: "compra_real" | "cotacao" | "tabela" | "outro"
      pagamento_status: "previsto" | "pago" | "atrasado" | "cancelado"
      pagamento_tipo:
        | "material"
        | "mao_de_obra"
        | "servico"
        | "aluguel"
        | "outro"
      pendencia_prioridade: "baixa" | "media" | "alta"
      pendencia_status: "aberta" | "em_andamento" | "resolvida"
      pendencia_tipo:
        | "documento"
        | "custo"
        | "pagamento"
        | "diario"
        | "orcamento"
        | "fornecedor"
        | "outro"
      tipo_contato:
        | "cliente"
        | "fornecedor_material"
        | "mao_de_obra"
        | "parceiro"
        | "projetista"
        | "outro"
      tipo_implantacao: "nova" | "em_andamento"
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
      app_role: ["gestor", "funcionario", "cliente", "admin", "engenheiro"],
      calculadora_cobertura: [
        "aparente_ceramica",
        "aparente_fibrocimento",
        "embutida_metalica",
        "laje_impermeabilizada",
      ],
      calculadora_construcao_existente: ["nenhuma", "parcial", "total"],
      calculadora_estrutura: [
        "alvenaria_estrutural",
        "concreto_armado",
        "estrutura_metalica",
        "wood_frame",
        "steel_frame",
      ],
      calculadora_fundacao: ["radier", "sapata", "estaca"],
      calculadora_metodo: [
        "a_cub_simplificado",
        "b_hibrido",
        "c_sinapi_quantitativos",
      ],
      calculadora_padrao_acabamento: ["baixo", "normal", "alto"],
      calculadora_tipo_uso: [
        "residencial_unifamiliar",
        "residencial_multifamiliar",
        "comercial",
        "galpao_industrial",
        "reforma_interiores",
      ],
      calculadora_topografia: [
        "plano",
        "aclive_leve",
        "aclive_forte",
        "declive_leve",
        "declive_forte",
      ],
      clima_tipo: ["sol", "nublado", "chuva", "chuvoso_forte"],
      cronograma_status: [
        "nao_iniciada",
        "em_andamento",
        "concluida",
        "atrasada",
      ],
      diario_status: ["pendente", "aprovado", "rejeitado"],
      feedback_tipo: ["sugestao", "problema", "elogio", "outro"],
      forma_pagamento: [
        "boleto",
        "pix",
        "cartao",
        "transferencia",
        "dinheiro",
        "outro",
      ],
      movimentacao_tipo: ["entrada", "saida"],
      obra_link_tipo: ["visualizacao", "operacao"],
      obra_status: ["planejamento", "em_andamento", "concluida", "pausada"],
      orcamento_origem: [
        "manual",
        "importacao_excel",
        "calculadora_estimativa",
      ],
      origem_dados: [
        "real",
        "estimado",
        "importado",
        "verbal",
        "pendente_validacao",
      ],
      origem_preco: ["compra_real", "cotacao", "tabela", "outro"],
      pagamento_status: ["previsto", "pago", "atrasado", "cancelado"],
      pagamento_tipo: [
        "material",
        "mao_de_obra",
        "servico",
        "aluguel",
        "outro",
      ],
      pendencia_prioridade: ["baixa", "media", "alta"],
      pendencia_status: ["aberta", "em_andamento", "resolvida"],
      pendencia_tipo: [
        "documento",
        "custo",
        "pagamento",
        "diario",
        "orcamento",
        "fornecedor",
        "outro",
      ],
      tipo_contato: [
        "cliente",
        "fornecedor_material",
        "mao_de_obra",
        "parceiro",
        "projetista",
        "outro",
      ],
      tipo_implantacao: ["nova", "em_andamento"],
    },
  },
} as const
