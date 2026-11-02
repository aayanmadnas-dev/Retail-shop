import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Sale, Product, Customer } from '../../types/database';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  IndianRupee,
  Calendar,
  Package,
  Users,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Store,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type {
  Sale,
  SaleItem,
  Product,
  Customer
} from '../../types/database';

export const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { business } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const [salesRes, prodRes, custRes] = await Promise.all([
          supabase
            .from('sales')
            .select('*, customers(name)')
            .eq('business_id', business.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('sale_items')
            .select('sale_id, quantity, total, purchase_price_at_sale')
            .eq('business_id', business.id),
          supabase
            .from('products')
            .select('*')
            .eq('business_id', business.id),
            .eq('is_active', true)
          supabase
            .from('customers')
            .select('*')
            .eq('business_id', business.id),
        ]);

        if (salesRes.data) setSales(salesRes.data as Sale[]);
        if (itemsRes.data) setSaleItems(itemsRes.data as SaleItem[]);
        if (prodRes.data) setProducts(prodRes.data as Product[]);
        if (custRes.data) setCustomers(custRes.data as Customer[]);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [business?.id]);

  // Today's Sales
  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales
      .filter((s) => new Date(s.created_at) >= today)
      .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  }, [sales]);

  // Monthly Sales
  const monthlySales = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales
      .filter((s) => new Date(s.created_at) >= startOfMonth)
      .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
  }, [sales]);

  
const monthlyGrossProfit = useMemo(() => {
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const monthlySalesList = sales.filter(
    (s) => new Date(s.created_at) >= startOfMonth
  );

  const salesMap = new Map(
    monthlySalesList.map((sale) => [sale.id, sale])
  );

  return saleItems.reduce((profit, item) => {
    const sale = salesMap.get(item.sale_id);

    if (!sale) return profit;

    const lineTotal = Number(item.total) || 0;
    const quantity = Number(item.quantity) || 0;
    const costPrice =
      Number(item.purchase_price_at_sale) || 0;

    // Allocate invoice discount proportionally.
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
}, [sales, saleItems]);


  // Low Stock Items (Physical inventory items only)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const isService = p.item_type === 'service' || p.category?.toLowerCase() === 'service';
      return !isService && (Number(p.stock_quantity) || 0) <= 5;
    });
  }, [products]);

  // Total Inventory Valuation
  const totalInventoryValuation = useMemo(() => {
    return products.reduce(
      (acc, p) => acc + (Number(p.stock_quantity) || 0) * (Number(p.purchase_price) || 0),
      0
    );
  }, [products]);

  // 7-day Sales Overview Trend for Recharts
  const chartData = useMemo(() => {
    const days: { [key: string]: number } = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      days[dateKey] = 0;
    }

    sales.forEach((s) => {
      const dateKey = s.created_at.split('T')[0];
      if (days[dateKey] !== undefined) {
        days[dateKey] += Number(s.total) || 0;
      }
    });

    return Object.entries(days).map(([date, amount]) => {
      const d = new Date(date);
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      return {
        date: dayLabel,
        amount: Math.round(amount),
      };
    });
  }, [sales]);

  const recentTransactions = useMemo(() => {
    return sales.slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Welcome back, {business?.name || 'Retailer'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here is your live retail sales and inventory performance summary.
          </p>
        </div>

        {/* Quick Actions Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/billing')}
            className="gap-2 shadow-sm shadow-emerald-600/30"
          >
            <Receipt className="w-4 h-4" />
            Create New Bill
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(todaySales)}
          subtitle="Sales recorded today"
          icon={<IndianRupee className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          onClick={() => navigate('/reports')}
        />

       <StatCard
        title="Monthly Gross Profit"
        value={formatCurrency(monthlyGrossProfit)}
        subtitle="Sales minus product costs"
        icon={<TrendingUp className="w-5 h-5" />}
        iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
        iconColor="text-emerald-600 dark:text-emerald-400"
        onClick={() => navigate('/reports')}
      />

        <StatCard
          title="Total Products"
          value={products.length}
          subtitle={`Valued at ${formatCurrency(totalInventoryValuation)}`}
          icon={<Package className="w-5 h-5" />}
          iconBgColor="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
          onClick={() => navigate('/inventory')}
        />

        <StatCard
          title="Low Stock Alerts"
          value={lowStockProducts.length}
          subtitle={
            lowStockProducts.length > 0
              ? 'Items needing restock'
              : 'All inventory stocked'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor={
            lowStockProducts.length > 0
              ? 'bg-rose-50 dark:bg-rose-950/40'
              : 'bg-slate-100 dark:bg-slate-800'
          }
          iconColor={
            lowStockProducts.length > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500'
          }
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/billing')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center gap-3 transition-all text-left shadow-xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              POS Billing
            </span>
            <span className="text-[11px] text-slate-400">Quick Invoice</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/inventory')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center gap-3 transition-all text-left shadow-xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Add Product
            </span>
            <span className="text-[11px] text-slate-400">Manage Catalog</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/customers')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center gap-3 transition-all text-left shadow-xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Customers
            </span>
            <span className="text-[11px] text-slate-400">Credit Ledger</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center gap-3 transition-all text-left shadow-xs group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
              Reports
            </span>
            <span className="text-[11px] text-slate-400">Sales Analytics</span>
          </div>
        </button>
      </div>

      {/* Sales Overview Chart (Recharts) */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              7-Day Sales Overview
            </h3>
            <p className="text-xs text-slate-500">Daily retail revenue trajectory</p>
          </div>
          <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
            Last 7 Days
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip
                formatter={(value: any) => [`₹${value}`, 'Revenue']}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '0.75rem',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#emeraldGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent Transactions & Low Stock Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Transactions Card */}
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h3>
              <p className="text-[11px] text-slate-400">Latest invoices generated</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
              className="text-xs text-emerald-600 gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No bills created yet today.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
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
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {s.customers?.name || 'Walk-in'} • {s.payment_method.toUpperCase()} •{' '}
                      {formatDate(s.created_at, true)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Low Stock Watchlist Card */}
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Low Stock Alert
              </h3>
              <p className="text-[11px] text-slate-400">Products with &le; 5 units</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/inventory')}
              className="text-xs text-emerald-600 gap-1"
            >
              Restock <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
              Healthy inventory. No low-stock items.
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {p.category || 'General'} • MRP: {formatCurrency(p.selling_price)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-rose-600">
                      {p.stock_quantity} {p.unit}
                    </span>
                    <span className="text-[10px] text-rose-500 block">Remaining</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
