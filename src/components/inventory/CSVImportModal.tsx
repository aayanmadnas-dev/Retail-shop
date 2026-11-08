
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Upload, FileSpreadsheet, Download, X } from 'lucide-react';


const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;

  text = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') i++;

      row.push(cell.trim());
      if (row.some(value => value !== '')) rows.push(row);

      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (insideQuotes) {
    throw new Error('Invalid CSV: A quoted field was not closed.');
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some(value => value !== '')) rows.push(row);
  }

  return rows;
};


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
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [parseError, setParseError] = useState('');

  
const headers = (parsedRows[0] || []).map(header =>
  header.trim().toLowerCase().replace(/^\uFEFF/, '')
);

const requiredHeaders = ['name'];

const missingHeaders = requiredHeaders.filter(
  header => !headers.includes(header)
);

const headerError = missingHeaders.length > 0
  ? `Missing required column: ${missingHeaders.join(', ')}`
  : '';

const previewRows = parsedRows.slice(1, 6);
const rowValidationErrors: string[] = parsedRows.slice(1).flatMap(
  (row, index) => {
    const errors: string[] = [];
    const rowNumber = index + 2;

    const nameIndex = headers.indexOf('name');
    if (nameIndex !== -1 && !row[nameIndex]?.trim()) {
      errors.push(`Row ${rowNumber}: Product name is required.`);
    }

    if (row.length > headers.length) {
      errors.push(`Row ${rowNumber}: More values than CSV headers.`);
    }

    const numericFields = [
      'purchase_price',
      'selling_price',
      'stock_quantity',
    ];

    numericFields.forEach(field => {
      const columnIndex = headers.indexOf(field);
      if (columnIndex === -1) return;

      const value = row[columnIndex]?.trim();
      if (value === undefined || value === '') return;

      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        errors.push(
          `Row ${rowNumber}: ${field} must be a valid non-negative number.`
        );
      }
    });

    const itemTypeIndex = headers.indexOf('item_type');

    if (itemTypeIndex !== -1) {
      const itemType = row[itemTypeIndex]?.trim().toLowerCase();

      if (itemType && !['inventory', 'service'].includes(itemType)) {
        errors.push(
          `Row ${rowNumber}: item_type must be inventory or service.`
        );
      }
    }

    return errors;
  }
);

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
              onChange={async event => {
  const selected = event.target.files?.[0] || null;
  event.target.value = '';

  setFile(selected);
  setParsedRows([]);
  setParseError('');

  if (!selected) return;

  try {
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      throw new Error('Please select a CSV file.');
    }

    if (selected.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5 MB.');
    }

    const text = await selected.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      throw new Error('CSV must contain a header and at least one product.');
    }

    setParsedRows(rows);
  } catch (error) {
    setFile(null);
    setParseError(
      error instanceof Error ? error.message : 'Failed to read CSV file.'
    );
  }
}}
            />
          </label>
        </div>

        
{parseError && (
  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
    {parseError}
  </p>
)}

{parsedRows.length > 0 && (
  <div className="space-y-3">
    {headerError ? (
      <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
        {headerError}
      </p>
    ) : (
      <p className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg">
        CSV headers validated successfully. {parsedRows.length - 1} product rows found.
      </p>
    )}

    {rowValidationErrors.length > 0 && (
  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 space-y-1">
    <p className="text-sm font-semibold text-red-700 dark:text-red-400">
      Please correct these CSV errors:
    </p>

    {rowValidationErrors.slice(0, 10).map((error, index) => (
      <p key={index} className="text-xs text-red-600 dark:text-red-300">
        {error}
      </p>
    ))}

    {rowValidationErrors.length > 10 && (
      <p className="text-xs text-red-600">
        And {rowValidationErrors.length - 10} more errors.
      </p>
    )}
  </div>
)}

    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-100 dark:bg-slate-800">
          <tr>
            {headers.map(header => (
              <th key={header} className="p-2 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row, index) => (
            <tr key={index} className="border-t dark:border-slate-700">
              {headers.map((header, columnIndex) => (
                <td key={columnIndex} className="p-2 whitespace-nowrap">
                  {row[columnIndex] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="text-xs text-slate-500">
      Showing up to 5 products as a preview.
    </p>
  </div>
)}


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

  <Button
    disabled={
      !file ||
      parsedRows.length < 2 ||
      !!headerError ||
      rowValidationErrors.length > 0
    }
  >
    Continue
  </Button>
</div>
