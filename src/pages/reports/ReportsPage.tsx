import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Sale, Product, SaleItem, CartItem } from '../../types/database';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { InvoiceReceiptModal } from '../../components/billing/InvoiceReceiptModal';
import { formatCurrency, formatDate, exportToCsv } from '../../lib/utils';
import {
  BarChart3,
  Calendar,
  Download,
  IndianRupee,
  Receipt,
  RotateCw,
  TrendingUp,
  PieChart as PieIcon,
  Search,
  Filter,
  Eye,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export const ReportsPage: React.FC = () => {
  const { business } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time Range Filter: 'today' | 'week' | 'month' | 'custom'
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected sale for receipt reprint modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedCartItems, setSelectedCartItems] = useState<CartItem[]>([]);
  const [processingSaleId, setProcessingSaleId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchReportData = async () => {
    if (!business?.id) return;
    setIsLoading(true);

    try {
      const [salesRes, itemsRes, prodRes] = await Promise.all([
        supabase
          .from('sales')
          .select('*, customers(name, phone, address)')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sale_items')
          .select('*, products(name, unit, selling_price, category)')
          .eq('business_id', business.id),
        supabase
          .from('products')
          .select('*')
          .eq('business_id', business.id),
      ]);

      if (salesRes.data) setSales(salesRes.data as Sale[]);
      if (itemsRes.data) setSaleItems(itemsRes.data as SaleItem[]);
      if (prodRes.data) setProducts(prodRes.data as Product[]);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  // Void an invoice and restore stock
const handleVoidInvoice = async (sale: Sale) => {
  if (!business?.id || processingSaleId) return;

  const confirmed = window.confirm(
    `Are you sure you want to void invoice ${sale.invoice_number}?\n\nStock will be restored and this invoice will be excluded from sales reports and customer dues.`
  );

  if (!confirmed) return;

  setProcessingSaleId(sale.id);
  setActionMessage(null);

  try {
    const { error } = await supabase.rpc('void_sale', {
      p_sale_id: sale.id,
    });

    if (error) throw error;

    setActionMessage(
      `Invoice ${sale.invoice_number} voided successfully. Stock restored.`
    );

    await fetchReportData();
  } catch (error: any) {
    setActionMessage(error.message || 'Failed to void invoice.');
  } finally {
    setProcessingSaleId(null);
  }
};


// Undo invoice deletion
const handleUndoInvoice = async (sale: Sale) => {
  if (!business?.id || processingSaleId) return;

  const confirmed = window.confirm(
    `Restore invoice ${sale.invoice_number}?\n\nThe original stock quantities will be deducted again.`
  );

  if (!confirmed) return;

  setProcessingSaleId(sale.id);
  setActionMessage(null);

  try {
    const { error } = await supabase.rpc('undo_void_sale', {
      p_sale_id: sale.id,
    });

    if (error) throw error;

    setActionMessage(
      `Invoice ${sale.invoice_number} restored successfully.`
    );

    await fetchReportData();
  } catch (error: any) {
    setActionMessage(error.message || 'Failed to restore invoice.');
  } finally {
    setProcessingSaleId(null);
  }
};

  useEffect(() => {
    fetchReportData();
  }, [business?.id]);

  // Filter sales by date range
    const matchingSales = useMemo(() => {
    const now = new Date();

    return sales.filter((s) => {
      const sDate = new Date(s.created_at);

      if (timeRange === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (sDate < todayStart) return false;
      } else if (timeRange === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        if (sDate < weekStart) return false;
      } else if (timeRange === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (sDate < monthStart) return false;
      } else if (timeRange === 'custom') {
        if (startDate && new Date(startDate) > sDate) return false;
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (sDate > end) return false;
        }
      }

      // Search query (invoice number or customer name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInvoice = s.invoice_number.toLowerCase().includes(q);
        const matchesCustomer = s.customers?.name?.toLowerCase().includes(q);
        if (!matchesInvoice && !matchesCustomer) return false;
      }

      return true;
    });
  }, [sales, timeRange, startDate, endDate, searchQuery]);

  // Only active invoices contribute to financial calculations.
const filteredSales = useMemo(
  () => matchingSales.filter((sale) => !sale.is_voided),
  [matchingSales]
);

  // Metric Computations
  const totalSales = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  }, [filteredSales]);

  
