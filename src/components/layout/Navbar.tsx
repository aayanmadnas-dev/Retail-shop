
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  AlertTriangle,
  Languages,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { profile, business, isSuperAdmin, isSuspended, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Brand & Shop info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30 font-bold text-lg shrink-0">
            RF
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {business?.name || (isSuperAdmin ? 'RetailFlow Platform' : 'RetailFlow')}
              </h1>

              {isSuperAdmin ? (
                <Badge variant="purple" size="sm">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Super Admin
                </Badge>
              ) : isSuspended ? (
                <Badge variant="rose" size="sm">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  Suspended
                </Badge>
              ) : (
                <Badge variant="emerald" size="sm">
                  Active
                </Badge>
              )}
            </div>

            <p className="text-[11px] text-slate-500 hidden sm:block truncate">
              {profile?.full_name ? `Owner: ${profile.full_name}` : 'Retail SaaS Billing & Inventory'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="inline-flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors"
            title="Change language"
            aria-label="Change language"
          >
            <Languages className="w-4 h-4" />
            <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
