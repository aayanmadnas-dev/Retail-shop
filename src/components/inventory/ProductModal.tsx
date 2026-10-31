import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product, ItemType } from '../../types/database';
import { AlertCircle, Barcode, Tag, Package, Wrench, Layers } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
}

const COMMON_UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'pack', 'meter', 'dozen'];
const SERVICE_UNITS = ['service', 'charge', 'hr', 'job', 'visit', 'pcs'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
}) => {
  const { business } = useAuth();

  const [itemType, setItemType] = useState<ItemType>('inventory');
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
      const isServ = product.item_type === 'service' || product.category?.toLowerCase() === 'service';
      setItemType(isServ ? 'service' : 'inventory');
      setName(product.name || '');
      setCategory(product.category || (isServ ? 'Service' : ''));
      setSku(product.sku || '');
      setBarcode(product.barcode || '');
      setPurchasePrice(product.purchase_price?.toString() || '');
      setSellingPrice(product.selling_price?.toString() || '');
      setStockQuantity(product.stock_quantity?.toString() || '0');
      setUnit(product.unit || (isServ ? 'service' : 'pcs'));
      setError(null);
    } else {
      setItemType('inventory');
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

  const handleItemTypeChange = (type: ItemType) => {
    setItemType(type);
    if (type === 'service') {
      if (!category) setCategory('Service');
      if (unit === 'pcs') setUnit('service');
      setStockQuantity('0');
    } else {
      if (category === 'Service') setCategory('');
      if (unit === 'service') setUnit('pcs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) {
      setError('Business context missing. Please re-login.');
      return;
    }

    if (!name.trim()) {
      setError('Item / Product name is required.');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const qty = itemType === 'service' ? 0 : parseFloat(stockQuantity) || 0;

    if (sPrice < 0 || pPrice < 0) {
      setError('Prices cannot be negative numbers.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload: any = {
      name: name.trim(),
      category: category.trim() || (itemType === 'service' ? 'Service' : null),
      sku: itemType === 'service' ? null : (sku.trim() || null),
      barcode: itemType === 'service' ? null : (barcode.trim() || null),
      purchase_price: pPrice,
      selling_price: sPrice,
      stock_quantity: qty,
      unit: unit.trim() || (itemType === 'service' ? 'service' : 'pcs'),
      item_type: itemType,
    };

    try {
      if (product) {
        // Edit existing product
        let { error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id)
          .eq('business_id', business.id);

        // Fallback if item_type column not yet applied on remote database
        if (updateError && (updateError.message.includes('item_type') || updateError.code === '42703')) {
          delete payload.item_type;
          const retry = await supabase
            .from('products')
            .update(payload)
            .eq('id', product.id)
            .eq('business_id', business.id);
          if (retry.error) throw retry.error;
        } else if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new product
        let { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert({
            ...payload,
            business_id: business.id,
          })
          .select()
          .single();

        // Fallback if item_type column not yet applied on remote database
        if (insertError && (insertError.message.includes('item_type') || insertError.code === '42703')) {
          delete payload.item_type;
          const retry = await supabase
            .from('products')
            .insert({
              ...payload,
              business_id: business.id,
            })
            .select()
            .single();
          if (retry.error) throw retry.error;
          newProd = retry.data;
        } else if (insertError) {
          throw insertError;
        }

        // Log initial stock movement ONLY for physical inventory products if qty > 0
        if (itemType === 'inventory' && qty > 0 && newProd) {
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
      setError(err.message || 'Failed to save item.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Item / Service' : 'Add Item / Service'}
      description={
        product
          ? 'Update pricing, classification, and billing details'
          : 'Create physical inventory items or non-inventory service charges'
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

        {/* Item Classification Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Item Classification <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleItemTypeChange('inventory')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                itemType === 'inventory'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${itemType === 'inventory' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Inventory Product</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Physical goods with stock deduction</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleItemTypeChange('service')}
              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                itemType === 'service'
                  ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${itemType === 'service' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Service / Non-Inventory</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Labor, delivery, repair (no stock impact)</p>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={itemType === 'service' ? 'Service / Charge Name' : 'Product Name'}
            placeholder={
              itemType === 'service'
                ? 'e.g. Delivery Charge, Labour Charge, Repair Service'
                : 'e.g. Basmati Rice 1kg or Parle-G Biscuit'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="sm:col-span-2"
          />

          <Input
            label="Category"
            placeholder={itemType === 'service' ? 'Service, Charges, Repair, Delivery' : 'e.g. Grocery, Snacks, Dairy'}
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
              {(itemType === 'service' ? SERVICE_UNITS : COMMON_UNITS).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${itemType === 'service' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Billing Price / Rate (₹)"
            placeholder="0.00"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            required
          />

          <Input
            type="number"
            step="0.01"
            min="0"
            label={itemType === 'service' ? 'Internal Cost / Expense (₹) (Optional)' : 'Purchase / Cost (₹)'}
            placeholder="0.00"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />

          {itemType === 'inventory' && (
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
          )}
        </div>

        {/* Optional Identifiers (For physical inventory items) */}
        {itemType === 'inventory' && (
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
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {product ? 'Save Changes' : itemType === 'service' ? 'Add Service Item' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
