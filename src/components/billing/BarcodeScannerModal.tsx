
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Barcode, Search, Camera } from 'lucide-react';
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockedRef = useRef(false);

  const handleScan = (code: string) => {
    const trimmed = code.trim();

    if (!trimmed || scanLockedRef.current) return;

    const found = products.find(
      (p) =>
        (p.barcode &&
          p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        (p.sku &&
          p.sku.toLowerCase() === trimmed.toLowerCase())
    );

    if (found) {
      scanLockedRef.current = true;
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

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    scanLockedRef.current = false;
    setBarcodeInput('');
    setStatusMessage('Starting camera...');

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 130 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            if (!scanLockedRef.current) {
              handleScan(decodedText);
            }
          },
          () => {
            // Ignore individual frames where no barcode is detected.
          }
        );

        if (cancelled && scanner.isScanning) {
          await scanner.stop();
          scanner.clear();
        } else {
          setStatusMessage(null);
        }
      } catch (error) {
        console.error('Camera scanner error:', error);

        if (!cancelled) {
          setStatusMessage(
            'Camera unavailable. Allow camera permission or enter the barcode manually.'
          );
        }
      }
    };

    const timer = window.setTimeout(() => {
      void startScanner();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      const activeScanner = scanner;

      if (activeScanner) {
        if (activeScanner.isScanning) {
          void activeScanner
            .stop()
            .then(() => activeScanner.clear())
            .catch((error) => {
              console.warn('Scanner cleanup:', error);
            });
        } else {
          try {
            activeScanner.clear();
          } catch {
            // Scanner may already be cleared.
          }
        }
      }

      if (scannerRef.current === activeScanner) {
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(barcodeInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & SKU Scanner"
      description="Scan a product using your mobile camera or enter its barcode manually."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <Camera className="w-4 h-4 text-emerald-600" />
          Live Camera Scanner
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-black min-h-[220px]">
          <div
            id="barcode-reader"
            className="w-full"
          />
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              statusMessage.startsWith('Found')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : statusMessage.startsWith('Starting')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="text-center text-xs text-slate-500">
          Point your rear camera at the product barcode.
        </div>

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400">OR ENTER MANUALLY</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            placeholder="Enter barcode / SKU..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            leftIcon={<Barcode className="w-4 h-4" />}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              className="flex-1 gap-1.5"
              disabled={!barcodeInput.trim()}
            >
              <Search className="w-4 h-4" />
              Find Item
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
