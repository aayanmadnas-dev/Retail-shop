import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types/database';
import { AlertCircle, Barcode, Tag, DollarSign, Package } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

const COMMON_UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'meter', 'dozen'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const { business } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || '');
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setPurchasePrice(product.purchase_price?.toString() || '');
      setSellingPrice(product.selling_price?.toString() || '');
      setStockQuantity(product.stock_quantity?.toString() || '');
      setUnit(product.unit || 'pcs');
      setError(null);
    } else {
      setName('');
      setCategory('');
      setSku('');
      setBarcode('');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQuantity('0');
      setUnit('pcs');
      setError(null);
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) {
      setError('Business context missing. Please re-login.');
      return;
    }

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const qty = parseFloat(stockQuantity) || 0;

    if (sPrice < 0 || pPrice < 0) {
      setError('Prices cannot be negative numbers.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (product) {
        // Edit existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            category: category.trim() || null,
            sku: sku.trim() || null,
            barcode: barcode.trim() || null,
            purchase_price: pPrice,
            selling_price: sPrice,
            stock_quantity: qty,
            unit: unit.trim() || 'pcs',
          })
          .eq('id', product.id)
          .eq('business_id', business.id);

        if (updateError) throw updateError;
      } else {
        // Insert new product
        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert({
            business_id: business.id,
            name: name.trim(),
            category: category.trim() || null,
            sku: sku.trim() || null,
            barcode: barcode.trim() || null,
            purchase_price: pPrice,
            selling_price: sPrice,
            stock_quantity: qty,
            unit: unit.trim() || 'pcs',
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Log initial stock movement if quantity > 0
        if (qty > 0 && newProd) {
          await supabase.from('stock_movements').insert({
            business_id: business.id,
            product_id: newProd.id,
            quantity: qty,
            movement_type: 'restock',
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      description={
        product
          ? 'Update product pricing, stock count, and details'
          : 'SKU and Barcode are completely optional. Retail products work without them.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Product Name"
            placeholder="e.g. Basmati Rice 1kg or Parle-G Biscuit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="sm:col-span-2"
          />

          <Input
            label="Category"
            placeholder="e.g. Grocery, Snacks, Dairy, Beverages"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Unit of Measure <span className="text-rose-500">*</span>
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Selling Price (₹)"
            placeholder="0.00"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            required
          />

          <Input
            type="number"
            step="0.01"
            min="0"
            label="Purchase / Cost (₹)"
            placeholder="0.00"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />

          <Input
            type="number"
            step="any"
            min="0"
            label="Current Stock"
            placeholder="0"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            required
          />
        </div>

        {/* Optional Identifiers Accordion / Fields */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Optional Codes (Leave blank if not used):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="SKU Code (Optional)"
              placeholder="e.g. BR-1001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              leftIcon={<Tag className="w-3.5 h-3.5" />}
            />
            <Input
              label="Barcode / EAN (Optional)"
              placeholder="e.g. 8901234567890"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              leftIcon={<Barcode className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {product ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

