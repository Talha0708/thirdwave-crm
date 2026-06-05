import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Clock, CheckCircle2, Truck, Package, GripVertical, MoreVertical, Search, Filter, Loader2, Plus } from 'lucide-react';

const OrderPipeline = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrderId, setDraggedOrderId] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  // ─── 1. Fetch Real Orders from Database ───
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/orders`, config);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
  }, [token]);

  // ─── 2. Native Drag & Drop Handlers (Optimistic UI) ───
  const handleDragStart = (e, id) => {
    setDraggedOrderId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedOrderId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Drop allow করার জন্য মাস্ট
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedOrderId) return;

    // 💥 ম্যাজিক: Optimistic Update (আগে স্ক্রিনে চেঞ্জ হবে, তারপর ডেটাবেসে যাবে)
    const previousOrders = [...orders];
    setOrders((prev) => 
      prev.map((order) => 
        order._id === draggedOrderId ? { ...order, status: newStatus } : order
      )
    );

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      // ব্যাকএন্ডে স্ট্যাটাস আপডেট রিকোয়েস্ট
      await axios.put(`${API_URL}/orders/${draggedOrderId}`, { status: newStatus }, config);
    } catch (error) {
      console.error("Failed to update status", error);
      alert("⚠️ Server error! Couldn't move the order.");
      setOrders(previousOrders); // ফেইল করলে আগের অবস্থায় ফেরত যাবে
    }
  };

  // ─── 3. Test Order Generator (টেলস্টিং এর জন্য) ───
  const handleAddTestOrder = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const testOrder = {
        customerName: "Aurelian VIP " + Math.floor(Math.random() * 100),
        customerPhone: "01711-" + Math.floor(100000 + Math.random() * 900000),
        customerAddress: "Dhaka, Bangladesh",
        productName: "Premium Oxford Shirt",
        totalAmount: 1090,
        status: "Pending" // Capitalized to match backend enum
      };
      await axios.post(`${API_URL}/orders`, testOrder, config);
      fetchOrders(); // নতুন ডেটা রিফ্রেশ করা
    } catch (error) {
      alert("Failed to add test order");
    }
  };

  // ─── Column Configuration (Matching Backend Enum) ───
  const columns = [
    { id: 'Pending', title: 'Pending Orders', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    { id: 'Processing', title: 'Processing', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { id: 'Shipped', title: 'Shipped', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { id: 'Delivered', title: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
  ];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Order Pipeline</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and track customer orders via drag-and-drop.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* 💥 টেস্টিং বাটন */}
          <button onClick={handleAddTestOrder} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Test Order
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search order..." 
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
          <button className="p-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Kanban Board ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-zinc-500 text-sm">Loading pipeline...</p>
        </div>
      ) : (
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
                      key={order._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order._id)}
                      onDragEnd={handleDragEnd}
                      className="bg-[#111111] border border-zinc-800 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors shadow-sm group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700">
                            {order._id.slice(-6).toUpperCase()} {/* ID এর লাস্ট ৬ ডিজিট */}
                          </span>
                        </div>
                        <button className="text-zinc-600 hover:text-zinc-300 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h4 className="font-medium text-zinc-200 text-sm mb-1">{order.customerName}</h4>
                      <p className="text-xs text-zinc-500 mb-3">{order.customerPhone}</p>
                      
                      <div className="p-2 bg-[#0A0A0A] rounded-lg border border-zinc-800/50 mb-3">
                        <p className="text-xs text-zinc-400 truncate">{order.productName}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300">৳ {order.totalAmount}</span>
                        <span className="text-zinc-600">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty State placeholder */}
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
      )}
    </div>
  );
};

export default OrderPipeline;