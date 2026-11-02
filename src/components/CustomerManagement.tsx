import React, { useState } from 'react';
import { Users, Plus, Search, Phone, MapPin, Edit2, Trash2, X, ShoppingBag, UserRound } from 'lucide-react';
import { Customer, SalesDocument } from '../types';

interface CustomerManagementProps {
  customers: Customer[];
  documents: SalesDocument[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  documents,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [note, setNote] = useState('');

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxId('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email || '');
    setAddress(c.address);
    setTaxId(c.taxId || '');
    setNote(c.note || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      code: editingCustomer
        ? editingCustomer.code
        : `C${(customers.length + 1).toString().padStart(3, '0')}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxId: taxId.trim(),
      lineUserId: editingCustomer?.lineUserId, // คงค่าเดิมไว้ (เลิกใช้ส่ง LINE แล้ว)
      note: note.trim(),
      createdAt: editingCustomer
        ? editingCustomer.createdAt
        : new Date().toISOString().split('T')[0],
    };

    onSaveCustomer(newCust);
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.taxId && c.taxId.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term)) ||
      (c.code && c.code.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-zinc-200/80 px-5 py-5 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
            <Users className="w-8 h-8 stroke-[1.75] shrink-0" />
            <span>ฐานข้อมูลลูกค้า (Customer Database)</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1 sm:ml-11">
            จัดเก็บประวัติลูกค้า ที่อยู่จัดส่ง และเลขประจำตัวผู้เสียภาษีอากร
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-gradient-to-r from-[#0068F0] to-[#0068F0] hover:from-[#0052C7] hover:to-[#0052C7] text-white text-sm font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มข้อมูลลูกค้า</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-zinc-200/80 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า / เบอร์โทรศัพท์ / เลขประจำตัวผู้เสียภาษีอากร (Tax ID) / ที่อยู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-50/30 border border-zinc-200 text-xs text-zinc-800 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Customer List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white border border-zinc-200/80 rounded-2xl p-10 text-center text-zinc-400 text-xs shadow-xs">
            ไม่พบข้อมูลลูกค้าที่ตรงกับคำค้นหา
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const customerDocs = documents.filter((d) => d.customerId === c.id || d.customerName === c.name);
            const totalSpent = customerDocs
              .filter((d) => {
                if (d.status === 'CANCELLED') return false;
                if (d.type === 'RECEIPT') return true;
                if (d.status === 'PAID' || d.status === 'APPROVED') {
                  const hasLinkedReceipt =
                    (d.linkedReceiptNumbers && d.linkedReceiptNumbers.length > 0) ||
                    documents.some((r) => r.type === 'RECEIPT' && r.sourceInvoiceId === d.id);
                  return !hasLinkedReceipt;
                }
                return false;
              })
              .reduce((acc, d) => acc + d.grandTotal, 0);

            return (
              <div
                key={c.id}
                className="bg-white border border-zinc-200/80 hover:border-zinc-200 p-4 rounded-xl space-y-3 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 font-extrabold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-zinc-800">{c.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-50 text-zinc-900 font-bold border border-zinc-200">
                          {c.code}
                        </span>
                      </div>
                      {c.taxId && c.taxId.trim() !== '' && (
                        <p className="text-xs text-zinc-600 font-mono font-medium">
                          เลขประจำตัวผู้เสียภาษี: <span className="text-zinc-800 font-bold">{c.taxId}</span>
                        </p>
                      )}
                      <p className="text-xs text-zinc-600 flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>โทร. {c.phone || 'ไม่ระบุเบอร์'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-lg border border-zinc-200 transition-all"
                      title="แก้ไขลูกค้า"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCustomer(c.id)}
                      className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-rose-600 rounded-lg border border-zinc-200 transition-all"
                      title="ลบลูกค้า"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-zinc-700 bg-zinc-50/40 p-2.5 rounded-lg border border-zinc-100 space-y-1">
                  <p className="flex items-start gap-1.5 text-zinc-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{c.address || 'ไม่ระบุที่อยู่'}</span>
                  </p>
                  {c.note ? (
                    <p className="text-[11px] text-zinc-500 pl-5 italic">
                      {c.note}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-50">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
                    สั่งซื้อแล้ว {customerDocs.length} ออเดอร์
                  </span>
                  <span className="font-extrabold text-zinc-900">
                    ยอดซื้อสะสม: ฿{totalSpent.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-100 text-zinc-800 rounded-xl w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-800 flex items-center gap-2">
                <UserRound className="w-5 h-5" />
                <span>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มข้อมูลลูกค้าใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 bg-zinc-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              {/* Field 1: Customer Name */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  ชื่อลูกค้า / บริษัท <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณอนันต์ ชัยประเสริฐ หรือ บริษัท สยามเทรดดิ้ง จำกัด"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Field 2: Tax ID (Right after Customer Name and before Phone / Address) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1 flex items-center justify-between">
                  <span>เลขประจำตัวผู้เสียภาษีอากร (Tax ID)</span>
                  <span className="text-[10px] font-normal text-zinc-400">ไม่บังคับกรอก</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น 1490700030250 (13 หลัก หรือเว้นว่างได้)"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Field 3: Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="เช่น 0898765432"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Field 4: Address */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">ที่อยู่สำหรับจัดส่งและออกเอกสาร</label>
                <textarea
                  rows={2}
                  placeholder="เช่น 123/45 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                ></textarea>
              </div>

              {/* Field 6: Note */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น ลูกค้าประจำ ชอบให้ส่งพัสดุช่วงบ่าย"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-semibold rounded-lg transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0068F0] hover:bg-[#0052C7] text-white text-xs font-bold rounded-lg shadow-xs transition-all"
                >
                  บันทึกลูกค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
