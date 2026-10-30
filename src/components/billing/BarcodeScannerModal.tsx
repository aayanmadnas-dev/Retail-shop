import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Barcode, Search, Camera, Check } from 'lucide-react';
import type { Product } from '../../types/database';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBarcodeInput('');
      setStatusMessage(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Look up by barcode or SKU
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase())
    );

    if (found) {
      setStatusMessage(`Found: ${found.name}`);
      onProductScanned(found);
      setBarcodeInput('');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setStatusMessage(`No product found with barcode "${trimmed}".`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(barcodeInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & SKU Scanner"
      description="Scan with an attached barcode gun or type SKU/barcode manually"
    >
      <div className="space-y-4 text-center">
        {/* Scanner Simulation Window */}
        <div className="relative h-44 rounded-2xl bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden border border-slate-700">
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 animate-pulse shadow-sm shadow-rose-500/50" />
          <Camera className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-xs text-slate-400 font-mono">Ready to scan barcode / QR</p>
          <span className="text-[10px] text-slate-500 mt-1">Laser barcode guns type directly into the field below</span>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              statusMessage.startsWith('Found')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            placeholder="Scan or enter barcode / SKU..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            leftIcon={<Barcode className="w-4 h-4" />}
            autoFocus
          />

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 gap-1.5">
              <Search className="w-4 h-4" />
              Find Item
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
