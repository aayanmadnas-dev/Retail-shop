import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Customer } from '../../types/database';
import { AlertCircle, Phone, User, MapPin } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer?: Customer) => void;
  customer?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer,
}) => {
  const { business } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setError(null);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setError(null);
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (customer) {
        // Edit customer
        const { data, error: updateError } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
          })
          .eq('id', customer.id)
          .eq('business_id', business.id)
          .select()
          .single();

        if (updateError) throw updateError;
        onSuccess(data as Customer);
      } else {
        // Add new customer
        const { data, error: insertError } = await supabase
          .from('customers')
          .insert({
            business_id: business.id,
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        onSuccess(data as Customer);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
      description="Record customer details for easy lookup and billing ledger"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Customer Full Name"
          placeholder="e.g. Rajesh Kumar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <Input
          type="tel"
          label="Mobile Number (Optional)"
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
        />

        <Input
          label="Address / Colony (Optional)"
          placeholder="e.g. Flat 302, Green Park"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          leftIcon={<MapPin className="w-4 h-4" />}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {customer ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

