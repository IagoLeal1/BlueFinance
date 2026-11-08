
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cartoes": {
                  Row: {
                    "criado_em": string,"dia_fechamento": number,"dia_vencimento": number | null,"id": string,"nome": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"dia_fechamento": number,"dia_vencimento"?: number | null,"id"?: string,"nome": string,"user_id": string
                  }
                  Update: {
                    "criado_em"?: string,"dia_fechamento"?: number,"dia_vencimento"?: number | null,"id"?: string,"nome"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categorias": {
                  Row: {
                    "icone": string,"id": string,"nome": string,"ordem": number,"tipo": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "icone"?: string,"id"?: string,"nome": string,"ordem"?: number,"tipo": string,"user_id": string
                  }
                  Update: {
                    "icone"?: string,"id"?: string,"nome"?: string,"ordem"?: number,"tipo"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inscricoes_push": {
                  Row: {
                    "auth": string,"criado_em": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"criado_em"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"criado_em"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"investimentos": {
                  Row: {
                    "aportado": number,"criado_em": string,"id": string,"instituicao": string,"nome": string,"tipo": string,"user_id": string,"valor_atual": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aportado"?: number,"criado_em"?: string,"id"?: string,"instituicao": string,"nome": string,"tipo": string,"user_id": string,"valor_atual"?: number
                  }
                  Update: {
                    "aportado"?: number,"criado_em"?: string,"id"?: string,"instituicao"?: string,"nome"?: string,"tipo"?: string,"user_id"?: string,"valor_atual"?: number
                  }
                  Relationships: [
                    
                  ]
                },"lancamentos": {
                  Row: {
                    "cartao_id": string | null,"categoria_id": string | null,"competencia": string,"compra_id": string | null,"criado_em": string,"data": string,"descricao": string,"forma_pagamento": string | null,"id": string,"investimento_id": string | null,"origem": string,"parcela": number | null,"parcelas": number | null,"recorrente": boolean,"tipo": string,"user_id": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"competencia"?: string,"compra_id"?: string | null,"criado_em"?: string,"data"?: string,"descricao"?: string,"forma_pagamento"?: string | null,"id"?: string,"investimento_id"?: string | null,"origem"?: string,"parcela"?: number | null,"parcelas"?: number | null,"recorrente"?: boolean,"tipo": string,"user_id": string,"valor": number
                  }
                  Update: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"competencia"?: string,"compra_id"?: string | null,"criado_em"?: string,"data"?: string,"descricao"?: string,"forma_pagamento"?: string | null,"id"?: string,"investimento_id"?: string | null,"origem"?: string,"parcela"?: number | null,"parcelas"?: number | null,"recorrente"?: boolean,"tipo"?: string,"user_id"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_cartao_id_fkey"
      columns: ["cartao_id"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamentos_investimento_id_fkey"
      columns: ["investimento_id"]
isOneToOne: false
      referencedRelation: "investimentos"
      referencedColumns: ["id"]
    }
                  ]
                },"tokens_pessoais": {
                  Row: {
                    "criado_em": string,"hash": string,"id": string,"usado_em": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"hash": string,"id"?: string,"usado_em"?: string | null,"user_id": string
                  }
                  Update: {
                    "criado_em"?: string,"hash"?: string,"id"?: string,"usado_em"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "editar_lancamento":
{ Args: { "p_categoria"?: string,"p_descricao": string,"p_id": string,"p_valor": number }; Returns: undefined
                           },
"excluir_lancamento":
{ Args: { "p_id": string }; Returns: undefined
                           },
"registrar_aporte":
{ Args: { "p_descricao": string,"p_investimento": string,"p_valor": number }; Returns: string
                           },
"regravar_compra":
{ Args: { "p_compra": string,"p_linhas": Json }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
