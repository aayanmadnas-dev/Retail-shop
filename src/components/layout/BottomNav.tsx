import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/billing', label: 'Billing', icon: Receipt, highlight: true },
    { to: '/inventory', label: 'Stock', icon: Package },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all select-none',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold scale-105'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                  item.highlight && !isActive && 'text-emerald-600/80 font-medium'
                )
              }
            >
              <div className={cn(
                'p-1 rounded-lg transition-colors',
                item.highlight && 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
