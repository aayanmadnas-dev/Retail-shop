import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Product, StockMovement } from '../../types/database';
import { formatDate } from '../../lib/utils';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';
import { History, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface StockMovementHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockMovementHistoryModal: React.FC<StockMovementHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { business } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && business?.id && product?.id) {
      setIsLoading(true);
      supabase
        .from('stock_movements')
        .select('*')
        .eq('business_id', business.id)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (!error && data) {
            setMovements(data as StockMovement[]);
          }
          setIsLoading(false);
        });
    }
  }, [isOpen, business?.id, product?.id]);

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Movement Audit Trail"
      description={`History of restocks, sales deductions, and adjustments for ${product.name}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={<History className="w-8 h-8" />}
            title="No Movement Logs"
            description="No stock in/out events recorded yet for this product."
          />
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {movements.map((m) => {
              const isPositive = Number(m.quantity) > 0;
              const type = (m.movement_type || '').toLowerCase();

              return (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {type === 'sale'
                            ? 'POS Sale Deduction'
                            : type === 'restock'
                            ? 'Inventory Restock'
                            : type === 'damage'
                            ? 'Damaged / Wastage'
                            : 'Stock Audit'}
                        </span>
                        <Badge
                          variant={
                            type === 'sale'
                              ? 'amber'
                              : type === 'restock'
                              ? 'emerald'
                              : 'slate'
                          }
                          size="sm"
                        >
                          {m.movement_type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(m.created_at, true)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-bold font-mono ${
                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isPositive ? `+${m.quantity}` : `${m.quantity}`} {product.unit}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

