import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Users, Server, DollarSign, Activity, ArrowUpRight, 
  ShieldCheck, Zap, MoreVertical, Loader2, Plus, X 
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  
  const [dbStats, setDbStats] = useState({ totalClients: 0, revenue: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', company: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

  const fetchDashboardData = async () => {
    try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${API_URL}/admin/dashboard-stats`, config);
        if (response.data.success) {
            setDbStats(response.data.stats);
            setRecentUsers(response.data.recentUsers);
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [API_URL, token]);

  // Handle Add Client Submit
  const handleAddClient = async (e) => {
      e.preventDefault();
      setAddLoading(true);
      setError('');
      try {
          const config = { headers: { Authorization: `Bearer ${token}` } };
          await axios.post(`${API_URL}/admin/add-client`, formData, config);
          
          setFormData({ name: '', email: '', password: '', company: '' });
          setIsModalOpen(false);
          fetchDashboardData(); // নতুন ক্লায়েন্ট অ্যাড হলে ড্যাশবোর্ড রিলোড করবে
      } catch (err) {
          setError(err.response?.data?.error || 'Failed to add client');
      } finally {
          setAddLoading(false);
      }
  };

  const stats = [
    { label: 'Total MRR (Revenue)', value: `৳ ${dbStats.revenue || '0'}`, trend: '+15.2%', isPositive: true, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
    { label: 'Active Clients', value: dbStats.totalClients, trend: 'Live', isPositive: true, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'API Requests (24h)', value: '142.5K', trend: '+12%', isPositive: true, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { label: 'System Health', value: '99.9%', trend: 'Stable', isPositive: true, icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
  ];

  if (loading) return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-zinc-500 animate-spin mb-4" />
          <p className="text-zinc-400 font-medium animate-pulse">Syncing strictly with MongoDB Cluster...</p>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500 relative">
      
      {/* ─── Add Client Modal ─── */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-6 border-b border-zinc-800/50">
                      <h2 className="text-xl font-semibold text-white">Create Workspace</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleAddClient} className="p-6 space-y-4">
                      {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
                      <div>
                          <label className="text-sm text-zinc-400 block mb-1.5">Client Name</label>
                          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors" placeholder="e.g. Aurelian Menswear" />
                      </div>
                      <div>
                          <label className="text-sm text-zinc-400 block mb-1.5">Company / Brand</label>
                          <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors" placeholder="Thirdwave Future Tech" />
                      </div>
                      <div>
                          <label className="text-sm text-zinc-400 block mb-1.5">Email Address</label>
                          <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors" placeholder="client@brand.com" />
                      </div>
                      <div>
                          <label className="text-sm text-zinc-400 block mb-1.5">Temporary Password</label>
                          <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors" placeholder="••••••••" />
                      </div>
                      <button type="submit" disabled={addLoading} className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70">
                          {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* ─── Header Section ─── */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-center gap-2">
            Super Admin Control <ShieldCheck className="w-6 h-6 text-blue-500" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">System overview and infrastructure status for {user?.name}.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-sm font-semibold rounded-lg hover:bg-blue-600/20 transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4" /> New Workspace
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-all active:scale-[0.98]">
            <Zap className="w-4 h-4" /> Deploy Updates
          </button>
        </div>
      </div>

      {/* ─── Top Level Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#0A0A0A] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${stat.bg} rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity`}></div>
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.border} border`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${stat.isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {stat.trend} {stat.trend !== 'Stable' && stat.trend !== 'Live' && <ArrowUpRight className="w-3 h-3 ml-1" />}
              </span>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Recent Clients Table (Real Data) ─── */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Recent Workspaces</h2>
            <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">View All</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-[#111111] text-zinc-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentUsers.length > 0 ? (
                  recentUsers.map((client) => (
                    <tr key={client._id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-white border border-zinc-700 uppercase">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-200">{client.name}</p>
                            <p className="text-xs text-zinc-500">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700 capitalize">
                          {client.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-300">
                          {client.company || <span className="text-zinc-600">N/A</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">No recent clients found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Server Infrastructure (Untouched!) ─── */}
        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Infrastructure</h2>
          </div>
          <div className="space-y-6">
            <div className="p-4 border border-zinc-800 rounded-xl bg-[#111111]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">Vercel Edge Network</h3>
                  <p className="text-xs text-zinc-500">Dhaka Region (Routing)</p>
                </div>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                <span>Latency</span><span className="font-mono text-emerald-400">24ms</span>
              </div>
            </div>

            <div className="p-4 border border-zinc-800 rounded-xl bg-[#111111]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">MongoDB Cluster</h3>
                  <p className="text-xs text-zinc-500">Primary Database</p>
                </div>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Storage Used</span><span>14% (1.4GB)</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '14%' }}></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border border-red-900/30 rounded-xl bg-red-950/10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-medium text-red-200">WhatsApp API</h3>
                  <p className="text-xs text-red-400/70">Rate limit approaching</p>
                </div>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </div>
              <button className="mt-3 text-xs font-medium text-red-400 hover:text-red-300">Increase Limit &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;