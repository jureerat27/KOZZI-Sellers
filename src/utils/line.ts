import { Product, SalesDocument, SellerProfile } from '../types';

export async function sendLineNotification(
  token: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: 'กรุณากรอก LINE Notify Token ในการตั้งค่าก่อน' };
  }

  try {
    const res = await fetch('/api/line/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, message }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'ส่งการแจ้งเตือน LINE ไม่สำเร็จ' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
  }
}

export function formatDocumentForLine(doc: SalesDocument, seller: SellerProfile): string {
  const typeText =
    doc.type === 'QUOTATION'
      ? '📋 ใบเสนอราคา'
      : doc.type === 'INVOICE'
      ? '📄 ใบแจ้งหนี้'
      : '🧾 ใบเสร็จรับเงิน';

  let text = `${typeText} (${doc.docNumber})\n`;
  text += `ร้าน: ${seller.name}\n`;
  text += `ลูกค้า: ${doc.customerName}\n`;
  text += `วันที่: ${doc.date}\n`;
  text += `--------------------------------\n`;
  doc.items.forEach((item, index) => {
    text += `${index + 1}. ${item.productName}\n   ${item.quantity} x ฿${item.price.toLocaleString()} = ฿${item.total.toLocaleString()}\n`;
  });
  text += `--------------------------------\n`;
  if (doc.shippingFee > 0) {
    text += `ค่าจัดส่ง: ฿${doc.shippingFee.toLocaleString()}\n`;
  }
  if (doc.discountAmount > 0) {
    text += `ส่วนลด: -฿${doc.discountAmount.toLocaleString()}\n`;
  }
  text += `💰 ยอดรวมสุทธิ: ฿${doc.grandTotal.toLocaleString()}\n`;
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
