// Pesan order WhatsApp (diadaptasi dari src/utils/whatsapp.ts repo asli,
// di-Indonesia-kan; tanpa payment gateway apa pun).

/** Normalisasi nomor WhatsApp Indonesia ke digit internasional (62...). */
export function normalizeWaDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  return digits;
}

export function buildOrderWhatsAppUrl(
  sellerPhone: string,
  params: {
    storeName: string;
    productName: string;
    quantity: number;
    total: number;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    paymentMethod: string;
    notes?: string;
  },
): string {
  const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const methodLabel =
    params.paymentMethod === 'cod'
      ? 'COD (bayar di tempat)'
      : params.paymentMethod === 'transfer'
        ? 'Transfer bank'
        : 'WhatsApp';
  const lines = [
    `Halo, saya baru saja memesan di ${params.storeName}.`,
    '',
    `Produk: ${params.productName}`,
    `Jumlah: ${params.quantity}`,
    `Total: ${params.total > 0 ? rupiah.format(params.total) : 'Tanya Harga'}`,
    `Metode pembayaran: ${methodLabel}`,
    '',
    `Nama: ${params.customerName}`,
    `No. WhatsApp: ${params.customerPhone}`,
    ...(params.customerAddress ? [`Alamat: ${params.customerAddress}`] : []),
    ...(params.notes ? [`Catatan: ${params.notes}`] : []),
  ];
  return `https://wa.me/${normalizeWaDigits(sellerPhone)}?text=${encodeURIComponent(lines.join('\n'))}`;
}