const totalGrossProfit = useMemo(() => {
  const salesMap = new Map(
    filteredSales.map((sale) => [sale.id, sale])
  );

  return saleItems.reduce((profit, item) => {
    const sale = salesMap.get(item.sale_id);

    if (!sale) return profit;

    const lineTotal = Number(item.total) || 0;
    const quantity = Number(item.quantity) || 0;
    const costPrice =
      Number(item.purchase_price_at_sale) || 0;

    const subtotal = Number(sale.subtotal) || 0;
    const discount = Number(sale.discount) || 0;

    const allocatedDiscount =
      subtotal > 0
        ? (discount * lineTotal) / subtotal
        : 0;

    const netSales = lineTotal - allocatedDiscount;
    const totalCost = quantity * costPrice;

    return profit + netSales - totalCost;
  }, 0);
}, [filteredSales, saleItems]);


  const totalTransactions = filteredSales.length;

const averageTicketSize = useMemo(() => {
  return totalTransactions > 0
    ? totalSales / totalTransactions
    : 0;
}, [totalSales, totalTransactions]);
  
  const totalDiscountsGiven = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
  }, [filteredSales]);

  // Payment Breakdown for Pie Chart
  const paymentBreakdownData = useMemo(() => {
    const map: { [key: string]: number } = { cash: 0, upi: 0, card: 0, other: 0 };
    filteredSales.forEach((s) => {
      const method = s.payment_method || 'other';
      map[method] = (map[method] || 0) + (Number(s.total) || 0);
    });

    return [
      { name: 'Cash', value: Math.round(map.cash) },
      { name: 'UPI', value: Math.round(map.upi) },
      { name: 'Card', value: Math.round(map.card) },
      { name: 'Other', value: Math.round(map.other) },
    ].filter((item) => item.value > 0);
  }, [filteredSales]);

  // Best Selling Products Ranking
  const bestSellingProducts = useMemo(() => {
    const saleIds = new Set(filteredSales.map((s) => s.id));
    const relevantItems = saleItems.filter((i) => saleIds.has(i.sale_id));

    const productMap: {
      [key: string]: { name: string; quantity: number; revenue: number; unit: string };
    } = {};

    relevantItems.forEach((item) => {
      const pId = item.product_id;
      const pName = item.products?.name || 'Product';
      const pUnit = item.products?.unit || 'pcs';

      if (!productMap[pId]) {
        productMap[pId] = { name: pName, quantity: 0, revenue: 0, unit: pUnit };
      }
      productMap[pId].quantity += Number(item.quantity) || 0;
      productMap[pId].revenue += Number(item.total) || 0;
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales, saleItems]);

  // Handle View / Reprint Invoice
  const handleViewInvoice = (sale: Sale) => {
    const itemsForSale = saleItems
      .filter((i) => i.sale_id === sale.id)
      .map((i) => ({
        product: {
          id: i.product_id,
          business_id: sale.business_id,
          name: i.products?.name || 'Product',
          sku: null,
          barcode: null,
          category: i.products?.category || null,
          purchase_price: 0,
          selling_price: i.unit_price,
          stock_quantity: 0,
          unit: i.products?.unit || 'pcs',
          is_active: true,
          created_at: sale.created_at,
        },
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
      }));

    setSelectedSale(sale);
    setSelectedCartItems(itemsForSale);
  };


  const handleExportCSV = () => {
    const rows = filteredSales.map((s) => ({
      invoice_number: s.invoice_number,
      customer: s.customers?.name || 'Walk-in',
      date: formatDate(s.created_at, true),
      subtotal: s.subtotal,
      discount: s.discount,
      tax_amount: s.tax_amount,
      total: s.total,
      payment_method: s.payment_method.toUpperCase(),
      payment_status: s.payment_status.toUpperCase(),
    }));

    exportToCsv(`Sales_Report_${timeRange}`, rows, [
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'customer', label: 'Customer' },
      { key: 'date', label: 'Date & Time' },
      { key: 'subtotal', label: 'Subtotal (INR)' },
      { key: 'discount', label: 'Discount (INR)' },
      { key: 'tax_amount', label: 'GST (INR)' },
      { key: 'total', label: 'Grand Total (INR)' },
      { key: 'payment_method', label: 'Payment Method' },
      { key: 'payment_status', label: 'Payment Status' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Sales Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified financial reports, customer transactions, and product rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report CSV</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={fetchReportData}
            isLoading={isLoading}
            className="p-2.5 h-11"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Time range buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Range:
            </span>
            {(['today', 'week', 'month', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${timeRange === r
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
              >
                {r === 'today'
                  ? 'Daily'
                  : r === 'week'
                    ? 'Weekly (7d)'
                    : r === 'month'
                      ? 'This Month'
                      : 'Custom'}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Custom date range picker inputs */}
        {timeRange === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        )}
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Sales
          </span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalSales)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
    Gross Profit
  </span>

  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
    {formatCurrency(totalGrossProfit)}
  </p>
</div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Total Invoices
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {totalTransactions}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Average Ticket Size
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(averageTicketSize)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Discounts Given
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalDiscountsGiven)}
          </p>
        </div>
      </div>

      {/* Charts Grid: Payment Breakdown & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Methods Breakdown */}
        <Card className="p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Payment Method Breakdown
            </h3>
            <p className="text-[11px] text-slate-400">Cash vs UPI vs Card revenue share</p>
          </div>

          {paymentBreakdownData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              No transactions in this period.
            </div>
          ) : (
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentBreakdownData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Best-Selling Products Ranking */}
        <Card className="p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Top Selling Products
            </h3>
            <p className="text-[11px] text-slate-400">Ranked by total sales revenue</p>
          </div>

          {bestSellingProducts.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              No product sales data in this period.
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {bestSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {p.quantity} {p.unit} sold
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {formatCurrency(p.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Itemized Transactions Table */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Recorded Transactions
          </h3>
          <p className="text-[11px] text-slate-400">
            Click on any invoice to view receipt, print, or share
          </p>

          {actionMessage && (
  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
    {actionMessage}
  </div>
)}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : matchingSales.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" />}
            title="No Invoices Found"
            description="No sales matched your date or search filter."
          />
        ) : (
          <div className="space-y-2">
            {matchingSales.map((s) => (
              <div
                key={s.id}
                className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                      {s.invoice_number}
                    </span>
                    <Badge
                      variant={
                        s.payment_status === 'paid'
                          ? 'emerald'
                          : s.payment_status === 'partial'
                            ? 'amber'
                            : 'rose'
                      }
                      size="sm"
                    >
                      {s.payment_status}
                    </Badge>
                    <Badge variant="slate" size="sm">
                      {s.payment_method.toUpperCase()}
                    </Badge>

                    {s.is_voided && (
  <Badge variant="rose" size="sm">
    VOIDED
  </Badge>
)}
                  </div>

                  <p className="text-xs text-slate-500">
                    Billed to:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {s.customers?.name || 'Walk-in Customer'}
                    </span>{' '}
                    • {formatDate(s.created_at, true)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.total)}
                    </span>
                    {Number(s.discount) > 0 && (
                      <span className="text-[10px] text-emerald-600 block">
                        Saved {formatCurrency(s.discount)}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInvoice(s)}
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Receipt
                  </Button>

                  {s.is_voided ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingSaleId !== null}
                    onClick={() => handleUndoInvoice(s)}
                    className="gap-1.5 text-xs text-emerald-600"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Undo
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingSaleId !== null}
                    onClick={() => handleVoidInvoice(s)}
                    className="gap-1.5 text-xs text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                )}
                                  
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invoice Receipt Modal */}
      <InvoiceReceiptModal
        isOpen={Boolean(selectedSale)}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        items={selectedCartItems}
        customer={selectedSale?.customers || null}
        business={business}
      />
    </div>
  );
};

