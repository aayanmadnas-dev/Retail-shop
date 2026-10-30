import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Customer, Sale } from '../../types/database';
import { formatCurrency, formatDate } from '../../lib/utils';
import { TableSkeleton } from '../ui/SkeletonLoader';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { Receipt, Phone, MapPin, Calendar, Clock, CreditCard } from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice?: (sale: Sale) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSelectInvoice,
}) => {
  const { business } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && business?.id && customer?.id) {
      setIsLoading(true);
      supabase
        .from('sales')
        .select('*')
        .eq('business_id', business.id)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setSales(data as Sale[]);
          }
          setIsLoading(false);
        });
    }
  }, [isOpen, business?.id, customer?.id]);

  if (!customer) return null;

  const totalSpent = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  const outstanding = sales
    .filter((s) => s.payment_status === 'unpaid' || s.payment_status === 'partial')
    .reduce((acc, s) => acc + (Number(s.total) || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer.name}
      description={`Customer Account & Order History`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Customer Header Info */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Total Purchases
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalSpent)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{sales.length} Bills Issued</p>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Outstanding Due
            </span>
            <p className={`text-xl font-bold ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(outstanding)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {outstanding > 0 ? 'Pending Collection' : 'All Cleared'}
            </p>
          </div>

          {(customer.phone || customer.address) && (
            <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-4 text-xs text-slate-500">
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoices list */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
            Invoices & Purchase History
          </h4>

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : sales.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No Invoices Found"
              description="This customer does not have any recorded purchases yet."
            />
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        {sale.invoice_number}
                      </span>
                      <Badge
                        variant={
                          sale.payment_status === 'paid'
                            ? 'emerald'
                            : sale.payment_status === 'partial'
                            ? 'amber'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {sale.payment_status}
                      </Badge>
                      <Badge variant="slate" size="sm">
                        {sale.payment_method.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(sale.created_at, true)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
