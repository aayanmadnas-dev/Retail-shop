import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, BarChart3, Store, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const Sidebar: React.FC = () => {
  const { business } = useAuth();
const { t, language } = useLanguage();

  const links = [
  { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
  { to: '/billing', label: t('billing'), icon: Receipt, highlight: true },
  { to: '/inventory', label: t('inventory'), icon: Package },
  { to: '/customers', label: t('customers'), icon: Users },
  { to: '/reports', label: t('reports'), icon: BarChart3 },
];

  return (
    <aside className="hidden sm:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 shrink-0 h-[calc(100vh-61px)] sticky top-[61px]">
      {/* Store quick info card */}
      {/* Clickable Store Profile Card */}
<Link
  to="/business-profile"
  className="p-3.5 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-all group"
>
  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
    <Store className="w-5 h-5" />
  </div>

  <div className="min-w-0 flex-1">
    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
      {business?.name || 'Retail Shop'}
    </p>

    <p className="text-[11px] text-slate-500 truncate">
      {business?.phone || (language === 'hi' ? 'रिटेल व्यवसाय' : 'Retail Business')}
    </p>

    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
      {t('manageProfile')}
    </p>
  </div>

  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
</Link>

      {/* Navigation links */}
      <nav className="space-y-1.5 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group select-none',
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60',
                  link.highlight && !isActive && 'text-emerald-600'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                <span>{link.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          );
        })}
      </nav>

      {/* Footer support / info */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
        <p className="font-semibold text-slate-600 dark:text-slate-300">RetailFlow SaaS India</p>
<p>{language === 'hi' ? 'मोबाइल बिलिंग और स्टॉक प्रबंधन' : 'Mobile-first POS & Inventory'}</p>
      </div>
    </aside>
  );
};

