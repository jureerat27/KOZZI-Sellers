import React, { useState } from 'react';
import { Users, Plus, Search, Phone, MapPin, Edit2, Trash2, X, ShoppingBag } from 'lucide-react';
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
      name,
      phone,
      email,
      address,
      taxId,
      note,
      createdAt: editingCustomer
        ? editingCustomer.createdAt
        : new Date().toISOString().split('T')[0],
    };

    onSaveCustomer(newCust);
    setIsModalOpen(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-rose-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">👥</span>
            <span>ฐานข้อมูลลูกค้า (Customer Database)</span>
          </h1>
          <p className="text-xs text-slate-500">
            จัดเก็บประวัติลูกค้า ที่อยู่จัดส่ง และเลขประจำตัวผู้เสียภาษี 🌸
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มข้อมูลลูกค้า 👤</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white/90 border border-rose-100 p-4 rounded-2xl shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-pink-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า / เบอร์โทรศัพท์ / ที่อยู่..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-pink-50/30 border border-pink-200 text-xs text-slate-800 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-pink-400"
          />
        </div>
      </div>

      {/* Customer List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white/90 border border-rose-100 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-xs">
            🌸 ไม่พบข้อมูลลูกค้า
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const customerDocs = documents.filter((d) => d.customerId === c.id || d.customerName === c.name);
            const totalSpent = customerDocs
              .filter((d) => d.status === 'PAID')
              .reduce((acc, d) => acc + d.grandTotal, 0);

            return (
              <div
                key={c.id}
                className="bg-white/90 border border-rose-100 hover:border-pink-200 p-4 rounded-2xl space-y-3 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600 font-extrabold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-800">{c.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 font-bold border border-pink-200">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                        <Phone className="w-3 h-3 text-pink-400" />
                        <span>{c.phone || 'ไม่ระบุเบอร์'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 transition-all"
                      title="แก้ไขลูกค้า"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCustomer(c.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition-all"
                      title="ลบลูกค้า"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-pink-50/40 p-2.5 rounded-xl border border-pink-100 space-y-1">
                  <p className="flex items-start gap-1.5 text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span>{c.address || 'ไม่ระบุที่อยู่'}</span>
                  </p>
                  {c.taxId && (
                    <p className="text-[11px] text-slate-500 pl-5 font-mono">
                      💳 เลขผู้เสียภาษี: {c.taxId}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-50">
                  <span className="text-slate-500 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-pink-400" />
                    สั่งซื้อแล้ว {customerDocs.length} ออเดอร์ 🛍️
                  </span>
                  <span className="font-extrabold text-pink-600">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 text-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <span className="text-xl">👤</span>
                <span>{editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มข้อมูลลูกค้าใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-rose-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อ-นามสกุล / บริษัท *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณอนันต์ ชัยประเสริฐ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="เช่น 0898765432"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">อีเมล</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ที่อยู่สำหรับจัดส่งและออกเอกสาร</label>
                <textarea
                  rows={2}
                  placeholder="เช่น 123/45 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                ></textarea>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  เลขผู้เสียภาษี / เลขบัตรประชาชน
                </label>
                <input
                  type="text"
                  placeholder="13 หลัก"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  placeholder="เช่น ลูกค้าประจำ ชอบให้ส่งพัสดุช่วงบ่าย"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  บันทึกลูกค้า 🌸
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
