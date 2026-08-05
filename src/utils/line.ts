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

export async function sendLineOaPushNotification(
  channelAccessToken: string,
  lineUserId: string,
  message?: string,
  flexMessage?: any
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!channelAccessToken) {
    return { success: false, error: 'กรุณากรอก LINE OA Channel Access Token ในหน้าตั้งค่าก่อน' };
  }
  if (!lineUserId) {
    return { success: false, error: 'กรุณากรอก LINE User ID ของลูกค้า' };
  }

  try {
    const res = await fetch('/api/line/oa/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelAccessToken, lineUserId, message, flexMessage }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    } else {
      return { success: false, error: data.error || 'ไม่สามารถส่งข้อความผ่าน LINE OA ได้' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ LINE OA ได้' };
  }
}

export function generateFlexReceipt(doc: SalesDocument, seller: SellerProfile): any {
  const docTypeName =
    doc.type === 'QUOTATION'
      ? 'ใบเสนอราคา'
      : doc.type === 'INVOICE'
      ? 'ใบแจ้งหนี้ / ใบวางบิล'
      : 'ใบเสร็จรับเงิน';

  const docTypeColor = doc.type === 'RECEIPT' ? '#059669' : doc.type === 'INVOICE' ? '#2563EB' : '#D97706';

  const itemContents = doc.items.map((item) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `${item.productName} (x${item.quantity})`,
        size: 'xs',
        color: '#475569',
        flex: 3,
        wrap: true,
      },
      {
        type: 'text',
        text: `฿${item.total.toLocaleString()}`,
        size: 'xs',
        color: '#0F172A',
        align: 'end',
        weight: 'bold',
        flex: 2,
      },
    ],
    margin: 'md',
  }));

  return {
    type: 'flex',
    altText: `🧾 เอกสาร ${docTypeName} (${doc.docNumber}) จาก ${seller.name}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: seller.name || 'ร้านค้าออนไลน์',
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
          },
          {
            type: 'text',
            text: `${docTypeName} • ${doc.docNumber}`,
            color: '#FFFFFF',
            size: 'xs',
            margin: 'xs',
          },
        ],
        backgroundColor: docTypeColor,
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `เรียนคุณ ${doc.customerName}`,
            weight: 'bold',
            size: 'sm',
            color: '#0F172A',
          },
          {
            type: 'text',
            text: `วันที่ออกเอกสาร: ${doc.date}`,
            size: 'xs',
            color: '#64748B',
            margin: 'xs',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: itemContents,
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'ยอดสุทธิทั้งสิ้น',
                weight: 'bold',
                size: 'sm',
                color: '#0F172A',
              },
              {
                type: 'text',
                text: `฿${doc.grandTotal.toLocaleString()}`,
                weight: 'bold',
                size: 'lg',
                color: '#059669',
                align: 'end',
              },
            ],
          },
          ...(seller.promptPayNumber && doc.type !== 'RECEIPT'
            ? [
                {
                  type: 'box' as const,
                  layout: 'vertical' as const,
                  margin: 'md' as const,
                  backgroundColor: '#F8FAFC',
                  paddingAll: 'md' as const,
                  cornerRadius: 'md' as const,
                  contents: [
                    {
                      type: 'text' as const,
                      text: `💳 ชำระผ่าน PromptPay: ${seller.promptPayNumber}`,
                      size: 'xs' as const,
                      color: '#2563EB',
                      weight: 'bold' as const,
                    },
                    {
                      type: 'text' as const,
                      text: `ชื่อบัญชี: ${seller.bankAccountName || seller.name}`,
                      size: 'xs' as const,
                      color: '#475569',
                      margin: 'xs' as const,
                    },
                  ],
                },
              ]
            : []),
        ],
        paddingAll: 'lg',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ขอบคุณที่อุดหนุนสินค้าและบริการของเราค่ะ/ครับ 🙏',
            size: 'xs',
            color: '#94A3B8',
            align: 'center',
          },
        ],
        paddingAll: 'md',
      },
    },
  };
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
