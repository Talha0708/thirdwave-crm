import React, { useState, useEffect, useCallback, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Settings,
  Plus, Save, Power, DollarSign, Info, X, CheckCircle,
  Loader2, Trash2, Edit2, LogOut, Shield, Users, Activity,
  RefreshCw, TrendingUp, Zap, KeyRound, Lock, MessageCircle
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

// ── Available Sizes Array ─────────────────────────────────────
const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'FREE SIZE'];

// ══════════════════════════════════════════════════════════════
//  Shared UI Primitives (Moved to top to prevent White Screen Crash)
// ══════════════════════════════════════════════════════════════
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const isError = type === 'error';
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-xl text-sm font-medium transition-all duration-300 transform translate-y-0
      ${isError ? 'bg-red-950/80 border-red-900/50 text-red-200 shadow-[0_0_30px_rgba(220,38,38,0.15)]' : 'bg-zinc-900/80 border-zinc-800/50 text-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.05)]'}`}>
      {isError ? <X className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-zinc-400" />}
      {message}
    </div>
  );
};

const TableSkeleton = ({ columns }) => (
  <>
    {[1, 2, 3, 4].map(r => (
      <tr key={r} className="border-b border-white/5">
        {Array(columns).fill(0).map((_, c) => (
          <td key={c} className="px-6 py-5">
            <div className="h-4 bg-white/5 rounded animate-pulse w-2/3"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

const StatCard = ({ icon, label, value, loading }) => {
  return (
    <div className="group relative rounded-2xl p-6 bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">{label}</p>
          {loading ? <Loader2 className="w-6 h-6 animate-spin text-zinc-600" /> : <h3 className="text-3xl font-semibold text-zinc-100 tracking-tight">{value}</h3>}
        </div>
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <h2 className="text-base font-medium text-zinc-200">{title}</h2>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4" />
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
    <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2">{label}</label>
    {children}
  </div>
);

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
      setShops(prev => prev.map(s => s._id === id ? { ...s, isActive: res.data.isActive } : s));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Command Center</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage infrastructure and deployments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-white text-black px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
          <Plus className="w-4 h-4" /> Provision Workspace
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard loading={loading} icon={<Users className="w-5 h-5" />} label="Total Identities" value={stats.totalUsers} />
        <StatCard loading={loading} icon={<Package className="w-5 h-5" />} label="Workspaces" value={stats.totalShops} />
        <StatCard loading={loading} icon={<Zap className="w-5 h-5 text-emerald-400" />} label="Active AI Instances" value={stats.activeShops} />
      </div>

      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <Shield className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-zinc-300">Client Instances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {['Organization', 'Resource Usage', 'Status', 'Configuration'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-medium uppercase text-zinc-500 tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {loading ? <TableSkeleton columns={4} /> : (
              <>
                {shops.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-zinc-600 font-medium">No instances provisioned.</td></tr>
                )}
                {shops.map(shop => {
                  const limit        = PLAN_LIMITS[shop.plan];
                  const usagePct     = limit ? Math.min(100, (shop.monthlyMessageCount / limit) * 100) : 0;
                  const isWarning    = usagePct >= 90;
                  return (
                    <tr key={shop._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-200">{shop.shopName}</p>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">{shop.userId?.email}</p>
                      </td>
                      <td className="px-6 py-4 w-1/3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="px-2 py-1 bg-white/10 text-zinc-300 text-[10px] font-medium uppercase tracking-widest rounded border border-white/5">
                            {shop.plan}
                          </span>
                          <span className={`text-xs font-mono ${isWarning ? 'text-red-400' : 'text-zinc-500'}`}>
                            {shop.monthlyMessageCount.toLocaleString()} / {limit ? limit.toLocaleString() : '∞'}
                          </span>
                        </div>
                        {limit && (
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`} style={{ width: `${usagePct}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleShopStatus(shop._id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all border ${shop.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${shop.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          {shop.isActive ? 'Active' : 'Suspended'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openSubModal(shop)} className="px-4 py-2 bg-transparent border border-white/10 text-zinc-400 rounded-lg text-xs font-medium hover:bg-white/5 hover:text-white hover:border-white/20 transition-all">
                          Configure
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

      {showCreateModal && (
        <Modal title="Deploy Workspace" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Owner Name">
                <input required type="text" className="form-input" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} />
              </FormField>
              <FormField label="Workspace ID (Shop Name)">
                <input required type="text" className="form-input" value={clientData.shopName} onChange={e => setClientData({ ...clientData, shopName: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Root Email">
              <input required type="email" className="form-input" value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} />
            </FormField>
            <FormField label="Access Key (Password)">
              <input required type="text" className="form-input font-mono" value={clientData.password} onChange={e => setClientData({ ...clientData, password: e.target.value })} />
            </FormField>
            <FormField label="Compute Tier">
              <select className="form-input" value={clientData.plan} onChange={e => setClientData({ ...clientData, plan: e.target.value })}>
                {Object.entries(PLAN_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#111]">{k} ({v.price} / {v.desc})</option>
                ))}
              </select>
            </FormField>
            <div className="pt-4">
              <button type="submit" disabled={creating} className="btn-primary w-full justify-center">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Initialize Deployment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showSubModal && selectedShop && (
        <Modal title="Configure Infrastructure" onClose={() => setShowSubModal(false)}>
          <form onSubmit={handleSubscriptionUpdate} className="space-y-6">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-200">{selectedShop.shopName}</p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">{selectedShop.plan} &bull; {selectedShop.monthlyMessageCount.toLocaleString()} reqs</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
            <div className="space-y-3">
            {[
              { value: 'RENEW',   icon: <RefreshCw className="w-4 h-4 text-zinc-400" />, label: 'Reset Cycle',      desc: 'Zero out current usage counters.' },
              { value: 'UPGRADE', icon: <TrendingUp className="w-4 h-4 text-zinc-400" />,  label: 'Scale Tier',   desc: 'Adjust compute and usage limits.' },
              { value: 'TOPUP',   icon: <Activity className="w-4 h-4 text-zinc-400" />,           label: 'Burst Quota',       desc: 'Add emergency allocations.' },
            ].map(opt => (
              <label key={opt.value} className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${selectedAction === opt.value ? 'border-white/40 bg-white/10' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'}`}>
                <input type="radio" name="action" value={opt.value} checked={selectedAction === opt.value} onChange={e => setSelectedAction(e.target.value)} className="mt-1 w-4 h-4 accent-white bg-transparent border-white/20" />
                <div>
                  <div className="flex items-center gap-2 font-medium text-sm text-zinc-200">{opt.icon} {opt.label}</div>
                  <p className="text-xs text-zinc-500 mt-1">{opt.desc}</p>
                </div>
              </label>
            ))}
            </div>
            {selectedAction === 'UPGRADE' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="form-input">
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-[#111]">{k} Tier — {v.price}</option>)}
                </select>
              </div>
            )}
            <div className="pt-2">
              <button type="submit" disabled={updating} className="btn-primary w-full justify-center">
                {updating && <Loader2 className="w-4 h-4 animate-spin" />} Apply Configuration
              </button>
            </div>
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
      .catch(() => showMessage('Failed to fetch analytics.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Real-time metrics for your workspace</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard loading={loading} icon={<DollarSign className="w-5 h-5" />} label="Gross Volume" value={`৳ ${stats.totalRevenue.toLocaleString()}`} />
        <StatCard loading={loading} icon={<ShoppingCart className="w-5 h-5" />} label="Transactions" value={stats.totalOrders.toLocaleString()} />
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  Orders View
// ══════════════════════════════════════════════════════════════
const STATUS_STYLES = {
  Pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Confirmed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Shipped:   'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Delivered: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
};
const ORDER_STATUSES = Object.keys(STATUS_STYLES);

const OrdersView = ({ showMessage }) => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/orders')
      .then(res => setOrders(res.data?.orders ?? []))
      .catch(() => showMessage('Failed to load logs.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
      showMessage('State updated', 'success');
    } catch {
      showMessage('Failed to mutate state', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Transactions</h1>
        <p className="text-sm text-zinc-500 mt-1">Audit log of all order requests</p>
      </div>
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {['Client', 'Payload', 'Destination', 'Value', 'State'].map(h => (
                  <th key={h} className="px-6 py-4 text-xs font-medium uppercase text-zinc-500 tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {loading ? <TableSkeleton columns={5} /> : (
              <>
                {orders.length === 0
                  ? <tr><td colSpan="5" className="px-6 py-12 text-center text-zinc-600 font-medium">No transactions found.</td></tr>
                  : orders.map(order => (
                    <tr key={order._id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-zinc-200">{order.customerName}</p>
                        <p className="font-mono text-xs text-zinc-500 mt-1">{order.phoneNumber}</p>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-3">
                          {/* 🔥 Legacy fallback in case items array is missing for older orders */}
                          {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                            <div key={idx} className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                              <p className="font-medium text-zinc-200 text-sm">
                                <span className="text-indigo-400 font-bold">{item.quantity}x</span> {item.productName}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase rounded">Code: {item.productCode}</span>
                                {item.size && item.size !== 'FREE SIZE' && <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase rounded">Size: {item.size}</span>}
                                {item.color && <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase rounded">Color: {item.color}</span>}
                              </div>
                            </div>
                          )) : (
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                              <p className="font-medium text-zinc-200 text-sm">
                                <span className="text-indigo-400 font-bold">1x</span> {order.productName}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase rounded">Code: {order.productCode}</span>
                                {order.productSize && <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 uppercase rounded">Size: {order.productSize}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400 max-w-[200px] truncate align-top pt-7">{order.address}</td>
                      <td className="px-6 py-4 align-top pt-7">
                        <p className="font-semibold text-zinc-200 font-mono text-lg">৳{order.totalPrice?.toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Inc. ৳{order.deliveryCharge} Delivery</p>
                      </td>
                      <td className="px-6 py-4 align-top pt-6">
                        <select
                          value={order.status}
                          onChange={e => handleStatusChange(order._id, e.target.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border outline-none cursor-pointer transition-colors appearance-none text-center ${STATUS_STYLES[order.status] ?? 'bg-white/5 text-zinc-400 border-white/10'}`}
                        >
                          {ORDER_STATUSES.map(s => <option key={s} value={s} className="bg-[#111] text-zinc-200">{s}</option>)}
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
//  Inventory View (ULTRA SAFE Multi-Size Array Processing)
// ══════════════════════════════════════════════════════════════
const InventoryView = ({ showMessage }) => {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  
  const [isEditing, setIsEditing]     = useState(false);
  const [editId, setEditId]           = useState(null);
  
  const [formData, setFormData]       = useState({ name: '', code: '', price: '', sizes: [], color: '' });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data ?? []);
    } catch {
      showMessage('Failed to fetch catalog.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData, price: Number(formData.price) };
      if (isEditing) {
        await api.put(`/products/${editId}`, payload);
        showMessage('Item mutated successfully', 'success');
      } else {
        await api.post('/products', payload);
        showMessage('Item injected successfully', 'success');
      }
      closeModal();
      loadProducts();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 🔥 100% Crash-Proof Edit Handler
  const handleEditClick = (p) => {
    setIsEditing(true);
    setEditId(p._id);
    
    let currentSizes = [];
    if (Array.isArray(p.sizes)) {
      currentSizes = [...p.sizes];
    } else if (typeof p.sizes === 'string') {
      currentSizes = p.sizes.split(',').map(s => s.trim());
    } else if (typeof p.size === 'string') {
      currentSizes = [p.size.trim()];
    }
    
    setFormData({ 
      name: p.name || '', 
      code: p.code || '', 
      price: p.price || '', 
      sizes: currentSizes.filter(Boolean), 
      color: p.color || '' 
    });
    setShowModal(true);
  };

  // 🔥 Crash-Proof Inject Handler
  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: '', code: '', price: '', sizes: [], color: '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Execute deletion?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/products/${id}`);
      showMessage('Item purged', 'success');
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      showMessage('Purge failed.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: '', code: '', price: '', sizes: [], color: '' });
  };

  // 🔥 Crash-Proof Size Toggle Handler
  const handleSizeToggle = (sz) => {
    setFormData(prev => {
      const currentSizes = Array.isArray(prev.sizes) ? prev.sizes : [];
      if (currentSizes.includes(sz)) {
        return { ...prev, sizes: currentSizes.filter(s => s !== sz) };
      } else {
        return { ...prev, sizes: [...currentSizes, sz] };
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Data Models</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage catalog schemas and batch size entry</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Inject Item
        </button>
      </div>

      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                {['ID', 'Identifier', 'Available Sizes', 'Base Value', ''].map((h, i) => (
                  <th key={i} className={`px-6 py-4 text-xs font-medium uppercase text-zinc-500 tracking-widest ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {loading ? <TableSkeleton columns={5} /> : (
              <>
                {products.length === 0
                  ? <tr><td colSpan="5" className="px-6 py-12 text-center text-zinc-600 font-medium">Dataset empty.</td></tr>
                  : products.map(p => {
                      const displaySizes = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : (p.size ? [p.size] : []);
                      return (
                        <tr key={p._id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 font-mono text-zinc-400 text-sm">{p.code}</td>
                          <td className="px-6 py-4 font-medium text-zinc-200">
                            {p.name}
                            {p.color && <span className="block text-xs text-zinc-500 font-normal mt-0.5">{p.color}</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                              {displaySizes.length > 0 ? (
                                displaySizes.map(sz => (
                                  <span key={sz} className="px-2.5 py-1 bg-white/5 border border-white/10 text-[10px] font-medium font-mono text-zinc-300 uppercase rounded-md shadow-sm">
                                    {sz}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs font-mono text-zinc-600 italic">No Size (e.g. Wallet/Bag)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-200">৳{p.price?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button onClick={() => handleEditClick(p)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(p._id)} 
                              disabled={deletingId === p._id}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                }
              </>
            )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title={isEditing ? "Mutate Data Model" : "Define Data Model"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Unique ID / SKU Code">
                <input required type="text" className="form-input font-mono uppercase" placeholder="e.g. 101" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
              </FormField>
              <FormField label="Descriptor (Name)">
                <input required type="text" className="form-input" placeholder="e.g. Premium Kurta" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </FormField>
            </div>
            
            <FormField label="Scale Configuration (Select Available Sizes)">
              <div className="grid grid-cols-4 gap-2 mt-2 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                {AVAILABLE_SIZES.map(sz => {
                  const sizesArray = Array.isArray(formData.sizes) ? formData.sizes : [];
                  const isSelected = sizesArray.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleSizeToggle(sz)}
                      className={`py-2.5 rounded-lg text-xs font-semibold font-mono tracking-wider border transition-all duration-200 ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)] font-bold'
                          : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono leading-relaxed">
                * Click to toggle sizes. Leave unselected for items without size parameters (e.g. Wallets).
              </p>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Variant (Color)">
                <input type="text" className="form-input" placeholder="e.g. Black" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} />
              </FormField>
              <FormField label="Integer Value (৳)">
                <input required type="number" min="0" className="form-input font-mono" placeholder="799" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </FormField>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-white/5">
              <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? 'Commit Changes' : 'Execute Injection'}
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
  
  const [manualIntegration, setManualIntegration] = useState({ pageId: '', token: '' });
  const [connectingFb, setConnectingFb] = useState(false);
  const [waIntegration, setWaIntegration] = useState({ phoneId: '', token: '' });
  const [connectingWa, setConnectingWa] = useState(false);

  useEffect(() => {
    api.get('/shop/config')
      .then(res => { if (res.data) setConfig(res.data); })
      .catch(() => showMessage('Failed to fetch config.', 'error'))
      .finally(() => setLoading(false));
  }, [showMessage]);

  const savePrompt = async () => {
    setSaving(true);
    try {
      await api.put('/shop/config', { systemPrompt: config.systemPrompt });
      showMessage('Ruleset deployed', 'success');
    } catch {
      showMessage('Deployment failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAI = async () => {
    const next = !config.isAIActive;
    try {
      await api.put('/shop/config', { isAIActive: next });
      setConfig(c => ({ ...c, isAIActive: next }));
      showMessage(`Engine state: ${next ? 'ONLINE' : 'OFFLINE'}`, 'success');
    } catch {
      showMessage('State mutation failed', 'error');
    }
  };

  const handleFacebookConnect = async (e) => {
    e.preventDefault();
    if (!manualIntegration.pageId || !manualIntegration.token) return showMessage('Parameters missing', 'error');
    setConnectingFb(true);
    try {
      await api.put('/shop/manual-facebook', { metaPageId: manualIntegration.pageId, metaAccessToken: manualIntegration.token });
      showMessage('Graph API linked', 'success');
      setConfig(prev => ({ ...prev, metaPageId: manualIntegration.pageId }));
      setManualIntegration({ pageId: '', token: '' }); 
    } catch (err) {
      showMessage('Link failed', 'error');
    } finally {
      setConnectingFb(false);
    }
  };

  const handleWhatsappConnect = async (e) => {
    e.preventDefault();
    if (!waIntegration.phoneId || !waIntegration.token) return showMessage('Parameters missing', 'error');
    setConnectingWa(true);
    try {
      await api.put('/shop/manual-whatsapp', { whatsappPhoneNumberId: waIntegration.phoneId, whatsappAccessToken: waIntegration.token });
      showMessage('Cloud API linked', 'success');
      setConfig(prev => ({ ...prev, whatsappPhoneNumberId: waIntegration.phoneId }));
      setWaIntegration({ phoneId: '', token: '' }); 
    } catch (err) {
      showMessage('Link failed', 'error');
    } finally {
      setConnectingWa(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Integrations</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure external APIs and AI behavior</p>
      </div>

      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Power className={`w-5 h-5 ${config.isAIActive ? 'text-white' : 'text-zinc-600'}`} />
          </div>
          <div>
            <h3 className="font-medium text-zinc-200">Processing Engine</h3>
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Status: {config.isAIActive ? <span className="text-emerald-400">OPERATIONAL</span> : <span className="text-amber-400">STANDBY</span>}
            </p>
          </div>
        </div>
        <button onClick={toggleAI} className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none ${config.isAIActive ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-zinc-800 border border-white/10'}`}>
          <span className={`absolute top-1 w-5 h-5 rounded-full transition-all duration-300 ${config.isAIActive ? 'left-8 bg-black' : 'left-1 bg-zinc-500'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleFacebookConnect} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Lock className="w-24 h-24" /></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-zinc-200 flex items-center gap-2"><Lock className="w-4 h-4 text-zinc-500" /> Graph API (Meta)</h3>
              {config.metaPageId && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-widest uppercase rounded">Bound</span>}
            </div>
            <div className="space-y-4">
              <input type="text" required placeholder={config.metaPageId || "Resource ID"} className="form-input font-mono" value={manualIntegration.pageId} onChange={e => setManualIntegration({ ...manualIntegration, pageId: e.target.value })} />
              <input type="password" required placeholder="Bearer Token" className="form-input font-mono" value={manualIntegration.token} onChange={e => setManualIntegration({ ...manualIntegration, token: e.target.value })} />
              <button type="submit" disabled={connectingFb} className="btn-secondary w-full justify-center">
                {connectingFb ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inject Credentials'}
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={handleWhatsappConnect} className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><MessageCircle className="w-24 h-24" /></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-zinc-200 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-zinc-500" /> WA Cloud API</h3>
              {config.whatsappPhoneNumberId && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-widest uppercase rounded">Bound</span>}
            </div>
            <div className="space-y-4">
              <input type="text" required placeholder={config.whatsappPhoneNumberId || "Node ID"} className="form-input font-mono" value={waIntegration.phoneId} onChange={e => setWaIntegration({ ...waIntegration, phoneId: e.target.value })} />
              <input type="password" required placeholder="Bearer Token" className="form-input font-mono" value={waIntegration.token} onChange={e => setWaIntegration({ ...waIntegration, token: e.target.value })} />
              <button type="submit" disabled={connectingWa} className="btn-secondary w-full justify-center">
                {connectingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inject Credentials'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="font-medium text-sm text-zinc-200">System Instruction (LLM)</h3>
          <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider"><Info className="w-3.5 h-3.5" /> Preserve [SYNC] block</p>
        </div>
        <textarea
          className="w-full h-[400px] p-6 bg-transparent text-zinc-300 font-mono text-[13px] leading-relaxed outline-none resize-none focus:ring-1 focus:ring-white/20 selection:bg-white/20"
          value={config.systemPrompt || ''}
          onChange={e => setConfig({ ...config, systemPrompt: e.target.value })}
          spellCheck={false}
        />
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button onClick={savePrompt} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Compile & Deploy
          </button>
        </div>
      </div>
    </div>
  );
};

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
    ...(isAdmin ? [{ id: 'superadmin', label: 'Command', icon: Shield }] : []),
    { id: 'dashboard', label: 'Overview',    icon: Activity },
    { id: 'orders',    label: 'Transactions',icon: ShoppingCart },
    { id: 'inventory', label: 'Models',      icon: Package },
    { id: 'settings',  label: 'Integration', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col md:flex-row font-sans selection:bg-white/20">
      <style>{`
        .form-input { width: 100%; padding: 0.75rem 1rem; background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.5rem; font-size: 0.875rem; color: #e4e4e7; outline: none; transition: all 0.2s; }
        .form-input:focus { border-color: rgba(255, 255, 255, 0.3); background-color: rgba(255, 255, 255, 0.05); }
        .btn-primary { padding: 0.625rem 1.25rem; background-color: #ededed; color: #000; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { background-color: #fff; box-shadow: 0 0 15px rgba(255,255,255,0.2); }
        .btn-secondary { padding: 0.625rem 1.25rem; background-color: rgba(255,255,255,0.05); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.1); font-size: 0.875rem; font-weight: 500; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .btn-secondary:hover:not(:disabled) { background-color: rgba(255,255,255,0.1); }
      `}</style>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <aside className="w-full md:w-[240px] bg-[#050505] border-r border-white/5 flex flex-col shrink-0 sticky top-0 md:h-screen z-40">
        <div className="px-6 py-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-black font-black text-sm">T</div>
          <div>
            <h1 className="font-semibold text-zinc-200 tracking-tight text-sm">Thirdwave CRM</h1>
            <p className="text-[9px] font-mono text-zinc-500 uppercase mt-1 tracking-widest">{isAdmin ? 'ROOT ADMIN' : user?.name}</p>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group ${active ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <div className="flex items-center gap-3"><Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`} />{label}</div>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 mt-auto">
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Terminate Session
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 sm:p-10 max-w-6xl mx-auto w-full">
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
  if (loading) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
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
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}