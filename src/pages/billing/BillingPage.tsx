import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product, Customer, CartItem, Sale, PaymentMethod, PaymentStatus } from '../../types/database';
import { formatCurrency, generateInvoiceNumber } from '../../lib/utils';
import { InvoiceReceiptModal } from '../../components/billing/InvoiceReceiptModal';
import { BarcodeScannerModal } from '../../components/billing/BarcodeScannerModal';
import { CustomerModal } from '../../components/customers/CustomerModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Receipt,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

const GST_RATES = [
  { label: '0% (Exempt)', value: 0 },
  { label: '5% GST', value: 0.05 },
  { label: '12% GST', value: 0.12 },
  { label: '18% GST', value: 0.18 },
  { label: '28% GST', value: 0.28 },
];

export const BillingPage: React.FC = () => {
  const { business } = useAuth();

  // Products and Customers
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  

  // Pricing Modifiers
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0); // 0% default

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');

  // Search and Category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Generated Sale & Receipt Modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedCart, setCompletedCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch products & customers
  const loadData = async () => {
    if (!business?.id) return;
    setIsLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('business_id', business.id)
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('customers')
          .select('*')
          .eq('business_id', business.id)
          .order('name', { ascending: true }),
      ]);

      if (prodRes.data) setProducts(prodRes.data as Product[]);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business?.id]);

  // Distinct Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Helper to identify service / non-inventory items
  const isServiceItem = (p: Product) =>
    p.item_type === 'service' || p.category?.toLowerCase() === 'service';

  // Cart operations
  const addToCart = (product: Product) => {
    setErrorMessage(null);
    const existing = cart.find((item) => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const availableStock = Number(product.stock_quantity) || 0;
    const isService = isServiceItem(product);

    // Only validate available stock for physical inventory items
    if (!isService && currentQty + 1 > availableStock) {
      setErrorMessage(
        `Insufficient stock for "${product.name}". Only ${availableStock} ${product.unit} available.`
      );
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unit_price,
              }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          unit_price: Number(product.selling_price) || 0,
          total: Number(product.selling_price) || 0,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setErrorMessage(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const isService = isServiceItem(item.product);
    const availableStock = Number(item.product.stock_quantity) || 0;

    // Only validate available stock for physical inventory items
    if (!isService && newQty > availableStock) {
      setErrorMessage(
        `Cannot exceed available stock of ${availableStock} ${item.product.unit}.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? {
              ...i,
              quantity: newQty,
              total: newQty * i.unit_price,
            }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue('');
    setTaxRate(0);
    setErrorMessage(null);
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) return 0;
    if (discountType === 'percentage') {
      return (subtotal * Math.min(100, val)) / 100;
    }
    return Math.min(subtotal, val);
  }, [subtotal, discountValue, discountType]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

 
  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Automatically fill phone number when customer changes
  useEffect(() => {
    setCustomerPhone(selectedCustomer?.phone || '');
  }, [selectedCustomer]);

  // Complete Checkout / Generate Invoice
  const handleCheckout = async () => {
    if (!business?.id) return;
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Please add items before checking out.');
      return;
    }

    // Pre-flight stock verification (ONLY for physical inventory items)
    for (const item of cart) {
      if (isServiceItem(item.product)) continue;

      const liveProduct = products.find((p) => p.id === item.product.id);
      const liveStock = Number(liveProduct?.stock_quantity) || 0;
      if (item.quantity > liveStock) {
        setErrorMessage(
          `Stock error: "${item.product.name}" only has ${liveStock} ${item.product.unit} remaining.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const invoiceNumber = generateInvoiceNumber('INV');

      // 1. Insert Sales Record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          business_id: business.id,
          customer_id: selectedCustomer ? selectedCustomer.id : null,
          customer_phone: customerPhone.trim() || null,
          invoice_number: invoiceNumber,
          subtotal: Math.round(subtotal * 100) / 100,
          discount: Math.round(discountAmount * 100) / 100,
          tax_amount: Math.round(taxAmount * 100) / 100,
          total: Math.round(grandTotal * 100) / 100,
          paid_amount:
  paymentStatus === 'paid'
    ? Math.round(grandTotal * 100) / 100
    : 0,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const createdSale = saleData as Sale;

     
      // 2. Insert Sale Items (products and services)

      
const saleItemsToInsert = cart.map((item) => ({
  business_id: business.id,
  sale_id: createdSale.id,
  product_id: item.product.id,
  product_name: item.product.name,
  quantity: item.quantity,
  unit_price: item.unit_price,

  // Store immutable cost price at the time of sale.
  purchase_price_at_sale:
    Number(item.product.purchase_price) || 0,

  total: Math.round(item.total * 100) / 100,
}));


      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsToInsert);

      if (itemsError) {
        throw new Error(
          `Failed to save sale items: ${itemsError.message}`
        );
      }

      // 3. Deduct Stock & Insert Stock Movements ONLY for physical inventory products
      for (const item of cart) {
        // Non-inventory / Service charges: Do NOT deduct stock and do NOT create stock movement!
        if (isServiceItem(item.product)) {
          continue;
        }

        const remaining = Math.max(0, (Number(item.product.stock_quantity) || 0) - item.quantity);

        // Update product stock
        await supabase
          .from('products')
          .update({ stock_quantity: remaining })
          .eq('id', item.product.id)
          .eq('business_id', business.id);

        // Record stock movement
        await supabase.from('stock_movements').insert({
          business_id: business.id,
          product_id: item.product.id,
          quantity: -item.quantity,
          movement_type: 'sale',
        });
      }

      // Celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // fallback
      }

      // Refresh product list in background
      loadData();

      // Set completed sale to reveal receipt
      setCompletedCart([...cart]);
      setCompletedSale(createdSale);

      // Reset cart
      setCart([]);
      setDiscountValue('');
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            Quick Touch Billing
          </h1>
          <p className="text-xs text-slate-500">
            Rapid mobile-first POS for fast store checkout
          </p>
        </div>

        <div className="flex items-center gap-2">
         <Button
  variant="outline"
  size="sm"
  onClick={() => setIsScannerOpen(true)}
  className="gap-1.5 text-xs font-semibold"
>
  <Barcode className="w-4 h-4 text-emerald-600" />
  <span>Scan barcode</span>
</Button>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-slate-500 hover:text-rose-600 text-xs"
            >
              Clear Cart
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Catalog Left / Cart Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Catalog & Search (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search Bar & Categories */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products by name, SKU or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Items
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                      selectedCategory === c
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isService = isServiceItem(p);
              const stock = Number(p.stock_quantity) || 0;
              const isOutOfStock = !isService && stock <= 0;
              const cartItem = cart.find((i) => i.product.id === p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all select-none active:scale-[0.98] ${
                    isOutOfStock
                      ? 'opacity-50 border-slate-200 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                      : cartItem
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500/30'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                          {p.name}
                        </h4>
                        {isService && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            SERVICE
                          </span>
                        )}
                      </div>
                      {cartItem && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>
                    {p.category && (
                      <span className="text-[10px] text-slate-400 block truncate">
                        {p.category}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {formatCurrency(p.selling_price)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isService
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : isOutOfStock
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {isService ? 'Service Charge' : isOutOfStock ? 'Out of Stock' : `${stock} ${p.unit}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Cart & Billing Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 sm:p-5 space-y-4 shadow-md">
            {/* Customer Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  Customer
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  + Add New
                </button>
              </div>
            
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="walk-in">
                  Walk-in Customer (Unregistered)
                </option>

                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {/* Customer WhatsApp Number */}
              <div className="space-y-1.5 mt-3">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Customer WhatsApp Number
                </label>

                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter mobile number (e.g. 9876543210)"
                  className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>


            {/* Cart Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Items ({cart.length})</span>
                <span>Amount</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Tap items on the left to add them to this bill.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const isServ = isServiceItem(item.product);
                    return (
                    <div
                      key={item.product.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.product.name}
                          </p>
                          {isServ && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              SERVICE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatCurrency(item.unit_price)} x {item.quantity} {item.product.unit}
                        </p>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold w-6 text-center text-slate-900 dark:text-slate-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right w-16 shrink-0 font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discount & Tax Options */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Discount
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full h-9 px-2 text-xs rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountType(discountType === 'flat' ? 'percentage' : 'flat')
                    }
                    className="h-9 px-2 rounded-r-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    {discountType === 'flat' ? '₹' : '%'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  GST Rate
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {GST_RATES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method & Status */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Payment Mode
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {(['cash', 'upi', 'card', 'other'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                        paymentMethod === m
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Payment Status
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['paid', 'partial', 'unpaid'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentStatus(st)}
                      className={`py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                        paymentStatus === st
                          ? st === 'paid'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'partial'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Breakdown & Grand Total */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono font-medium">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({taxRate * 100}%):</span>
                  <span className="font-mono font-medium">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total Due:</span>
                <span className="font-mono text-xl text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Desktop Checkout Button */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              isLoading={isSubmitting}
              onClick={handleCheckout}
              className="w-full gap-2 text-base font-bold shadow-md shadow-emerald-600/30"
            >
              <CheckCircle2 className="w-5 h-5" />
              Generate Bill ({formatCurrency(grandTotal)})
            </Button>
          </Card>
        </div>
      </div>

      {/* Sticky Mobile Checkout Bar */}
      {cart.length > 0 && (
        <div className="sm:hidden fixed bottom-14 left-0 right-0 z-30 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              {cart.reduce((a, b) => a + b.quantity, 0)} Items
            </span>
            <span className="text-lg font-bold font-mono text-emerald-600">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            onClick={handleCheckout}
            className="flex-1 font-bold text-sm shadow-md"
          >
            Complete Bill
          </Button>
        </div>
      )}

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onProductScanned={(p) => addToCart(p)}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(newCust) => {
          if (newCust) {
            setCustomers((prev) => [...prev, newCust]);
            setSelectedCustomerId(newCust.id);
          }
        }}
      />

      <InvoiceReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        items={completedCart}
        customer={selectedCustomer}
        business={business}
      />
    </div>
  );
};

