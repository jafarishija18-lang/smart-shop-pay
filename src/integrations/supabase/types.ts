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
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          category: string
          created_at: string
          denomination: string | null
          id: string
          student_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          denomination?: string | null
          id?: string
          student_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          denomination?: string | null
          id?: string
          student_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string
          created_at: string
          id: string
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          barcode: string
          created_at?: string
          id?: string
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          id: string
          public_key: string
          student_id: string
          transports: string | null
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          id?: string
          public_key: string
          student_id: string
          transports?: string | null
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          id?: string
          public_key?: string
          student_id?: string
          transports?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          balance: number
          combination: string | null
          created_at: string
          email: string
          form_level: string | null
          id: string
          initial_balance: number
          is_jaffary: boolean
          low_balance_notified: boolean
          name: string
          student_code: string
          updated_at: string
          week_start: string
          weekly_spent: number
          zero_balance_notified: boolean
        }
        Insert: {
          balance?: number
          combination?: string | null
          created_at?: string
          email: string
          form_level?: string | null
          id?: string
          initial_balance?: number
          is_jaffary?: boolean
          low_balance_notified?: boolean
          name: string
          student_code: string
          updated_at?: string
          week_start?: string
          weekly_spent?: number
          zero_balance_notified?: boolean
        }
        Update: {
          balance?: number
          combination?: string | null
          created_at?: string
          email?: string
          form_level?: string | null
          id?: string
          initial_balance?: number
          is_jaffary?: boolean
          low_balance_notified?: boolean
          name?: string
          student_code?: string
          updated_at?: string
          week_start?: string
          weekly_spent?: number
          zero_balance_notified?: boolean
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          id: string
          student_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          total_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          student_id: string
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          student_id: string
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          student_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_funds: {
        Args: { _amount: number; _student_id: string }
        Returns: number
      }
      clear_all_student_balances: { Args: never; Returns: number }
      clear_contributions: {
        Args: { _category: string; _denomination?: string }
        Returns: number
      }
      clear_transactions: { Args: never; Returns: number }
      deduct_funds: {
        Args: { _amount: number; _reason?: string; _student_id: string }
        Returns: number
      }
      delete_student: { Args: { _student_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_checkout: {
        Args: { _credential_id: string; _items: Json; _student_code: string }
        Returns: Json
      }
      process_contribution:
        | {
            Args: {
              _amount: number
              _category: string
              _credential_id: string
              _student_code: string
            }
            Returns: Json
          }
        | {
            Args: {
              _amount: number
              _category: string
              _credential_id: string
              _denomination?: string
              _student_code: string
            }
            Returns: Json
          }
      register_student: {
        Args: {
          _combination?: string
          _email: string
          _form_level?: string
          _initial_balance: number
          _is_jaffary?: boolean
          _name: string
          _student_code: string
        }
        Returns: string
      }
      run_weekly_jaffary_transfer: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "cashier"
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
      app_role: ["admin", "cashier"],
    },
  },
} as const
