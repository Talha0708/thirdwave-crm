import React, { useState, useEffect, useCallback, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Settings,
  Plus, Save, Power, DollarSign, Info, X, CheckCircle,
  Loader2, Trash2, LogOut, Shield, Users, Activity,
  RefreshCw, TrendingUp, Zap, KeyRound, Lock, MessageCircle
} from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import AuthPage from './pages/AuthPage'; // নিশ্চিত করুন এই পাথটি সঠিক
import api from './api/axios'; // নিশ্চিত করুন আপনার axios api ফাইলের পাথটি সঠিক

// ── Enterprise Plan Config ────────────────────────────────────
const PLAN_LIMITS = { Starter: 3000, Business: 8000, Enterprise: null };
const PLAN_LABELS = {
  Starter:    { price: '৳500',   desc: '3k Msgs/mo' },
  Business:   { price: '৳1,200', desc: '8k Msgs/mo' },
  Enterprise: { price: '৳3,000+', desc: 'Unlimited'  },
};

// ── Toast Notification ────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const isError = type === 'error';
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-semibold transition-all duration-300
      ${isError ? 'bg-red-600' : 'bg-gray-950 border border-gray-800'}`}>
      {isError ? <X className="w-5 h-5 text-red-200" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
      {message}
    </div>
  );
};

// ── Skeleton Loader ───────────────────────────────────────────
const TableSkeleton = ({ columns }) => (
  <>
    {[1, 2, 3, 4].map(r => (
      <tr key={r} className="border-b border-gray-50">
        {Array(columns).fill(0).map((_, c) => (
          <td key={c} className="px-6 py-4">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, variant = 'default', loading }) => {
  const styles = {
    dark:    'bg-gray-950 text-white',
    success: 'bg-emerald-50 border border-emerald-100 text-emerald-900',
    purple:  'bg-purple-50 border border-purple-100 text-purple-900',
    default: 'bg-white border border-gray-100 text-gray-900',
  };
  const iconStyles = {
    dark:    'text-white opacity-10',
    success: 'text-emerald-400 opacity-20',
    purple:  'text-purple-400 opacity-20',
    default: 'text-gray-300',
  };
  return (
    <div className={`relative rounded-2xl p-6 overflow-hidden shadow-sm ${styles[variant]}`}>
      <div className={`absolute -bottom-4 -right-4 w-28 h-28 ${iconStyles[variant]}`}>
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">{label}</p>
      {loading ? <Loader2 className="w-6 h-6 animate-spin mt-2" /> : <h3 className="text-3xl font-black">{value}</h3>}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Super Admin View
// ══════════════════════════════════════════════════════════════
const SuperAdminView = ({ showMessage }) => {
  const [stats, setStats]               = useState({ totalUsers: 0, totalShops: 0, activeShops: 0 });
  const [shops, setShops]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreateModal, setShowCreate] = useState(false);
  const [clientData, setClientData]     = useState({ name: '', email: '', password: '', shopName: '', plan: 'Starter' });
  const [creating, setCreating]         = useState(false);
  const [selectedShop, setSelectedShop]   = useState(null);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [selectedAction, setSelectedAction] = useState('RENEW');
  const [newPlan, setNewPlan]             = useState('Starter');
  const [updating, setUpdating]           = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, shopsRes] = await Promise.all([
        api.get('/admin/system-stats'),
        api.get('/admin/shops'),
      ]);
      setStats(statsRes.data);
      setShops(shopsRes.data);
    } catch {
      showMessage('Failed to load admin data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/admin/create-client', clientData);
      showMessage('Client account created successfully!', 'success');
      setShowCreate(false);
      setClientData({ name: '', email: '', password: '', shopName: '', plan: 'Starter' });
      fetchAdminData();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to create client', 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggleShopStatus = async (id) => {
    try {
      const res = await api.put(`/admin/shops/${id}/toggle`);
      showMessage(res.data.message, 'success');
      setShops(prev => prev.map(s =>
        s._id === id ? { ...s, isActive: res.data.isActive } : s
      ));
    } catch {
      showMessage('Failed to toggle status', 'error');
    }
  };

  const handleSubscriptionUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.put(`/admin/shops/${selectedShop._id}/subscription`, {
        action:  selectedAction,
        newPlan: selectedAction === 'UPGRADE' ? newPlan : undefined,
      });
      showMessage(`Subscription updated: ${selectedAction}`, 'success');
      setShowSubModal(false);
      fetchAdminData();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Subscription update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const openSubModal = (shop) => {
    setSelectedShop(shop);
    setNewPlan(shop.plan);
    setSelectedAction('RENEW');
    setShowSubModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 flex items-center justify-center rounded-xl shadow-inner">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Control Center</h1>
            <p className="text-sm font-bold text-gray-400">Manage Thirdwave CRM clients and subscriptions</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200"
        >
          <Plus className="w-4 h-4" /> Create Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard loading={loading} variant="dark"    icon={<Users    className="w-full h-full" />} label="Total Users"      value={stats.totalUsers} />
        <StatCard loading={loading} variant="default" icon={<Package  className="w-full h-full" />} label="Registered Shops" value={stats.totalShops} />
        <StatCard loading={loading} variant="success" icon={<Zap className="w-full h-full" />} label="Active AI Bots"   value={stats.activeShops} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><KeyRound className="w-5 h-5" /> Client Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Shop', 'Plan & Usage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading ? <TableSkeleton columns={4} /> : (
              <>
                {shops.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-bold">No clients found.</td></tr>
                )}
                {shops.map(shop => {
                  const limit        = PLAN_LIMITS[shop.plan];
                  const usagePct     = limit ? Math.min(100, (shop.monthlyMessageCount / limit) * 100) : 0;
                  const isWarning    = usagePct >= 90;
                  return (
                    <tr key={shop._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-900">{shop.shopName}</p>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">{shop.userId?.name} · {shop.userId?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-[10px] font-black uppercase tracking-widest rounded">
                            {shop.plan}
                          </span>
                          <span className={`text-xs font-bold ${isWarning ? 'text-red-600' : 'text-gray-400'}`}>
                            {shop.monthlyMessageCount.toLocaleString()} / {limit ? limit.toLocaleString() : '∞'}
                          </span>
                        </div>
                        {limit && (
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleShopStatus(shop._id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                            shop.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {shop.isActive ? 'ACTIVE' : 'SUSPENDED'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openSubModal(shop)}
                          className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                        >
                          Manage Plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Client Modal */}
      {showCreateModal && (
        <Modal title="Add New Client" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateClient} className="space-y-4">
            {[
              { label: 'Client Name',     key: 'name',     type: 'text'     },
              { label: 'Login Email',     key: 'email',    type: 'email'    },
              { label: 'Login Password',  key: 'password', type: 'text'     },
              { label: 'Shop Name',       key: 'shopName', type: 'text'     },
            ].map(({ label, key, type }) => (
              <FormField key={key} label={label}>
                <input
                  required type={type}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:border-gray-900 transition-colors"
                  value={clientData[key]}
                  onChange={e => setClientData({ ...clientData, [key]: e.target.value })}
                />
              </FormField>
            ))}
            <FormField label="Subscription Plan">
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-gray-900"
                value={clientData.plan}
                onChange={e => setClientData({ ...clientData, plan: e.target.value })}
              >
                {Object.entries(PLAN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{k} ({v.price} · {v.desc})</option>
                ))}
              </select>
            </FormField>
            <button
              type="submit" disabled={creating}
              className="w-full py-3.5 mt-2 bg-purple-600 text-white rounded-xl font-black text-sm tracking-wide hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create & Provision Account
            </button>
          </form>
        </Modal>
      )}

      {/* Subscription Modal */}
      {showSubModal && selectedShop && (
        <Modal title="Manage Subscription" onClose={() => setShowSubModal(false)}>
          <form onSubmit={handleSubscriptionUpdate} className="space-y-5">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Selected Shop</p>
              <p className="font-black text-gray-900 text-lg">{selectedShop.shopName}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">
                Current Plan: {selectedShop.plan} · {selectedShop.monthlyMessageCount.toLocaleString()} msgs used
              </p>
            </div>
            
            <div className="space-y-3">
            {[
              { value: 'RENEW',   icon: <RefreshCw className="w-5 h-5 text-emerald-500" />, label: 'Renew Current Plan',      desc: 'Resets usage counter and starts a new 30-day cycle.' },
              { value: 'UPGRADE', icon: <TrendingUp className="w-5 h-5 text-purple-500" />,  label: 'Upgrade / Change Plan',   desc: 'Moves client to a different plan and resets billing cycle.' },
              { value: 'TOPUP',   icon: <Zap className="w-5 h-5 text-blue-500" />,           label: 'Emergency Top-Up',       desc: 'Resets usage only — billing date stays the same.' },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-gray-300 ${
                  selectedAction === opt.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio" name="action" value={opt.value}
                  checked={selectedAction === opt.value}
                  onChange={e => setSelectedAction(e.target.value)}
                  className="mt-0.5 w-4 h-4 accent-gray-900"
                />
                <div>
                  <div className="flex items-center gap-2 font-black text-gray-900">
                    {opt.icon} {opt.label}
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              </label>
            ))}
            </div>

            {selectedAction === 'UPGRADE' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <select
                  value={newPlan}
                  onChange={e => setNewPlan(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-gray-900"
                >
                  {Object.entries(PLAN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{k} Plan — {v.price} · {v.desc}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit" disabled={updating}
              className="w-full py-3.5 mt-2 bg-gray-900 text-white rounded-xl font-black text-sm tracking-wide hover:bg-black active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm & Apply Changes
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Dashboard View
// ══════════════════════════════════════════════════════════════
const DashboardView = ({ showMessage }) => {
  const [stats, setStats]   = useState({ totalOrders: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/analytics')
      .then(res => setStats({ totalOrders: res.data.totalOrders ?? 0, totalRevenue: res.data.totalRevenue ?? 0 }))
      .catch(() => showMessage('Failed to load analytics.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-2xl font-black text-gray-900">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard loading={loading} variant="success" icon={<DollarSign className="w-full h-full" />}
          label="Total Revenue" value={`৳ ${stats.totalRevenue.toLocaleString()}`} />
        <StatCard loading={loading} variant="default" icon={<ShoppingCart className="w-full h-full" />}
          label="Total Orders" value={stats.totalOrders.toLocaleString()} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Orders View
// ══════════════════════════════════════════════════════════════
const STATUS_STYLES = {
  Pending:   'bg-yellow-50 text-yellow-800 border-yellow-200',
  Confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  Shipped:   'bg-purple-50 text-purple-800 border-purple-200',
  Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-red-50 text-red-800 border-red-200',
};
const ORDER_STATUSES = Object.keys(STATUS_STYLES);

const OrdersView = ({ showMessage }) => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data?.orders ?? []))
      .catch(() => showMessage('Failed to load orders.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);
  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      showMessage('Order status updated!', 'success');
    } catch {
      showMessage('Failed to update status.', 'error');
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-black text-gray-900">Order Management</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Customer', 'Phone', 'Product', 'Address', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {loading ? <TableSkeleton columns={6} /> : (
              <>
                {orders.length === 0
                  ? <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-bold">No orders yet.</td></tr>
                  : orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{order.customerName}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-600">{order.phoneNumber}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{order.productName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black tracking-widest uppercase rounded">
                            #{order.productCode}
                          </span>
                          <span className="text-xs font-bold text-gray-500">Size: {order.productSize}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{order.address}</td>
                      <td className="px-6 py-4 font-black text-gray-900">৳ {order.totalPrice?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <select
                          value={order.status}
                          onChange={e => handleStatusChange(order._id, e.target.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border outline-none cursor-pointer ${STATUS_STYLES[order.status] ?? 'bg-gray-50 text-gray-700'}`}
                        >
                          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))
                }
              </>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Inventory View
