import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Search, Filter, Plus, UserPlus, Loader2, MoreHorizontal, X } from 'lucide-react';

const ManageClients = () => {
    const { token } = useAuth();
    
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    // ─── NEW: ফর্ম স্টেটে প্ল্যান, এমআরআর, স্ট্যাটাস অ্যাড করা হলো ───
    const [formData, setFormData] = useState({ 
        name: '', email: '', password: '', company: '', plan: 'Basic', mrr: '', status: 'Active' 
    });
    const [addLoading, setAddLoading] = useState(false);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'https://thirdwave-crm.vercel.app/api';

    const fetchClients = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/admin/clients`, config);
            if (response.data.success) setClients(response.data.data);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchClients();
    }, [API_URL, token]);

    const handleAddClient = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`${API_URL}/admin/add-client`, formData, config);
            
            setFormData({ name: '', email: '', password: '', company: '', plan: 'Basic', mrr: '', status: 'Active' });
            setIsModalOpen(false);
            fetchClients();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add client');
        } finally {
            setAddLoading(false);
        }
    };

    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500 relative">
            
            {/* ─── REAL Add Client Modal ─── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl my-8">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-800/50 sticky top-0 bg-[#0A0A0A] rounded-t-2xl z-10">
                            <h2 className="text-xl font-semibold text-white">Create New Workspace</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddClient} className="p-6 space-y-4">
                            {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</p>}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-sm text-zinc-400 block mb-1.5">Client Name</label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Talha Belal" />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-sm text-zinc-400 block mb-1.5">Company Name</label>
                                    <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="e.g. Aurelian" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-zinc-400 block mb-1.5">Email Address</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="admin@domain.com" />
                            </div>
                            
                            <div>
                                <label className="text-sm text-zinc-400 block mb-1.5">Initial Password</label>
                                <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="••••••••" />
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-800/50">
                                <div>
                                    <label className="text-sm text-zinc-400 block mb-1.5">Plan</label>
                                    <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none">
                                        <option value="Basic">Basic</option>
                                        <option value="Pro">Pro</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 block mb-1.5">MRR (৳)</label>
                                    <input required type="number" value={formData.mrr} onChange={e => setFormData({...formData, mrr: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="8000" />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 block mb-1.5">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-[#111111] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50 appearance-none">
                                        <option value="Active">Active</option>
                                        <option value="Onboarding">Onboarding</option>
                                        <option value="Suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" disabled={addLoading} className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-70">
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Deploy Workspace'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <UserPlus className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Manage Workspaces</h1>
                        <p className="text-sm text-zinc-400 mt-1">Add, edit, or suspend client accounts across the CRM.</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all active:scale-[0.98]">
                    <Plus className="w-4 h-4" /> Add New Client
                </button>
            </div>

            {/* ─── Filters & Search ─── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input type="text" placeholder="Search clients by name, company or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-900 transition-colors">
                    All Plans
                </button>
                <button className="flex items-center justify-center p-2.5 bg-[#0A0A0A] border border-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* ─── REAL Clients Table ─── */}
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#111111] text-zinc-500 font-medium text-xs uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4">Workspace / Email</th>
                                <th className="px-6 py-4">Plan & MRR</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3" />
                                        <p className="text-zinc-500">Loading workspaces...</p>
                                    </td>
                                </tr>
                            ) : filteredClients.length > 0 ? (
                                filteredClients.map((client) => (
                                    <tr key={client._id} className="hover:bg-zinc-900/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-white border border-zinc-700 uppercase shadow-sm">
                                                    {(client.company || client.name).charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-zinc-200">{client.company || client.name}</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">{client.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-wider uppercase border border-zinc-700">
                                                    {client.plan || 'Basic'}
                                                </span>
                                                <span className="text-xs font-medium text-zinc-400">৳ {client.mrr || 0} / mo</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 font-medium">
                                            {new Date(client.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                                client.status === 'Active' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 
                                                client.status === 'Suspended' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 
                                                'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    client.status === 'Active' ? 'bg-emerald-400' : 
                                                    client.status === 'Suspended' ? 'bg-red-400' : 'bg-amber-400'
                                                }`}></span> 
                                                {client.status || 'Onboarding'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-zinc-500">
                                        No matching workspaces found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageClients;