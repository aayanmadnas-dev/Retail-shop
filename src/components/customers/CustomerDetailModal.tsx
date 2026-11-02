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
import { Button } from '../ui/Button';
import { CheckCircle2, IndianRupee } from 'lucide-react';

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
  const [selectedPaymentSale, setSelectedPaymentSale] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
  const outstanding = sales.reduce((sum, sale) => {
  return sum + Math.max(
    0,
    Number(sale.total) - Number(sale.paid_amount || 0)
  );
}, 0);
  const handleRecordPayment = async () => {
  if (!selectedPaymentSale || !business?.id) return;

  const sale = selectedPaymentSale;

  const total = Number(sale.total) || 0;
  const alreadyPaid = Number(sale.paid_amount) || 0;
  const remaining = Math.max(0, total - alreadyPaid);

  const amount = Number(paymentAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    setPaymentError('Enter a valid payment amount.');
    return;
  }

  if (amount > remaining + 0.001) {
    setPaymentError('Payment cannot exceed the outstanding balance.');
    return;
  }

  const newPaidAmount = Math.min(
    total,
    Math.round((alreadyPaid + amount) * 100) / 100
  );

  const newStatus =
    newPaidAmount >= total - 0.001
      ? 'paid'
      : newPaidAmount > 0
        ? 'partial'
        : 'unpaid';

  setIsSavingPayment(true);
  setPaymentError(null);

  try {
    const { error } = await supabase
      .from('sales')
      .update({
        paid_amount: newPaidAmount,
        payment_status: newStatus,
      })
      .eq('id', sale.id)
      .eq('business_id', business.id)
      .eq('customer_id', customer?.id);

    if (error) throw error;

    setSales((previous) =>
      previous.map((item) =>
        item.id === sale.id
          ? {
              ...item,
              paid_amount: newPaidAmount,
              payment_status: newStatus,
            }
          : item
      )
    );

    setSelectedPaymentSale(null);
    setPaymentAmount('');
  } catch (error) {
    console.error('Payment update failed:', error);
    setPaymentError('Could not update payment. Please try again.');
  } finally {
    setIsSavingPayment(false);
  }
};

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

                 <div className="text-right space-y-1">
  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
    {formatCurrency(sale.total)}
  </p>

  <p className="text-[11px] text-emerald-600">
    Paid: {formatCurrency(sale.paid_amount || 0)}
  </p>

  <p className="text-[11px] text-rose-600">
    Due: {formatCurrency(
      Math.max(0, Number(sale.total) - Number(sale.paid_amount || 0))
    )}
  </p>

  {Number(sale.total) - Number(sale.paid_amount || 0) > 0.001 && (
    <Button
      size="sm"
      variant="primary"
      onClick={() => {
        setSelectedPaymentSale(sale);
        setPaymentAmount(
          String(
            Math.max(
              0,
              Number(sale.total) - Number(sale.paid_amount || 0)
            )
          )
        );
        setPaymentError(null);
      }}
    >
      <IndianRupee className="w-3.5 h-3.5" />
      Record Payment
    </Button>
  )}
</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedPaymentSale && (
  <div className="mt-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
      Record Customer Payment
    </h4>

    <p className="text-xs text-slate-500">
      Invoice: {selectedPaymentSale.invoice_number}
    </p>

    <p className="text-xs text-rose-600">
      Remaining:
      {' '}
      {formatCurrency(
        Number(selectedPaymentSale.total) -
        Number(selectedPaymentSale.paid_amount || 0)
      )}
    </p>

    <input
      type="number"
      min="0.01"
      step="0.01"
      value={paymentAmount}
      onChange={(e) => setPaymentAmount(e.target.value)}
      placeholder="Enter amount received"
      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    />

    {paymentError && (
      <p className="text-xs text-rose-600">{paymentError}</p>
    )}

    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedPaymentSale(null);
          setPaymentError(null);
        }}
      >
        Cancel
      </Button>

      <Button
        size="sm"
        isLoading={isSavingPayment}
        onClick={handleRecordPayment}
      >
        <CheckCircle2 className="w-4 h-4" />
        Save Payment
      </Button>
    </div>
  </div>
)}
      </div>
    </Modal>
  );
};

