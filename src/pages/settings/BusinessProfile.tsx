
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Store,
  Mail,
  Phone,
  UserRound,
  MapPin,
  ShieldCheck
} from 'lucide-react';

export const BusinessProfile: React.FC = () => {
  const { user, profile, business } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    setName(business?.name || '');
    setEmail(user?.email || '');
    setPhone(business?.phone || '');
    setOwnerName(profile?.full_name || '');
    setAddress(business?.address || '');
  }, [business, profile, user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Database saving will be connected in the next implementation step.
    alert('Profile form is ready. Database saving will be enabled in the next step.');
  };

  if (!business || !profile) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Business profile is not available.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Account Settings
        </p>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
          Business Profile
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Manage your business information.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm"
      >

        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Store Information
            </h2>
            <p className="text-xs text-slate-500">
              Update your store details.
            </p>
          </div>
        </div>

        <Input
          label="Business Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<Store className="w-4 h-4" />}
          required
        />

        <Input
          label="Business Email / Login Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          helperText="Changing your login email will require verification."
          required
        />

        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
        />

        <Input
          label="Business Owner Name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          leftIcon={<UserRound className="w-4 h-4" />}
          required
        />

        <div className="space-y-1.5">
          <label
            htmlFor="business-address"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Business Address
          </label>

          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

            <textarea
              id="business-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter complete business address"
              className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-y"
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />

          <span>
            Only the authorized business owner can manage their business information.
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" className="w-full sm:w-auto">
            Save Changes
          </Button>
        </div>

      </form>
    </div>
  );
};

export default BusinessProfile;
