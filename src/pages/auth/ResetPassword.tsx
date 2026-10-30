import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { validatePassword } from '../../lib/utils';
import { Lock, KeyRound, Check, X, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const { verifyOtpAndResetPassword } = useAuth();

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordValidation = validatePassword(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !otp.trim() || !newPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMessage('Please satisfy all password security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await verifyOtpAndResetPassword(email.trim(), otp.trim(), newPassword);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to verify OTP or update password.');
      return;
    }

    setSuccessMessage('Password reset successfully! Redirecting to login...');
    setTimeout(() => {
      navigate('/login');
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Set New Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enter your OTP code and create a secure new password
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="owner@yourstore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="text"
              label="Email OTP / Recovery Code"
              placeholder="e.g. 123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
              required
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-10 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength checklist */}
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Password Security Requirements:
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <span className={`flex items-center gap-1.5 ${passwordValidation.hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {passwordValidation.hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Min 8 characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordValidation.hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {passwordValidation.hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Uppercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordValidation.hasLower ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {passwordValidation.hasLower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Lowercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordValidation.hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {passwordValidation.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    One number
                  </span>
                  <span className={`flex items-center gap-1.5 col-span-2 ${passwordValidation.hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {passwordValidation.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    Special character (!@#$%^&*)
                  </span>
                </div>
              </div>
            </div>

            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Verify OTP & Set Password
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              to="/login"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

