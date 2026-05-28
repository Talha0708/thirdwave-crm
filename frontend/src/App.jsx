import React, { useState, useEffect, useCallback, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Settings,
  Plus, Save, Power, DollarSign, Info, X, CheckCircle,
  Loader2, Trash2, LogOut, Shield, Users, Activity,
  RefreshCw, TrendingUp, Zap, KeyRound, Lock
} from 'lucide-react';

import { AuthProvider, AuthContext } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import api from './api';

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
      {isError
        ? <Info className="w-4 h-4 shrink-0 text-red-200" />
        : <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ── Skeleton Loader ───────────────────────────────────────────
const TableSkeleton = ({ columns }) => (
  <tbody>
    {[1, 2, 3, 4].map(r => (
      <tr key={r} className="border-b border-gray-100 animate-pulse">
        {Array(columns).fill(0).map((_, c) => (
          <td key={c} className="p-4">
            <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
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
      <p className={`text-xs font-black uppercase tracking-widest mb-2 opacity-60`}>{label}</p>
      {loading
        ? <div className="h-9 w-24 rounded-xl bg-current opacity-10 animate-pulse" />
        : <h3 className="text-4xl font-black leading-none">{value}</h3>}
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" /> Control Center
          </h2>
          <p className="text-gray-500 mt-1 font-medium text-sm">Manage Thirdwave CRM clients and subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAdminData} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200"
          >
            <Plus className="w-4 h-4" /> Create Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard loading={loading} variant="dark"    icon={<Users    className="w-full h-full" />} label="Total Users"      value={stats.totalUsers} />
        <StatCard loading={loading} variant="default" icon={<Package  className="w-full h-full" />} label="Registered Shops" value={stats.totalShops} />
        <StatCard loading={loading} variant="success" icon={<Activity className="w-full h-full" />} label="Active AI Bots"   value={stats.activeShops} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Client Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-6 py-4 font-black">Shop</th>
                <th className="px-6 py-4 font-black">Plan & Usage</th>
                <th className="px-6 py-4 font-black text-center">Status</th>
                <th className="px-6 py-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton columns={4} /> : (
              <tbody className="divide-y divide-gray-50 text-sm">
                {shops.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-medium">No clients found.</td></tr>
                )}
                {shops.map(shop => {
                  const limit        = PLAN_LIMITS[shop.plan];
                  const usagePct     = limit ? Math.min(100, (shop.monthlyMessageCount / limit) * 100) : 0;
                  const isWarning    = usagePct >= 90;

                  return (
                    <tr key={shop._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{shop.shopName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{shop.userId?.name} · {shop.userId?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                            {shop.plan}
                          </span>
                          <span className={`text-xs font-bold ${isWarning ? 'text-red-600' : 'text-gray-400'}`}>
                            {shop.monthlyMessageCount.toLocaleString()} / {limit ? limit.toLocaleString() : '∞'}
                          </span>
                        </div>
                        {limit && (
                          <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${usagePct}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
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
                      <td className="px-6 py-4 text-right">
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
              </tbody>
            )}
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
            <FormField label="Initial Plan">
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
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Selected Shop</p>
            <p className="font-black text-gray-900">{selectedShop.shopName}</p>
            <p className="text-sm text-purple-600 font-bold mt-1">
              Current Plan: {selectedShop.plan} · {selectedShop.monthlyMessageCount.toLocaleString()} msgs used
            </p>
          </div>

          <form onSubmit={handleSubscriptionUpdate} className="space-y-3">
            {[
              { value: 'RENEW',   icon: <RefreshCw className="w-4 h-4" />,   label: 'Renew Current Plan',      desc: 'Resets usage counter and starts a new 30-day cycle.' },
              { value: 'UPGRADE', icon: <TrendingUp className="w-4 h-4" />,  label: 'Upgrade / Change Plan',   desc: 'Moves client to a different plan and resets billing cycle.' },
              { value: 'TOPUP',   icon: <Zap className="w-4 h-4" />,         label: 'Emergency Top-Up',        desc: 'Resets usage only — billing date stays the same.' },
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
                  <span className="flex items-center gap-1.5 font-bold text-sm text-gray-900">
                    {opt.icon} {opt.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 block">{opt.desc}</span>
                </div>
              </label>
            ))}

            {selectedAction === 'UPGRADE' && (
              <div className="pl-4">
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
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
    <div className="p-8 max-w-7xl mx-auto">
      <h2 className="text-3xl font-black text-gray-900 mb-8">Order Management</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                {['Customer', 'Phone', 'Product', 'Address', 'Total', 'Status'].map(h => (
                  <th key={h} className="px-6 py-4 font-black">{h}</th>
                ))}
              </tr>
            </thead>
            {loading ? <TableSkeleton columns={6} /> : (
              <tbody className="divide-y divide-gray-50 text-sm">
                {orders.length === 0
                  ? <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-medium">No orders yet.</td></tr>
                  : orders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{order.customerName}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{order.phoneNumber}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{order.productName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                            #{order.productCode}
                          </span>
                          <span className="text-xs text-gray-400 font-bold">Size: {order.productSize}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-[180px] truncate">{order.address}</td>
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
              </tbody>
            )}
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-gray-900">Inventory</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
              {['Code', 'Name', 'Price', ''].map((h, i) => (
                <th key={i} className={`px-6 py-4 font-black ${i === 3 ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          {loading ? <TableSkeleton columns={4} /> : (
            <tbody className="divide-y divide-gray-50 text-sm">
              {products.length === 0
                ? <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-medium">No products yet.</td></tr>
                : products.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{p.code}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">৳ {p.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
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
            </tbody>
          )}
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
            <div className="flex justify-end gap-3 pt-2">
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
  const [config, setConfig]   = useState({ isAIActive: true, systemPrompt: '', metaPageId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  
  // State for manual token integration
  const [manualIntegration, setManualIntegration] = useState({ pageId: '', token: '' });
  const [connecting, setConnecting] = useState(false);

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

  const handleManualConnect = async (e) => {
    e.preventDefault();
    if (!manualIntegration.pageId || !manualIntegration.token) {
      return showMessage('Please enter both Page ID and Access Token', 'error');
    }
    setConnecting(true);
    try {
      await api.put('/shop/manual-facebook', {
        metaPageId: manualIntegration.pageId,
        metaAccessToken: manualIntegration.token
      });
      showMessage('Page securely connected!', 'success');
      setConfig(prev => ({ ...prev, metaPageId: manualIntegration.pageId }));
      setManualIntegration({ pageId: '', token: '' }); // Clear token immediately for security
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to connect page.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-black text-gray-900 tracking-tight">Integration Hub</h2>

      {/* Manual Integration Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-600" /> Secure Facebook Integration
            </h3>
            <p className="text-gray-500 text-sm mt-1">Connect your page via Developer Access Token.</p>
          </div>
          {config.metaPageId && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black rounded-lg flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              CONNECTED
            </span>
          )}
        </div>
        
        <div className="p-6 bg-gray-50/50">
          <form onSubmit={handleManualConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Facebook Page ID">
                <input
                  type="text"
                  required
                  placeholder={config.metaPageId || "e.g. 108357504425089"}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-purple-500 transition-colors"
                  value={manualIntegration.pageId}
                  onChange={e => setManualIntegration({ ...manualIntegration, pageId: e.target.value })}
                />
              </FormField>
              
              <FormField label="Page Access Token">
                <input
                  type="password"
                  required
                  placeholder="Paste EAAG... token here"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-purple-500 transition-colors"
                  value={manualIntegration.token}
                  onChange={e => setManualIntegration({ ...manualIntegration, token: e.target.value })} 
                />
              </FormField>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Your token is encrypted via AES-256 before saving.
              </p>
              <button
                type="submit" disabled={connecting}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black active:scale-95 transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save & Secure Connection
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
        <div>
          <h3 className="font-black text-gray-900">AI Bot Active</h3>
          <p className="text-sm text-gray-500 mt-1">
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-black text-gray-900 mb-2">Thirdwave AI Brain</h3>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs font-semibold p-3 rounded-xl mb-4">
          ⚠️ Do not remove the <code className="font-mono bg-yellow-100 px-1 rounded">[SYNC: ...]</code> extraction block from the prompt.
        </div>
        <textarea
          className="w-full h-[380px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 font-mono text-xs focus:border-purple-500 outline-none resize-none transition-colors leading-relaxed"
          value={config.systemPrompt || ''}
          onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
          spellCheck={false}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={savePrompt} disabled={saving}
            className="flex items-center gap-2 px-7 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black active:scale-95 transition-all disabled:opacity-60"
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
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-gray-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
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
  const showMessage       = useCallback((msg, type) => setToast({ message: msg, type }), []);

  const navItems = [
    ...(isAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: Shield }] : []),
    { id: 'dashboard', label: 'Overview',    icon: LayoutDashboard },
    { id: 'orders',    label: 'Orders',      icon: ShoppingCart    },
    { id: 'inventory', label: 'Inventory',   icon: Package         },
    { id: 'settings',  label: 'Integration', icon: Settings        },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col z-10 shadow-[2px_0_20px_rgba(0,0,0,0.03)]">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-gray-900 leading-none">Thirdwave CRM</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              {isAdmin ? 'ADMIN' : user?.name}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
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
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'superadmin' && isAdmin   && <SuperAdminView showMessage={showMessage} />}
        {tab === 'dashboard'               && <DashboardView  showMessage={showMessage} />}
        {tab === 'orders'                  && <OrdersView     showMessage={showMessage} />}
        {tab === 'inventory'               && <InventoryView  showMessage={showMessage} />}
        {tab === 'settings'                && <SettingsView   showMessage={showMessage} />}
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
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
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