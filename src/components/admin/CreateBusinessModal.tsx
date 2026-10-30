import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { adminService } from '../../lib/adminService';
import { useAuth } from '../../context/AuthContext';
import { copyToClipboard } from '../../lib/utils';
import { Check, Copy, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once-only credentials reveal state
  const [createdCredentials, setCreatedCredentials] = useState<{
    businessName: string;
    email: string;
    password: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleReset = () => {
    setName('');
    setOwnerName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAddress('');
    setError(null);
    setCreatedCredentials(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !ownerName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await adminService.createBusiness(
        {
          name: name.trim(),
          owner_name: ownerName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        },
        session?.access_token
      );

      if (!res.success) {
        setError(res.error || 'Failed to create business.');
        setIsLoading(false);
        return;
      }

      setCreatedCredentials({
        businessName: name.trim(),
        email: email.trim(),
        password,
        id: res.business?.id || 'generated',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDetails = async () => {
    if (!createdCredentials) return;
    const text = `RetailFlow Business Login Credentials:
Store: ${createdCredentials.businessName}
Login URL: ${window.location.origin}/login
Email: ${createdCredentials.email}
Password: ${createdCredentials.password}

Please change your password after initial login.`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdCredentials ? 'Business Created Successfully!' : 'Register New Business'}
      description={
        createdCredentials
          ? 'Save or share these credentials with the business owner. They will only be displayed once.'
          : 'Create a separate business account and generate initial owner credentials.'
      }
      maxWidth="lg"
    >
      {createdCredentials ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Store Name
              </span>
              <p className="font-bold text-base text-slate-900 dark:text-slate-100">{createdCredentials.businessName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Owner Email
                </span>
                <p className="font-mono text-sm font-medium">{createdCredentials.email}</p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Initial Password
                </span>
                <p className="font-mono text-sm font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 inline-block">
                  {createdCredentials.password}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              className="flex-1 gap-2"
              onClick={handleCopyDetails}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Login Details'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Business / Shop Name"
              placeholder="e.g. Sharma Grocery Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Owner Full Name"
              placeholder="e.g. Ramesh Sharma"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="email"
              label="Owner Email (Login ID)"
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="tel"
              label="Mobile Number"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Initial Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                Generate Strong
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full h-11 px-3.5 pr-10 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                placeholder="Enter or generate initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <p className="text-[11px] text-slate-400 mt-1">Min 8 characters. Will be shown once upon creation.</p>
          </div>

          <Input
            label="Shop Address"
            placeholder="e.g. Shop 12, Main Market, Delhi"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Business
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

