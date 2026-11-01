import { Product, SalesDocument, SellerProfile } from '../types';
import { formatCurrency, formatDate } from './format';

export function formatDocumentForLine(doc: SalesDocument, seller: SellerProfile): string {
  const typeText =
    doc.type === 'QUOTATION'
      ? '📋 ใบเสนอราคา'
      : doc.type === 'INVOICE'
      ? (doc.paymentStage === 'DEPOSIT' ? '📄 ใบแจ้งหนี้ (เงินมัดจำ)' : doc.paymentStage === 'BALANCE' ? '📄 ใบแจ้งหนี้ (ยอดคงเหลือ)' : '📄 ใบแจ้งหนี้')
      : (doc.paymentStage === 'DEPOSIT' ? '🧾 ใบเสร็จรับเงิน (เงินมัดจำ)' : doc.paymentStage === 'BALANCE' ? '🧾 ใบเสร็จรับเงิน (ยอดคงเหลือ)' : '🧾 ใบเสร็จรับเงิน');

  let text = `${typeText} (${doc.docNumber})\n`;
  text += `ร้าน: ${seller.name}\n`;
  text += `ลูกค้า: ${doc.customerName}\n`;
  if (doc.customerTaxId) {
    text += `เลขประจำตัวผู้เสียภาษี: ${doc.customerTaxId}\n`;
  }
  text += `วันที่: ${formatDate(doc.date)}\n`;
  if (doc.parentQuotationDocNumber) {
    text += `อ้างอิงใบเสนอราคา: ${doc.parentQuotationDocNumber}\n`;
  }
  text += `--------------------------------\n`;
  doc.items.forEach((item, index) => {
    text += `${index + 1}. ${item.productName}\n   ${item.quantity} x ฿${formatCurrency(item.price)} = ฿${formatCurrency(item.total)}\n`;
  });
  text += `--------------------------------\n`;
  if (doc.shippingFee > 0) {
    text += `ค่าจัดส่ง: ฿${formatCurrency(doc.shippingFee)}\n`;
  }
  if (doc.discountAmount > 0) {
    text += `ส่วนลด: -฿${formatCurrency(doc.discountAmount)}\n`;
  }
  text += `💰 ยอดเงินตามเอกสาร: ฿${formatCurrency(doc.grandTotal)}\n`;

  if (doc.type === 'QUOTATION' && doc.paymentTermType === 'DEPOSIT') {
    text += `--------------------------------\n`;
    text += `📌 เงื่อนไขการชำระเงินมัดจำ:\n`;
    text += `• เงินมัดจำ (${doc.depositPercent ? `${doc.depositPercent}%` : 'งวดที่ 1'}): ฿${formatCurrency(doc.depositAmount || 0)}\n`;
    text += `• ยอดคงเหลือส่งมอบงาน: ฿${formatCurrency(doc.balanceAmount || 0)}\n`;
  }

  text += `--------------------------------\n`;

  if (doc.type !== 'RECEIPT' && seller.promptPayNumber) {
    text += `💳 ช่องทางชำระเงิน PromptPay:\n`;
    text += `เลขพร้อมเพย์: ${seller.promptPayNumber}\n`;
    text += `ชื่อบัญชี: ${seller.bankAccountName || seller.name}\n`;
    if (seller.bankName) {
      text += `ธนาคาร: ${seller.bankName} (${seller.bankAccountNo})\n`;
    }
  }

  if (doc.notes) {
    text += `\nหมายเหตุ: ${doc.notes}\n`;
  }

  text += `\nขอบคุณที่ไว้วางใจใช้บริการครับ 🙏`;
  return text;
}

export function formatLowStockAlert(lowStockProducts: Product[]): string {
  let text = `⚠️ แจ้งเตือนสินค้าใกล้หมดสต็อก (${lowStockProducts.length} รายการ)\n`;
  text += `--------------------------------\n`;
  lowStockProducts.forEach((p, idx) => {
    text += `${idx + 1}. ${p.name} [${p.sku}]\n   คงเหลือ: ${p.stock} ${p.unit} (จุดเตือน: ${p.minStock} ${p.unit})\n`;
  });
  text += `--------------------------------\n`;
  text += `กรุณาเติมสต็อกสินค้าเพื่อป้องกันสินค้าขาดแคลนครับ 📦`;
  return text;
}
