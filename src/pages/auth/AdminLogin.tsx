import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../lib/adminService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Lock, Mail, AlertCircle, KeyRound, CheckCircle2, User, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'setup'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup form state
  const [setupFullName, setSetupFullName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupSecretKey, setSetupSecretKey] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both admin email and password.');
      return;
    }

    setIsLoading(true);
    const res = await signIn(email.trim(), password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Admin login failed.');
      return;
    }

    navigate('/admin');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    setSetupSuccess(null);

    if (!setupFullName.trim() || !setupEmail.trim() || !setupPassword) {
      setSetupError('Full name, email, and password are required.');
      return;
    }

    setSetupLoading(true);
    const res = await adminService.setupSuperAdmin({
      full_name: setupFullName.trim(),
      email: setupEmail.trim(),
      password: setupPassword,
      secret_key: setupSecretKey.trim() || undefined,
    });
    setSetupLoading(false);

    if (!res.success) {
      setSetupError(res.error || 'Failed to initialize Super Admin.');
      return;
    }

    setSetupSuccess(res.message || 'Super Admin account initialized! You can now sign in.');
    setEmail(setupEmail.trim());
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-purple-600/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Platform management & business authorization</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-5">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-900/60 p-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin Sign In
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'setup'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              First-Time Setup
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {setupSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{setupSuccess}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Input
                type="email"
                label="Admin Email"
                placeholder="admin@retailflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                required
              />

              <Input
                type="password"
                label="Master Password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 shadow-purple-600/30"
                isLoading={isLoading}
              >
                Access Admin Dashboard
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-300 text-xs">
                Use this to initialize your master Super Admin profile on the database.
              </div>

              {setupError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{setupError}</span>
                </div>
              )}

              <Input
                label="Super Admin Name"
                placeholder="e.g. Master Administrator"
                value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100"
                required
              />

              <Input
                type="email"
                label="Admin Email"
                placeholder="admin@retailflow.com"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100"
                required
              />

              <Input
                type="password"
                label="Admin Password"
                placeholder="Choose a strong password (min 8 chars)"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100"
                required
              />

              <Input
                type="password"
                label="Supabase Service Role Key (Optional if set in .env)"
                placeholder="Paste secret key if not yet in .env"
                value={setupSecretKey}
                onChange={(e) => setSetupSecretKey(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4" />}
                className="bg-slate-900 border-slate-700 text-slate-100"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 shadow-purple-600/30"
                isLoading={setupLoading}
              >
                Initialize Super Admin
              </Button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-700 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Business Owner Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
