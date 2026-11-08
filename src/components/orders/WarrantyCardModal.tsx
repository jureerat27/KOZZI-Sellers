import React, { useEffect, useState } from 'react';
import { Copy, Download, Loader2, Printer, Share2 } from 'lucide-react';
import { Order } from '../../types';
import { cardDataFromOrder, nextWarrantyNumber, renderWarrantyCard } from '../../utils/warrantyCard';
import { notify } from '../AppNotifier';
import { Modal, btn } from './ui';
import { docFileName } from '../../utils/pdf';

interface Props {
  order: Order;
  orders: Order[];
  onSave: (order: Order) => Promise<Order>;
  onClose: () => void;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export const WarrantyCardModal: React.FC<Props> = ({ order, orders, onSave, onClose }) => {
  const [img, setImg] = useState('');
  const [error, setError] = useState('');
  const [number, setNumber] = useState(order.warrantyNumber || '');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let no = order.warrantyNumber;
        if (!no) {
          // ออกเลขใบรับประกันครั้งแรกแล้วบันทึกไว้กับออเดอร์ (เลขเดิมใช้ซ้ำเมื่อเปิดอีกครั้ง)
          no = nextWarrantyNumber(orders, order.completedDate || order.orderDate);
          await onSave({ ...order, warrantyNumber: no });
        }
        const url = await renderWarrantyCard(cardDataFromOrder(order, no));
        if (alive) {
          setNumber(no);
          setImg(url);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'สร้างใบรับประกันไม่สำเร็จ');
      }
    })();
    return () => {
      alive = false;
    };
    // สร้างครั้งเดียวตอนเปิดหน้าต่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ชื่อไฟล์: เลขใบรับประกัน_ชื่อลูกค้า
  const fileName = `${docFileName(number || order.orderNumber, order.customerName)}.jpg`;

  const download = () => {
    const url = URL.createObjectURL(dataUrlToBlob(img));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const file = () => new File([dataUrlToBlob(img)], fileName, { type: 'image/jpeg' });
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare && !!img && navigator.canShare({ files: [file()] });

  const share = async () => {
    try {
      await navigator.share({ files: [file()], title: 'ใบรับประกันสินค้า KOZZI' });
    } catch (e: any) {
      if (e?.name !== 'AbortError') notify('แชร์รูปไม่สำเร็จ กรุณาใช้ปุ่มดาวน์โหลดแทน');
    }
  };

  const copy = async () => {
    try {
      // คลิปบอร์ดรองรับ PNG: แปลงจาก JPEG ก่อน
      const bmp = await createImageBitmap(dataUrlToBlob(img));
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext('2d')!.drawImage(bmp, 0, 0);
      const png: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      notify('คัดลอกรูปใบรับประกันเรียบร้อยแล้ว นำไปวางในแชท LINE ได้เลย');
    } catch {
      notify('เบราว์เซอร์นี้คัดลอกรูปไม่ได้ กรุณาใช้ปุ่มดาวน์โหลดแทน');
    }
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<html><head><title>${fileName}</title><style>@page{size:A4 landscape;margin:10mm}body{margin:0;display:flex;justify-content:center}img{width:100%;max-width:277mm}</style></head><body><img src="${img}" onload="window.print()"></body></html>`
    );
    w.document.close();
  };

  return (
    <Modal
      wide
      title="ใบรับประกันสินค้า"
      subtitle={number ? `เลขที่ ${number} · ${order.customerName}` : 'กำลังสร้างใบรับประกัน…'}
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-zinc-500 mr-auto">ส่งให้ลูกค้าทาง LINE: กด "แชร์" (มือถือ) หรือ "คัดลอกรูป" แล้ววางในแชท</span>
          {canShare && (
            <button className={btn.primary} onClick={share} disabled={!img}>
              <Share2 className="w-4 h-4" /> แชร์
            </button>
          )}
          <button className={btn.secondary} onClick={copy} disabled={!img}>
            <Copy className="w-4 h-4" /> คัดลอกรูป
          </button>
          <button className={btn.secondary} onClick={print} disabled={!img}>
            <Printer className="w-4 h-4" /> พิมพ์
          </button>
          <button className={canShare ? btn.secondary : btn.primary} onClick={download} disabled={!img}>
            <Download className="w-4 h-4" /> ดาวน์โหลดรูป
          </button>
        </>
      }
    >
      {error ? (
        <div className="p-6 text-center text-sm text-rose-700">{error}</div>
      ) : img ? (
        <img src={img} alt="ใบรับประกันสินค้า" className="w-full rounded-lg border border-zinc-200 shadow-sm bg-white" />
      ) : (
        <div className="p-16 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังสร้างใบรับประกัน…
        </div>
      )}
    </Modal>
  );
};
