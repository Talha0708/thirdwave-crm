import React, { useState } from 'react';
import { Clock, CheckCircle2, Truck, Package, GripVertical, MoreVertical, Search, Filter } from 'lucide-react';

// ডামি ডেটা (টেস্টিং এর জন্য)
const initialOrders = [
  { id: 'ORD-1042', customer: 'Rakib Hasan', phone: '01711-XXXXXX', product: 'Aurelian Premium Oxford Shirt', price: '৳ 1090', date: '2 mins ago', status: 'pending' },
  { id: 'ORD-1043', customer: 'Sadia Islam', phone: '01912-XXXXXX', product: 'Aurelian Campaign Tee', price: '৳ 799', date: '1 hour ago', status: 'pending' },
  { id: 'ORD-1041', customer: 'Tanvir Ahmed', phone: '01819-XXXXXX', product: 'Aurelian Classic Polo', price: '৳ 1090', date: '3 hours ago', status: 'processing' },
  { id: 'ORD-1039', customer: 'Fahim Faysal', phone: '01677-XXXXXX', product: 'Premium Trouser', price: '৳ 1200', date: '1 day ago', status: 'shipped' },
  { id: 'ORD-1035', customer: 'Mehedi Hasan', phone: '01755-XXXXXX', product: 'Aurelian Campaign Tee', price: '৳ 799', date: '2 days ago', status: 'delivered' },
];

const OrderPipeline = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [draggedOrderId, setDraggedOrderId] = useState(null);

  // ─── Native Drag & Drop Handlers (100% Bug Free) ───
  const handleDragStart = (e, id) => {
    setDraggedOrderId(id);
    e.dataTransfer.effectAllowed = 'move';
    // একটু ডিলে করে ট্রান্সপারেন্ট করা যাতে ড্র্যাগ করার সময় সুন্দর লাগে
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedOrderId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Drop allow করার জন্য এটা মাস্ট
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedOrderId) {
      setOrders((prev) => 
        prev.map((order) => 
          order.id === draggedOrderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  // ─── Column Configuration ───
  const columns = [
    { id: 'pending', title: 'Pending Orders', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    { id: 'processing', title: 'Processing', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { id: 'shipped', title: 'Shipped', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { id: 'delivered', title: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Order Pipeline</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and track customer orders via drag-and-drop.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search order ID..." 
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <button className="p-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Kanban Board ─── */}
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-6 min-w-[1000px] h-full items-start">
          
          {columns.map((col) => (
            <div 
              key={col.id} 
              className="flex-1 min-w-[280px] bg-[#0A0A0A]/50 border border-zinc-800/50 rounded-2xl flex flex-col max-h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-sm rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${col.bg} ${col.border} border`}>
                    <col.icon className={`w-4 h-4 ${col.color}`} />
                  </div>
                  <h3 className="font-medium text-zinc-200 text-sm">{col.title}</h3>
                </div>
                <span className="text-xs font-semibold text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full border border-zinc-800">
                  {orders.filter(o => o.status === col.id).length}
                </span>
              </div>

              {/* Column Body (Draggable Cards) */}
              <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-[150px]">
                {orders.filter(o => o.status === col.id).map((order) => (
                  <div
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    onDragEnd={handleDragEnd}
                    className="bg-[#111111] border border-zinc-800 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors shadow-sm group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xs font-semibold text-white bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700">
                          {order.id}
                        </span>
                      </div>
                      <button className="text-zinc-600 hover:text-zinc-300 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-medium text-zinc-200 text-sm mb-1">{order.customer}</h4>
                    <p className="text-xs text-zinc-500 mb-3">{order.phone}</p>
                    
                    <div className="p-2 bg-[#0A0A0A] rounded-lg border border-zinc-800/50 mb-3">
                      <p className="text-xs text-zinc-400 truncate">{order.product}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">{order.price}</span>
                      <span className="text-zinc-600">{order.date}</span>
                    </div>
                  </div>
                ))}
                
                {/* Empty State placeholder if column is empty */}
                {orders.filter(o => o.status === col.id).length === 0 && (
                  <div className="h-24 border-2 border-dashed border-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-600 text-xs font-medium">
                    Drop orders here
                  </div>
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};

export default OrderPipeline;