import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(res.error || 'Admin login failed. Please check your credentials.');
      return;
    }

    navigate('/admin');
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
          <p className="text-xs text-slate-400 mt-1">Platform management & authorized access</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl space-y-5">
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-purple-400" />
            <span>Authorized Super Administrator Login Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 shadow-purple-600/30 font-semibold"
              isLoading={isLoading}
            >
              Access Admin Dashboard
            </Button>
          </form>

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
