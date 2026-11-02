import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Customer, Sale } from '../../types/database';
import { CustomerModal } from '../../components/customers/CustomerModal';
import { CustomerDetailModal } from '../../components/customers/CustomerDetailModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate, exportToCsv } from '../../lib/utils';
import {
  Users,
  Plus,
  Search,
  RotateCw,
  Edit2,
  Trash2,
  Eye,
  Download,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Confirmation dialog state
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!business?.id) return;
    setIsLoading(true);
    try {
      // 1. Fetch only ACTIVE customers
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (custError) throw custError;

      // 2. Fetch sales to calculate purchase totals and balances
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('customer_id, total, payment_status')
        .eq('business_id', business.id);

      if (salesError) console.error('Error loading sales ledger:', salesError);

      const custs = (customerData as Customer[]) || [];
      const sls = (salesData as Sale[]) || [];

      // Calculate totals per customer
      const enriched = custs.map((c) => {
        const cSales = sls.filter((s) => s.customer_id === c.id);
        const totalPurchases = cSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
       const outstanding = cSales.reduce((acc, sale) => {
  const total = Number(sale.total) || 0;
  const paid = Number(sale.paid_amount) || 0;

  return acc + Math.max(0, total - paid);
}, 0);
        return {
          ...c,
          total_purchases: totalPurchases,
          outstanding_balance: outstanding,
          total_orders: cSales.length,
        };
      });

      setCustomers(enriched);
      setSales(sls);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [business?.id]);

  // Soft delete: set is_active = false (preserves all history)
  const handleConfirmDelete = async () => {
    if (!deletingCustomer || !business?.id) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', deletingCustomer.id)
        .eq('business_id', business.id);

      if (error) {
        setDeleteError('Failed to remove customer. Please try again.');
        return;
      }

      // Remove from UI only after DB success
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      setDeletingCustomer(null);
    } catch {
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0);
  }, [customers]);

  const totalRevenueFromCustomers = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.total_purchases || 0), 0);
  }, [customers]);

  const handleExportCSV = () => {
    const rows = filteredCustomers.map((c) => ({
      name: c.name,
      phone: c.phone || 'N/A',
      address: c.address || 'N/A',
      total_purchases: c.total_purchases || 0,
      outstanding_balance: c.outstanding_balance || 0,
      total_orders: c.total_orders || 0,
      created_at: formatDate(c.created_at),
    }));

    exportToCsv(`Customers_${business?.name || 'Store'}`, rows, [
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'total_purchases', label: 'Total Purchases (INR)' },
      { key: 'outstanding_balance', label: 'Outstanding Due (INR)' },
      { key: 'total_orders', label: 'Orders Count' },
      { key: 'created_at', label: 'Registration Date' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Customer Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Maintain customer records, order history, credit ledgers, and contact numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Registered Customers
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {customers.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Customer Lifetime Purchases
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalRevenueFromCustomers)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-rose-600 font-semibold">
            Total Outstanding Due
          </span>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer by name, mobile, address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="p-2.5 h-10 ml-auto"
            title="Refresh list"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredCustomers.length === 0 ? (
        <Card className="py-12">
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No Customers Found"
            description={
              searchQuery
                ? 'No customers match your search.'
                : 'No customers recorded yet. Quick billing also supports unregistered walk-in customers.'
            }
            actionLabel={searchQuery ? 'Clear Search' : 'Add First Customer'}
            onAction={
              searchQuery
                ? () => setSearchQuery('')
                : () => {
                    setEditingCustomer(null);
                    setIsModalOpen(true);
                  }
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((c) => {
            const hasDue = (c.outstanding_balance || 0) > 0;
            return (
              <Card
                key={c.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {c.name}
                    </h3>
                    {hasDue && (
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                        Due: {formatCurrency(c.outstanding_balance)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Joined {formatDate(c.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Purchases summary */}
                <div className="flex items-center gap-4 text-left sm:text-right">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                      Total Purchases
                    </span>
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatCurrency(c.total_purchases)}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {c.total_orders} Orders
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingCustomer(c)}
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ledger
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCustomer(c);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-500 hover:text-slate-700"
                    title="Edit customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingCustomer(c);
                    }}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Remove customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Soft Delete Confirmation Dialog */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Remove Customer?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    "{deletingCustomer.name}"
                  </span>{' '}
                  will be removed from your customer directory. All their past invoices,
                  purchase history, and ledger records are permanently preserved.
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
                  setDeletingCustomer(null);
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
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
              >
                Yes, Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSuccess={fetchData}
        customer={editingCustomer}
      />

      {/* View Customer Ledger Modal */}
      <CustomerDetailModal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        customer={viewingCustomer}
      />
    </div>
  );
};
