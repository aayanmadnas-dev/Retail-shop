import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types/database';
import { ProductModal } from '../../components/inventory/ProductModal';
import { StockAdjustModal } from '../../components/inventory/StockAdjustModal';
import { StockMovementHistoryModal } from '../../components/inventory/StockMovementHistoryModal';
import { BarcodeScannerModal } from '../../components/billing/BarcodeScannerModal';
import { CSVImportModal } from '../../components/inventory/CSVImportModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, exportToCsv } from '../../lib/utils';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Filter,
  RotateCw,
  Edit2,
  Trash2,
  ArrowUpDown,
  History,
  AlertTriangle,
  Download,
  Upload,
  Boxes,
  TrendingUp,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    if (!business?.id) return;
    setIsLoading(true);
    try {
      // Only fetch ACTIVE products (is_active = true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts((data as Product[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [business?.id]);

  // Confirmation dialog state
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Soft delete: set is_active = false (preserves all sale history)
  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct || !business?.id) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', deletingProduct.id)
        .eq('business_id', business.id);

      if (error) {
        setDeleteError('Failed to remove product. Please try again.');
        return;
      }

      // Remove from UI only after DB success
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch {
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const isService = p.item_type === 'service' || p.category?.toLowerCase() === 'service';
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;

      const matchesLowStock = !lowStockOnly || (!isService && (Number(p.stock_quantity) || 0) <= 5);

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, searchQuery, selectedCategory, lowStockOnly]);

  // Inventory valuation calculations (calculated on physical inventory items only)
  const inventoryItems = useMemo(() => {
    return products.filter((p) => p.item_type !== 'service' && p.category?.toLowerCase() !== 'service');
  }, [products]);

  const totalStockUnits = useMemo(() => {
    return inventoryItems.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);
  }, [inventoryItems]);

  const totalPurchaseValuation = useMemo(() => {
    return inventoryItems.reduce(
      (acc, p) => acc + (Number(p.stock_quantity) || 0) * (Number(p.purchase_price) || 0),
      0
    );
  }, [inventoryItems]);

  const totalRetailValuation = useMemo(() => {
    return inventoryItems.reduce(
      (acc, p) => acc + (Number(p.stock_quantity) || 0) * (Number(p.selling_price) || 0),
      0
    );
  }, [inventoryItems]);

  const handleExportCSV = () => {
    const rows = filteredProducts.map((p) => ({
      name: p.name,
      category: p.category || 'General',
      sku: p.sku || 'N/A',
      barcode: p.barcode || 'N/A',
      selling_price: p.selling_price,
      purchase_price: p.purchase_price,
      stock_quantity: p.stock_quantity,
      unit: p.unit,
      inventory_value: (p.stock_quantity || 0) * (p.purchase_price || 0),
    }));

    exportToCsv(`Inventory_${business?.name || 'Store'}`, rows, [
      { key: 'name', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'selling_price', label: 'Selling Price (INR)' },
      { key: 'purchase_price', label: 'Cost Price (INR)' },
      { key: 'stock_quantity', label: 'Stock' },
      { key: 'unit', label: 'Unit' },
      { key: 'inventory_value', label: 'Total Value (INR)' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Inventory & Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your store catalog, retail pricing, barcode scanning, and stock levels.
          </p>
        </div>

       <div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="md"
    onClick={handleExportCSV}
    disabled={filteredProducts.length === 0}
    className="gap-2"
  >
    <Download className="w-4 h-4" />
    <span className="hidden sm:inline">Export CSV</span>
  </Button>

  <Button
    variant="outline"
    size="md"
    onClick={() => setIsImportModalOpen(true)}
    className="gap-2"
  >
    <Upload className="w-4 h-4" />
    <span>Import CSV</span>
  </Button>

  <Button
    variant="primary"
    size="md"
    onClick={() => {
      setEditingProduct(null);
      setIsProductModalOpen(true);
    }}
    className="gap-2"
  >
    <Plus className="w-4 h-4" />
    Add Product
  </Button>
</div>
      </div>

      {/* Inventory Valuation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Products
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {products.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Units in Stock
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {totalStockUnits}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Cost Valuation (Cost)
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalPurchaseValuation)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-emerald-600 font-semibold">
            Retail Potential (MRP)
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalRetailValuation)}
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product name, category, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
                   </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScannerOpen(true)}
            className="h-10 gap-1.5 w-full sm:w-auto"
          >
            <Barcode className="w-4 h-4 text-emerald-600" />
            Scan Barcode
          </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`text-xs px-3 py-2 rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${lowStockOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock (&le; 5)
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              className="p-2.5 h-10"
              title="Refresh product list"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${selectedCategory === c
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Product List */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredProducts.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No Products Found"
            description={
              searchQuery || lowStockOnly || selectedCategory !== 'all'
                ? 'No items match your active filters.'
                : 'Your catalog is empty. Add your first product to begin billing.'
            }
            actionLabel={
              searchQuery || lowStockOnly || selectedCategory !== 'all'
                ? 'Clear Filters'
                : 'Add First Product'
            }
            onAction={
              searchQuery || lowStockOnly || selectedCategory !== 'all'
                ? () => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setLowStockOnly(false);
                }
                : () => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const isService = p.item_type === 'service' || p.category?.toLowerCase() === 'service';
            const isLowStock = !isService && (Number(p.stock_quantity) || 0) <= 5;
            return (
              <Card
                key={p.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Left: Product Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {p.name}
                    </h3>
                    {isService ? (
                      <Badge variant="blue" size="sm">
                        SERVICE
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm">
                        {p.category || 'Product'}
                      </Badge>
                    )}
                    {isLowStock && (
                      <Badge variant="rose" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Low Stock
                      </Badge>
                    )}
                  </div>

                  {/* Pricing and identifiers */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div>
                      Rate / Price:{' '}
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {formatCurrency(p.selling_price)}
                      </span>
                      <span className="text-[11px] text-slate-400"> / {p.unit}</span>
                    </div>

                    {!isService && Number(p.purchase_price) > 0 && (
                      <div>
                        Cost:{' '}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {formatCurrency(p.purchase_price)}
                        </span>
                      </div>
                    )}

                    {!isService && p.sku && <div>SKU: <span className="font-mono">{p.sku}</span></div>}
                    {!isService && p.barcode && <div>Barcode: <span className="font-mono">{p.barcode}</span></div>}
                  </div>
                </div>

                {/* Middle: Current stock pill */}
                <div className="flex items-center gap-3">
                  <div className="text-left sm:text-right">
                    {isService ? (
                      <div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold block">
                          Non-Inventory
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          No stock tracking
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                          In Stock
                        </span>
                        <span
                          className={`text-lg font-bold font-mono ${
                            isLowStock ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {p.stock_quantity} <span className="text-xs font-normal">{p.unit}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  {!isService && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdjustingProduct(p)}
                        className="gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="Adjust or restock quantity"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        Adjust Stock
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistoryProduct(p)}
                        className="p-2 text-slate-500 hover:text-slate-700"
                        title="Audit trail of stock movements"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProduct(p);
                      setIsProductModalOpen(true);
                    }}
                    className="p-2 text-slate-500 hover:text-slate-700"
                    title="Edit item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingProduct(p);
                    }}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remove product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={fetchProducts}
        product={editingProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        onSuccess={fetchProducts}
        product={adjustingProduct}
      />

      {/* Stock Movement Audit History */}
      <StockMovementHistoryModal
        isOpen={Boolean(historyProduct)}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      {/* Inventory Barcode Scanner */}
<BarcodeScannerModal
  isOpen={isScannerOpen}
  onClose={() => setIsScannerOpen(false)}
  products={products}
  onProductScanned={(product) => {
    setSearchQuery(product.barcode || product.sku || product.name);
    setSelectedCategory('all');
    setLowStockOnly(false);
  }}
/>

        {/* CSV Product Import Modal */}
<CSVImportModal
  isOpen={isImportModalOpen}
  onClose={() => setIsImportModalOpen(false)}
  onSuccess={fetchProducts}
/>

      {/* Soft Delete Confirmation Dialog */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Remove Product?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    "{deletingProduct.name}"
                  </span>{' '}
                  will be removed from your active catalog and billing. All past sales,
                  invoices, and stock movement history for this product are permanently preserved.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-lg">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeletingProduct(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isDeleting}
                onClick={handleConfirmDeleteProduct}
                className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

