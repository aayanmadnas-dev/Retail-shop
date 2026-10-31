// RetailFlow Database Types matching exact Supabase schema

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  role: 'super_admin' | 'business_owner';
  business_id: string | null;
  created_at: string;
}

export type ItemType = 'inventory' | 'service';

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  unit: string; // 'pcs', 'kg', 'litre', 'box', 'meter', 'service', 'hr', etc.
  item_type?: ItemType; // 'inventory' (default) | 'service'
  is_active: boolean; // Soft delete — false means archived/removed from catalog
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean; // Soft delete — false means archived/removed from directory
  created_at: string;
  // Computed client-side / joined
  total_purchases?: number;
  outstanding_balance?: number;
  total_orders?: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Sale {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_phone?: string | null;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  // Joined relation
  customers?: Customer | null;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  business_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  products?: Product;
}

export type MovementType = 'sale' | 'restock' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  business_id: string;
  product_id: string;
  quantity: number; // positive or negative
  movement_type: MovementType | string;
  created_at: string;
  // Joined
  products?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total: number;
}
