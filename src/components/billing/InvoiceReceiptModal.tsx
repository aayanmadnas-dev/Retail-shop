import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Sale, CartItem, Customer, Business } from '../../types/database';
import { Printer, Share2, Check, Download, Store, MessageCircle } from 'lucide-react';

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  items: CartItem[];
  customer: Customer | null;
  business: Business | null;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  items,
  customer,
  business,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const generateInvoicePdf = async () => {
    const element = document.getElementById('printable-invoice');

    if (!element) {
      throw new Error('Invoice receipt not found');
    }

    const html2canvas = (await import('html2canvas-pro')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const imageData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const image = pdf.getImageProperties(imageData);

    const availableWidth = pageWidth - 20;
    const availableHeight = pageHeight - 20;

    const scale = Math.min(
      availableWidth / image.width,
      availableHeight / image.height
    );

    const width = image.width * scale;
    const height = image.height * scale;

    pdf.addImage(
      imageData,
      'PNG',
      (pageWidth - width) / 2,
      10,
      width,
      height
    );

    return pdf;
  };

  // Download invoice PDF
  const handleDownloadPDF = async () => {
    try {
      const pdf = await generateInvoicePdf();

      pdf.save(`Invoice-${sale.invoice_number}.pdf`);
    } 
    catch (error) {
  console.error('PDF generation failed:', error);

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  alert(`PDF generation failed: ${message}`);
}
  };

  // Share actual PDF using the phone's native sharing menu
  const handleSharePDF = async () => {
    try {
      const pdf = await generateInvoicePdf();

      const blob = pdf.output('blob');

      const file = new File(
        [blob],
        `Invoice-${sale.invoice_number}.pdf`,
        { type: 'application/pdf' }
      );

      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `Invoice ${sale.invoice_number}`,
          text: `Invoice from ${business?.name || 'RetailFlow Store'}`,
        });
      } else {
        pdf.save(`Invoice-${sale.invoice_number}.pdf`);

        alert(
          'PDF downloaded. Open WhatsApp and attach the downloaded invoice.'
        );
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('PDF sharing failed:', error);
        alert('Unable to share PDF. Please download it instead.');
      }
    }
  };

  // Open the specific customer's WhatsApp chat
  const handleShareWhatsApp = () => {
    const rawPhone = sale.customer_phone || customer?.phone || '';
    let phone = rawPhone.replace(/\D/g, '');

    // Automatically add India's country code for 10-digit numbers
    if (phone.length === 10) {
      phone = `91${phone}`;
    }

    if (phone.length < 10 || phone.length > 15) {
      alert('Please enter a valid customer WhatsApp number.');
      return;
    }

    const message = `Hello ${customer?.name || 'Customer'},

Thank you for shopping at ${business?.name || 'our store'}.

Your invoice number is ${sale.invoice_number}.
Total Amount: ${formatCurrency(sale.total)}.

Please find your invoice PDF attached.

Thank you!`;

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank');
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice & Bill Receipt"
      description={`Generated successfully: ${sale.invoice_number}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Printable Invoice Container */}
        <div
          id="printable-invoice"
          className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 text-slate-800 text-xs shadow-xs"
        >
          {/* Shop Header */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
              {business?.name || 'RetailFlow Store'}
            </h2>
            {business?.address && (
              <p className="text-slate-500 mt-0.5">{business.address}</p>
            )}
            {business?.phone && (
              <p className="text-slate-500">Ph: {business.phone}</p>
            )}
            {business?.email && (
              <p className="text-slate-500">Email: {business.email}</p>
            )}
            <div className="mt-2 inline-block px-2.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Retail Tax Invoice
            </div>
          </div>

          {/* Invoice & Customer Meta */}
          <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Invoice Details</span>
              <p className="font-mono font-bold text-slate-900">{sale.invoice_number}</p>
              <p className="text-slate-500">{formatDate(sale.created_at, true)}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Billed To</span>
              <p className="font-bold text-slate-900">{customer?.name || 'Walk-in Customer'}</p>
              {(sale.customer_phone || customer?.phone) && (
  <p className="text-slate-500">
    {sale.customer_phone || customer?.phone}
  </p>
)}
              {customer?.address && <p className="text-slate-500 truncate">{customer.address}</p>}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-3">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {items.map((item, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-1.5 pr-2 font-sans font-medium">
                      {item.product.name}
                      {item.product.sku && (
                        <span className="text-[10px] text-slate-400 ml-1">({item.product.sku})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-center">
                      {item.quantity} {item.product.unit}
                    </td>
                    <td className="py-1.5 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="pt-3 border-t border-slate-200 space-y-1 text-right font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {Number(sale.tax_amount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax:</span>
                <span>+{formatCurrency(sale.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
          </div>

          {/* Payment Status Bar */}
          <div className="mt-4 p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-500">Payment Mode: </span>
              <span className="font-bold text-slate-800 uppercase">{sale.payment_method}</span>
            </div>
            <div>
              <span className="text-slate-500">Status: </span>
              <span className={`font-bold uppercase ${sale.payment_status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {sale.payment_status}
              </span>
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center pt-4 text-[10px] text-slate-400 border-t border-slate-100 mt-4">
            Thank you for your visit! Please visit again.
          </div>
        </div>

               {/* Action Buttons (Excluded from print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 no-print">
          <div className="flex flex-wrap items-center gap-2">

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDownloadPDF}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSharePDF}
              className="gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              Share PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleShareWhatsApp}
              className="gap-1.5 text-emerald-700 border-emerald-200"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Chat
            </Button>

          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onClose}
          >
            New Bill
          </Button>
        </div>

      </div>
    </Modal>
  );
};
