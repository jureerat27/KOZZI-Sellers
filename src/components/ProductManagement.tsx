import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  TrendingUp,
  Send,
  PlusCircle,
  MinusCircle,
  PackagePlus,
} from 'lucide-react';
import { Product, SellerProfile } from '../types';
import { getOrderOptions } from '../utils/orders';

interface ProductManagementProps {
  products: Product[];
  seller: SellerProfile;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
  onSendLineNotify: (message: string) => void;
  showAddModalDirectly?: boolean;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  seller,
  onSaveProduct,
  onDeleteProduct,
  onUpdateStock,
  onSendLineNotify,
  showAddModalDirectly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(showAddModalDirectly);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('อุปกรณ์ไอที');
  const [price, setPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [stock, setStock] = useState(10);
  const [minStock, setMinStock] = useState(5);
  const [unit, setUnit] = useState('ชิ้น');
  const [description, setDescription] = useState('');
  const [productLine, setProductLine] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const orderOpts = getOrderOptions(seller);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setSku(`P${(products.length + 1).toString().padStart(3, '0')}`);
    setName('');
    setCategory('อุปกรณ์ไอที');
    setPrice(100);
    setCostPrice(50);
    setStock(10);
    setMinStock(5);
    setUnit('ชิ้น');
    setDescription('');
    setProductLine('');
    setModel('');
    setColor('');
    setSize('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price);
    setCostPrice(p.costPrice);
    setStock(p.stock);
    setMinStock(p.minStock);
    setUnit(p.unit);
    setDescription(p.description || '');
    setProductLine(p.productLine || '');
    setModel(p.model || '');
    setColor(p.color || '');
    setSize(p.size || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: sku || `P${Date.now().toString().slice(-4)}`,
      name,
      category,
      price: Number(price) || 0,
      costPrice: Number(costPrice) || 0,
      stock: Number(stock) || 0,
      minStock: Number(minStock) || 0,
      unit,
      description,
      productLine: productLine.trim() || undefined,
      model: model.trim() || undefined,
      color: color.trim() || undefined,
      size: size.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(newProd);
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = !showLowStockOnly || p.stock <= p.minStock;

    return matchesCategory && matchesSearch && matchesLowStock;
  });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-zinc-100 p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-zinc-800 flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span>คลังสินค้า & การจัดการสต็อก</span>
          </h1>
          <p className="text-xs text-zinc-500">
            ระบบบริหารสินค้าคงคลัง พร้อมแจ้งเตือนสต็อกต่ำอัตโนมัติ
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-gradient-to-r from-zinc-900 to-zinc-900 hover:from-zinc-900 hover:to-zinc-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มสินค้าใหม่</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/90 border border-zinc-100 p-4 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Low stock toggle filter */}
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                showLowStockOnly
                  ? 'bg-zinc-100 border-rose-300 text-rose-800'
                  : 'bg-zinc-50/60 border-zinc-100 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>สินค้าใกล้หมด ({lowStockCount})</span>
            </button>

            {/* Category Filter Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-50/40 border border-zinc-200 text-xs text-zinc-700 font-bold rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="ALL">ทุกหมวดหมู่สินค้า</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="ค้นหารหัส SKU / ชื่อสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50/30 border border-zinc-200 text-xs text-zinc-800 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Product List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white/90 border border-zinc-100 rounded-xl p-10 text-center text-zinc-400 text-xs shadow-xs">
            ไม่พบสินค้าตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLowStock = p.stock <= p.minStock;
            const profitPerUnit = p.price - p.costPrice;

            return (
              <div
                key={p.id}
                className={`bg-white/90 border p-4 rounded-xl transition-all shadow-xs space-y-3 ${
                  isLowStock
                    ? 'border-rose-300 bg-zinc-50/40'
                    : 'border-zinc-100 hover:border-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-900 shrink-0">
                      <Package className="w-6 h-6 text-zinc-800" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-800">{p.name}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        SKU: <span className="font-mono text-zinc-700 font-semibold">{p.sku}</span> • {p.category}
                      </p>
                      {p.model && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {[p.productLine, p.model, p.color, p.size].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-lg border border-zinc-200"
                      title="แก้ไขสินค้า"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(p.id)}
                      className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-rose-600 rounded-lg border border-zinc-200"
                      title="ลบสินค้า"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Pricing & Margin Info */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-zinc-50/40 rounded-lg text-xs border border-zinc-100/60">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">ราคาขาย</span>
                    <span className="font-extrabold text-zinc-800">฿{p.price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">ต้นทุน</span>
                    <span className="font-semibold text-zinc-600">฿{p.costPrice.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">กำไร/ชิ้น</span>
                    <span className="font-bold text-zinc-900">
                      +฿{profitPerUnit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-medium">สต็อกคงเหลือ:</span>
                    <span
                      className={`text-sm font-bold px-2.5 py-0.5 rounded-lg border ${
                        isLowStock
                          ? 'bg-zinc-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                    {isLowStock && (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        ต่ำกว่า {p.minStock} {p.unit}
                      </span>
                    )}
                  </div>

                  {/* Quick Inline Adjustment */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onUpdateStock(p.id, Math.max(0, p.stock - 1))}
                      className="p-1 text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-all"
                      title="ลดสต็อก 1"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onUpdateStock(p.id, p.stock + 1)}
                      className="p-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all"
                      title="เพิ่มสต็อก 1"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-100 text-zinc-800 rounded-xl w-full max-w-lg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-base text-zinc-800 flex items-center gap-2">
                <PackagePlus className="w-5 h-5" />
                <span>{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่เข้าคลัง'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 bg-zinc-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">รหัสสินค้า (SKU)</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">หมวดหมู่สินค้า</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="เช่น อุปกรณ์ไอที, แฟชั่น"
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">ชื่อสินค้า *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น หูฟังบลูทูธไร้สาย เสียงระดับ HD"
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">ราคาขาย (บาท) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-bold text-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">ต้นทุนสินค้า (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">จำนวนสต็อก</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">จุดเตือนสต็อกต่ำ</label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="เช่น ชิ้น, ใบ, กล่อง"
                    className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-zinc-700">
                  ข้อมูลรุ่น (ใช้ตัดสต็อกจากออเดอร์อัตโนมัติ — กรอก MODEL, สี, ขนาด ให้ครบ)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'รุ่น', value: productLine, set: setProductLine, list: orderOpts.productLines.map((l) => l.name), id: 'pl' },
                    { label: 'MODEL', value: model, set: setModel, list: orderOpts.models, id: 'md' },
                    { label: 'สี', value: color, set: setColor, list: orderOpts.colors, id: 'cl' },
                    { label: 'ขนาด', value: size, set: setSize, list: orderOpts.sizes, id: 'sz' },
                  ].map((f) => (
                    <div key={f.id}>
                      <label className="block text-[11px] font-bold text-zinc-600 mb-1">{f.label}</label>
                      <input
                        type="text"
                        list={`prod-opt-${f.id}`}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                      />
                      <datalist id={`prod-opt-${f.id}`}>
                        {f.list.map((v) => (
                          <option key={v} value={v} />
                        ))}
                      </datalist>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">คำอธิบายเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-50/30 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 text-xs font-semibold rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  บันทึกสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
