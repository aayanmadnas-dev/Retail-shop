
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, FileSpreadsheet, Download, X } from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);

  const downloadTemplate = () => {
    const headers = [
      'name',
      'category',
      'sku',
      'barcode',
      'purchase_price',
      'selling_price',
      'stock_quantity',
      'unit',
      'item_type',
    ];

    const sample = [
      'Cooking Oil',
      'Grocery',
      'OIL001',
      '8901234567890',
      '100',
      '120',
      '50',
      'pcs',
      'inventory',
    ];

    const csv = [headers, sample]
      .map(row =>
        row.map(value => `"${value.replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Products from CSV"
      description="Add multiple inventory products using a spreadsheet."
      maxWidth="lg"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                First, prepare your spreadsheet
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Download our template and fill in your product details using
                Excel or Google Sheets. Export or save it as a CSV file.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-200">
            Select CSV File
          </label>

          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 cursor-pointer hover:border-blue-500 transition-colors">
            <Upload className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Click to select your CSV file
            </span>
            <span className="text-xs text-slate-500">
              CSV files only
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={event => {
                const selected = event.target.files?.[0] || null;
                setFile(selected);
                event.target.value = '';
              }}
            />
          </label>
        </div>

        {file && (
          <div className="flex items-center justify-between rounded-lg bg-slate-100 dark:bg-slate-800 p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-2 text-slate-500 hover:text-red-500"
              aria-label="Remove selected file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={!file}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
