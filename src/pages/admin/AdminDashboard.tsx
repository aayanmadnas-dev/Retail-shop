import React, { useState, useEffect } from 'react';
import { adminService } from '../../lib/adminService';
import type { Business } from '../../types/database';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { CreateBusinessModal } from '../../components/admin/CreateBusinessModal';
import { EditBusinessModal } from '../../components/admin/EditBusinessModal';
import { formatDate } from '../../lib/utils';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Power,
  RotateCw,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { session } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    const res = await adminService.getBusinesses();
    setBusinesses(res.businesses || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleToggleStatus = async (business: Business) => {
    const newStatus = business.status === 'active' ? 'suspended' : 'active';
    const confirmMessage = `Are you sure you want to ${
      newStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'
    } "${business.name}"? ${
      newStatus === 'suspended'
        ? 'The owner will immediately lose access to their POS and inventory.'
        : 'The owner will immediately regain access.'
    }`;

    if (!window.confirm(confirmMessage)) return;

    setTogglingId(business.id);
    const res = await adminService.toggleBusinessStatus(business.id, newStatus, session?.access_token);
    if (res.success) {
      setBusinesses((prev) =>
        prev.map((b) => (b.id === business.id ? { ...b, status: newStatus } : b))
      );
    } else {
      alert(`Failed to update status: ${res.error}`);
    }
    setTogglingId(null);
  };

  // Metrics
  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === 'active').length;
  const suspendedBusinesses = businesses.filter((b) => b.status === 'suspended').length;

  // Filtered list
  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone && b.phone.includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Platform Businesses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage all enrolled retail businesses, credentials, and access statuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={fetchBusinesses}
            isLoading={isLoading}
            className="gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Register Business
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Businesses"
          value={totalBusinesses}
          subtitle="Registered retail stores"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          title="Active Businesses"
          value={activeBusinesses}
          subtitle="Operational retail stores"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Suspended Accounts"
          value={suspendedBusinesses}
          subtitle="Access temporarily revoked"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 dark:bg-rose-950/40"
          iconColor="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by store name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['all', 'active', 'suspended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Business List */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredBusinesses.length === 0 ? (
        <Card className="py-8">
          <EmptyState
            icon={<Building2 className="w-8 h-8" />}
            title="No Businesses Found"
            description={
              searchQuery
                ? 'No retail businesses match your search filter.'
                : 'No businesses have been registered yet. Click "Register Business" to create the first one.'
            }
            actionLabel={searchQuery ? 'Clear Search' : 'Register New Business'}
            onAction={
              searchQuery ? () => setSearchQuery('') : () => setIsCreateOpen(true)
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map((b) => (
            <Card
              key={b.id}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {b.name}
                  </h3>
                  <Badge variant={b.status === 'active' ? 'emerald' : 'rose'}>
                    {b.status === 'active' ? 'Active' : 'Suspended'}
                  </Badge>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    ID: {b.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{b.email}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Created: {formatDate(b.created_at)}</span>
                  </div>
                </div>

                {b.address && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{b.address}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBusiness(b)}
                  className="gap-1.5 text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>

                <Button
                  variant={b.status === 'active' ? 'destructive' : 'primary'}
                  size="sm"
                  isLoading={togglingId === b.id}
                  onClick={() => handleToggleStatus(b)}
                  className="gap-1.5 text-xs"
                >
                  <Power className="w-3.5 h-3.5" />
                  {b.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateBusinessModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchBusinesses}
      />

      <EditBusinessModal
        business={editingBusiness}
        isOpen={Boolean(editingBusiness)}
        onClose={() => setEditingBusiness(null)}
        onSuccess={fetchBusinesses}
      />
    </div>
  );
};