// ══════════════════════════════════════════════════════════════
const InventoryView = ({ showMessage }) => {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAddModal, setShowAdd]    = useState(false);
  const [newProduct, setNewProduct]   = useState({ name: '', code: '', price: '' });
  const [saving, setSaving]           = useState(false);
  
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data ?? []);
    } catch {
      showMessage('Failed to load inventory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);
  
  useEffect(() => { loadProducts(); }, [loadProducts]);
  
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/products', { ...newProduct, price: Number(newProduct.price) });
      showMessage('Product added!', 'success');
      setShowAdd(false);
      setNewProduct({ name: '', code: '', price: '' });
      loadProducts();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to add product.', 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      showMessage('Product deleted!', 'success');
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      showMessage(err.response?.data?.error || 'Delete failed.', 'error');
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Inventory</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-black uppercase text-gray-400 tracking-wider">
              {['Code', 'Name', 'Price', ''].map((h, i) => (
                <th key={i} className={`px-6 py-4 ${i === 3 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
          {loading ? <TableSkeleton columns={4} /> : (
            <>
              {products.length === 0
                ? <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500 font-bold">No products yet.</td></tr>
                : products.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-600">{p.code}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 font-black text-gray-900">৳ {p.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleDelete(p._id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              }
            </>
          )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title="Add New Product" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <FormField label="Product Code">
              <input
                required type="text" placeholder="e.g. PB-101"
                className="w-full p-3 border border-gray-200 rounded-xl font-mono font-bold uppercase text-sm outline-none focus:border-gray-900 bg-gray-50"
                value={newProduct.code}
                onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
              />
            </FormField>
            <FormField label="Product Name">
              <input
                required type="text" placeholder="Product name"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-900 bg-gray-50"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </FormField>
            <FormField label="Price (৳)">
              <input
                required type="number" min="0" placeholder="0"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-900 bg-gray-50"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </FormField>
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button
                type="button" onClick={() => setShowAdd(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Product
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Settings View (Integration Hub)
// ══════════════════════════════════════════════════════════════
const SettingsView = ({ showMessage }) => {
  const [config, setConfig]   = useState({ isAIActive: true, systemPrompt: '', metaPageId: '', whatsappPhoneNumberId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  
  // State for manual token integration
  const [manualIntegration, setManualIntegration] = useState({ pageId: '', token: '' });
  const [connectingFb, setConnectingFb] = useState(false);

  const [waIntegration, setWaIntegration] = useState({ phoneId: '', token: '' });
  const [connectingWa, setConnectingWa] = useState(false);

  useEffect(() => {
    api.get('/shop/config')
      .then(res => { if (res.data) setConfig(res.data); })
      .catch(() => showMessage('Failed to load config.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);

  const savePrompt = async () => {
    setSaving(true);
    try {
      await api.put('/shop/config', { systemPrompt: config.systemPrompt });
      showMessage('AI Brain updated successfully!', 'success');
    } catch {
      showMessage('Failed to save prompt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAI = async () => {
    const next = !config.isAIActive;
    try {
      await api.put('/shop/config', { isAIActive: next });
      setConfig(c => ({ ...c, isAIActive: next }));
      showMessage(`AI Bot ${next ? 'activated' : 'deactivated'}!`, 'success');
    } catch {
      showMessage('Failed to toggle AI.', 'error');
    }
  };

  // Facebook Connect
  const handleFacebookConnect = async (e) => {
    e.preventDefault();
    if (!manualIntegration.pageId || !manualIntegration.token) {
      return showMessage('Please enter both Page ID and Access Token', 'error');
    }
    setConnectingFb(true);
    try {
      await api.put('/shop/manual-facebook', {
        metaPageId: manualIntegration.pageId,
        metaAccessToken: manualIntegration.token
      });
      showMessage('Facebook Page securely connected!', 'success');
      setConfig(prev => ({ ...prev, metaPageId: manualIntegration.pageId }));
      setManualIntegration({ pageId: '', token: '' }); // Clear token immediately
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to connect page.', 'error');
    } finally {
      setConnectingFb(false);
    }
  };

  // WhatsApp Connect
  const handleWhatsappConnect = async (e) => {
    e.preventDefault();
    if (!waIntegration.phoneId || !waIntegration.token) {
      return showMessage('Please enter both Phone ID and Access Token', 'error');
    }
    setConnectingWa(true);
    try {
      await api.put('/shop/manual-whatsapp', {
        whatsappPhoneNumberId: waIntegration.phoneId,
        whatsappAccessToken: waIntegration.token
      });
      showMessage('WhatsApp securely connected!', 'success');
      setConfig(prev => ({ ...prev, whatsappPhoneNumberId: waIntegration.phoneId }));
      setWaIntegration({ phoneId: '', token: '' }); // Clear token immediately
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to connect WhatsApp.', 'error');
    } finally {
      setConnectingWa(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Integration Hub</h1>

      {/* Manual Facebook Integration Section */}
      <form onSubmit={handleFacebookConnect} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-base">Secure Facebook Integration</h3>
            <p className="text-xs font-bold text-gray-400">Connect your page via Developer Access Token.</p>
          </div>
          {config.metaPageId && (
            <span className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase rounded-full border border-emerald-200">
              CONNECTED
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex-1">
            <input
              type="text" required
              placeholder={config.metaPageId || "e.g. 108357504425089"}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 transition-colors"
              value={manualIntegration.pageId}
              onChange={e => setManualIntegration({ ...manualIntegration, pageId: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <input
              type="password" required
              placeholder="Paste EAAG... token here"
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-blue-500 transition-colors"
              value={manualIntegration.token}
              onChange={e => setManualIntegration({ ...manualIntegration, token: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Your token is encrypted via AES-256 before saving.
          </p>
          <button
            type="submit" disabled={connectingFb}
            className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black active:scale-95 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {connectingFb && <Loader2 className="w-4 h-4 animate-spin" />}
            Save FB Connection
          </button>
        </div>
      </form>

      {/* 🔥 NEW: Manual WhatsApp Integration Section */}
      <form onSubmit={handleWhatsappConnect} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-base">Secure WhatsApp Integration</h3>
            <p className="text-xs font-bold text-gray-400">Connect via WhatsApp Cloud API Token.</p>
          </div>
          {config.whatsappPhoneNumberId && (
            <span className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-widest uppercase rounded-full border border-emerald-200">
              CONNECTED
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex-1">
            <input
              type="text" required
              placeholder={config.whatsappPhoneNumberId || "Phone Number ID (e.g. 10456...)"}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-green-500 transition-colors"
              value={waIntegration.phoneId}
              onChange={e => setWaIntegration({ ...waIntegration, phoneId: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <input
              type="password" required
              placeholder="Paste EAAG... WA token here"
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-green-500 transition-colors"
              value={waIntegration.token}
              onChange={e => setWaIntegration({ ...waIntegration, token: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Token is encrypted via AES-256.
          </p>
          <button
            type="submit" disabled={connectingWa}
            className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {connectingWa && <Loader2 className="w-4 h-4 animate-spin" />}
            Save WA Connection
          </button>
        </div>
      </form>

      {/* AI Toggle */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-black text-gray-900 flex items-center gap-2"><Power className="w-5 h-5 text-purple-500" /> AI Bot Active</h3>
          <p className="text-xs font-bold text-gray-500 mt-1">
            {config.isAIActive ? 'Bot is currently replying to messages.' : 'Bot is paused — messages are not being answered.'}
          </p>
        </div>
        <button
          onClick={toggleAI}
          className={`relative w-12 h-6 rounded-full transition-colors ${config.isAIActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.isAIActive ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {/* System Prompt */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h3 className="font-black text-gray-900 flex items-center gap-2">Thirdwave AI Brain</h3>
          <p className="text-xs font-bold text-amber-600 mt-1 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> ⚠️ Do not remove the [SYNC: ...] extraction block from the prompt.
          </p>
        </div>
        <textarea
          className="w-full h-[380px] p-6 bg-white text-gray-800 font-mono text-xs focus:ring-inset focus:ring-2 focus:ring-purple-500 outline-none resize-none transition-all leading-relaxed"
          value={config.systemPrompt || ''}
          onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
          spellCheck={false}
        />
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={savePrompt} disabled={saving}
            className="flex items-center justify-center gap-2 px-7 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Deploy Updates
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Shared UI Primitives
// ══════════════════════════════════════════════════════════════
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h2 className="text-xl font-black text-gray-900">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════
//  Dashboard Layout
// ══════════════════════════════════════════════════════════════
const DashboardLayout = () => {
  const { user, logout }  = useContext(AuthContext);
  const isAdmin           = user?.role === 'admin';
  const [tab, setTab]     = useState(isAdmin ? 'superadmin' : 'dashboard');
  const [toast, setToast] = useState(null);
  
  const showMessage = useCallback((msg, type) => setToast({ message: msg, type }), []);
  
  const navItems = [
    ...(isAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: Shield }] : []),
    { id: 'dashboard', label: 'Overview',    icon: LayoutDashboard },
    { id: 'orders',    label: 'Orders',      icon: ShoppingCart    },
    { id: 'inventory', label: 'Inventory',   icon: Package         },
    { id: 'settings',  label: 'Integration', icon: Settings        },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row font-sans selection:bg-purple-200">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 sticky top-0 md:h-screen z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
            T
          </div>
          <div>
            <h1 className="font-black text-gray-900 tracking-tight text-lg">Thirdwave CRM</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {isAdmin ? 'ADMIN' : user?.name}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active       = tab === id;
            const isSuperAdmin = id === 'superadmin';
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  active
                    ? isSuperAdmin
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                        : 'bg-gray-950 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? (isSuperAdmin ? 'text-purple-200' : 'text-gray-300') : ''}`} />
                {label}
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-50 mt-auto">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
        {tab === 'superadmin' && isAdmin   && <SuperAdminView  showMessage={showMessage} />}
        {tab === 'dashboard'               && <DashboardView   showMessage={showMessage} />}
        {tab === 'orders'                  && <OrdersView      showMessage={showMessage} />}
        {tab === 'inventory'               && <InventoryView   showMessage={showMessage} />}
        {tab === 'settings'                && <SettingsView    showMessage={showMessage} />}
      </main>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Route Protection & Entry Point
// ══════════════════════════════════════════════════════════════
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={
            <AuthContext.Consumer>
              {({ user }) => !user ? <AuthPage /> : <Navigate to="/dashboard" replace />}
            </AuthContext.Consumer>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}