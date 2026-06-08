import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Clock, CheckCircle2, Truck, Package, GripVertical, 
  MoreVertical, Search, Filter, Loader2, Plus, X, MapPin 
} from 'lucide-react'; // 💥 MapPin আইকন অ্যাড করা হলো

const OrderPipeline = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedOrderId, setDraggedOrderId] = useState(null);
  
  // 💥 Dropdown Menu State
  const [activeDropdown, setActiveDropdown] = useState(null);

  // ─── Modal States ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '', customerPhone: '', customerAddress: '', productName: '', totalAmount: '', status: 'Pending'
  });

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  // ─── 1. Fetch Real Orders ───
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

  // ─── 2. Universal Status Update Logic ───
  const handleStatusChange = async (orderId, newStatus) => {
    setActiveDropdown(null); 
    
    const orderToMove = orders.find(o => o._id === orderId);
    if (orderToMove && orderToMove.status === newStatus) return;

    // Optimistic Update
    const previousOrders = [...orders];
    setOrders((prev) => 
      prev.map((order) => 
        order._id === orderId ? { ...order, status: newStatus } : order
      )
    );

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/orders/${orderId}`, { status: newStatus }, config);
    } catch (error) {
      console.error("Failed to update status", error);
      alert("⚠️ Server error! Couldn't move the order.");
      setOrders(previousOrders); 
    }
  };

  // ─── 3. Drag & Drop Handlers ───
  const handleDragStart = (e, id) => {
    setDraggedOrderId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
    setActiveDropdown(null); 
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedOrderId(null);
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedOrderId) {
      handleStatusChange(draggedOrderId, newStatus);
    }
  };

  // ─── 4. Add Order Form Submit ───
  const handleAddOrder = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
          ...formData,
          totalAmount: Number(formData.totalAmount)
      };

      await axios.post(`${API_URL}/orders`, payload, config);
      
      setIsModalOpen(false);
      setFormData({ customerName: '', customerPhone: '', customerAddress: '', productName: '', totalAmount: '', status: 'Pending' });
      fetchOrders(); 
    } catch (err) {
      console.error("Failed to add order", err);
      const errorMessage = err.response?.data?.error || err.message || "Unknown Error";
      alert(`⚠️ Save Failed!\nReason: ${errorMessage}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { id: 'Pending', title: 'Pending Orders', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
    { id: 'Processing', title: 'Processing', icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { id: 'Shipped', title: 'Shipped', icon: Truck, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { id: 'Delivered', title: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
  ];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      
      {/* ─── ADD ORDER MODAL ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl my-8">
                <div className="flex justify-between items-center p-6 border-b border-zinc-800/50 sticky top-0 bg-[#0A0A0A] rounded-t-2xl z-10">
                    <h2 className="text-xl font-semibold text-white">Create New Order</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAddOrder} className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-zinc-400 block mb-1.5">Customer Name</label>
                        <input required type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Rakib Hasan" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Phone Number</label>
                            <input required type="text" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="017XXXXXXXX" />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 block mb-1.5">Total Amount (৳)</label>
                            <input required type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="1090" />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-zinc-400 block mb-1.5">Delivery Address</label>
                        <input required type="text" value={formData.customerAddress} onChange={e => setFormData({...formData, customerAddress: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Dhanmondi 27, Dhaka" />
                    </div>

                    <div>
                        <label className="text-sm text-zinc-400 block mb-1.5">Product Details</label>
                        <input required type="text" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Aurelian Premium Oxford Shirt (Size: M)" />
                    </div>

                    <button type="submit" disabled={submitLoading} className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70">
                        {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Order'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Order Pipeline</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and track customer orders via drag-and-drop or action menu.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Order
          </button>
          <div className="relative w-full sm:w-64 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search order..." 
              className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>
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
                      className="bg-[#111111] border border-zinc-800 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors shadow-sm relative group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700">
                            ORD-{order._id.slice(-5).toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Action Menu / 3-Dot Button */}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === order._id ? null : order._id)} 
                            className="p-1 text-zinc-500 hover:text-white transition-colors relative z-20 rounded-md hover:bg-zinc-800"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdown === order._id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)}></div>
                              
                              <div className="absolute right-0 mt-2 w-36 bg-[#0A0A0A] border border-zinc-700 rounded-xl shadow-2xl z-20 py-1 overflow-hidden">
                                <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/50 bg-[#111111]">
                                  Move Order To
                                </div>
                                {columns.map(c => (
                                  c.id !== order.status && ( 
                                    <button 
                                      key={c.id} 
                                      onClick={() => handleStatusChange(order._id, c.id)} 
                                      className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                      <c.icon className="w-3.5 h-3.5" />
                                      {c.title}
                                    </button>
                                  )
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-zinc-200 text-sm mb-1">{order.customerName}</h4>
                      <p className="text-xs text-zinc-500 mb-2">{order.customerPhone}</p>
                      
                      {/* 💥 NEW: Delivery Address Block (ম্যাপ আইকন সহ সুন্দর এড্রেস সেকশন) */}
                      <div className="flex items-start gap-1.5 text-zinc-500 mb-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/30">
                        <MapPin className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed" title={order.customerAddress}>
                          {order.customerAddress || 'No address provided'}
                        </p>
                      </div>
                      
                      {/* Product Details Block */}
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