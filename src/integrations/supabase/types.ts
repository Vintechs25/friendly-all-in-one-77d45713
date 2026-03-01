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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          business_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_payment_configs: {
        Row: {
          business_id: string
          consumer_key: string | null
          consumer_secret: string | null
          created_at: string
          environment: string
          id: string
          is_active: boolean
          passkey: string | null
          payment_type: string
          shortcode: string | null
          till_number: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          passkey?: string | null
          payment_type: string
          shortcode?: string | null
          till_number?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          consumer_key?: string | null
          consumer_secret?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          passkey?: string | null
          payment_type?: string
          shortcode?: string | null
          till_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_payment_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          allow_branding_edit: boolean | null
          allow_name_edit: boolean | null
          business_id: string
          created_at: string
          currency_code: string | null
          currency_symbol: string | null
          default_tax_label: string | null
          default_tax_rate: number | null
          id: string
          invoice_prefix: string | null
          logo_url: string | null
          platform_watermark: boolean | null
          primary_color: string | null
          receipt_footer_text: string | null
          receipt_header_text: string | null
          secondary_color: string | null
          theme_mode: string | null
          updated_at: string
        }
        Insert: {
          allow_branding_edit?: boolean | null
          allow_name_edit?: boolean | null
          business_id: string
          created_at?: string
          currency_code?: string | null
          currency_symbol?: string | null
          default_tax_label?: string | null
          default_tax_rate?: number | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          platform_watermark?: boolean | null
          primary_color?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          secondary_color?: string | null
          theme_mode?: string | null
          updated_at?: string
        }
        Update: {
          allow_branding_edit?: boolean | null
          allow_name_edit?: boolean | null
          business_id?: string
          created_at?: string
          currency_code?: string | null
          currency_symbol?: string | null
          default_tax_label?: string | null
          default_tax_rate?: number | null
          id?: string
          invoice_prefix?: string | null
          logo_url?: string | null
          platform_watermark?: boolean | null
          primary_color?: string | null
          receipt_footer_text?: string | null
          receipt_header_text?: string | null
          secondary_color?: string | null
          theme_mode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          currency_code: string
          currency_symbol: string
          email: string | null
          id: string
          industry: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          subscription_plan: string
          tax_label: string
          tax_rate: number
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          email?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          subscription_plan?: string
          tax_label?: string
          tax_rate?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          email?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          subscription_plan?: string
          tax_label?: string
          tax_rate?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cashier_shifts: {
        Row: {
          branch_id: string | null
          business_id: string
          cash_variance: number | null
          cashier_id: string
          closing_cash: number | null
          ended_at: string | null
          expected_cash: number | null
          id: string
          notes: string | null
          opening_cash: number
          started_at: string
          status: string
          total_sales: number
          total_transactions: number
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          cash_variance?: number | null
          cashier_id: string
          closing_cash?: number | null
          ended_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opening_cash?: number
          started_at?: string
          status?: string
          total_sales?: number
          total_transactions?: number
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cash_variance?: number | null
          cashier_id?: string
          closing_cash?: number | null
          ended_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opening_cash?: number
          started_at?: string
          status?: string
          total_sales?: number
          total_transactions?: number
        }
        Relationships: [
          {
            foreignKeyName: "cashier_shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashier_shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          business_id: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      device_registrations: {
        Row: {
          device_fingerprint: string
          device_name: string | null
          id: string
          last_seen_at: string | null
          license_id: string
          registered_at: string
        }
        Insert: {
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          license_id: string
          registered_at?: string
        }
        Update: {
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_seen_at?: string | null
          license_id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_registrations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_toggles: {
        Row: {
          business_id: string
          created_at: string
          feature_name: string
          id: string
          is_enabled: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          feature_name: string
          id?: string
          is_enabled?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feature_toggles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          balance: number
          business_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          balance?: number
          business_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          balance?: number
          business_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      held_sale_items: {
        Row: {
          created_at: string
          held_sale_id: string
          id: string
          item_discount: number
          item_discount_type: string | null
          price_override: number | null
          product_id: string | null
          product_name: string
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          held_sale_id: string
          id?: string
          item_discount?: number
          item_discount_type?: string | null
          price_override?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          held_sale_id?: string
          id?: string
          item_discount?: number
          item_discount_type?: string | null
          price_override?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "held_sale_items_held_sale_id_fkey"
            columns: ["held_sale_id"]
            isOneToOne: false
            referencedRelation: "held_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "held_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      held_sales: {
        Row: {
          branch_id: string | null
          business_id: string
          cart_discount: number
          cart_discount_type: string | null
          cashier_id: string
          created_at: string
          discount_amount: number
          id: string
          label: string | null
          subtotal: number
          tax_amount: number
          total: number
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          cart_discount?: number
          cart_discount_type?: string | null
          cashier_id: string
          created_at?: string
          discount_amount?: number
          id?: string
          label?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cart_discount?: number
          cart_discount_type?: string | null
          cashier_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
          label?: string | null
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "held_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "held_sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          reorder_level: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reorder_level?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reorder_level?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      license_validations: {
        Row: {
          business_id: string
          created_at: string
          device_fingerprint: string | null
          device_name: string | null
          failure_reason: string | null
          id: string
          validation_status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          failure_reason?: string | null
          id?: string
          validation_status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          failure_reason?: string | null
          id?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_validations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          license_key: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          license_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          license_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mpesa_transactions: {
        Row: {
          amount: number
          business_id: string
          checkout_request_id: string | null
          created_at: string
          customer_name: string | null
          id: string
          matched_at: string | null
          matched_by: string | null
          matched_sale_id: string | null
          mpesa_receipt_number: string | null
          phone: string | null
          raw_callback: Json | null
          status: string
          transaction_id: string
          transaction_type: string
        }
        Insert: {
          amount?: number
          business_id: string
          checkout_request_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_sale_id?: string | null
          mpesa_receipt_number?: string | null
          phone?: string | null
          raw_callback?: Json | null
          status?: string
          transaction_id: string
          transaction_type?: string
        }
        Update: {
          amount?: number
          business_id?: string
          checkout_request_id?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_sale_id?: string | null
          mpesa_receipt_number?: string | null
          phone?: string | null
          raw_callback?: Json | null
          status?: string
          transaction_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpesa_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mpesa_transactions_matched_sale_id_fkey"
            columns: ["matched_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string
          category: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id: string | null
          payment_status: string | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id?: string | null
          payment_status?: string | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          mpesa_checkout_request_id?: string | null
          payment_status?: string | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          batch_number: string | null
          business_id: string
          category_id: string | null
          cost: number
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          low_stock_threshold: number | null
          min_stock_level: number | null
          minimum_price: number | null
          name: string
          price: number
          serial_number: string | null
          sku: string | null
          stock_quantity: number
          tax_rate: number
          track_inventory: boolean
          track_stock: boolean
          unit: string | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          batch_number?: string | null
          business_id: string
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          min_stock_level?: number | null
          minimum_price?: number | null
          name: string
          price?: number
          serial_number?: string | null
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          track_stock?: boolean
          unit?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          batch_number?: string | null
          business_id?: string
          category_id?: string | null
          cost?: number
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          low_stock_threshold?: number | null
          min_stock_level?: number | null
          minimum_price?: number | null
          name?: string
          price?: number
          serial_number?: string | null
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          track_stock?: boolean
          unit?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          business_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          pin_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          business_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          pin_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          business_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          pin_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          purchase_order_id: string
          quantity: number
          received_quantity: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id: string
          quantity?: number
          received_quantity?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          order_number: string
          status: string
          supplier_id: string
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: string
          supplier_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: string
          supplier_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          refund_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          refund_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          refund_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "refund_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_items_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          id: string
          reason: string | null
          refund_number: string
          refunded_by: string | null
          restock_items: boolean
          sale_id: string
          status: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          id?: string
          reason?: string | null
          refund_number: string
          refunded_by?: string | null
          restock_items?: boolean
          sale_id: string
          status?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          refund_number?: string
          refunded_by?: string | null
          restock_items?: boolean
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_drops: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          dropped_by: string | null
          id: string
          notes: string | null
          shift_id: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          dropped_by?: string | null
          id?: string
          notes?: string | null
          shift_id: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          dropped_by?: string | null
          id?: string
          notes?: string | null
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safe_drops_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safe_drops_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cashier_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          item_discount: number
          item_discount_type: string | null
          override_by: string | null
          price_override: number | null
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          tax_amount: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          item_discount?: number
          item_discount_type?: string | null
          override_by?: string | null
          price_override?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          tax_amount?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          item_discount?: number
          item_discount_type?: string | null
          override_by?: string | null
          price_override?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          tax_amount?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          business_id: string
          cashier_id: string
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount_amount: number
          held_name: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_number: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          tax_amount: number
          total: number
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          cashier_id: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          held_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cashier_id?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          held_name?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch_id: string | null
          business_id: string
          cashier_id: string
          closed_at: string | null
          closing_amount: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          status: Database["public"]["Enums"]["shift_status"]
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          cashier_id: string
          closed_at?: string | null
          closing_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: Database["public"]["Enums"]["shift_status"]
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          cashier_id?: string
          closed_at?: string | null
          closing_amount?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          status?: Database["public"]["Enums"]["shift_status"]
        }
        Relationships: [
          {
            foreignKeyName: "shifts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string | null
          branch_id: string
          business_id: string
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string
        }
        Insert: {
          adjusted_by?: string | null
          branch_id: string
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          reason: string
        }
        Update: {
          adjusted_by?: string | null
          branch_id?: string
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          business_id: string
          created_at: string
          from_branch_id: string
          id: string
          initiated_by: string | null
          notes: string | null
          product_id: string
          quantity: number
          status: string
          to_branch_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          from_branch_id: string
          id?: string
          initiated_by?: string | null
          notes?: string | null
          product_id: string
          quantity?: number
          status?: string
          to_branch_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          from_branch_id?: string
          id?: string
          initiated_by?: string | null
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          to_branch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_branches: number
          max_products: number
          max_users: number
          name: string
          plan_type: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_branches?: number
          max_products?: number
          max_users?: number
          name: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_branches?: number
          max_products?: number
          max_users?: number
          name?: string
          plan_type?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      terminal_hardware_configs: {
        Row: {
          branch_id: string | null
          business_id: string
          created_at: string
          drawer_enabled: boolean
          drawer_status: string
          id: string
          printer_connection_type: string
          printer_enabled: boolean
          printer_status: string
          scale_enabled: boolean
          scale_status: string
          scanner_enabled: boolean
          scanner_status: string
          terminal_name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          business_id: string
          created_at?: string
          drawer_enabled?: boolean
          drawer_status?: string
          id?: string
          printer_connection_type?: string
          printer_enabled?: boolean
          printer_status?: string
          scale_enabled?: boolean
          scale_status?: string
          scanner_enabled?: boolean
          scanner_status?: string
          terminal_name?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          business_id?: string
          created_at?: string
          drawer_enabled?: boolean
          drawer_status?: string
          id?: string
          printer_connection_type?: string
          printer_enabled?: boolean
          printer_status?: string
          scale_enabled?: boolean
          scale_status?: string
          scanner_enabled?: boolean
          scanner_status?: string
          terminal_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminal_hardware_configs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terminal_hardware_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          business_id: string
          created_at: string
          granted_by: string | null
          id: string
          override_type: string
          permission_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          override_type?: string
          permission_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          override_type?: string
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string
          hierarchy_level: number | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id: string
          hierarchy_level?: number | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string
          hierarchy_level?: number | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_effective_permissions: {
        Args: { _branch_id?: string; _user_id: string }
        Returns: {
          action: string
          module: string
          permission_id: string
        }[]
      }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "business_owner"
        | "branch_manager"
        | "cashier"
        | "auditor"
        | "super_admin"
        | "manager"
        | "waiter"
        | "inventory_officer"
      payment_method:
        | "cash"
        | "card"
        | "mpesa"
        | "bank_transfer"
        | "store_credit"
        | "gift_card"
      sale_status: "active" | "completed" | "held" | "voided" | "refunded"
      shift_status: "open" | "closed"
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
      app_role: [
        "platform_admin",
        "business_owner",
        "branch_manager",
        "cashier",
        "auditor",
        "super_admin",
        "manager",
        "waiter",
        "inventory_officer",
      ],
      payment_method: [
        "cash",
        "card",
        "mpesa",
        "bank_transfer",
        "store_credit",
        "gift_card",
      ],
      sale_status: ["active", "completed", "held", "voided", "refunded"],
      shift_status: ["open", "closed"],
    },
  },
} as const
