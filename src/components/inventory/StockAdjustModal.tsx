import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types/database';
import { AlertCircle, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';

interface StockAdjustModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { business } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'restock' | 'damage' | 'set'>('restock');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const currentStock = Number(product.stock_quantity) || 0;
  const numAmount = parseFloat(amount) || 0;

  let calculatedNewStock = currentStock;
  if (adjustmentType === 'restock') {
    calculatedNewStock = currentStock + numAmount;
  } else if (adjustmentType === 'damage') {
    calculatedNewStock = Math.max(0, currentStock - numAmount);
  } else if (adjustmentType === 'set') {
    calculatedNewStock = Math.max(0, numAmount);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    if (numAmount <= 0 && adjustmentType !== 'set') {
      setError('Please enter a quantity greater than zero.');
      return;
    }

    if (adjustmentType === 'damage' && numAmount > currentStock) {
      setError(`Cannot deduct more than current stock (${currentStock} ${product.unit}).`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate delta for stock_movements
      let movementDelta = 0;
      let movementType = 'adjustment';

      if (adjustmentType === 'restock') {
        movementDelta = numAmount;
        movementType = 'restock';
      } else if (adjustmentType === 'damage') {
        movementDelta = -numAmount;
        movementType = 'damage';
      } else {
        movementDelta = calculatedNewStock - currentStock;
        movementType = 'audit';
      }

      // 1. Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: calculatedNewStock })
        .eq('id', product.id)
        .eq('business_id', business.id);

      if (updateError) throw updateError;

      // 2. Insert stock movement log
      const { error: logError } = await supabase.from('stock_movements').insert({
        business_id: business.id,
        product_id: product.id,
        quantity: movementDelta,
        movement_type: movementType,
      });

      if (logError) console.error('Error logging stock movement:', logError);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      description={`Update physical stock quantity for ${product.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current stock status banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Current Stock
            </span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {currentStock} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Projected Stock
            </span>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {calculatedNewStock}{' '}
              <span className="text-xs font-normal text-slate-500">{product.unit}</span>
            </p>
          </div>
        </div>

        {/* Adjustment type selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Adjustment Reason
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType('restock')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                adjustmentType === 'restock'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('damage')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                adjustmentType === 'damage'
                  ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Damage / Lost</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('set')}
              className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                adjustmentType === 'set'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Set Exact</span>
            </button>
          </div>
        </div>

        <Input
          type="number"
          step="any"
          min="0"
          label={
            adjustmentType === 'restock'
              ? `Quantity to Add (${product.unit})`
              : adjustmentType === 'damage'
              ? `Quantity Damaged/Deducted (${product.unit})`
              : `Exact Stock Count (${product.unit})`
          }
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
